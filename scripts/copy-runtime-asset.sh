#!/usr/bin/env bash
set -euo pipefail

src_path="${1:?Usage: copy-runtime-asset.sh <path>}"
dest_path="dist${src_path#src}"
mkdir -p "$(dirname "$dest_path")"
cp "$src_path" "$dest_path"
