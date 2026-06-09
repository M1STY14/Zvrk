#!/bin/bash
# Deploy Zvrk. Run by the GitHub Actions workflow (SSH) or manually on the box:
# pull, build, migrate, rebuild caches, restart the long-lived services.
set -euo pipefail

APP_DIR=/home/deploy/Zvrk
# Match this to the box's PHP-FPM unit (`ls /run/php` / `systemctl list-units 'php*-fpm*'`)
# and to the name allowed in /etc/sudoers.d/zvrk-deploy.
PHP_FPM_SERVICE=php8.4-fpm

cd "$APP_DIR"

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
