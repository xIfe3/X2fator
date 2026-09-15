#!/usr/bin/env bash
# Builds standalone, workspace-free deploy bundles for shared cPanel
# hosting (Passenger "Setup Node.js App"), where a plain `npm install`
# has to work with no pnpm and no knowledge of the monorepo.
#
# Usage:
#   ./scripts/build-cpanel.sh
#
# Output (written to C:\deploy-x2factor, NOT inside this repo — see
# the path-length note below):
#   deploy-x2factor/api/   — ready to upload, then `npm install --omit=dev` on the server
#   deploy-x2factor/web/   — ready to upload (self-contained, no npm install needed)
#   deploy-x2factor/api.zip
#   deploy-x2factor/web.zip
#
# Prereqs: run from the repo root, with pnpm installed and a working
# `pnpm install` already done at least once (node_modules present).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# A short, drive-root deploy path — not nested under this repo's own
# (long, space-containing) path — because pnpm's .pnpm/<pkg>@<version>
# segments combined with Next's standalone node_modules copy can push
# well past Windows' 260-character path limit otherwise.
DEPLOY_DIR="/c/deploy-x2factor"
DB_PKG="$ROOT/packages/database"
API_PKG="$ROOT/apps/api"
WEB_PKG="$ROOT/apps/web"

echo "== 1/6 Cleaning old deploy output =="
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/api" "$DEPLOY_DIR/web"

echo "== 2/6 Building @2xfactor/database =="
pnpm --filter @2xfactor/database build

echo "== 3/6 Building api =="
pnpm --filter api build

echo "== 4/6 Building web (standalone) =="
pnpm --filter @2xfactor/web build

# ---------------------------------------------------------------------
# api bundle
# ---------------------------------------------------------------------
echo "== 5/6 Assembling api bundle =="

API_OUT="$DEPLOY_DIR/api"
mkdir -p "$API_OUT/dist" "$API_OUT/node_modules/@2xfactor/database/dist"

cp -r "$API_PKG/dist/." "$API_OUT/dist/"

# Vendor the built database package directly into node_modules so a
# plain `npm install` never has to resolve `workspace:*`.
cp -r "$DB_PKG/dist/." "$API_OUT/node_modules/@2xfactor/database/dist/"
node "$ROOT/scripts/flatten-package.js" \
  "$DB_PKG/package.json" \
  "$API_OUT/node_modules/@2xfactor/database/package.json"

# Flattened package.json: same deps as apps/api/package.json, minus the
# workspace:* entry (already vendored above) and devDependencies.
node "$ROOT/scripts/flatten-package.js" \
  "$API_PKG/package.json" \
  "$API_OUT/package.json" \
  "--strip-dep=@2xfactor/database" \
  "--start=node dist/main.js"

cat > "$API_OUT/README-DEPLOY.txt" <<'EOF'
Deploying this folder on cPanel (Setup Node.js App):

1. Upload this whole `api/` folder to the server (SSH: scp/rsync, or
   git push to a repo the server pulls from).
2. In cPanel > Setup Node.js App, create/edit the app:
     - Application root: point at this folder
     - Application startup file: dist/main.js
     - Node version: 20.x (or whatever this project targets)
3. Set every environment variable from your local apps/api/.env in the
   cPanel Node app's "Environment variables" section (DATABASE_URL,
   JWT secrets, FLUTTERWAVE_*, RESEND_API_KEY, etc.) — do NOT upload
   the .env file itself.
4. SSH into the app's virtual env and run:
     npm install --omit=dev
5. Restart the app from the cPanel Node.js App screen.

Re-run scripts/build-cpanel.sh and re-upload every time you deploy a
change — this is not a live copy of the repo.
EOF

# ---------------------------------------------------------------------
# web bundle (Next.js standalone output)
# ---------------------------------------------------------------------
echo "== 6/6 Assembling web bundle =="

WEB_OUT="$DEPLOY_DIR/web"
mkdir -p "$WEB_OUT"

# In a monorepo, Next's standalone output nests the real app under its
# workspace-relative path (standalone/apps/web/{server.js,package.json,
# node_modules,.next}) with the hoisted deps in standalone/node_modules
# at the root. Flatten both into $WEB_OUT directly — copying the whole
# standalone/ tree as-is (preserving that nesting) pushes path lengths
# past Windows' 260-char limit once it's placed under $DEPLOY_DIR.
STANDALONE="$WEB_PKG/.next/standalone"
cp "$STANDALONE/apps/web/server.js" "$WEB_OUT/server.js"
cp "$STANDALONE/apps/web/package.json" "$WEB_OUT/package.json"
if [ -f "$STANDALONE/apps/web/.env" ]; then
  cp "$STANDALONE/apps/web/.env" "$WEB_OUT/.env"
fi

# The server-runtime .next (manifests + compiled server/ output) plus
# the client static/ assets both need to land at $WEB_OUT/.next/.
mkdir -p "$WEB_OUT/.next"
cp -r "$STANDALONE/apps/web/.next/." "$WEB_OUT/.next/"
cp -r "$WEB_PKG/.next/static" "$WEB_OUT/.next/static"

# apps/web/node_modules under standalone/ only holds a symlink back to
# the hoisted root copy — skip it and take the real root node_modules
# directly, which is the only one that matters at runtime.
cp -r "$STANDALONE/node_modules" "$WEB_OUT/node_modules"

if [ -d "$WEB_PKG/public" ]; then
  cp -r "$WEB_PKG/public" "$WEB_OUT/public"
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
   your deployed api/ app's public URL) and PORT (cPanel usually sets
   this for you; don't hardcode it).
4. This bundle already contains its own node_modules (Next.js
   "standalone" output traces and copies only what's needed) — there
   is nothing to `npm install`. Just start the app.
5. Restart the app from the cPanel Node.js App screen.

Re-run scripts/build-cpanel.sh and re-upload every time you deploy a
change — this is not a live copy of the repo.
EOF

echo "== Zipping =="
if command -v zip >/dev/null 2>&1; then
  ( cd "$DEPLOY_DIR/api" && zip -rq ../api.zip . )
  ( cd "$DEPLOY_DIR/web" && zip -rq ../web.zip . )
elif command -v powershell.exe >/dev/null 2>&1; then
  # Git Bash has no `zip` by default — fall back to PowerShell's
  # Compress-Archive, which ships with every modern Windows install.
  powershell.exe -NoProfile -Command \
    "Compress-Archive -Path '$(cygpath -w "$DEPLOY_DIR/api")\\*' -DestinationPath '$(cygpath -w "$DEPLOY_DIR/api.zip")' -Force"
  powershell.exe -NoProfile -Command \
    "Compress-Archive -Path '$(cygpath -w "$DEPLOY_DIR/web")\\*' -DestinationPath '$(cygpath -w "$DEPLOY_DIR/web.zip")' -Force"
else
  echo "  (skipped — no 'zip' or 'powershell.exe' found; upload the" \
       "deploy-x2factor/api and deploy-x2factor/web folders directly instead)"
fi

echo ""
echo "Done. Output written to $DEPLOY_DIR (kept outside the repo so its"
echo "long path doesn't hit Windows path-length limits):"
echo "  $DEPLOY_DIR/api/     ($(du -sh "$DEPLOY_DIR/api" | cut -f1))"
echo "  $DEPLOY_DIR/web/     ($(du -sh "$DEPLOY_DIR/web" | cut -f1))"
[ -f "$DEPLOY_DIR/api.zip" ] && echo "  $DEPLOY_DIR/api.zip  ($(du -sh "$DEPLOY_DIR/api.zip" | cut -f1))"
[ -f "$DEPLOY_DIR/web.zip" ] && echo "  $DEPLOY_DIR/web.zip  ($(du -sh "$DEPLOY_DIR/web.zip" | cut -f1))"
echo ""
echo "See README-DEPLOY.txt inside each folder for upload/setup steps."
