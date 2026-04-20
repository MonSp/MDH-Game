#pragma once

#include "../../ecs/Registry.h"
#include "../../ecs/components/StatsComponent.h"
#include "../../ecs/components/LifecycleComponent.h"
#include <unordered_map>
#include <cmath>

struct LifespanConfig {
    uint32_t baseLifespan;
    uint32_t maxLifespan;
    float deathProbabilityPerYear;
};

class LifecycleSystem {
public:
    static LifecycleSystem& getInstance() {
        static LifecycleSystem instance;
        return instance;
    }

    void initialize() {
        realmLifespans_[RealmLevel::Mortal] = {80, 100, 0.1f};
        realmLifespans_[RealmLevel::QiRefining] = {100, 120, 0.15f};
        realmLifespans_[RealmLevel::FoundationBuilding] = {150, 200, 0.08f};
        realmLifespans_[RealmLevel::GoldenCore] = {300, 400, 0.05f};
        realmLifespans_[RealmLevel::YuanInfant] = {800, 1000, 0.03f};
        realmLifespans_[RealmLevel::Transcension] = {2000, 3000, 0.01f};
    }

    void updateAge(ECS::EntityId entityId, float deltaYears) {
        auto* lifecycle = ECS::Registry::getInstance().getComponent<LifecycleComponent>(entityId);
        auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(entityId);

        if (!lifecycle || !stats) return;

        lifecycle->age += deltaYears;

        auto it = realmLifespans_.find(stats->realm);
        if (it == realmLifespans_.end()) return;

        const LifespanConfig& config = it->second;

        if (lifecycle->age >= config.maxLifespan) {
            lifecycle->setDead(DeathCause::AgeLimit);
            return;
        }

        if (lifecycle->age >= config.baseLifespan) {
            float yearsOverBase = lifecycle->age - config.baseLifespan;
            float totalYears = config.maxLifespan - config.baseLifespan;
            float deathProbability = config.deathProbabilityPerYear * (yearsOverBase / totalYears);

            float random = static_cast<float>(rand()) / RAND_MAX;
            if (random < deathProbability) {
                lifecycle->setDead(DeathCause::AgeLimit);
            }
        }
    }

    void updateAllNPCs(float deltaYears) {
        auto& registry = ECS::Registry::getInstance();
        auto entities = registry.getEntitiesWithComponent<LifecycleComponent>();

        for (ECS::EntityId entityId : entities) {
            updateAge(entityId, deltaYears);
        }
    }

    bool isDead(ECS::EntityId entityId) const {
        auto* lifecycle = ECS::Registry::getInstance().getComponent<LifecycleComponent>(entityId);
        if (!lifecycle) return true;
        return lifecycle->lifeState == NPCLifeState::Dead;
    }

    DeathCause* getDeathCause(ECS::EntityId entityId) const {
        auto* lifecycle = ECS::Registry::getInstance().getComponent<LifecycleComponent>(entityId);
        if (!lifecycle) return nullptr;
        return lifecycle->deathCause;
    }

private:
    LifecycleSystem() {
        initialize();
    }

    std::unordered_map<RealmLevel, LifespanConfig> realmLifespans_;
};
