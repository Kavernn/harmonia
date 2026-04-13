#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="Harmonia"
BINARY_NAME="app"
BUNDLE_ID="com.vincentpinard.harmonia"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROCESS_MATCH="/${APP_NAME}.app/Contents/MacOS/${BINARY_NAME}"

pkill -f "$PROCESS_MATCH" >/dev/null 2>&1 || true

build_release() {
  (cd "$ROOT_DIR" && cargo tauri build --bundles app)
}

build_debug() {
  (cd "$ROOT_DIR" && cargo tauri build --debug --bundles app)
}

find_bundle() {
  local profile="$1"
  local candidates=(
    "$ROOT_DIR/target/$profile/bundle/macos/$APP_NAME.app"
    "$ROOT_DIR/src-tauri/target/$profile/bundle/macos/$APP_NAME.app"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  echo "unable to locate $APP_NAME.app for profile '$profile'" >&2
  return 1
}

open_app() {
  local bundle="$1"
  /usr/bin/open -n "$bundle"
}

case "$MODE" in
  run)
    build_release
    APP_BUNDLE="$(find_bundle release)"
    open_app "$APP_BUNDLE"
    ;;
  --debug|debug)
    build_debug
    APP_BUNDLE="$(find_bundle debug)"
    lldb -- "$APP_BUNDLE/Contents/MacOS/$BINARY_NAME"
    ;;
  --logs|logs)
    build_release
    APP_BUNDLE="$(find_bundle release)"
    open_app "$APP_BUNDLE"
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --telemetry|telemetry)
    build_release
    APP_BUNDLE="$(find_bundle release)"
    open_app "$APP_BUNDLE"
    /usr/bin/log stream --info --style compact --predicate "subsystem == \"$BUNDLE_ID\""
    ;;
  --verify|verify)
    build_release
    APP_BUNDLE="$(find_bundle release)"
    open_app "$APP_BUNDLE"
    sleep 2
    pgrep -f "$PROCESS_MATCH" >/dev/null
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
