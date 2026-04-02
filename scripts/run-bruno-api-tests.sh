#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
COLLECTION_DIR="$ROOT_DIR/tests/bruno/brainiac-api"
ENV_NAME="Local"
REPORT_DIR="$ROOT_DIR/tests/bruno/reports"
CI_MODE=false

if [[ "${1:-}" == "--ci" ]]; then
  CI_MODE=true
fi

if [[ ! -d "$COLLECTION_DIR" ]]; then
  echo "Bruno collection not found at: $COLLECTION_DIR" >&2
  exit 1
fi

echo "[bruno] Ensuring dependencies are installed..."
bun install --frozen-lockfile

echo "[bruno] Seeding database..."
bun run db:seed

if ! curl -fsS "http://localhost:3000/" >/dev/null 2>&1; then
  echo "[bruno] Starting API server on http://localhost:3000 ..."
  bun run dev:server >/tmp/brainiac-bruno-server.log 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

  ATTEMPTS=0
  until curl -fsS "http://localhost:3000/" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [[ "$ATTEMPTS" -ge 60 ]]; then
      echo "[bruno] API server did not become ready in time." >&2
      exit 1
    fi
    sleep 1
  done
else
  echo "[bruno] API server is already running."
fi

if [[ "$CI_MODE" == true ]]; then
  mkdir -p "$REPORT_DIR"
  echo "[bruno] Running collection with JUnit report..."
  bunx --yes @usebruno/cli run "$COLLECTION_DIR" -r --env "$ENV_NAME" --tests-only --reporter-junit "$REPORT_DIR/junit.xml"
  echo "[bruno] Report written to $REPORT_DIR/junit.xml"
else
  echo "[bruno] Running collection..."
  bunx --yes @usebruno/cli run "$COLLECTION_DIR" -r --env "$ENV_NAME" --tests-only
fi

echo "[bruno] Completed successfully."
