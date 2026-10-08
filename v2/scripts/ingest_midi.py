"""Build a unified MIDI corpus from a file, ZIP, recursive directory, or source config."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from groove.ingest.schema import Config
from groove.ingest.pipeline import run
from groove.ingest.export import export_hvo
from groove.ingest.discover import EXTENSIONS


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    source=parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--config',type=Path,help='JSON configuration for collections, metadata policy and drum maps')
    source.add_argument('--input',type=Path,help='MIDI file, ZIP, or directory (all subdirectories are scanned); generic GM source')
    parser.add_argument('--output',type=Path,help='Canonical output root (default: data/unified, or config value)')
    parser.add_argument('--max-files',type=int,help='Process at most N MIDI candidates across all sources (positive integer; ZIP members count separately)')
    parser.add_argument('--web-mode',choices=['off','cache','musicbrainz','brave','auto'])
    parser.add_argument('--annotations',type=Path)
    parser.add_argument('--export-hvo',type=Path,help='Fresh directory; canonical corpus is always preserved separately')
    args=parser.parse_args()
    if args.max_files is not None and args.max_files<=0:parser.error('--max-files must be a positive integer')
    if args.input is not None:
        path=args.input.expanduser().resolve()
        if not path.exists():parser.error(f'Input does not exist: {path}')
        if not path.is_dir() and (not path.is_file() or path.suffix.lower() not in EXTENSIONS|{'.zip'}):
            parser.error('Input must be a directory, ZIP, or supported MIDI file (.mid, .midi, .kar, .smf, .rmi, .rmid)')
        config=Config(sources=[{'id':'local-midi','path':str(path)}])
    else:
        config=Config.model_validate_json(args.config.read_text())
    if args.output is not None:config.output=str(args.output.expanduser())
    if args.max_files is not None:config.max_files=args.max_files
    if args.web_mode:config.web.mode=args.web_mode
    if args.annotations:config.annotations=str(args.annotations)
    result,report=run(config,progress=lambda message:print(message,flush=True))
    print('Canonical run:',result)
    if args.export_hvo:print(json.dumps(export_hvo(result,args.export_hvo),indent=2))

if __name__=='__main__':main()
