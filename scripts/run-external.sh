#!/usr/bin/env bash
# MMX v2 — External Runner
#
# PURPOSE:
#   Run the MMX v2 pipeline from a plain terminal (outside any Claude Code session).
#   The Agent SDK spawns a 'claude' subprocess. Claude Code prevents nested sessions
#   by detecting the CLAUDECODE env var. This script unsets it so the SDK can run.
#
# USAGE:
#   ./scripts/run-external.sh run /path/to/target --level 1
#   ./scripts/run-external.sh preflight /path/to/target
#   ./scripts/run-external.sh dashboard --repo /path/to/target --port 4242
#
# REQUIREMENT:
#   Run from a plain terminal, NOT from inside a Claude Code session.
#   Running from inside Claude Code will still fail — this script is for
#   external invocation only.
#
# ARCHITECTURE NOTE:
#   The production path is: start the dashboard from a plain terminal, then
#   use the dashboard UI to launch runs. The dashboard's POST /api/run spawn
#   automatically strips CLAUDECODE from the child env.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_DIR="$(dirname "$SCRIPT_DIR")"
CLI="$ENGINE_DIR/dist/cli.js"

if [[ ! -f "$CLI" ]]; then
  echo "ERROR: dist/cli.js not found. Run 'npm run build' first." >&2
  exit 1
fi

# Unset CLAUDECODE so Agent SDK can spawn claude subprocess.
# This is subprocess env configuration — not an in-process hack.
unset CLAUDECODE

echo "[MMX External Runner] CLAUDECODE unset. Starting CLI..."
exec node "$CLI" "$@"
