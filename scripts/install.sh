#!/usr/bin/env bash
# ============================================================
#  TECH ARSLAN SOFTWARE SOLUTIONS - VPS installer
#  Target: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (x86_64)
#  Installs Node.js 20, FFmpeg and PM2, then the bot.
#  Generated for TECH ARSLAN SOFTWARE SOLUTIONS by TECH HACKER
# ============================================================
set -euo pipefail

APP_NAME="tech-arslan-software-solutions"
NODE_MAJOR="20"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { echo -e "\033[1;36m[TECH ARSLAN]\033[0m $*"; }
err() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

if [[ "${EUID}" -ne 0 ]]; then
  err "Please run this installer with sudo:  sudo bash scripts/install.sh"
  exit 1
fi

log "Updating apt package index..."
apt-get update -y

log "Installing base packages (curl, git, ffmpeg, build tools)..."
apt-get install -y --no-install-recommends \
  curl git ca-certificates gnupg ffmpeg python3 make g++

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "${NODE_MAJOR}" ]]; then
  log "Installing Node.js ${NODE_MAJOR}.x from NodeSource..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
else
  log "Node.js $(node -v) already installed."
fi

log "Node.js: $(node -v)   npm: $(npm -v)"

log "Installing PM2 globally..."
npm install -g pm2

log "Installing application dependencies..."
cd "${PROJECT_DIR}"
npm install

log "Preparing runtime directories and configuration..."
mkdir -p "${PROJECT_DIR}/logs"
if [[ ! -f "${PROJECT_DIR}/config.env" ]]; then
  cp "${PROJECT_DIR}/config.env.example" "${PROJECT_DIR}/config.env"
  log "Created config.env from config.env.example - edit it and set SESSION_ID."
fi

log "Registering PM2 startup on boot..."
pm2 startup systemd -u "${SUDO_USER:-root}" --hp "$(eval echo ~${SUDO_USER:-root})" >/dev/null 2>&1 || \
  log "PM2 startup hook skipped (run 'pm2 startup' manually if needed)."

cat <<EOF

============================================================
 TECH ARSLAN SOFTWARE SOLUTIONS installed successfully.
============================================================
 Project : ${PROJECT_DIR}
 Node    : $(node -v)
 PM2     : $(pm2 -v)

 Next steps:
   1. Edit config.env and set your SESSION_ID (and PAIR_API if used).
   2. Start the bot:   bash scripts/start.sh
   3. View logs:       pm2 logs ${APP_NAME}
   4. Save process:    pm2 save

 Website: https://techarslan.kesug.com
 Email  : hackertech152@gmail.com
============================================================
EOF
