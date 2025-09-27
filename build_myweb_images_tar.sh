#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: build_myweb_images_tar.sh [options]

Build the MyWeb runtime image and export every required image into a single tarball
for offline usage.

Options:
  -t, --tag TAG              Tag for the MyWeb image (default: myweb:latest)
  -o, --output FILE          Target path for the exported archive (default: ./dist/myweb-images-<timestamp>.tar)
      --build-arg KEY=VALUE  Forward additional --build-arg values (repeatable)
      --no-compress          Do not gzip the resulting tar archive
  -h, --help                 Show this help message and exit

Environment overrides:
  IMAGE_TAG          Same as --tag
  OUTPUT_DIR         Default directory for generated artifacts (default: ./dist)
  COMPRESS_TAR       When set to 0, behaves like --no-compress
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

IMAGE_TAG=${IMAGE_TAG:-myweb:latest}
COMPRESS=${COMPRESS_TAR:-1}
OUTPUT_DIR=${OUTPUT_DIR:-"$SCRIPT_DIR/dist"}
OUTPUT_TAR=""
BUILD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag)
      [[ $# -lt 2 ]] && { echo "Error: --tag requires a value" >&2; exit 1; }
      IMAGE_TAG="$2"
      shift 2
      ;;
    -o|--output)
      [[ $# -lt 2 ]] && { echo "Error: --output requires a value" >&2; exit 1; }
      OUTPUT_TAR="$2"
      shift 2
      ;;
    --no-compress)
      COMPRESS=0
      shift
      ;;
    --build-arg)
      [[ $# -lt 2 ]] && { echo "Error: --build-arg requires a value" >&2; exit 1; }
      BUILD_ARGS+=("--build-arg" "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker CLI is required" >&2
  exit 1
fi

export DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}

TIMESTAMP=$(date -u +"%Y%m%d-%H%M%SZ")
mkdir -p "$OUTPUT_DIR"

if [[ -z "$OUTPUT_TAR" ]]; then
  OUTPUT_TAR="$OUTPUT_DIR/myweb-images-${TIMESTAMP}.tar"
fi

mkdir -p "$(dirname "$OUTPUT_TAR")"

echo "[1/3] Building image $IMAGE_TAG"
docker build "${BUILD_ARGS[@]}" --file Dockerfile --tag "$IMAGE_TAG" "$SCRIPT_DIR"

IMAGES_TO_SAVE=("$IMAGE_TAG")

printf '[2/3] Exporting image bundle to %s\n' "$OUTPUT_TAR"
docker save "${IMAGES_TO_SAVE[@]}" -o "$OUTPUT_TAR"

FINAL_OUTPUT="$OUTPUT_TAR"
if [[ "$COMPRESS" -eq 1 ]]; then
  if command -v pigz >/dev/null 2>&1; then
  echo "[2b] Compressing archive with pigz"
    pigz -f "$OUTPUT_TAR"
  else
  echo "[2b] Compressing archive with gzip"
    gzip -f "$OUTPUT_TAR"
  fi
  FINAL_OUTPUT="${OUTPUT_TAR}.gz"
fi

MANIFEST_PATH="${FINAL_OUTPUT}.manifest"
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
{
  echo "# MyWeb image bundle manifest"
  echo "Created at: ${CURRENT_TIME}"
  echo "Archive: $(basename "$FINAL_OUTPUT")"
  echo
  echo "Included images:"
  for image in "${IMAGES_TO_SAVE[@]}"; do
    digest=$(docker image inspect "$image" --format '{{.Id}}')
    size_bytes=$(docker image inspect "$image" --format '{{.Size}}')
    if command -v numfmt >/dev/null 2>&1; then
      size_human=$(numfmt --to=iec-i "$size_bytes")
    else
      size_human="${size_bytes} bytes"
    fi
    echo "- ${image}"
    echo "  digest: ${digest}"
    echo "  size: ${size_human}"
  done
  echo
  echo "Usage instructions:"
    echo "  docker load -i $(basename "$FINAL_OUTPUT")"
    echo "  docker compose up -d"
} > "$MANIFEST_PATH"

echo "[3/3] Bundle ready"
echo "  Archive : $FINAL_OUTPUT"
echo "  Manifest: $MANIFEST_PATH"

echo
echo "Next steps (offline host):"
echo "  1. Transfer the archive and manifest to the target host."
echo "  2. docker load -i $(basename "$FINAL_OUTPUT")"
echo "  3. docker compose up -d"
