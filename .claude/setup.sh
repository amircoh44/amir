#!/usr/bin/env bash
# SessionStart setup for Claude Code (web). Idempotent: safe to re-run.
# Creates a venv and installs dev dependencies so tests/lint work immediately.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate

pip install --quiet --upgrade pip >/dev/null 2>&1 || true
pip install --quiet -r requirements-dev.txt

echo "GreenBulk env ready. Run: . .venv/bin/activate && make test"
