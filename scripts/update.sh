#!/usr/bin/env bash
# Update TECH ARSLAN SOFTWARE SOLUTIONS from git, reinstall deps and restart.
set -euo pipefail

APP_NAME="tech-arslan-software-solutions"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

echo "[TECH ARSLAN] Updating source from git..."
if [[ -d .git ]]; then
  git fetch --all
  git reset --hard "@{u}" 2>/dev/null || git pull --ff-only
else
  echo "[TECH ARSLAN] Not a git repository - skipping git update."
fi

echo "[TECH ARSLAN] Installing/refreshing dependencies..."
npm install

echo "[TECH ARSLAN] Restarting bot..."
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save
echo "[TECH ARSLAN] Update complete."
