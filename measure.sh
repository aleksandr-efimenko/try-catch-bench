#!/bin/bash
# Times a hot loop plain, inside a try that never throws, and throwing on every pass,
# in Node 24 and Python 3.14 (plus 3.10, before zero-cost exceptions). Writes data/trycatch.json.
# usage: bash measure.sh            (full run, about a minute on an M1 Pro)
#        SMOKE=1 bash measure.sh    (tiny sizes, under 3 s; writes data/trycatch.smoke.json)
set -euo pipefail
cd "$(dirname "$0")"

NODE_BIN="$HOME/.nvm/versions/node/v24.21.0/bin/node"
[ -x "$NODE_BIN" ] || { echo "missing $NODE_BIN" >&2; exit 1; }
export PATH="$(dirname "$NODE_BIN"):$PATH"

if [ "${SMOKE:-0}" = 1 ]; then
  export LOOP_N=200000 THROW_N=5000 ROUNDS=3 WARMUP=1
  out=data/trycatch.smoke.json
else
  export LOOP_N=10000000 THROW_N=1000000 ROUNDS=9 WARMUP=2
  out=data/trycatch.json
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p data

"$NODE_BIN" bench/run.mjs > "$tmp/node.json"
(cd bench && uv run --no-project --python 3.14 python run.py) > "$tmp/py314.json"
(cd bench && uv run --no-project --python 3.10 python run.py) > "$tmp/py310.json"

uv run --no-project --python 3.14 python bench/merge.py "$tmp/node.json" "$tmp/py314.json" "$tmp/py310.json" \
  ${SMOKE:+--smoke=$SMOKE} > "$out.tmp"
mv "$out.tmp" "$out"
echo "wrote $out"
