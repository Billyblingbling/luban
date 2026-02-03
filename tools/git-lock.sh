#!/usr/bin/env bash
set -euo pipefail

LOCK_DIR="${LUBAN_GIT_LOCK_DIR:-.context/git-ops.lock}"
OWNER_FILE="${LUBAN_GIT_LOCK_OWNER_FILE:-.context/git-ops.lock.owner}"
WAIT_SECONDS="${LUBAN_GIT_LOCK_WAIT_SECONDS:-300}"
SLEEP_SECONDS="${LUBAN_GIT_LOCK_SLEEP_SECONDS:-0.2}"

usage() {
  cat <<'USAGE'
Usage:
  tools/git-lock.sh -- <command> [args...]

This script provides a simple file-based lock for git operations in a shared worktree.
It uses an atomic `mkdir` to acquire the lock, and releases via `rmdir`.

Environment variables:
  LUBAN_GIT_LOCK_DIR            Lock directory path (default: .context/git-ops.lock)
  LUBAN_GIT_LOCK_OWNER_FILE     Owner info path (default: .context/git-ops.lock.owner)
  LUBAN_GIT_LOCK_WAIT_SECONDS   Timeout in seconds (default: 300)
  LUBAN_GIT_LOCK_SLEEP_SECONDS  Sleep between retries (default: 0.2)
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -eq 0 ]]; then
  usage >&2
  exit 2
fi

mkdir -p "$(dirname "$LOCK_DIR")"

acquired=0
start_epoch="$(date +%s)"

while true; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    acquired=1
    break
  fi

  now_epoch="$(date +%s)"
  if (( now_epoch - start_epoch >= WAIT_SECONDS )); then
    echo "git lock timeout after ${WAIT_SECONDS}s: ${LOCK_DIR}" >&2
    if [[ -f "$OWNER_FILE" ]]; then
      echo "lock owner:" >&2
      cat "$OWNER_FILE" >&2 || true
    fi
    exit 1
  fi

  sleep "$SLEEP_SECONDS"
done

release_lock() {
  if (( acquired == 1 )); then
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
}

trap release_lock EXIT INT TERM

{
  printf 'pid=%s\n' "$$"
  printf 'host=%s\n' "$(hostname 2>/dev/null || echo unknown)"
  printf 'cwd=%s\n' "$(pwd)"
  printf 'started_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date)"
  printf 'command='
  printf '%q ' "$@"
  printf '\n'
} >"$OWNER_FILE" || true

"$@"
