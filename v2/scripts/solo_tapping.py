#!/usr/bin/env python3
"""Run the style-independent full-groove → one-channel research pilot."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from groove.solo.cli import main

if __name__ == '__main__':
    main()
