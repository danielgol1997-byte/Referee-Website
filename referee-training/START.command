#!/bin/bash

# UEFA Referee Training Platform - Local one-click start
# - Spins up a local Postgres just for this project (port 5434)
# - Applies migrations and seeds sample users/tests
# - Starts the Next.js dev server

set -euo pipefail

cd "$(dirname "$0")"

echo "⚽ UEFA Referee Training Platform"
echo "=================================="
echo ""

# ------------------------------------------------------------------
# Paths & settings
# ------------------------------------------------------------------
if [[ $(uname -m) == "arm64" ]]; then
  export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
else
  export PATH="/usr/local/bin:/usr/local/opt/postgresql@16/bin:$PATH"
fi

DATA_DIR="$HOME/.rtw-postgres"
PG_PORT=5434
DB_USER="referee_admin"
DB_PASS="referee_password"
DB_NAME="referee_training"
PG_LOG="$DATA_DIR/server.log"
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}"

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
log() { echo "[$(date +'%H:%M:%S')] $*"; }

cleanup_existing() {
  # Kill any existing Next.js dev server on port 3000
  if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log "🛑 Stopping existing Next.js server..."
    lsof -Pi :3000 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
    sleep 1
  fi

  # Kill any process using port 5434 (our Postgres port)
  if lsof -Pi :${PG_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    log "🛑 Stopping existing process on port ${PG_PORT}..."
    lsof -Pi :${PG_PORT} -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
    sleep 2
  fi

  # Stop any existing Postgres via pg_ctl
  if pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
    log "🛑 Stopping existing Postgres..."
    pg_ctl -D "$DATA_DIR" stop -m fast >/dev/null 2>&1 || true
    sleep 1
  fi
}

ensure_tools() {
  if ! command -v brew >/dev/null 2>&1; then
    log "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi

  if ! command -v psql >/dev/null 2>&1; then
    log "🐘 Installing PostgreSQL..."
    brew install postgresql@16
  fi

  if ! command -v node >/dev/null 2>&1; then
    log "📦 Installing Node.js..."
    brew install node
  fi
}

ensure_cluster() {
  # Check if cluster is initialized
  if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    log "🗄️  Initializing local Postgres cluster at $DATA_DIR (port ${PG_PORT})"
    rm -rf "$DATA_DIR"
    
    # Let initdb create the directory
    mkdir -p "$(dirname "$DATA_DIR")"
    echo "$DB_PASS" > "$(dirname "$DATA_DIR")/.pgpassfile"
    
    initdb -D "$DATA_DIR" -U "$DB_USER" --pwfile="$(dirname "$DATA_DIR")/.pgpassfile" 2>&1 | grep -v "^initdb:"
    log "✅ Cluster initialized"
  fi

  # Start if not running
  if ! pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
    log "🚀 Starting Postgres (port ${PG_PORT})"
    pg_ctl -D "$DATA_DIR" -l "$PG_LOG" -o "-p ${PG_PORT}" start >/dev/null
    sleep 2
  fi

  # Ensure DB exists
  PSQL_BASE="psql -p ${PG_PORT} -U ${DB_USER} -d postgres"
  
  if ! $PSQL_BASE -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | grep -q 1; then
    log "🛠️  Creating database ${DB_NAME}"
    $PSQL_BASE -c "CREATE DATABASE ${DB_NAME}" >/dev/null 2>&1
  fi

  # Ensure password is set
  $PSQL_BASE -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" >/dev/null 2>&1
}

ensure_env() {
  if [ ! -f ".env" ]; then
    log "📝 Creating .env"
    cat > .env <<EOF
DATABASE_URL="${DATABASE_URL}"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_CLIENT_SECRET="your-apple-client-secret"
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"
EOF
  fi
}

apply_migrations_and_seed() {
  log "🔄 Applying migrations..."
  
  # Check if User table exists (actual schema, not just migrations table)
  PSQL_MAIN="psql -p ${PG_PORT} -U ${DB_USER} -d ${DB_NAME}"
  if ! $PSQL_MAIN -tc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User'" 2>/dev/null | grep -q 1; then
    log "📝 Applying initial schema..."
    $PSQL_MAIN -f prisma/migrations/0001_init.sql >/dev/null 2>&1
    
    log "📝 Applying mandatory tests migration..."
    $PSQL_MAIN -f prisma/migrations/0002_add_mandatory_tests.sql >/dev/null 2>&1
    
    log "📝 Applying question IDs migration..."
    $PSQL_MAIN -f prisma/migrations/0003_add_question_ids.sql >/dev/null 2>&1
    
    log "📝 Applying question fields migration..."
    $PSQL_MAIN -f prisma/migrations/0004_add_question_fields/migration.sql >/dev/null 2>&1
  fi

  log "🌱 Seeding sample data..."
  npx prisma db seed
}

start_server() {
  log "🚀 Starting Next.js dev server..."
  DATABASE_URL="${DATABASE_URL}" npm run dev >/tmp/rtw-dev.log 2>&1 &
  SERVER_PID=$!

  log "⏳ Waiting for server..."
  for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  log "✅ Website running at: http://localhost:3000"
  echo "📊 Login credentials:"
  echo "   Referee:      referee@example.com / password123"
  echo "   Admin:        admin@example.com / password123"
  echo "   Super Admin:  super@example.com / password123"
  echo ""

  if ! pgrep -f "Chrome.*localhost:3000" >/dev/null; then
    log "🌐 Opening in Chrome..."
    open -a "Google Chrome" http://localhost:3000 2>/dev/null || open http://localhost:3000
  fi

  wait $SERVER_PID
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
cleanup_existing
ensure_tools
ensure_cluster
ensure_env

if [ ! -d "node_modules" ]; then
  log "📦 Installing project dependencies..."
  npm install --silent
fi

log "⚙️  Generating Prisma client..."
npx prisma generate

apply_migrations_and_seed
start_server
