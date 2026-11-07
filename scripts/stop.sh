#!/usr/bin/env bash
# Stop TECH ARSLAN SOFTWARE SOLUTIONS under PM2.
set -euo pipefail

APP_NAME="tech-arslan-software-solutions"

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 stop "${APP_NAME}"
  pm2 save
  echo "[TECH ARSLAN] Bot stopped."
else
  echo "[TECH ARSLAN] No PM2 process named ${APP_NAME} is running."
fi
