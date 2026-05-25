#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BUILD_DIR="build"
SRC_JS="../../src/ecs/ecs_wasm.js"
PUBLIC_WASM="../../public/ecs_wasm.wasm"

echo "=== ECS WASM Builder ==="
echo ""

if command -v emcc &>/dev/null; then
    echo "[INFO] emcc found, building WASM..."

    mkdir -p "$BUILD_DIR"

    emcc \
        -O3 \
        -I../../src/server \
        -std=c++17 \
        --no-entry \
        -s WASM=1 \
        -s USE_PTHREADS=1 \
        -s PTHREAD_POOL_SIZE=4 \
        -s EXPORTED_FUNCTIONS='["_ecs_init","_ecs_createNPCs","_ecs_updateFrame","_ecs_getNPCStateCount","_ecs_getNPCStates","_ecs_getStats","_ecs_destroy","_malloc","_free"]' \
        -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s INITIAL_MEMORY=64MB \
        -s NO_EXIT_RUNTIME=1 \
        -s MODULARIZE=1 \
        -s EXPORT_ES6=1 \
        -s ENVIRONMENT=web,worker \
        -o "$BUILD_DIR/ecs_wasm.js" \
        src/wasm_exports.cpp

    cp "$BUILD_DIR/ecs_wasm.js" "$SRC_JS"
    cp "$BUILD_DIR/ecs_wasm.wasm" "$PUBLIC_WASM"

    echo ""
    echo "[OK] JS  → $SRC_JS"
    echo "[OK] WASM → $PUBLIC_WASM"

else
    echo "[ERROR] emcc not found. Please install Emscripten SDK:"
    echo "  cd tools/emsdk && ./emsdk install latest && ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    echo "  cd ../ecs-wasm && ./build.sh"
    exit 1
fi
