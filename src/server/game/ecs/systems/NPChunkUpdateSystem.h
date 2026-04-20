#pragma once

#include "../../ecs/Registry.h"
#include "../../ecs/components/IdentityComponent.h"
#include "../../job/ThreadPool.h"
#include "../../job/JobDispatcher.h"
#include "../../npc/BehaviorTreeSystem.h"
#include "../../npc/MovementSystem.h"
#include <vector>
#include <chrono>
#include <cmath>

struct LayerConfig {
    uint8_t layer;
    std::string name;
    float spiritMultiplier;
    float resourceMultiplier;
    int32_t npcPowerMin;
    int32_t npcPowerMax;
};

class NPChunkUpdateSystem {
public:
    static NPChunkUpdateSystem& getInstance() {
        static NPChunkUpdateSystem instance;
        return instance;
    }

    void initialize(ThreadPool* pool) {
        threadPool_ = pool;
        jobDispatcher_ = std::make_unique<JobDispatcher>(pool);
    }

    void updateAllNPCs(float deltaTime, uint64_t currentTime) {
        auto& registry = ECS::Registry::getInstance();
        auto entities = registry.getEntitiesWithComponent<IdentityComponent>();

        if (entities.empty()) return;

        size_t chunkSize = 1000;
        size_t totalChunks = (entities.size() + chunkSize - 1) / chunkSize;

        std::vector<std::shared_ptr<IJob>> jobs;
        jobs.reserve(totalChunks);

        for (size_t c = 0; c < totalChunks; ++c) {
            size_t start = c * chunkSize;
            size_t end = std::min(start + chunkSize, entities.size());

            auto job = jobDispatcher_->dispatch([this, &entities, start, end, deltaTime, currentTime]() {
                for (size_t i = start; i < end; ++i) {
                    updateSingleNPC(entities[i], deltaTime, currentTime);
                }
            }, static_cast<uint32_t>(c % threadPool_->getThreadCount()));

            jobs.push_back(job);
        }

        jobDispatcher_->waitForAll(jobs);
    }

private:
    void updateSingleNPC(ECS::EntityId entityId, float deltaTime, uint64_t currentTime) {
        auto* lifecycle = ECS::Registry::getInstance().getComponent<LifecycleComponent>(entityId);
        if (!lifecycle || lifecycle->lifeState != NPCLifeState::Active) {
            return;
        }

        BehaviorTreeSystem::getInstance().evaluate(entityId);
        BehaviorTreeSystem::getInstance().execute(entityId, currentTime, deltaTime);
        MovementSystem::getInstance().update(entityId, deltaTime);
    }

    NPChunkUpdateSystem() = default;

    ThreadPool* threadPool_;
    std::unique_ptr<JobDispatcher> jobDispatcher_;
};
