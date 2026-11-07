#!/usr/bin/env bash
# Restart TECH ARSLAN SOFTWARE SOLUTIONS under PM2.
set -euo pipefail

APP_NAME="tech-arslan-software-solutions"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  echo "[TECH ARSLAN] Process not found, starting it instead..."
  pm2 start ecosystem.config.js
fi

pm2 save
pm2 status "${APP_NAME}"
