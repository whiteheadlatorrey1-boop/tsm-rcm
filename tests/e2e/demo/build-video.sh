#!/usr/bin/env bash
# build-video.sh <vertical> [seconds-per-slide]
# Example: ./build-video.sh healthcare 3
set -euo pipefail

VERTICAL="${1:?Usage: build-video.sh <vertical> [seconds-per-slide]}"
SECONDS_PER_SLIDE="${2:-3}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/screenshots/${VERTICAL}"
OUT_MP4="${DIR}/../${VERTICAL}-demo.mp4"
OUT_GIF="${DIR}/../${VERTICAL}-demo.gif"

if [ ! -d "$DIR" ]; then
  echo "No screenshots found at $DIR — run the Playwright spec for this vertical first." >&2
  exit 1
fi

# Rename to a strictly sequential frame-%03d.png set (screenshots are already
# numbered 001-, 002-, ... but ffmpeg's glob needs a contiguous pattern).
TMP="$(mktemp -d)"
i=1
for f in "$DIR"/*.png; do
  printf -v idx "%03d" "$i"
  cp "$f" "$TMP/frame-${idx}.png"
  i=$((i + 1))
done

FPS="$(python3 -c "print(1/${SECONDS_PER_SLIDE})")"

ffmpeg -y -framerate "$FPS" -i "$TMP/frame-%03d.png" \
  -vf "scale=1920:-2:flags=lanczos,format=yuv420p" \
  -c:v libx264 -r 30 -pix_fmt yuv420p "$OUT_MP4"

ffmpeg -y -framerate "$FPS" -i "$TMP/frame-%03d.png" \
  -vf "scale=960:-2:flags=lanczos" \
  "$OUT_GIF"

rm -rf "$TMP"
echo "Wrote:"
echo "  $OUT_MP4"
echo "  $OUT_GIF"
