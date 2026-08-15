#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== worker pytest =="
(cd worker && uv run pytest -q)

echo "== web node tests =="
(
  cd web
  node --experimental-strip-types --test src/lib/*.test.ts
)

echo "== web tsc =="
(cd web && npx tsc --noEmit)

echo "== docs-lint =="
python3 "$ROOT/scripts/docs-lint.py"

python3 "$ROOT/.cursor/hooks/stop-review.py" --stamp

echo "verify: ok"
