#include "game/ecs/Registry.h"
#include "game/ecs/systems/WorldUpdateLoop.h"
#include "game/ecs/components/IdentityComponent.h"
#include "game/ecs/components/StatsComponent.h"
#include "game/ecs/components/PositionComponent.h"
#include "game/ecs/components/BehaviorComponent.h"
#include "game/ecs/components/CultivationComponent.h"
#include "game/ecs/components/SocialComponent.h"
#include "game/ecs/components/ResourcesComponent.h"
#include "game/ecs/components/LifecycleComponent.h"
#include "game/ecs/components/RoleCommandComponent.h"
#include "game/npc/NPCCreationSystem.h"
#include <cstdint>
#include <cstring>
#include <algorithm>

#pragma pack(push, 1)
struct NPCStateWasm {
    int64_t spiritStones;
    uint64_t entityId;
    float x;
    float y;
    int32_t hp;
    int32_t maxHp;
    int32_t mp;
    int32_t maxMp;
    int32_t power;
    int32_t realm;
    int32_t role;
    int32_t activity;
    int32_t layer;
    float cultivationProgress;
    float hunger;
    float fatigue;
    float socialDesire;
    char name[52];
    uint32_t activeCommandId;
    uint8_t commandStatus;
    uint8_t _pad[3];
    uint32_t squadId;
};
#pragma pack(pop)

static_assert(sizeof(NPCStateWasm) == 140, "NPCStateWasm must be 140 bytes");

extern "C" {

void ecs_init(int threadCount) {
    WorldUpdateLoop::getInstance().initialize(
        static_cast<uint32_t>(threadCount > 0 ? threadCount : 0));
}

int ecs_createNPCs(int count, int layer) {
    if (count <= 0) count = 1000;
    if (layer < 0) layer = 9;
    NPCCreationSystem::getInstance().createBatchNPCs(
        static_cast<size_t>(count), static_cast<uint8_t>(layer));
    return static_cast<int>(NPCCreationSystem::getInstance().getNPCCount());
}

void ecs_updateFrame() {
    WorldUpdateLoop::getInstance().updateOnce();
}

int ecs_getNPCStateCount() {
    auto& registry = ECS::Registry::getInstance();
    auto entities = registry.getEntitiesWithComponent<IdentityComponent>();
    int count = 0;
    for (auto id : entities) {
        auto* lifecycle = registry.getComponent<LifecycleComponent>(id);
        if (lifecycle && lifecycle->lifeState == NPCLifeState::Active) {
            count++;
        }
    }
    return count;
}

void ecs_getNPCStates(NPCStateWasm* outBuffer, int maxCount) {
    if (!outBuffer || maxCount <= 0) return;

    auto& registry = ECS::Registry::getInstance();
    auto entities = registry.getEntitiesWithComponent<IdentityComponent>();

    int written = 0;
    for (auto entityId : entities) {
        if (written >= maxCount) break;

        auto* lifecycle = registry.getComponent<LifecycleComponent>(entityId);
        if (!lifecycle || lifecycle->lifeState != NPCLifeState::Active) continue;

        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        auto* stats = registry.getComponent<StatsComponent>(entityId);
        auto* position = registry.getComponent<PositionComponent>(entityId);
        auto* behavior = registry.getComponent<BehaviorComponent>(entityId);
        auto* cultivation = registry.getComponent<CultivationComponent>(entityId);
        auto* social = registry.getComponent<SocialComponent>(entityId);
        auto* resources = registry.getComponent<ResourcesComponent>(entityId);
        auto* cmd = registry.getComponent<RoleCommandComponent>(entityId);

        NPCStateWasm& out = outBuffer[written];

        out.entityId = entityId;
        out.x = position ? position->x : 0.0f;
        out.y = position ? position->y : 0.0f;
        out.hp = stats ? stats->hp : 0;
        out.maxHp = stats ? stats->maxHp : 0;
        out.mp = stats ? stats->mp : 0;
        out.maxMp = stats ? stats->maxMp : 0;
        out.power = stats ? stats->power : 0;
        out.realm = stats ? static_cast<int32_t>(stats->realm) : 0;
        out.role = identity ? static_cast<int32_t>(identity->role) : 0;
        out.activity = behavior ? static_cast<int32_t>(behavior->currentActivity) : 0;
        out.layer = identity ? identity->layer : 0;
        out.cultivationProgress = cultivation ? cultivation->cultivationProgress : 0.0f;
        out.hunger = social ? social->hunger : 0.0f;
        out.fatigue = social ? social->fatigue : 0.0f;
        out.socialDesire = social ? social->socialDesire : 0.0f;
        out.spiritStones = resources ? resources->spiritStones : 0;
        out.activeCommandId = 0;
        out.commandStatus = 0;
        out.squadId = 0;
        out._pad[0] = 0;
        out._pad[1] = 0;
        out._pad[2] = 0;
        if (cmd && cmd->hasActiveCommand()) {
            const CommandSlot* slot = cmd->peekCommand();
            if (slot) {
                out.activeCommandId = slot->commandId;
                out.commandStatus = slot->status;
            }
        }
        out.squadId = cmd ? cmd->squadId : 0;

        if (identity) {
            size_t len = std::min(identity->name.length(), sizeof(out.name) - 1);
            std::memcpy(out.name, identity->name.c_str(), len);
            out.name[len] = '\0';
        } else {
            out.name[0] = '\0';
        }

        written++;
    }
}

void ecs_getStats(int* outNPC, float* outTime, int* outFrames) {
    if (outNPC) *outNPC = static_cast<int>(NPCCreationSystem::getInstance().getNPCCount());
    if (outTime) *outTime = WorldUpdateLoop::getInstance().getAverageFrameTime();
    if (outFrames) *outFrames = static_cast<int>(WorldUpdateLoop::getInstance().getFrameCount());
}

void ecs_destroy() {
    WorldUpdateLoop::getInstance().stop();
}

}
