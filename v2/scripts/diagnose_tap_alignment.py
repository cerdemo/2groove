"""Inspect onset information in existing alignment checkpoints without retraining them."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from groove.representation.diagnose_alignment import main

if __name__ == '__main__':
    main()
