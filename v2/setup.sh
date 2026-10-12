#!/bin/sh
set -eu
cd "$(dirname "$0")"

check_python() {
  "$1" -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)'
}

if [ -e .venv ]; then
  if [ ! -x .venv/bin/python ] || ! check_python .venv/bin/python; then
    echo 'Existing .venv is not Python 3.12. Deactivate and move it aside, then rerun setup. See README.md.' >&2
    exit 1
  fi
else
  interpreter=${PYTHON:-python3.12}
  if ! command -v "$interpreter" >/dev/null 2>&1 || ! check_python "$interpreter"; then
    echo 'Python 3.12 is required. Install it or set PYTHON to its executable. See README.md.' >&2
    exit 1
  fi
  "$interpreter" -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python -m pip check
