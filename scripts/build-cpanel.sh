#!/usr/bin/env bash
# Builds minimal deploy bundles for shared cPanel hosting (Passenger
# "Setup Node.js App"). Both api/ and web/ are standalone npm
# projects (no workspace, no shared package) — this script just
# builds each and copies the small set of files needed to run them;
# `npm install --omit=dev` runs on the SERVER, not in this bundle.
#
# Usage:
#   PROD_API_URL=https://api.x2factor.com/api ./scripts/build-cpanel.sh
#
# Output (written to C:\deploy-x2factor, NOT inside this repo — keeps
# it out of git and off any long/space-containing local path):
#   deploy-x2factor/api/   — dist/, package.json, package-lock.json, drizzle/
#   deploy-x2factor/web/   — .next/, public/, package.json, package-lock.json, next.config.mjs, server.js
#
# On the server, per app: upload the folder, run `npm install
# --omit=dev`, set env vars, start (api: dist/main.js, web: server.js —
# cPanel's Passenger/LSAPI runs a JS file directly, not `next start`).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_DIR="/c/deploy-x2factor"
API_PKG="$ROOT/api"
WEB_PKG="$ROOT/web"

# NEXT_PUBLIC_* vars are baked into the built JS at build time, so this
# script must NOT trust whatever happens to be active in web/.env right
# now (it's routinely switched to a localhost value for local dev) — a
# forgotten toggle there silently ships a production build that calls
# http://localhost from every visitor's own browser. Require the
# production API URL to be passed explicitly instead.
if [ -z "${PROD_API_URL:-}" ]; then
  echo "ERROR: PROD_API_URL is not set." >&2
  echo "Run this script as: PROD_API_URL=https://api.x2factor.com/api ./scripts/build-cpanel.sh" >&2
  exit 1
fi

case "$PROD_API_URL" in
  http://localhost*|http://127.0.0.1*)
    echo "ERROR: PROD_API_URL looks like a local dev URL ($PROD_API_URL) — refusing to build a production bundle with it." >&2
    exit 1
    ;;
esac

echo "== 1/4 Cleaning old deploy output =="
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/api" "$DEPLOY_DIR/web"

echo "== 2/4 Building api =="
( cd "$API_PKG" && npm run build )

echo "== 3/4 Building web (NEXT_PUBLIC_API_URL=$PROD_API_URL) =="
( cd "$WEB_PKG" && NEXT_PUBLIC_API_URL="$PROD_API_URL" npm run build )

# ---------------------------------------------------------------------
# api bundle
# ---------------------------------------------------------------------
echo "== 4/4 Assembling bundles =="

API_OUT="$DEPLOY_DIR/api"
cp -r "$API_PKG/dist" "$API_OUT/dist"
cp -r "$API_PKG/drizzle" "$API_OUT/drizzle"
cp "$API_PKG/drizzle.config.ts" "$API_OUT/drizzle.config.ts"
cp "$API_PKG/package.json" "$API_OUT/package.json"
if [ -f "$API_PKG/package-lock.json" ]; then
  cp "$API_PKG/package-lock.json" "$API_OUT/package-lock.json"
fi

cat > "$API_OUT/README-DEPLOY.txt" <<'EOF'
Deploying this folder on cPanel (Setup Node.js App):

1. Upload this whole `api/` folder to the server (scp/rsync over SSH,
   or git push to a repo the server pulls from).
2. In cPanel > Setup Node.js App, create/edit the app:
     - Application root: point at this folder
     - Application startup file: dist/main.js
     - Node version: 20.x (or whatever this project targets)
3. Set every environment variable from your local apps/api/.env in the
   cPanel Node app's "Environment variables" section (DATABASE_URL,
   JWT secrets, FLUTTERWAVE_*, RESEND_API_KEY, etc.) — do NOT upload
   the .env file itself.
4. In the app's SSH terminal (via cPanel's "Enter to the virtual
   environment" or your own SSH session), run:
     npm install --omit=dev
5. First deploy only — run migrations:
     npm run db:migrate
6. Restart the app from the cPanel Node.js App screen.

Re-run scripts/build-cpanel.sh and re-upload every time you deploy a
change.
EOF

# ---------------------------------------------------------------------
# web bundle
# ---------------------------------------------------------------------
WEB_OUT="$DEPLOY_DIR/web"
cp -r "$WEB_PKG/.next" "$WEB_OUT/.next"
# Build cache only speeds up the next local build — the server never
# reads it, and it's ~95% of the bundle's size.
rm -rf "$WEB_OUT/.next/cache"
if [ -d "$WEB_PKG/public" ]; then
  cp -r "$WEB_PKG/public" "$WEB_OUT/public"
fi
cp "$WEB_PKG/next.config.mjs" "$WEB_OUT/next.config.mjs"
cp "$WEB_PKG/server.js" "$WEB_OUT/server.js"
cp "$WEB_PKG/package.json" "$WEB_OUT/package.json"
if [ -f "$WEB_PKG/package-lock.json" ]; then
  cp "$WEB_PKG/package-lock.json" "$WEB_OUT/package-lock.json"
fi

cat > "$WEB_OUT/README-DEPLOY.txt" <<'EOF'
Deploying this folder on cPanel (Setup Node.js App):

1. Upload this whole `web/` folder to the server.
2. In cPanel > Setup Node.js App, create/edit the app:
     - Application root: point at this folder
     - Application startup file: server.js
     - Node version: 20.x
3. Set environment variables in the cPanel Node app's "Environment
   variables" section — at minimum NEXT_PUBLIC_API_URL (pointing at
   your deployed api app's public URL, including its /api prefix).
   NOTE: NEXT_PUBLIC_* vars are baked in at BUILD time, not read at
   runtime — set them in apps/web/.env locally and rebuild instead if
   they need to change.
4. In the app's SSH terminal, run:
     npm install --omit=dev
5. Restart the app from the cPanel Node.js App screen.

Re-run scripts/build-cpanel.sh and re-upload every time you deploy a
change.
EOF

echo ""
echo "Done. Output written to $DEPLOY_DIR:"
echo "  $DEPLOY_DIR/api/  ($(du -sh "$DEPLOY_DIR/api" | cut -f1))"
echo "  $DEPLOY_DIR/web/  ($(du -sh "$DEPLOY_DIR/web" | cut -f1))"
echo ""
echo "See README-DEPLOY.txt inside each folder for upload/setup steps."
