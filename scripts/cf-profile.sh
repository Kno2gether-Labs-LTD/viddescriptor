#!/usr/bin/env bash
# Switch between saved Cloudflare (wrangler) OAuth profiles.
#   scripts/cf-profile.sh use <name>    # activate ~/.wrangler-profiles/<name>.toml
#   scripts/cf-profile.sh save <name>   # store the current active token back (keeps refreshed tokens)
#   scripts/cf-profile.sh login <name>  # wrangler login, then save as <name>
#   scripts/cf-profile.sh list
# Why: wrangler keeps ONE active login (~/.wrangler/config/default.toml). Deploying the same
# Worker to two Cloudflare accounts (dev zone vs production zone) needs two logins.
set -euo pipefail
STORE="${WRANGLER_PROFILE_STORE:-$HOME/.wrangler-profiles}"
ACTIVE="$HOME/.wrangler/config/default.toml"
mkdir -p "$STORE" "$(dirname "$ACTIVE")"
case "${1:-}" in
  use)   [ -f "$STORE/$2.toml" ] || { echo "no profile '$2' — run: $0 login $2" >&2; exit 1; }
         cp "$STORE/$2.toml" "$ACTIVE"
         # wrangler caches the last-used account id per project; a stale one makes it deploy
         # to the previous account. Clear it so the account is resolved from the active token.
         rm -f node_modules/.cache/wrangler/wrangler-account.json
         echo "cf profile: $2" ;;
  save)  cp "$ACTIVE" "$STORE/$2.toml"; echo "saved profile: $2" ;;
  login) npx wrangler login && cp "$ACTIVE" "$STORE/$2.toml" && echo "saved profile: $2" ;;
  list)  ls "$STORE" | sed 's/\.toml$//' ;;
  *)     sed -n '2,7p' "$0"; exit 1 ;;
esac
