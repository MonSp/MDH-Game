#pragma once

#include "../../ecs/Registry.h"
#include "../../ecs/components/IdentityComponent.h"
#include "../../ecs/components/LifecycleComponent.h"
#include <vector>
#include <unordered_map>
#include <random>

struct PopulationTarget {
    size_t totalTarget;
    std::unordered_map<std::string, size_t> nationTargets;
    std::unordered_map<std::string, std::pair<size_t, size_t>> familyTargets;
};

class PopulationBalanceSystem {
public:
    static PopulationBalanceSystem& getInstance() {
        static PopulationBalanceSystem instance;
        return instance;
    }

    void initialize() {
        nations_ = {"秦国", "楚国", "齐国", "燕国", "赵国", "魏国", "韩国"};
        familiesPerNation_ = 16;
        targetPerFamily_ = 100;
    }

    PopulationTarget calculateTargetPopulation(uint8_t layerId) {
        PopulationTarget target;
        target.totalTarget = nations_.size() * familiesPerNation_ * targetPerFamily_;

        for (const auto& nation : nations_) {
            target.nationTargets[nation] = target.totalTarget / nations_.size();
        }

        for (const auto& nation : nations_) {
            for (size_t i = 0; i < familiesPerNation_; ++i) {
                std::string familyId = nation + "_family_" + std::to_string(i);
                size_t familyTarget = targetPerFamily_;
                target.familyTargets[familyId] = {
                    familyTarget * 5 / 10,
                    familyTarget * 15 / 10
                };
            }
        }

        return target;
    }

    struct BirthDecision {
        bool shouldBirth;
        size_t count;
        std::string nation;
        std::string familyId;
    };

    BirthDecision shouldTriggerBirth(uint8_t layerId) {
        auto& registry = ECS::Registry::getInstance();
        auto allEntities = registry.getAllEntities();

        size_t currentPopulation = 0;
        for (ECS::EntityId entityId : allEntities) {
            auto* identity = registry.getComponent<IdentityComponent>(entityId);
            auto* lifecycle = registry.getComponent<LifecycleComponent>(entityId);
            if (identity && lifecycle &&
                identity->layer == layerId &&
                lifecycle->lifeState == NPCLifeState::Active) {
                currentPopulation++;
            }
        }

        PopulationTarget target = calculateTargetPopulation(layerId);

        if (currentPopulation < target.totalTarget * 9 / 10) {
            return {true, 10, "", ""};
        }

        std::unordered_map<std::string, size_t> nationCounts;
        for (const auto& nation : nations_) {
            nationCounts[nation] = 0;
        }

        for (ECS::EntityId entityId : allEntities) {
            auto* identity = registry.getComponent<IdentityComponent>(entityId);
            auto* lifecycle = registry.getComponent<LifecycleComponent>(entityId);
            if (identity && lifecycle &&
                identity->layer == layerId &&
                lifecycle->lifeState == NPCLifeState::Active) {
                nationCounts[identity->nation]++;
            }
        }

        for (const auto& nation : nations_) {
            size_t current = nationCounts[nation];
            size_t targetCount = target.nationTargets[nation];
            if (current < targetCount * 8 / 10) {
                return {true, 5, nation, ""};
            }
        }

        return {false, 0, "", ""};
    }

    size_t getCurrentPopulation(uint8_t layerId) const {
        auto& registry = ECS::Registry::getInstance();
        auto allEntities = registry.getAllEntities();

        size_t count = 0;
        for (ECS::EntityId entityId : allEntities) {
            auto* identity = registry.getComponent<IdentityComponent>(entityId);
            auto* lifecycle = registry.getComponent<LifecycleComponent>(entityId);
            if (identity && lifecycle &&
                identity->layer == layerId &&
                lifecycle->lifeState == NPCLifeState::Active) {
                count++;
            }
        }
        return count;
    }

private:
    PopulationBalanceSystem() = default;

    std::vector<std::string> nations_;
    size_t familiesPerNation_;
    size_t targetPerFamily_;
};
