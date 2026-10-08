"""Conservative web metadata lookup, cached by identity (never by local path).

MusicBrainz recording search is the built-in network provider. A reviewed cache
entry can supply evidence from other web sources without changing the pipeline.
Network failures, ambiguous identity and actual no-match are distinct outcomes.
"""
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from .metadata import normalize_style,declared_style,styles_in_name
from .schema import evidence


def normalized(text):
    return re.sub(r'[^\w]+',' ',unicodedata.normalize('NFKC',text or '').casefold()).strip()


def cache_key(identity):return hashlib.sha256(json.dumps(identity,sort_keys=True,ensure_ascii=False).encode()).hexdigest()


class WebResolver:
    def __init__(self,config,fetch=None):
        self.config=config;self.cache=Path(config.cache);self.cache.mkdir(parents=True,exist_ok=True)
        self.requests=0;self.last_request=0.;self.fetch=fetch or self._http

    def _http(self,url):
        if self.requests>=self.config.max_requests:raise RuntimeError('web_request_budget_exhausted')
        time.sleep(max(0,1.1-(time.monotonic()-self.last_request)))
        self.last_request=time.monotonic();self.requests+=1
        headers={'User-Agent':self.config.user_agent,'Accept':'application/json'}
        if urllib.parse.urlparse(url).hostname=='api.search.brave.com':
            token=os.environ.get('BRAVE_SEARCH_API_KEY')
            if not token:raise RuntimeError('BRAVE_SEARCH_API_KEY_not_configured')
            headers['X-Subscription-Token']=token
        req=urllib.request.Request(url,headers=headers)
        with urllib.request.urlopen(req,timeout=self.config.timeout) as response:
            data=response.read(2_000_001)
        if len(data)>2_000_000:raise ValueError('web_response_too_large')
        return json.loads(data)

    def lookup(self,identity):
        key=cache_key(identity);path=self.cache/(key+'.json')
        if path.exists():
            try:
                result=json.loads(path.read_text())
                if result.get('identity')!=identity:raise ValueError('web_cache_identity_mismatch')
                if result.get('status') not in ('error','deferred') and (result.get('provider_mode')==self.config.mode or self.config.mode=='cache' or result.get('reviewed')):
                    result['cache_hit']=True;return result
            except (OSError,ValueError):return dict(status='error',identity=identity,error='invalid_web_cache',key=key)
        if self.config.mode in ('off','cache'):
            return dict(status='deferred',identity=identity,key=key,error='web_disabled' if self.config.mode=='off' else 'cache_miss')
        try:
            if self.config.mode=='brave':result=self._brave(identity)
            else:
                result=self._musicbrainz(identity)
                if self.config.mode=='auto' and result['status']!='resolved' and os.environ.get('BRAVE_SEARCH_API_KEY'):
                    catalog=result;result=self._brave(identity);result['catalog_attempt']=catalog
        except Exception as e:return dict(status='error',identity=identity,key=key,error=str(e))
        result.update(identity=identity,key=key,fetched_at=datetime.now(timezone.utc).isoformat(),provider_mode=self.config.mode)
        temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2));temporary.replace(path)
        return result

    def _musicbrainz(self,identity):
        # Only search identity leaves the machine, never local paths or MIDI bytes.
        def quote(value):return '"'+re.sub(r'["\\]',' ',value)+'"'
        query='recording:'+quote(identity['title'])
        if identity.get('artist'):query+=' AND artist:'+quote(identity['artist'])
        url='https://musicbrainz.org/ws/2/recording/?'+urllib.parse.urlencode(dict(query=query,fmt='json',limit=25))
        response=self.fetch(url);rows=response.get('recordings',[]);matches=[]
        for row in rows:
            artists=[a.get('name',a.get('artist',{}).get('name','')) for a in row.get('artist-credit',[]) if isinstance(a,dict)]
            if normalized(row.get('title'))!=normalized(identity['title']):continue
            if identity.get('artist') and normalized(identity['artist']) not in {normalized(a) for a in artists}:continue
            matches.append(row)
        ids={r['id'] for r in matches}
        candidates=[dict(id=r.get('id'),title=r.get('title'),artist_credit=r.get('artist-credit')) for r in rows[:10]]
        if not ids:return dict(status='not_found',query_url=url,candidates=candidates,evidence=[])
        if len(ids)!=1 or response.get('count',0)>25:
            return dict(status='ambiguous',query_url=url,candidates=candidates,evidence=[])
        identifier=next(iter(ids))
        if not re.fullmatch(r'[0-9a-fA-F-]{36}',identifier):raise ValueError('invalid_recording_identifier')
        detail=self.fetch(f'https://musicbrainz.org/ws/2/recording/{identifier}?inc=genres+tags+artist-credits&fmt=json')
        genres=sorted({n for item in detail.get('genres',[]) if item.get('count',0)>0 and (n:=declared_style(item.get('name','')))} |
                      {n for item in detail.get('tags',[]) if item.get('count',0)>0 and (n:=normalize_style(item.get('name','')))})
        fields=[]
        if genres:fields.append(dict(field='style',value=genres,url='https://musicbrainz.org/recording/'+identifier,scope='recording'))
        return dict(status='resolved' if fields else 'insufficient_metadata',identity_status='exact',
                    query_url=url,candidates=candidates,evidence=fields,recording_id=identifier)

    def _brave(self,identity):
        query=' '.join('"'+v.replace('"','')+'"' for v in [identity['title'],identity.get('artist')] if v)+' song genre'
        url='https://api.search.brave.com/res/v1/web/search?'+urllib.parse.urlencode({'q':query,'count':10})
        response=self.fetch(url);results=response.get('web',{}).get('results',[])
        if not results:return dict(status='not_found',query=query,evidence=[],provider='brave')
        candidates=[];votes={}
        for item in results:
            text=item.get('title','')+' '+re.sub(r'<[^>]+>',' ',item.get('description',''))
            headline=' '+normalized(item.get('title',''))+' '
            exact=(' '+normalized(identity['title'])+' ') in headline and bool(identity.get('artist')) and (' '+normalized(identity['artist'])+' ') in headline
            genres=styles_in_name(text) if re.search(r'\b(?:genre|style)\s*[:=]',text,re.I) else []
            candidates.append(dict(title=item.get('title'),url=item.get('url'),snippet=item.get('description','')[:600],identity_match=exact,genres=genres))
            host=urllib.parse.urlparse(item.get('url','')).hostname
            if exact and genres and host:
                votes.setdefault(tuple(genres),{})[host]=item['url']
        # Corroborate explicit genre fields across independent hosts. Never infer
        # style just because a genre keyword appears somewhere in a search result.
        agreed=[(genres,hosts) for genres,hosts in votes.items() if len(hosts)>=2]
        if len(agreed)==1 and len(votes)==1:
            genres,hosts=agreed[0]
            return dict(status='resolved',identity_status='exact',query=query,provider='brave',candidates=candidates,
                evidence=[dict(field='style',value=list(genres),url=u,scope='recording') for u in hosts.values()])
        return dict(status='ambiguous' if votes or not identity.get('artist') else 'insufficient_metadata',query=query,provider='brave',candidates=candidates,evidence=[])


def web_evidence(result,identity,asset_sha=None):
    if result.get('status')!='resolved' or result.get('identity')!=identity or result.get('identity_status')!='exact':return {}
    candidates={}
    for item in result.get('evidence',[]):
        field=item.get('field');value=item.get('value');url=item.get('url','')
        if urllib.parse.urlparse(url).scheme not in ('https','http'):continue
        if field=='style':
            values=value if isinstance(value,list) else [value]
            value=sorted({n for s in values if (n:=declared_style(s))})
            if not value:continue
        elif field=='tempo':
            # A recording's BPM is not evidence for the MIDI arrangement's tempo.
            if item.get('scope')!='midi_arrangement' or not asset_sha or item.get('midi_sha256')!=asset_sha:continue
            if not isinstance(value,(int,float)) or not 10<=value<=600:continue
        else:continue
        candidates.setdefault(field,[]).append(evidence(value,'web',url,.82,scope=item.get('scope','recording'),
            raw=item,fetched_at=result.get('fetched_at'),query=identity))
    return candidates
