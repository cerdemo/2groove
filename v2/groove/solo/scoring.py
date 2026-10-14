"""Compatibility import for the relocated research module."""
import sys
from importlib import import_module
sys.modules[__name__] = import_module("research.solo_tapping.scoring")
