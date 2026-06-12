#!/usr/bin/env bash
# Configure CORS on Railway/Tigris S3-compatible bucket.
#
# Usage:
#   ./scripts/configure-bucket-cors.sh
#
# Required env vars:
#   BUCKET_CORS_ORIGINS   comma-separated list of allowed origins
#                         e.g. "https://example.com,https://admin.example.com"
#
# Optional:
#   BUCKET_CORS_METHODS   default: GET,PUT,POST,DELETE,HEAD
#   BUCKET_CORS_MAX_AGE   default: 3600
#
# These are read from the server app's .env (S3_ENDPOINT, S3_REGION, etc.):
#   S3_ENDPOINT       → BUCKET_ENDPOINT
#   S3_BUCKET         → BUCKET_NAME
#   S3_REGION         → BUCKET_REGION
#   S3_ACCESS_KEY_ID  → BUCKET_ACCESS_KEY_ID
#   S3_SECRET_ACCESS_KEY → BUCKET_SECRET_ACCESS_KEY

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../apps/server/.env}"
if [[ -f "$ENV_FILE" ]]; then
  echo "→ loading $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Map server-app S3_* vars to script-level BUCKET_* vars
: "${S3_ENDPOINT:?S3_ENDPOINT required (set in apps/server/.env)}"
: "${S3_BUCKET:?S3_BUCKET required (set in apps/server/.env)}"
: "${S3_REGION:=auto}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID required (set in apps/server/.env)}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY required (set in apps/server/.env)}"

BUCKET_ENDPOINT="$S3_ENDPOINT"
BUCKET_NAME="$S3_BUCKET"
BUCKET_REGION="$S3_REGION"
BUCKET_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
BUCKET_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"

: "${BUCKET_CORS_ORIGINS:?BUCKET_CORS_ORIGINS required (comma-separated)}"
: "${BUCKET_CORS_METHODS:=GET,PUT,POST,DELETE,HEAD}"
: "${BUCKET_CORS_MAX_AGE:=3600}"

if ! command -v aws >/dev/null 2>&1; then
  echo "✗ aws CLI not found. Install: https://aws.amazon.com/cli/" >&2
  exit 1
fi

to_json_array() {
  local IFS=','
  local items=()
  for item in $1; do
    item="${item#"${item%%[![:space:]]*}"}"
    item="${item%"${item##*[![:space:]]}"}"
    items+=("\"$item\"")
  done
  local IFS=','
  echo "[${items[*]}]"
}

ORIGINS_JSON=$(to_json_array "$BUCKET_CORS_ORIGINS")
METHODS_JSON=$(to_json_array "$BUCKET_CORS_METHODS")

CORS_FILE=$(mktemp -t cors-XXXXXX.json)
trap 'rm -f "$CORS_FILE"' EXIT

cat >"$CORS_FILE" <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": $ORIGINS_JSON,
      "AllowedMethods": $METHODS_JSON,
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": $BUCKET_CORS_MAX_AGE
    }
  ]
}
EOF

echo "→ bucket:   $BUCKET_NAME"
echo "→ endpoint: $BUCKET_ENDPOINT"
echo "→ region:   $BUCKET_REGION"
echo "→ origins:  $ORIGINS_JSON"
echo "→ methods:  $METHODS_JSON"

export AWS_ACCESS_KEY_ID="$BUCKET_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BUCKET_SECRET_ACCESS_KEY"

echo "→ applying CORS..."
aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration "file://$CORS_FILE" \
  --endpoint-url "$BUCKET_ENDPOINT" \
  --region "$BUCKET_REGION"

echo "→ verifying..."
aws s3api get-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --endpoint-url "$BUCKET_ENDPOINT" \
  --region "$BUCKET_REGION"

echo "✓ CORS applied to $BUCKET_NAME"
