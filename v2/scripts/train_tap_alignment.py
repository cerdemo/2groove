"""Train human tap/groove contrastive alignment; see CONTRASTIVE.md."""
import os
from pathlib import Path
import sys

os.environ.setdefault('CUBLAS_WORKSPACE_CONFIG', ':4096:8')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from groove.representation.train_alignment import main

if __name__ == '__main__':
    main()
