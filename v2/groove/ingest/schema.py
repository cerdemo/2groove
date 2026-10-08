from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Source(StrictModel):
    id: str
    path: str
    adapter: Literal['generic', 'gmd'] = 'generic'
    drum_map: Literal['gm', 'roland_td11', 'custom'] = 'gm'
    pitch_map: dict[int, str] = Field(default_factory=dict)
    defaults: dict = Field(default_factory=dict)
    license: str | None = None
    origin_url: str | None = None
    group_by: Literal['file', 'parent', 'grandparent'] = 'file'


class Policy(StrictModel):
    required_metadata: list[Literal['style','tempo','meter']] = Field(default_factory=lambda:['style','tempo'])
    minimum_metadata_score: float = Field(default=.8,ge=0,le=1)
    minimum_percussion_score: float = Field(default=.85,ge=0,le=1)
    conflict_policy: Literal['quarantine','prefer_priority'] = 'quarantine'
    allow_uninterpreted_sysex: bool = False
    max_file_bytes: int = Field(default=32_000_000,gt=0)
    max_events: int = Field(default=1_000_000,gt=0)
    max_archive_members: int = Field(default=100_000,gt=0)


class WebConfig(StrictModel):
    mode: Literal['off','cache','musicbrainz','brave','auto'] = 'auto'
    cache: str = 'data/metadata-web-cache'
    max_requests: int = Field(default=100,ge=0,le=10000)
    timeout: float = Field(default=12,gt=0,le=60)
    user_agent: str = '2groove/0.3 (https://github.com/cerdemo/2groove)'


class Config(StrictModel):
    sources: list[Source] = Field(min_length=1)
    output: str = 'data/unified'
    policy: Policy = Field(default_factory=Policy)
    web: WebConfig = Field(default_factory=WebConfig)
    annotations: str | None = None
    max_files: int | None = Field(default=None,gt=0,strict=True)
    seed: int = 42

    @model_validator(mode='after')
    def unique_sources(self):
        if len({s.id for s in self.sources})!=len(self.sources):raise ValueError('Source IDs must be unique')
        return self


def evidence(value, kind, locator, score, raw=None, scope='midi', **extra):
    return dict(value=value,kind=kind,locator=locator,evidence_score=score,
                raw=raw,scope=scope,**extra)
