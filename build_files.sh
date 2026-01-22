#!/usr/bin/env bash
set -euo pipefail

# Vercel's Python runtime is externally managed (PEP 668). Use a venv for builds.
python3 -m venv .venv
. .venv/bin/activate

pip install -r requirements.txt

# Ensure Django can run during build even if SECRET_KEY isn't configured yet.
export SECRET_KEY="${SECRET_KEY:-build-only-secret-key}"

python backend/manage.py collectstatic --noinput
