# Zvrk

A web app where users sign up and play tabletop games with other players in real-time.

## Tech Stack

- **Backend:** Laravel 12 (PHP 8.5)
- **Frontend:** React + Inertia.js + TypeScript
- **Auth:** Laravel Breeze
- **WebSockets:** Laravel Reverb
- **Database:** MySQL 8.4
- **Cache/Queue:** Redis
- **Dev Environment:** Docker via Laravel Sail

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

That's it. Everything else runs inside Docker.

## Project Setup (First Time)

```bash
# 1. Clone the repo and enter the directory
git clone <repo-url>
cd Zvrk

# 2. Copy the environment file
cp .env.example .env

# 3. Install PHP dependencies
docker compose run --rm composer install

# 4. Start the containers
./vendor/bin/sail up -d

# 5. Run migrations and install frontend dependencies
./vendor/bin/sail artisan migrate
./vendor/bin/sail npm install
```

## Running the App

```bash
# 1. Start the containers (app server, MySQL, Redis, Reverb, queue worker)
./vendor/bin/sail up -d

# 2. Start the Vite dev server (frontend hot reload)
./vendor/bin/sail npm run dev
```

Open http://localhost in your browser.

The WebSocket server (Reverb) and queue worker start automatically with the container — no extra terminals needed.

## Stopping

```bash
./vendor/bin/sail down
```

## Useful Commands

```bash
./vendor/bin/sail artisan test          # Run tests
./vendor/bin/sail artisan migrate       # Run migrations
./vendor/bin/sail artisan <command>     # Any artisan command
./vendor/bin/sail mysql                 # MySQL CLI
./vendor/bin/sail logs                  # View container logs
./vendor/bin/sail build --no-cache      # Rebuild after Dockerfile changes
```

## Sail Alias (Recommended)

Add this to your `~/.zshrc` or `~/.bashrc` so you can type `sail` instead of `./vendor/bin/sail`:

```bash
alias sail='./vendor/bin/sail'
```

Then: `sail up -d`, `sail npm run dev`, etc.
