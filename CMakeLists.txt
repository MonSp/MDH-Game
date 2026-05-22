cmake_minimum_required(VERSION 3.15)
project(NPCGameEngine VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -Wall")

include_directories(
    ${CMAKE_SOURCE_DIR}/src
)

file(GLOB_RECURSE ECS_COMPONENTS
    "src/server/game/ecs/components/*.h"
)

file(GLOB_RECURSE ECS_CORE
    "src/server/game/ecs/*.h"
)

file(GLOB_RECURSE JOB_FILES
    "src/server/game/job/*.h"
)

file(GLOB_RECURSE NPC_FILES
    "src/server/game/npc/*.h"
)

file(GLOB_RECURSE ECS_SYSTEMS
    "src/server/game/ecs/systems/*.h"
)

file(GLOB_RECURSE IPC_FILES
    "src/server/game/ipc/*.h"
)

file(GLOB_RECURSE LLM_FILES
    "src/server/game/llm/*.h"
)

add_executable(game_engine
    src/server/main.cpp
    ${ECS_COMPONENTS}
    ${ECS_CORE}
    ${JOB_FILES}
    ${NPC_FILES}
    ${ECS_SYSTEMS}
    ${IPC_FILES}
    ${LLM_FILES}
)

target_link_libraries(game_engine
    pthread
)

# ============================================================
# 本地 LLM 推理后端 —— llama.cpp
# 启用步骤：
#   1. git clone https://github.com/ggerganov/llama.cpp.git third_party/llama.cpp
#   2. cd third_party/llama.cpp && mkdir build && cd build
#   3. cmake .. -DLLAMA_CURL=OFF && make -j$(nproc)
#   4. 取消下面 4 行的注释
#   5. 在 LocalLLMEngine.h 中取消 #define LLAMA_CPP_BACKEND 的注释
# ============================================================
# set(LLAMA_DIR "${CMAKE_SOURCE_DIR}/third_party/llama.cpp/build" CACHE PATH "llama.cpp build directory")
# target_include_directories(game_engine PRIVATE
#     ${LLAMA_DIR}/../include
#     ${LLAMA_DIR}/../common
#     ${LLAMA_DIR}/../ggml/include
# )
# target_link_libraries(game_engine ${LLAMA_DIR}/libllama.so)
# target_compile_definitions(game_engine PRIVATE LLAMA_CPP_BACKEND)
