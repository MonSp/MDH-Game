#pragma once

#include "NPChunkUpdateSystem.h"
#include "LifecycleSystem.h"
#include "PopulationBalanceSystem.h"
#include "LLMPlanningSystem.h"
#include "../../job/ThreadPool.h"
#include <chrono>
#include <iostream>
#include <memory>

class WorldUpdateLoop {
public:
    static WorldUpdateLoop& getInstance() {
        static WorldUpdateLoop instance;
        return instance;
    }

    void initialize(uint32_t threadCount = 8) {
        ThreadPoolConfig config;
        config.threadCount = threadCount;
        config.queueSize = 10000;
        config.enableStealing = true;

        threadPool_ = std::make_unique<ThreadPool>(config);
        NPChunkUpdateSystem::getInstance().initialize(threadPool_.get());
        LifecycleSystem::getInstance().initialize();
        PopulationBalanceSystem::getInstance().initialize();
        LLMPlanningSystem::getInstance().initialize();

        running_ = false;
        frameCount_ = 0;
        totalFrameTimeMs_ = 0.0;
    }

    void start() {
        running_ = true;
        lastTime_ = std::chrono::high_resolution_clock::now();
        loopThread_ = std::make_unique<std::thread>([this]() { loop(); });
    }

    void stop() {
        running_ = false;
        if (loopThread_ && loopThread_->joinable()) {
            loopThread_->join();
        }
        threadPool_.reset();
    }

    void updateOnce() {
        auto currentTime = std::chrono::high_resolution_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            currentTime - lastTime_).count();
        lastTime_ = currentTime;

        float deltaTime = static_cast<float>(elapsed);
        uint64_t currentTimeMs = std::chrono::duration_cast<std::chrono::milliseconds>(
            currentTime.time_since_epoch()).count();

        auto frameStart = std::chrono::high_resolution_clock::now();

        LLMPlanningSystem::getInstance().updatePlanningRequests(currentTimeMs);

        NPChunkUpdateSystem::getInstance().updateAllNPCs(deltaTime, currentTimeMs);

        LifecycleSystem::getInstance().updateAllNPCs(deltaTime / 1000.0f);

        auto frameEnd = std::chrono::high_resolution_clock::now();
        float frameTime = std::chrono::duration<float, std::milli>(frameEnd - frameStart).count();

        frameCount_++;
        totalFrameTimeMs_ += frameTime;

        if (frameCount_ % 100 == 0) {
            std::cout << "Frame " << frameCount_
                     << " | Avg Frame Time: " << (totalFrameTimeMs_ / frameCount_) << "ms"
                     << " | NPC Count: " << NPCCreationSystem::getInstance().getNPCCount()
                     << " | Active Plans: " << LLMPlanningSystem::getInstance().getActivePlanCount()
                     << std::endl;
        }
    }

    float getAverageFrameTime() const {
        return (frameCount_ > 0) ? (totalFrameTimeMs_ / frameCount_) : 0.0f;
    }

    size_t getFrameCount() const {
        return frameCount_;
    }

    bool isRunning() const {
        return running_;
    }

private:
    WorldUpdateLoop() = default;

    void loop() {
        while (running_) {
            updateOnce();
            std::this_thread::sleep_for(std::chrono::milliseconds(16));
        }
    }

    bool running_;
    std::unique_ptr<ThreadPool> threadPool_;
    std::unique_ptr<std::thread> loopThread_;
    std::chrono::high_resolution_clock::time_point lastTime_;
    size_t frameCount_;
    double totalFrameTimeMs_;
};
