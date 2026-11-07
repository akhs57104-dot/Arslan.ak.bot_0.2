#!/usr/bin/env bash
# Start TECH ARSLAN SOFTWARE SOLUTIONS under PM2.
set -euo pipefail

APP_NAME="tech-arslan-software-solutions"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

mkdir -p logs

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  echo "[TECH ARSLAN] Restarting existing PM2 process..."
  pm2 restart "${APP_NAME}"
else
  echo "[TECH ARSLAN] Starting bot with PM2..."
  pm2 start ecosystem.config.js
fi

pm2 save
pm2 status "${APP_NAME}"
echo "[TECH ARSLAN] Logs: pm2 logs ${APP_NAME}"
