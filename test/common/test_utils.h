#pragma once
#include "../../src/server/game/ecs/Registry.h"
#include "../../src/server/game/ecs/components/StatsComponent.h"
#include "../../src/server/game/ecs/components/BehaviorComponent.h"
#include "../../src/server/game/ecs/components/PersonalityComponent.h"
#include "../../src/server/game/ecs/components/IdentityComponent.h"
#include "../../src/server/game/ecs/components/BehaviorTreeComponent.h"
#include "../../src/server/game/bt/BlackboardCache.h"
#include "../../src/server/game/bt/BehaviorTreeTemplate.h"
#include "../../src/server/game/ecs/components/CultivationComponent.h"
#include "../../src/server/game/ecs/components/RelationshipComponent.h"
#include "../../src/server/game/ecs/components/SocialComponent.h"
#include "../../src/server/game/ecs/components/LifecycleComponent.h"
#include "../../src/server/game/ecs/components/ResourcesComponent.h"
#include <cstdlib>

namespace TestUtils {
inline void resetRegistry() {
    ECS::Registry::getInstance().clear();
}
inline ECS::EntityId createTestNPC(NPCRole role = NPCRole::BranchDisciple) {
    auto& reg = ECS::Registry::getInstance();
    ECS::EntityId id = reg.createEntity().getId();
    auto* stats = reg.getComponent<StatsComponent>(id);
    if (stats) {
        RealmLevel realm = RealmLevel::QiRefining;
        int32_t basePower = 300;
        stats->power = basePower;
        stats->hp = basePower * 10;
        stats->maxHp = basePower * 10;
        stats->mp = basePower * 5;
        stats->maxMp = basePower * 5;
        stats->realm = realm;
    }
    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    if (behavior) behavior->currentActivity = NPCActivity::Rest;
    auto* personality = reg.getComponent<PersonalityComponent>(id);
    if (personality) {
        personality->loyalty = 50.0f;
        personality->ambition = 50.0f;
        personality->caution = 50.0f;
        personality->greed = 50.0f;
        personality->sociability = 50.0f;
        personality->diligence = 50.0f;
    }
    auto* identity = reg.getComponent<IdentityComponent>(id);
    if (identity) {
        identity->role = role;
        identity->nation = "Qin";
        identity->clanId = "test_clan";
        identity->factionCareerHeritage = 0x0081;
    }
    auto* resources = reg.getComponent<ResourcesComponent>(id);
    if (resources) { resources->spiritStones = 100; }
    auto* social = reg.getComponent<SocialComponent>(id);
    if (social) { social->energy = 80.0f; social->mood = 60.0f; }
    auto* lifecycle = reg.getComponent<LifecycleComponent>(id);
    if (lifecycle) { lifecycle->lifeState = NPCLifeState::Active; }
    auto* bb = reg.getComponent<BlackboardCache>(id);
    if (bb) bb->invalidate();
    return id;
}
inline void seedRand(unsigned int s) { srand(s); }
}
