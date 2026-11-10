#!/bin/bash
set -e

# Compliance Hub - Build Deployment Package
# Creates the IP Fabric extension ZIP and optionally a Docker image for deployment

# Configuration
OUTPUT_DIR="./dist"
BASE_NAME="compliance-hub-extension"
IMAGE_NAME="compliance-hub"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
BUILD_IMAGE=false
if [ "$1" = "--with-image" ]; then
    BUILD_IMAGE=true
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Compliance Hub - Deployment Package Builder           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Create ZIP package
echo -e "${GREEN}[1/2]${NC} Creating ZIP package..."
ZIP_FILE="$OUTPUT_DIR/${BASE_NAME}.zip"

# Remove any previous build so the archive is clean (not merged into an old one)
rm -f "$ZIP_FILE"

# For Next.js/Node projects, we exclude node_modules, .next, etc.
# NOTE: the leading '*' in each pattern is load-bearing — it matches the
# top-level directory (e.g. node_modules/...) as well as any nested copy.
# A pattern like '*/node_modules/*' only matches nested copies and lets the
# top-level node_modules into the archive.
zip -r "$ZIP_FILE" . \
    -x '*.git*' \
    -x '*node_modules/*' \
    -x '*.next/*' \
    -x '*dist/*' \
    -x '*.DS_Store' \
    -x '*.env*' \
    -x '*.zip' \
    -x '*.tar.gz' \
    -x '*.tar' \
    > /dev/null 2>&1

ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo -e "${GREEN}   ✓${NC} ZIP created: ${ZIP_FILE} (${ZIP_SIZE})"

# Safety check: make sure none of the heavy/secret paths slipped in
if unzip -l "$ZIP_FILE" | grep -qiE 'node_modules/|\.next/|(^|/)\.env'; then
    echo -e "${YELLOW}   ⚠ WARNING:${NC} archive contains node_modules/.next/.env — check exclude patterns."
fi

# Build and save Docker image if requested
if [ "$BUILD_IMAGE" = true ]; then
    echo ""
    echo -e "${GREEN}[2/2]${NC} Building Docker image..."

    # We use the existing Dockerfile in the root
    docker build -t "${IMAGE_NAME}:latest" . > /dev/null 2>&1
    echo -e "${GREEN}   ✓${NC} Docker image built: ${IMAGE_NAME}:latest"

    echo -e "${GREEN}[2/2]${NC} Saving Docker image..."
    IMAGE_FILE="$OUTPUT_DIR/${BASE_NAME}-image.tar"
    docker save -o "$IMAGE_FILE" "${IMAGE_NAME}:latest"

    # Compress the image
    echo -e "${GREEN}   ⏳${NC} Compressing image..."
    gzip -f "$IMAGE_FILE"
    IMAGE_FILE="${IMAGE_FILE}.gz"

    IMAGE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
    echo -e "${GREEN}   ✓${NC} Docker image saved: ${IMAGE_FILE} (${IMAGE_SIZE})"
else
    echo -e "${YELLOW}[2/2]${NC} Skipping Docker image build (use --with-image to include)"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Package Summary                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📦 ZIP Package:  ${ZIP_FILE}"
echo -e "     Size:         ${ZIP_SIZE}"

if [ "$BUILD_IMAGE" = true ]; then
    echo ""
    echo -e "  🐳 Docker Image: ${IMAGE_FILE}"
    echo -e "     Size:         ${IMAGE_SIZE}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Instructions                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}IP Fabric extension (Docker Zip):${NC}"
echo "  Upload ${ZIP_FILE} in IP Fabric: Settings > Extensions > Add,"
echo "  choose type 'Docker Zip', and set the slug to 'fabric-pulse'"
echo "  (must match assetPrefix '/extensions-apps/fabric-pulse' in next.config.js)."
echo ""

if [ "$BUILD_IMAGE" = true ]; then
    echo -e "${GREEN}Standalone VM (pre-built Docker image):${NC}"
    echo ""
    echo "1. Upload the Docker image to your VM:"
    echo "   scp ${IMAGE_FILE} user@your-vm:/tmp/"
    echo ""
    echo "2. On the VM, load the image:"
    echo "   docker load -i /tmp/$(basename ${IMAGE_FILE})"
    echo ""
    echo "3. Run the container:"
    echo "   docker run -d --name ${IMAGE_NAME} --restart unless-stopped \\"
    echo "     -p 80:80 \\"
    echo "     ${IMAGE_NAME}:latest"
    echo ""
fi

echo -e "${GREEN}Standalone VM (build from source ZIP):${NC}"
echo ""
echo "1. Upload the ZIP to your VM:"
echo "   scp ${ZIP_FILE} user@your-vm:/opt/${IMAGE_NAME}/"
echo ""
echo "2. On the VM, extract and build:"
echo "   cd /opt/${IMAGE_NAME}"
echo "   unzip $(basename ${ZIP_FILE})"
echo "   docker build -t ${IMAGE_NAME}:latest ."
echo ""
echo "3. Run the container:"
echo "   docker run -d --name ${IMAGE_NAME} --restart unless-stopped \\"
echo "     -p 80:80 \\"
echo "     ${IMAGE_NAME}:latest"
echo ""
echo -e "${YELLOW}Note:${NC} For IP Fabric extension deployment, auth is handled via cookie - no .env needed."
