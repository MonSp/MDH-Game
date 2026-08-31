cmake_minimum_required(VERSION 3.14)
project(agent-kernel LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -Wall")

# agent-kernel static library
add_library(agent-kernel STATIC
    # Sources will be added as .cpp files are introduced in later tasks.
    # For now, the library is header-only; we add a stub source so CMake
    # doesn't complain about an empty target.
    src/ecs/stub.cpp
)

target_include_directories(agent-kernel PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(agent-kernel PUBLIC pthread)

# Tests
add_executable(kernel_tests tests/test_ecs_core.cpp)
target_include_directories(kernel_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_link_libraries(kernel_tests PRIVATE agent-kernel pthread)
