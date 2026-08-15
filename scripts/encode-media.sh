#!/bin/bash
# Encode accepted raw clips (media-src/raw/) into production media
# (public/media/) for the Viddescriptor landing page.
#
# Idempotent: re-running always re-encodes every slot from its raw source and
# overwrites the previous output, so the script converges on the same result
# regardless of how many times it's run (as long as media-src/raw/ hasn't
# changed).
#
# Usage: scripts/encode-media.sh   (run from repo root)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW_DIR="$ROOT_DIR/media-src/raw"
OUT_DIR="$ROOT_DIR/public/media"
POSTER_DIR="$OUT_DIR/posters"

if [ ! -d "$RAW_DIR" ]; then
  echo "error: $RAW_DIR not found (media-src/ is local-only, not committed)" >&2
  exit 1
fi

mkdir -p "$OUT_DIR" "$POSTER_DIR"

# --- slot -> raw source file mapping -----------------------------------
# Format: "<slot>:<raw-basename>:<kind>" where kind is "main" (1080, crf23)
# or "wall" (720, crf26). Several slots intentionally share a raw source
# (see docs/media-brief.md clip table): g1/r1 share the same take, m1/g2
# share the same take, and wall1-6 are the same takes as their gallery/
# recipe siblings. Each still gets its own encoded output file per the
# controller ruling ("encode each slot to its own output regardless").
SLOT_MAP="
wall1:wall1.mp4:wall
wall2:wall2.mp4:wall
wall3:wall3.mp4:wall
wall4:wall4.mp4:wall
wall5:wall5.mp4:wall
wall6:wall6.mp4:wall
wall7:wall7.mp4:wall
wall8:wall8.mp4:wall
g1:g1.mp4:main
g2:m1.mp4:main
g3:g3.mp4:main
g4:g4.mp4:main
g5:g5.mp4:main
b1:b1.mp4:main
r1:g1.mp4:main
r2:r2.mp4:main
r3:r3.mp4:main
r4:r4.mp4:main
p1:p1.mp4:main
m1:m1.mp4:main
"

MAIN_CRF=23
MAIN_CRF_RETRY=25
WALL_CRF=26
WALL_CRF_RETRY=28
MAIN_BUDGET_BYTES=$((3500 * 1000))
WALL_BUDGET_BYTES=$((2500 * 1000))

WARNINGS=()

human_size() {
  # $1 = bytes
  awk -v b="$1" 'BEGIN { printf "%.2fMB", b/1000000 }'
}

encode_one() {
  local slot="$1" src_name="$2" kind="$3"
  local src="$RAW_DIR/$src_name"
  local out="$OUT_DIR/${slot}.mp4"
  local poster="$POSTER_DIR/${slot}.jpg"

  if [ ! -f "$src" ]; then
    echo "error: raw source '$src_name' for slot '$slot' not found at $src" >&2
    exit 1
  fi

  local vf crf budget retry_crf
  if [ "$kind" = "wall" ]; then
    vf="scale=-2:720"
    crf=$WALL_CRF
    retry_crf=$WALL_CRF_RETRY
    budget=$WALL_BUDGET_BYTES
  else
    vf="scale=-2:1080"
    crf=$MAIN_CRF
    retry_crf=$MAIN_CRF_RETRY
    budget=$MAIN_BUDGET_BYTES
  fi

  # Controller ruling: b1 gets a ~4% right-edge crop before scaling, to
  # remove a defocused faux-lettering shop sign in the background.
  if [ "$slot" = "b1" ]; then
    vf="crop=iw*0.96:ih:0:0,${vf}"
  fi

  echo "encoding $slot <- $src_name ($kind, crf $crf)..."
  ffmpeg -y -nostdin -loglevel error -i "$src" \
    -vf "$vf" \
    -c:v libx264 -preset slow -crf "$crf" \
    -movflags +faststart -an -pix_fmt yuv420p \
    "$out"

  local size
  size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  if [ "$size" -gt "$budget" ]; then
    echo "  size $(human_size "$size") exceeds budget $(human_size "$budget") — retrying at crf $retry_crf"
    ffmpeg -y -nostdin -loglevel error -i "$src" \
      -vf "$vf" \
      -c:v libx264 -preset slow -crf "$retry_crf" \
      -movflags +faststart -an -pix_fmt yuv420p \
      "$out"
    size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
    if [ "$size" -gt "$budget" ]; then
      WARNINGS+=("$slot: $(human_size "$size") still exceeds $(human_size "$budget") budget after crf $retry_crf retry")
    fi
  fi

  # Poster: frame at 0.5s.
  ffmpeg -y -nostdin -loglevel error -ss 0.5 -i "$src" -frames:v 1 -q:v 4 "$poster"

  echo "  -> $out ($(human_size "$size")), poster -> $poster"
}

while IFS=: read -r slot src_name kind; do
  [ -z "$slot" ] && continue
  encode_one "$slot" "$src_name" "$kind"
done <<< "$SLOT_MAP"

# --- b1-still: extra asset for the ImageToVideo before/after -----------
STILL_SRC="$RAW_DIR/b1-still.jpg"
STILL_OUT="$OUT_DIR/b1-still.jpg"
if [ -f "$STILL_SRC" ]; then
  echo "encoding b1-still.jpg (max width 1920, q4)..."
  ffmpeg -y -nostdin -loglevel error -i "$STILL_SRC" -vf "scale='min(1920,iw)':-2" -q:v 4 "$STILL_OUT"
  echo "  -> $STILL_OUT"
else
  echo "warning: $STILL_SRC not found, skipping b1-still" >&2
fi

# =========================================================================
# --- wave-2 section: wave-2 diversity batch + owner "own character" batch
# =========================================================================
# Local-only source dirs, same as media-src/raw/ above — not committed.
# Each source directory is optional (unlike media-src/raw/): if a dev's
# checkout doesn't have media-src/wave2/ or media-src/owner/ populated, this
# section warns and skips rather than aborting the whole script, since the
# wave-1 slots above are the only ones required to exist.
WAVE2_DIR="$ROOT_DIR/media-src/wave2"
OWNER_DIR="$ROOT_DIR/media-src/owner"

# YAVG (average luma, 0-255) below this is treated as an effectively black
# poster frame — retry the grab at 2s instead of 0.5s.
POSTER_BLACK_YAVG_THRESHOLD=12

# Extracts a poster JPEG at $3 (seconds) from $1 into $2, then checks it
# isn't black; if it is, re-extracts at 2s. Used for every wave-2/owner clip
# (same q4 poster convention as the wave-1 SLOT_MAP loop above).
extract_poster() {
  local src="$1" poster="$2" ts="${3:-0.5}"
  ffmpeg -y -nostdin -loglevel error -ss "$ts" -i "$src" -frames:v 1 -q:v 4 "$poster"
  local yavg
  yavg=$(ffprobe -v error -f lavfi -i "movie=${poster},signalstats" \
    -show_entries frame_tags=lavfi.signalstats.YAVG -of csv=p=0 2>/dev/null || echo "")
  if [ -n "$yavg" ] && awk -v y="$yavg" -v t="$POSTER_BLACK_YAVG_THRESHOLD" 'BEGIN { exit !(y < t) }'; then
    if [ "$ts" = "0.5" ]; then
      echo "  poster at 0.5s looked black (YAVG=$yavg) — retrying at 2s"
      extract_poster "$src" "$poster" 2
    else
      echo "  warning: poster at ${ts}s still looks black (YAVG=$yavg)" >&2
      WARNINGS+=("poster ${poster}: still looks black (YAVG=$yavg) after 2s retry")
    fi
  fi
}

# Encodes one wave-2/owner "feature tile" clip: crf $4 (retry at crf $5 if
# over the $6-byte budget), scale filter $7 (defaults to -2:1080, the
# main-kind convention — pass -2:720 for sources that are natively 720p
# landscape, so they're not upscaled), same libx264/faststart/-an/yuv420p
# conventions as the wave-1 "main" kind above. $2 = out path, $3 = poster.
encode_wave2_clip() {
  local src="$1" out="$2" poster="$3" crf="$4" retry_crf="$5" budget="$6" scale="${7:--2:1080}"

  echo "encoding $(basename "$out") <- $(basename "$src") (crf $crf, scale=$scale)..."
  ffmpeg -y -nostdin -loglevel error -i "$src" \
    -vf "scale=$scale" \
    -c:v libx264 -preset slow -crf "$crf" \
    -movflags +faststart -an -pix_fmt yuv420p \
    "$out"

  local size
  size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  if [ "$size" -gt "$budget" ]; then
    echo "  size $(human_size "$size") exceeds budget $(human_size "$budget") — retrying at crf $retry_crf"
    ffmpeg -y -nostdin -loglevel error -i "$src" \
      -vf "scale=$scale" \
      -c:v libx264 -preset slow -crf "$retry_crf" \
      -movflags +faststart -an -pix_fmt yuv420p \
      "$out"
    size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
    if [ "$size" -gt "$budget" ]; then
      WARNINGS+=("$(basename "$out"): $(human_size "$size") still exceeds $(human_size "$budget") budget after crf $retry_crf retry")
    fi
  fi

  extract_poster "$src" "$poster" 0.5
  echo "  -> $out ($(human_size "$size")), poster -> $poster"
}

if [ -d "$WAVE2_DIR" ]; then
  # Wave-2 diversity batch. Portrait sources (native 1280 height) use the
  # main-kind convention: crf 23, retry 25, ~3.5MB budget, scale=-2:1080.
  # Landscape sources are natively 1280x720 — scaling those to -2:1080
  # upscales by 1.5x for no visual gain (gallery tiles render ~600px wide),
  # so they encode at NATIVE 720p (scale=-2:720) instead, crf 24/retry 26,
  # ~4MB budget.
  WAVE2_LANDSCAPE_CRF=24
  WAVE2_LANDSCAPE_CRF_RETRY=26
  WAVE2_LANDSCAPE_BUDGET_BYTES=$((4000 * 1000))

  WAVE2_MAP="
w2-got:got-trailer.mp4:landscape720
w2-expressions:expressions.mp4:portrait1080
w2-festival:festival.mp4:landscape720
w2-baby:baby.mp4:landscape720
w2-emotional:emotional.mp4:portrait1080
"
  while IFS=: read -r stem src_name kind; do
    [ -z "$stem" ] && continue
    src="$WAVE2_DIR/$src_name"
    if [ ! -f "$src" ]; then
      echo "error: wave-2 source '$src_name' for '$stem' not found at $src" >&2
      exit 1
    fi
    if [ "$kind" = "landscape720" ]; then
      encode_wave2_clip "$src" "$OUT_DIR/${stem}.mp4" "$POSTER_DIR/${stem}.jpg" "$WAVE2_LANDSCAPE_CRF" "$WAVE2_LANDSCAPE_CRF_RETRY" "$WAVE2_LANDSCAPE_BUDGET_BYTES" "-2:720"
    else
      encode_wave2_clip "$src" "$OUT_DIR/${stem}.mp4" "$POSTER_DIR/${stem}.jpg" "$MAIN_CRF" "$MAIN_CRF_RETRY" "$MAIN_BUDGET_BYTES" "-2:1080"
    fi
  done <<< "$WAVE2_MAP"
else
  echo "warning: $WAVE2_DIR not found, skipping wave-2 diversity batch" >&2
fi

if [ -d "$OWNER_DIR" ]; then
  # Owner "own character" batch, char1-6 — portrait 720x1280, 15s sources,
  # so a tighter crf 24 / ~4.5MB budget / crf 26 retry than the default
  # main convention to keep the files reasonable.
  OWN_CRF=24
  OWN_CRF_RETRY=26
  OWN_BUDGET_BYTES=$((4500 * 1000))
  for n in 1 2 3 4 5 6; do
    src="$OWNER_DIR/char${n}.mp4"
    if [ ! -f "$src" ]; then
      echo "error: owner source 'char${n}.mp4' not found at $src" >&2
      exit 1
    fi
    encode_wave2_clip "$src" "$OUT_DIR/own-${n}.mp4" "$POSTER_DIR/own-${n}.jpg" "$OWN_CRF" "$OWN_CRF_RETRY" "$OWN_BUDGET_BYTES"
  done

  # Remaining owner clips — default main convention (crf 23 / 25 retry /
  # ~3.5MB budget), same as the wave-2 diversity batch above.
  OWNER_MAP="
own-alley:own-alley-raw.mp4
ember-city:ember-city-raw.mp4
rain-glass:rain-glass-raw.mp4
showcase-aerial:showcase1.mp4
"
  while IFS=: read -r stem src_name; do
    [ -z "$stem" ] && continue
    src="$OWNER_DIR/$src_name"
    if [ ! -f "$src" ]; then
      echo "error: owner source '$src_name' for '$stem' not found at $src" >&2
      exit 1
    fi
    encode_wave2_clip "$src" "$OUT_DIR/${stem}.mp4" "$POSTER_DIR/${stem}.jpg" "$MAIN_CRF" "$MAIN_CRF_RETRY" "$MAIN_BUDGET_BYTES"
  done <<< "$OWNER_MAP"

  # character-sheet.png -> character-sheet.jpg: a text-bearing card, not a
  # clip — no poster. JPEG q5, capped at 1600px wide.
  SHEET_SRC="$OWNER_DIR/character-sheet.png"
  SHEET_OUT="$OUT_DIR/character-sheet.jpg"
  if [ -f "$SHEET_SRC" ]; then
    echo "encoding character-sheet.jpg (max width 1600, q5)..."
    ffmpeg -y -nostdin -loglevel error -i "$SHEET_SRC" -vf "scale='min(1600,iw)':-2" -q:v 5 "$SHEET_OUT"
    echo "  -> $SHEET_OUT"
  else
    echo "error: $SHEET_SRC not found" >&2
    exit 1
  fi
else
  echo "warning: $OWNER_DIR not found, skipping owner batch" >&2
fi

echo ""
echo "=== encode-media.sh report ==="
total_bytes=0
for f in "$OUT_DIR"/*.mp4; do
  sz=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")
  total_bytes=$((total_bytes + sz))
done
for f in "$POSTER_DIR"/*.jpg "$OUT_DIR"/*.jpg; do
  [ -f "$f" ] || continue
  sz=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")
  total_bytes=$((total_bytes + sz))
done
echo "total public/media/ payload: $(human_size "$total_bytes")"

if [ "${#WARNINGS[@]}" -gt 0 ]; then
  echo ""
  echo "SIZE GATE WARNINGS:"
  for w in "${WARNINGS[@]}"; do
    echo "  - $w"
  done
else
  echo "size gate: all clips within budget"
fi
