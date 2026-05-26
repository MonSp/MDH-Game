#pragma once
#include "../../src/server/game/ecs/Registry.h"
#include "../../src/server/game/ecs/components/StatsComponent.h"
#include "../../src/server/game/ecs/components/BehaviorComponent.h"
#include "../../src/server/game/ecs/components/PersonalityComponent.h"
#include "../../src/server/game/ecs/components/IdentityComponent.h"
#include "../../src/server/game/ecs/components/BehaviorTreeComponent.h"
#include "../../src/server/game/bt/BlackboardCache.h"
#include "../../src/server/game/bt/BehaviorTreeTemplate.h"
#include <cstdlib>

namespace TestUtils {
inline void resetRegistry() {
    ECS::Registry::getInstance().clear();
}
inline ECS::EntityId createTestNPC(NPCRole role = NPCRole::BranchDisciple) {
    auto& reg = ECS::Registry::getInstance();
    ECS::EntityId id = reg.createEntity().getId();
    auto* stats = reg.getComponent<StatsComponent>(id);
    if (stats) { stats->hp = 100; stats->maxHp = 100; stats->mp = 50; stats->maxMp = 50; stats->power = 10; }
    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    if (behavior) behavior->currentActivity = NPCActivity::Rest;
    auto* personality = reg.getComponent<PersonalityComponent>(id);
    if (personality) { personality->loyalty = 50.0f; personality->ambition = 50.0f; personality->caution = 50.0f; personality->greed = 50.0f; }
    auto* identity = reg.getComponent<IdentityComponent>(id);
    if (identity) identity->role = role;
    auto* bb = reg.getComponent<BlackboardCache>(id);
    if (bb) bb->invalidate();
    return id;
}
inline void seedRand(unsigned int s) { srand(s); }
}
