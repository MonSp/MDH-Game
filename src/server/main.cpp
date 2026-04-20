#include "game/ecs/systems/WorldUpdateLoop.h"
#include "game/npc/NPCCreationSystem.h"
#include <iostream>
#include <thread>
#include <chrono>

int main(int argc, char* argv[]) {
    std::cout << "=== C++ ECS Game Engine ===" << std::endl;

    uint32_t threadCount = 8;
    if (argc > 1) {
        threadCount = std::atoi(argv[1]);
    }
    std::cout << "Initializing with " << threadCount << " threads..." << std::endl;

    WorldUpdateLoop::getInstance().initialize(threadCount);

    std::cout << "Creating benchmark NPCs..." << std::endl;
    auto startTime = std::chrono::high_resolution_clock::now();

    size_t npcCount = 100000;
    if (argc > 2) {
        npcCount = std::atoi(argv[2]);
    }

    for (uint8_t layer = 9; layer >= 1; --layer) {
        size_t layerNPCs = npcCount / 9;
        std::cout << "Creating " << layerNPCs << " NPCs for layer " << (int)layer << "..." << std::endl;
        NPCCreationSystem::getInstance().createBatchNPCs(layerNPCs, layer);
    }

    auto creationEnd = std::chrono::high_resolution_clock::now();
    auto creationTime = std::chrono::duration<double, std::milli>(creationEnd - startTime).count();
    std::cout << "NPC creation completed in " << creationTime << "ms" << std::endl;
    std::cout << "Total NPCs: " << NPCCreationSystem::getInstance().getNPCCount() << std::endl;

    std::cout << "\nStarting benchmark..." << std::endl;
    std::cout << "Running 100 frames..." << std::endl;

    WorldUpdateLoop::getInstance().start();

    auto benchmarkStart = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 100; ++i) {
        WorldUpdateLoop::getInstance().updateOnce();
    }
    auto benchmarkEnd = std::chrono::high_resolution_clock::now();

    auto benchmarkTime = std::chrono::duration<double, std::milli>(benchmarkEnd - benchmarkStart).count();
    float avgFrameTime = WorldUpdateLoop::getInstance().getAverageFrameTime();

    std::cout << "\n=== Benchmark Results ===" << std::endl;
    std::cout << "100 frames completed in: " << benchmarkTime << "ms" << std::endl;
    std::cout << "Average frame time: " << avgFrameTime << "ms" << std::endl;
    std::cout << "Estimated FPS: " << (1000.0f / avgFrameTime) << std::endl;
    std::cout << "Total NPCs processed: " << NPCCreationSystem::getInstance().getNPCCount() << std::endl;

    if (avgFrameTime < 16.67f) {
        std::cout << "[PASS] Frame time under 16.67ms (60 FPS target)" << std::endl;
    } else {
        std::cout << "[WARN] Frame time exceeds 16.67ms" << std::endl;
    }

    WorldUpdateLoop::getInstance().stop();

    std::cout << "\nShutdown complete." << std::endl;
    return 0;
}
