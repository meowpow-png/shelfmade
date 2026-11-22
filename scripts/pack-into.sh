#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "${1:?Usage: pack-into.sh <project>}" && pwd)"
pack_dir="$(mktemp -d)"
trap 'rm -rf "$pack_dir"' EXIT

cd "$(dirname "${BASH_SOURCE[0]}")/.."
npm pack --pack-destination "$pack_dir"

cd "$project_dir"
npm install --no-save "$pack_dir"/shelfmade-*.tgz
rm -rf node_modules/.vite
