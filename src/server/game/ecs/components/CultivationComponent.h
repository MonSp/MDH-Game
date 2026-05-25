#pragma once

#include "../../ecs/Component.h"
#include "StatsComponent.h"
#include <cstdint>

struct CultivationComponent : public ECS::ComponentBase<CultivationComponent> {
    float cultivationProgress;
    uint32_t bottleneckTimer;
    bool hasElixir;
    bool isBreakingThrough;
    uint32_t tribulationTimer;
    uint32_t tribulationDamage;

    CultivationComponent() : cultivationProgress(0.0f), bottleneckTimer(0),
        hasElixir(false), isBreakingThrough(false), tribulationTimer(0),
        tribulationDamage(0) {}

    bool isReadyForBreakthrough() const {
        return cultivationProgress >= 1000.0f;
    }

    float getBreakthroughChance(RealmLevel currentRealm) const {
        float base = 0.0f;
        switch (currentRealm) {
            case RealmLevel::Mortal:        base = 0.90f; break;
            case RealmLevel::QiRefining:     base = 0.70f; break;
            case RealmLevel::FoundationBuilding: base = 0.45f; break;
            case RealmLevel::GoldenCore:     base = 0.25f; break;
            case RealmLevel::YuanInfant:     base = 0.10f; break;
            case RealmLevel::Transcension:   base = 0.05f; break;
            default: break;
        }
        if (hasElixir) base += 0.15f;
        return base;
    }

    void addProgress(float amount) {
        cultivationProgress += amount;
        if (cultivationProgress > 1000.0f) cultivationProgress = 1000.0f;
    }

    void resetProgress() {
        cultivationProgress = 0.0f;
    }
};
