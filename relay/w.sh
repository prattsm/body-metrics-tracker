#!/usr/bin/env bash
set -euo pipefail
CFG="relay/wrangler.local.toml"
if [[ ! -f "$CFG" ]]; then
  echo "Missing $CFG. Copy relay/wrangler.toml -> $CFG and set your database_id." >&2
  exit 1
fi
exec npx wrangler --config "$CFG" "$@"
