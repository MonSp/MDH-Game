#pragma once

#include "../../ecs/components/StatsComponent.h"
#include "../../ecs/components/PositionComponent.h"
#include "../../ecs/components/IdentityComponent.h"
#include "../../ecs/components/LifecycleComponent.h"
#include "../../ecs/components/ResourcesComponent.h"
#include "../../ecs/Registry.h"
#include <cstdlib>
#include <ctime>

class CombatSystem {
public:
    static CombatSystem& getInstance() {
        static CombatSystem instance;
        return instance;
    }

    void resolveCombat(ECS::EntityId attackerId, ECS::EntityId defenderId) {
        auto* attackerStats = ECS::Registry::getInstance().getComponent<StatsComponent>(attackerId);
        auto* defenderStats = ECS::Registry::getInstance().getComponent<StatsComponent>(defenderId);
        auto* defenderLifecycle = ECS::Registry::getInstance().getComponent<LifecycleComponent>(defenderId);

        if (!attackerStats || !defenderStats || !defenderLifecycle) return;

        int32_t damage = calculateDamage(attackerStats->power, defenderStats->maxHp);
        defenderStats->takeDamage(damage);

        if (defenderStats->isDead()) {
            defenderLifecycle->setDead(DeathCause::Battle);
        }
    }

    int32_t calculateDamage(int32_t attackerPower, int32_t defenderMaxHp) {
        float baseDamage = attackerPower * 0.5f;
        float variance = static_cast<float>(rand() % 20) / 100.0f - 0.1f;
        float finalDamage = baseDamage * (1.0f + variance);
        return static_cast<int32_t>(finalDamage);
    }

    bool isInCombatRange(ECS::EntityId entity1, ECS::EntityId entity2, float range = 1.0f) {
        auto* pos1 = ECS::Registry::getInstance().getComponent<PositionComponent>(entity1);
        auto* pos2 = ECS::Registry::getInstance().getComponent<PositionComponent>(entity2);

        if (!pos1 || !pos2) return false;

        return pos1->distanceTo(*pos2) <= range;
    }

    void triggerCombat(ECS::EntityId attackerId, ECS::EntityId defenderId) {
        auto* attackerBehavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(attackerId);
        if (attackerBehavior) {
            attackerBehavior->changeActivity(NPCActivity::Chase);
            attackerBehavior->setActivityData("targetId", static_cast<float>(defenderId));
        }
    }

private:
    CombatSystem() {
        std::srand(static_cast<unsigned>(std::time(nullptr)));
    }
};
