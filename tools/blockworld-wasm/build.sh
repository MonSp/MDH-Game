#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BUILD_DIR="build"
SRC_JS="../../src/blockworld/blockworld_wasm.js"
PUBLIC_WASM="../../public/blockworld_wasm.wasm"

echo "=== BlockWorld WASM Builder ==="
echo ""

if command -v emcc &>/dev/null; then
    echo "[INFO] emcc found, building WASM..."

    mkdir -p "$BUILD_DIR"

    emcc \
        -O3 \
        -I./include \
        -std=c++17 \
        --no-entry \
        -s WASM=1 \
        -s EXPORTED_FUNCTIONS='["_bw_init","_bw_getTerrainHeight","_bw_generateChunkTerrain","_bw_destroy","_bw_chunkSize","_bw_chunkTotal","_malloc","_free"]' \
        -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s INITIAL_MEMORY=64MB \
        -s NO_EXIT_RUNTIME=1 \
        -s MODULARIZE=1 \
        -s EXPORT_ES6=1 \
        -s ENVIRONMENT=web,worker \
        -o "$BUILD_DIR/blockworld_wasm.js" \
        src/wasm_exports.cpp

    cp "$BUILD_DIR/blockworld_wasm.js" "$SRC_JS"
    cp "$BUILD_DIR/blockworld_wasm.wasm" "$PUBLIC_WASM"

    echo ""
    echo "[OK] JS  → $SRC_JS"
    echo "[OK] WASM → $PUBLIC_WASM"

elif command -v g++ &>/dev/null; then
    echo "[INFO] emcc NOT found. Building native test with g++..."
    mkdir -p "$BUILD_DIR" && cd "$BUILD_DIR"
    cmake .. -DCMAKE_BUILD_TYPE=Release
    make -j$(nproc 2>/dev/null || echo 4)
    echo ""
    echo "[OK] Native test built → build/bw_test"
    echo ""
    echo "Run: ./build/bw_test"
    echo ""
    echo "To build WASM, first install emsdk:"
    echo "  cd ../.. && git clone https://github.com/emscripten-core/emsdk.git tools/emsdk"
    echo "  cd tools/emsdk && ./emsdk install latest && ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    echo "  cd ../blockworld-wasm && ./build.sh"

else
    echo "[ERROR] Neither emcc nor g++ found. Cannot build."
    exit 1
fi
