#!/bin/sh
set -eu
lab_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$lab_root"
if [ ! -x "$lab_root/.venv/bin/python" ]; then
    echo "Set up v2/.venv first with v2/setup.sh." >&2
    exit 1
fi
exec "$lab_root/.venv/bin/python" -m research.solo_tapping "$@"
