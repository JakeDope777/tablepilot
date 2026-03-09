#!/usr/bin/env bash
set -euo pipefail

# Create a clean local fork/migration copy for TablePilot.
# Usage:
#   ./scripts/fork_to_tablepilot.sh /Users/you/Documents/Playground/tablepilot-ai

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <target-directory>"
  exit 1
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$1"

if [[ -e "$TARGET_DIR" ]]; then
  echo "Target already exists: $TARGET_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
rsync -a \
  --exclude ".git" \
  --exclude "frontend/node_modules" \
  --exclude "frontend/dist" \
  --exclude "backend/__pycache__" \
  --exclude "backend/.pytest_cache" \
  --exclude "test_data" \
  "$SRC_DIR"/ "$TARGET_DIR"/

echo "Fork copy created at: $TARGET_DIR"
echo "Initializing new git repository..."
(
  cd "$TARGET_DIR"
  git init -q
  git add .
  git commit -q -m "chore: initialize TablePilot fork from pilot base" || true
)

cat <<EOF
Done.
Next steps:
1) cd "$TARGET_DIR"
2) git remote add origin <new-tablepilot-repo-url>
3) git push -u origin main
EOF
