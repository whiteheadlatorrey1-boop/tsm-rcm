#!/usr/bin/env bash
# upload-music-demo.sh
# Uploads html/demo/music-demo.mp4 to the tsm-demos R2 bucket
# (served at https://demos.tsmatter.com) via wrangler.
#
# Usage (from repo root, e.g. /workspaces/tsm-rcm):
#   export CLOUDFLARE_API_TOKEN=<your R2-scoped token>
#   ./upload-music-demo.sh
#
# Treat CLOUDFLARE_API_TOKEN as single-session — unset/revoke it right
# after this script finishes, per usual practice.

set -euo pipefail

BUCKET="tsm-demos"
KEY="music-demo.mp4"
LOCAL_FILE="html/demo/music-demo.mp4"
CDN_URL="https://demos.tsmatter.com/${KEY}"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set." >&2
  echo "  export CLOUDFLARE_API_TOKEN=<your R2-scoped token>" >&2
  exit 1
fi

if [ ! -f "$LOCAL_FILE" ]; then
  echo "ERROR: $LOCAL_FILE not found. Run this from the repo root (e.g. /workspaces/tsm-rcm)." >&2
  exit 1
fi

echo "Uploading $LOCAL_FILE -> r2://${BUCKET}/${KEY} ..."
npx wrangler r2 object put "${BUCKET}/${KEY}" \
  --file "$LOCAL_FILE" \
  --content-type video/mp4 \
  --remote

echo "Verifying $CDN_URL ..."
STATUS=""
for attempt in 1 2 3 4 5; do
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$CDN_URL")"
  if [ "$STATUS" = "200" ]; then
    break
  fi
  echo "  attempt $attempt: got $STATUS, retrying in 3s..."
  sleep 3
done

if [ "$STATUS" = "200" ]; then
  echo "OK — $CDN_URL is live (200)."
else
  echo "WARNING: $CDN_URL returned $STATUS after 5 attempts. Check the R2 dashboard / custom domain binding." >&2
  exit 1
fi

echo ""
echo "Done. Remember to revoke/unset CLOUDFLARE_API_TOKEN now:"
echo "  unset CLOUDFLARE_API_TOKEN"