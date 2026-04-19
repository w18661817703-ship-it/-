#!/usr/bin/env bash
set -euo pipefail

APP_NAME="emotion-purifier-shield"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Installing dependencies..."
npm ci

echo "Building production assets..."
npm run build

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "Reloading existing PM2 app..."
  pm2 reload ecosystem.config.cjs --update-env
else
  echo "Starting PM2 app for the first time..."
  pm2 start ecosystem.config.cjs
fi

echo "Saving PM2 process list..."
pm2 save

echo "Deployment complete."
