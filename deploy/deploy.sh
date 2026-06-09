#!/bin/bash
# Deploy Zvrk. Run by the GitHub Actions workflow (SSH) or manually on the box:
# pull, build, migrate, rebuild caches, restart the long-lived services.
set -euo pipefail

APP_DIR=/home/deploy/Zvrk
# Match this to the box's PHP-FPM unit (`ls /run/php` / `systemctl list-units 'php*-fpm*'`)
# and to the name allowed in /etc/sudoers.d/zvrk-deploy.
PHP_FPM_SERVICE=php8.4-fpm

cd "$APP_DIR"

# Load nvm so node/npm are on PATH. The GitHub Actions SSH session is a
# non-interactive shell, so ~/.bashrc (which inits nvm) returns early and
# node/npm would otherwise be missing. Wrapped in set +u because nvm.sh
# references unset vars.
set +u
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
set -u

echo "==> Pulling latest main"
git fetch --prune origin
git reset --hard origin/main

echo "==> Installing PHP deps (production)"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

echo "==> Building frontend (vite -> public/build)"
# Note: VITE_REVERB_* are read from .env at build time and baked into the
# bundle, so .env must hold the production (zvrk.leokocijan.dev) values.
npm ci
npm run build

echo "==> Ensuring SQLite database file exists"
touch database/database.sqlite

echo "==> Running migrations"
php artisan migrate --force

echo "==> Rebuilding caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Restarting realtime services"
# A fresh systemd restart picks up the new code for both the worker and Reverb.
sudo systemctl restart zvrk-queue
sudo systemctl restart zvrk-reverb
sudo systemctl reload "$PHP_FPM_SERVICE"

echo "==> Done."
systemctl --no-pager --lines=0 status zvrk-reverb zvrk-queue || true
