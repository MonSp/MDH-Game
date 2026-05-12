cmake_minimum_required(VERSION 3.15)
project(orx_baker VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -Wall -ffast-math")

set(BAKER_TARGET "orx-baker")

include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/../orx/include
)

set(SOURCES
    src/main.cpp
)

add_executable(${BAKER_TARGET} ${SOURCES})

if(DEFINED ENV{ORX_LIB_DIR})
    target_include_directories(${BAKER_TARGET} PRIVATE $ENV{ORX_LIB_DIR}/include)
    target_link_directories(${BAKER_TARGET} PRIVATE $ENV{ORX_LIB_DIR}/lib)
    target_link_libraries(${BAKER_TARGET} orx)
    target_compile_definitions(${BAKER_TARGET} PRIVATE __orxHEADLESS__)
    message(STATUS "ORX support enabled: $ENV{ORX_LIB_DIR}")
else()
    message(STATUS "ORX not found. Set ORX_LIB_DIR env var for ORX support.")
    message(STATUS "Software renderer will be used for PoC.")
endif()

target_link_libraries(${BAKER_TARGET} m pthread)

add_custom_target(run_baker
    COMMAND ${BAKER_TARGET} --sample --output ${CMAKE_SOURCE_DIR}/output
    DEPENDS ${BAKER_TARGET}
    COMMENT "Running orx-baker with sample data"
)

add_custom_target(run_baker_16angles
    COMMAND ${BAKER_TARGET} --sample --angles 16 --output ${CMAKE_SOURCE_DIR}/output
    DEPENDS ${BAKER_TARGET}
    COMMENT "Running orx-baker with 16 angles"
)
