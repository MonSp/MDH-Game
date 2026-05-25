cmake_minimum_required(VERSION 3.15)
project(blockworld_wasm VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -Wall -ffast-math")

include_directories(${CMAKE_SOURCE_DIR}/include)

if(EMSCRIPTEN)
    message(STATUS "Building for WASM via Emscripten")

    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s WASM=1 -s EXPORTED_FUNCTIONS='[\"_bw_init\",\"_bw_getTerrainHeight\",\"_bw_generateChunkTerrain\",\"_bw_destroy\",\"_bw_chunkSize\",\"_bw_chunkTotal\"]' -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\",\"getValue\",\"setValue\"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s NO_EXIT_RUNTIME=1")

    add_executable(blockworld_wasm src/wasm_exports.cpp)
    target_link_libraries(blockworld_wasm "--pre-js ${CMAKE_SOURCE_DIR}/js/wasm_pre.js")
    set_target_properties(blockworld_wasm PROPERTIES SUFFIX ".js")

    add_custom_command(TARGET blockworld_wasm POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
        ${CMAKE_BINARY_DIR}/blockworld_wasm.wasm
        ${CMAKE_SOURCE_DIR}/../../public/blockworld_wasm.wasm
        COMMAND ${CMAKE_COMMAND} -E copy
        ${CMAKE_BINARY_DIR}/blockworld_wasm.js
        ${CMAKE_SOURCE_DIR}/../../public/blockworld_wasm.js
        COMMENT "Copying WASM files to public/"
    )

else()
    message(STATUS "Building native test executable")

    add_executable(bw_test
        src/main_test.cpp
        src/wasm_exports.cpp
    )

    add_custom_target(run_test
        COMMAND bw_test
        DEPENDS bw_test
        COMMENT "Running terrain generator test"
    )
endif()
