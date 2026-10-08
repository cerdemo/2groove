#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  echo 'Create the v2 environment first; see README.md.' >&2
  exit 1
fi
exec .venv/bin/python -m groove
