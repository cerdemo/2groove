"""One bounded public catalogue query; no MIDI or local filenames are uploaded."""
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.ingest.schema import WebConfig
from groove.ingest.web import WebResolver

result=WebResolver(WebConfig(mode='musicbrainz',cache='data/web-provider-smoke',max_requests=2)).lookup(
    {'title':'Never Gonna Give You Up','artist':'Rick Astley'})
summary={k:result[k] for k in ('status','identity','error','provider_mode','query_url') if k in result}
print(json.dumps(summary,indent=2))
Path('artifacts').mkdir(exist_ok=True)
Path('artifacts/metadata-web-smoke.json').write_text(json.dumps(result,indent=2))
if result['status'] in ('error','deferred'):sys.exit(1)
