#!/usr/bin/env bash
# Single-source-of-truth deploy: .env is the ONE place that drives both the
# page copy (VITE_* vars, baked into the client bundle by `vite build`) and
# the Worker's mint values (forwarded here as `wrangler deploy --var`).
# wrangler.jsonc's `vars` block only supplies the fallback defaults used when
# the corresponding VITE_* var is unset in .env.
#
# Usage: scripts/deploy.sh <dev|prod> [siteUrl]
#   dev   -> scripts/cf-profile.sh use dev  && wrangler deploy
#   prod  -> scripts/cf-profile.sh use prod && wrangler deploy --env production
#
# The optional second arg overrides the built site URL for this run; without
# it, prod reads VITE_SITE_URL_PROD from .env (falling back to
# https://viddescriptor.com), and dev reads VITE_SITE_URL from .env (falling
# back to the default baked into src/config.ts).
#
# PARTNER_API_KEY (and any other secret) is NEVER read from .env here and
# NEVER forwarded as a --var — secrets stay on `wrangler secret put`.
set -euo pipefail

TARGET="${1:-}"
if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "usage: $0 <dev|prod> [siteUrl]" >&2
  exit 1
fi
SITE_URL_ARG="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Loads KEY=VALUE (optionally `export KEY=VALUE`) lines from a dotenv file
# into the current shell's environment. Comment (#) and blank lines are
# skipped; values may be single- or double-quoted (quotes are stripped).
load_env() {
  local file="$1"
  [ -f "$file" ] || return 0
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*export[[:space:]]+([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
    elif [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
    else
      continue
    fi
    if [[ "$val" =~ ^\"(.*)\"$ ]]; then
      val="${BASH_REMATCH[1]}"
    elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
      val="${BASH_REMATCH[1]}"
    fi
    export "$key=$val"
  done < "$file"
}

load_env "$ENV_FILE"

if [[ "$TARGET" == "dev" ]]; then
  PROFILE="dev"
  WRANGLER_ENV_ARGS=()
  DEFAULT_SITE_URL="https://viddescriptor.kno2gether.com"
  BUILD_SITE_URL="${SITE_URL_ARG:-${VITE_SITE_URL:-$DEFAULT_SITE_URL}}"
else
  PROFILE="prod"
  WRANGLER_ENV_ARGS=(--env production)
  DEFAULT_SITE_URL="https://viddescriptor.com"
  BUILD_SITE_URL="${SITE_URL_ARG:-${VITE_SITE_URL_PROD:-$DEFAULT_SITE_URL}}"
fi

"$SCRIPT_DIR/cf-profile.sh" use "$PROFILE"

VITE_SITE_URL="$BUILD_SITE_URL" npx vite build

VAR_ARGS=()
add_var() {
  local worker_name="$1"
  local value="$2"
  if [[ -n "$value" ]]; then
    VAR_ARGS+=(--var "${worker_name}:${value}")
  fi
}

# Only forward when the .env source var is set — otherwise wrangler.jsonc's
# `vars` block supplies the default, unchanged.
add_var "UPSELL_AMOUNT_CENTS" "${VITE_UPSELL_AMOUNT_CENTS:-}"
add_var "UPSELL_CURRENCY" "${VITE_UPSELL_CURRENCY:-}"
add_var "UPSELL_CREDITS" "${VITE_UPSELL_CREDITS:-}"
add_var "FREE_CREDITS" "${VITE_FREE_CREDITS:-}"
add_var "ONBOARD_FEATURES_JSON" "${VITE_ONBOARD_FEATURES_JSON:-}"
# SITE_URL always forwarded — it's the exact value this build was just
# compiled against (either from .env or the default above), so the Worker's
# payment-link redirect target always matches what shipped in the bundle.
add_var "SITE_URL" "$BUILD_SITE_URL"

echo "deploy: target=$TARGET profile=$PROFILE site=$BUILD_SITE_URL vars_forwarded=${#VAR_ARGS[@]}"

# `${ARR[@]+"${ARR[@]}"}` (rather than plain `"${ARR[@]}"`) is needed because
# macOS ships bash 3.2, which treats expanding an empty array under `set -u`
# as an unbound-variable error (fixed upstream only in bash 4.4+).
npx wrangler deploy \
  ${WRANGLER_ENV_ARGS[@]+"${WRANGLER_ENV_ARGS[@]}"} \
  ${VAR_ARGS[@]+"${VAR_ARGS[@]}"}

"$SCRIPT_DIR/cf-profile.sh" save "$PROFILE"
