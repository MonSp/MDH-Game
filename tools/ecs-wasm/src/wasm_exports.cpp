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
#include "game/ecs/components/MemoryRingComponent.h"
#include "game/ecs/components/RelationshipComponent.h"
#include "game/ecs/EventStringPool.h"
#include "game/npc/NPCInteractionSystem.h"
#include <cstdint>
#include <cstring>
#include <algorithm>
#include "game/economy/MarketRegistry.h"

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
    uint8_t itemCount;
    uint8_t equipmentItemId;
    uint8_t _pad;
    uint32_t squadId;
};
#pragma pack(pop)

static_assert(sizeof(NPCStateWasm) == 140, "NPCStateWasm size mismatch");

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
        out.itemCount = resources ? static_cast<uint8_t>(resources->getTotalItemKinds()) : 0;
        out.equipmentItemId = resources ? static_cast<uint8_t>(resources->equipmentItemId) : 0;
        out._pad = 0;
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

int ecs_getAffinity(int slotA, int slotB) {
    if (slotA < 0 || slotB < 0) return 0;
    auto& reg = ECS::Registry::getInstance();
    auto* rel = &reg.getArray_<RelationshipComponent>()[static_cast<size_t>(slotA)];
    if (slotA >= (int)reg.entityIds_.size() || !reg.activeSlots_[slotA]) return 0;
    return rel->getAffinity(static_cast<uint32_t>(slotB));
}

void ecs_modifyAffinity(int slotA, int slotB, int delta) {
    if (slotA < 0 || slotB < 0) return;
    auto& reg = ECS::Registry::getInstance();
    if (slotA >= (int)reg.entityIds_.size() || !reg.activeSlots_[slotA]) return;
    if (slotB >= (int)reg.entityIds_.size() || !reg.activeSlots_[slotB]) return;
    reg.getArray_<RelationshipComponent>()[slotA].modifyAffinity(static_cast<uint32_t>(slotB), static_cast<int8_t>(delta));
    reg.getArray_<RelationshipComponent>()[slotB].modifyAffinity(static_cast<uint32_t>(slotA), static_cast<int8_t>(delta));
}

void ecs_getTopRelationships(int slot, int count, int* outBuf) {
    if (!outBuf || count <= 0 || slot < 0) return;
    auto& reg = ECS::Registry::getInstance();
    if (slot >= (int)reg.entityIds_.size() || !reg.activeSlots_[slot]) return;
    auto& rel = reg.getArray_<RelationshipComponent>()[slot];
    uint32_t slots[50];
    int8_t affs[50];
    int n = rel.getTopRelationships(slots, affs, count);
    for (int i = 0; i < n; i++) {
        outBuf[i * 2] = static_cast<int>(slots[i]);
        outBuf[i * 2 + 1] = static_cast<int>(affs[i]);
    }
}

void ecs_getRecentInteractions(int slot, int count, int32_t* outBuf) {
    if (!outBuf || count <= 0 || slot < 0) { if (outBuf) outBuf[0] = 0; return; }
    auto& reg = ECS::Registry::getInstance();
    if (slot >= (int)reg.entityIds_.size() || !reg.activeSlots_[slot]) { outBuf[0] = 0; return; }
    auto& mem = reg.getArray_<MemoryRingComponent>()[slot];
    InteractionSlot buf[20];
    size_t n = mem.interactions.getRecent(buf, count < 20 ? (size_t)count : 20);
    outBuf[0] = static_cast<int32_t>(n);
    for (size_t i = 0; i < n; i++) {
        outBuf[1 + i * 4] = static_cast<int32_t>(buf[i].timestamp & 0xFFFFFFFF);
        outBuf[1 + i * 4 + 1] = static_cast<int32_t>(buf[i].timestamp >> 32);
        outBuf[1 + i * 4 + 2] = static_cast<int32_t>(buf[i].otherSlot);
        outBuf[1 + i * 4 + 3] = static_cast<int32_t>(buf[i].type) | (static_cast<int32_t>(buf[i].impactScore) << 16);
    }
}

void ecs_getRecentCommandMemory(int slot, int count, int32_t* outBuf) {
    if (!outBuf || count <= 0 || slot < 0) { if (outBuf) outBuf[0] = 0; return; }
    auto& reg = ECS::Registry::getInstance();
    if (slot >= (int)reg.entityIds_.size() || !reg.activeSlots_[slot]) { outBuf[0] = 0; return; }
    auto& mem = reg.getArray_<MemoryRingComponent>()[slot];
    CommandMemorySlot buf[30];
    size_t n = mem.commandMemory.getRecent(buf, count < 30 ? (size_t)count : 30);
    outBuf[0] = static_cast<int32_t>(n);
    for (size_t i = 0; i < n; i++) {
        outBuf[1 + i * 6] = static_cast<int32_t>(buf[i].timestamp & 0xFFFFFFFF);
        outBuf[1 + i * 6 + 1] = static_cast<int32_t>(buf[i].timestamp >> 32);
        outBuf[1 + i * 6 + 2] = static_cast<int32_t>(buf[i].issuerSlot);
        outBuf[1 + i * 6 + 3] = static_cast<int32_t>(buf[i].commandId);
        outBuf[1 + i * 6 + 4] = static_cast<int32_t>(buf[i].result) | (static_cast<int32_t>(buf[i].emotionTag) << 8);
        outBuf[1 + i * 6 + 5] = buf[i].influence;
    }
}

void ecs_getWitnessedEvents(int slot, int count, int32_t* outBuf) {
    if (!outBuf || count <= 0 || slot < 0) { if (outBuf) outBuf[0] = 0; return; }
    auto& reg = ECS::Registry::getInstance();
    if (slot >= (int)reg.entityIds_.size() || !reg.activeSlots_[slot]) { outBuf[0] = 0; return; }
    auto& mem = reg.getArray_<MemoryRingComponent>()[slot];
    WitnessedSlot buf[30];
    size_t n = mem.witnessed.getRecent(buf, count < 30 ? (size_t)count : 30);
    outBuf[0] = static_cast<int32_t>(n);
    for (size_t i = 0; i < n; i++) {
        outBuf[1 + i * 3] = static_cast<int32_t>(buf[i].timestamp & 0xFFFFFFFF);
        outBuf[1 + i * 3 + 1] = static_cast<int32_t>(buf[i].timestamp >> 32);
        outBuf[1 + i * 3 + 2] = static_cast<int32_t>(buf[i].slot) | (static_cast<int32_t>(buf[i].significance) << 16);
    }
}

void ecs_getEventString(int index, char* outBuf, int maxLen) {
    if (!outBuf || maxLen <= 0) return;
    const char* str = EventStringPool::getInstance().getEvent(static_cast<uint16_t>(index));
    size_t len = std::strlen(str);
    size_t copyLen = len < (size_t)(maxLen - 1) ? len : (size_t)(maxLen - 1);
    std::memcpy(outBuf, str, copyLen);
    outBuf[copyLen] = '\0';
}

void ecs_consumeInteractionEvents(int* outBuf, int maxCount) {
    if (!outBuf || maxCount <= 0) return;
    NPCInteractionSystem::InteractionEvent events[256];
    size_t n = NPCInteractionSystem::getInstance().consumeInteractionEvents(events, maxCount < 256 ? (size_t)maxCount : 256);
    outBuf[0] = static_cast<int>(n);
    for (size_t i = 0; i < n; i++) {
        outBuf[1 + i * 3] = static_cast<int>(events[i].slotA);
        outBuf[1 + i * 3 + 1] = static_cast<int>(events[i].slotB);
        outBuf[1 + i * 3 + 2] = static_cast<int>(events[i].type);
    }
}

void ecs_recordWitnessedEvent(int eventSlot, const char* desc, int significance) {
    uint16_t idx = EventStringPool::getInstance().registerEvent(desc);
    auto& reg = ECS::Registry::getInstance();
    if (eventSlot < 0 || eventSlot >= (int)reg.entityIds_.size() || !reg.activeSlots_[eventSlot]) return;
    WitnessedSlot ws;
    ws.timestamp = 0;
    ws.slot = idx;
    ws.significance = static_cast<uint8_t>(significance > 10 ? 10 : significance);
    reg.getArray_<MemoryRingComponent>()[eventSlot].witnessed.push(ws);
}

int ecs_dumpMemory(int* outBuf, int maxSize) {
    if (!outBuf || maxSize < 4) return 0;
    auto& reg = ECS::Registry::getInstance();
    
    int* cursor = outBuf;
    int remaining = maxSize;
    
    int npcCount = 0;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (reg.activeSlots_[i]) npcCount++;
    }
    if (remaining < 4) return 0;
    *cursor++ = npcCount; remaining -= 4;
    
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (!reg.activeSlots_[i]) continue;
        if (remaining < 8) break;
        
        uint32_t slot = static_cast<uint32_t>(i);
        *cursor++ = static_cast<int>(slot); remaining -= 4;
        
        auto& rel = reg.getArray_<RelationshipComponent>()[i];
        *cursor++ = static_cast<int>(rel.relationCount); remaining -= 4;
        for (uint8_t j = 0; j < rel.relationCount && remaining >= 8; ++j) {
            *cursor++ = static_cast<int>(rel.relations[j].targetSlot); remaining -= 4;
            *cursor++ = static_cast<int>(rel.relations[j].affinity); remaining -= 4;
        }
        
        auto& mem = reg.getArray_<MemoryRingComponent>()[i];
        int ic = static_cast<int>(mem.interactions.size());
        *cursor++ = ic; remaining -= 4;
        InteractionSlot ibuf[20];
        mem.interactions.getRecent(ibuf, ic);
        for (int j = 0; j < ic && remaining >= 8; ++j) {
            *cursor++ = static_cast<int>(ibuf[j].timestamp); remaining -= 4;
            *cursor++ = static_cast<int>(ibuf[j].otherSlot) 
                      | (static_cast<int>(ibuf[j].type) << 24) 
                      | (static_cast<int>(ibuf[j].impactScore) << 16); remaining -= 4;
        }
        
        int cc = static_cast<int>(mem.commandMemory.size());
        *cursor++ = cc; remaining -= 4;
        CommandMemorySlot cbuf[30];
        mem.commandMemory.getRecent(cbuf, cc);
        for (int j = 0; j < cc && remaining >= 16; ++j) {
            *cursor++ = static_cast<int>(cbuf[j].timestamp); remaining -= 4;
            *cursor++ = static_cast<int>(cbuf[j].issuerSlot); remaining -= 4;
            *cursor++ = static_cast<int>(cbuf[j].commandId); remaining -= 4;
            *cursor++ = static_cast<int>(cbuf[j].result) 
                      | (static_cast<int>(cbuf[j].emotionTag) << 8)
                      | (static_cast<int>(cbuf[j].influence) << 16); remaining -= 4;
        }
        
        int wc = static_cast<int>(mem.witnessed.size());
        *cursor++ = wc; remaining -= 4;
        WitnessedSlot wbuf[30];
        mem.witnessed.getRecent(wbuf, wc);
        for (int j = 0; j < wc && remaining >= 8; ++j) {
            *cursor++ = static_cast<int>(wbuf[j].timestamp); remaining -= 4;
            *cursor++ = static_cast<int>(wbuf[j].slot) 
                      | (static_cast<int>(wbuf[j].significance) << 16); remaining -= 4;
        }
    }
    
    return static_cast<int>((reinterpret_cast<char*>(cursor) - reinterpret_cast<char*>(outBuf)));
}

void ecs_loadMemory(const int* inBuf, int size) {
    if (!inBuf || size < 4) return;
    auto& reg = ECS::Registry::getInstance();
    
    const int* cursor = inBuf;
    int npcCount = *cursor++;
    
    for (int n = 0; n < npcCount; ++n) {
        uint32_t slot = static_cast<uint32_t>(*cursor++);
        if (slot >= reg.entityIds_.size() || !reg.activeSlots_[slot]) {
            int relCount = *cursor++;
            cursor += relCount * 2;
            int ic = *cursor++;
            cursor += ic * 2;
            int cc = *cursor++;
            cursor += cc * 4;
            int wc = *cursor++;
            cursor += wc * 2;
            continue;
        }
        
        int relCount = *cursor++;
        auto& rel = reg.getArray_<RelationshipComponent>()[slot];
        rel.relationCount = 0;
        for (int j = 0; j < relCount && j < 50; ++j) {
            rel.relations[j].targetSlot = static_cast<uint32_t>(*cursor++);
            rel.relations[j].affinity = static_cast<int8_t>(*cursor++);
            rel.relationCount++;
        }
        
        auto& mem = reg.getArray_<MemoryRingComponent>()[slot];
        int ic = *cursor++;
        for (int j = 0; j < ic && j < 20; ++j) {
            InteractionSlot is;
            is.timestamp = static_cast<uint64_t>(*cursor++);
            int packed = *cursor++;
            is.otherSlot = static_cast<uint32_t>(packed & 0xFFFFFF);
            is.type = static_cast<uint8_t>((packed >> 24) & 0xFF);
            is.impactScore = static_cast<int8_t>((packed >> 16) & 0xFF);
            mem.interactions.push(is);
        }
        
        int cc = *cursor++;
        for (int j = 0; j < cc && j < 30; ++j) {
            CommandMemorySlot cs;
            cs.timestamp = static_cast<uint64_t>(*cursor++);
            cs.issuerSlot = static_cast<uint32_t>(*cursor++);
            cs.commandId = static_cast<uint32_t>(*cursor++);
            int packed = *cursor++;
            cs.result = static_cast<uint8_t>(packed & 0xFF);
            cs.emotionTag = static_cast<uint8_t>((packed >> 8) & 0xFF);
            cs.influence = static_cast<int8_t>((packed >> 16) & 0xFF);
            mem.commandMemory.push(cs);
        }
        
        int wc = *cursor++;
        for (int j = 0; j < wc && j < 30; ++j) {
            WitnessedSlot ws;
            ws.timestamp = static_cast<uint64_t>(*cursor++);
            int packed = *cursor++;
            ws.slot = static_cast<uint16_t>(packed & 0xFFFF);
            ws.significance = static_cast<uint8_t>((packed >> 16) & 0xFF);
            mem.witnessed.push(ws);
        }
    }
    (void)size;
}

float ecs_getMarketPrice(const char* clanId, int commodityType) {
    if (!clanId || commodityType < 0 || commodityType >= 6) return -1.0f;
    return MarketRegistry::getMarketPrice(std::string(clanId), static_cast<CommodityType>(commodityType));
}

void ecs_getCommodityPool(const char* clanId, int commodityType, int64_t* outSupply, int64_t* outDemand) {
    if (!clanId || !outSupply || !outDemand || commodityType < 0 || commodityType >= 6) {
        if (outSupply) *outSupply = 0;
        if (outDemand) *outDemand = 0;
        return;
    }
    const CommodityPool* pool = MarketRegistry::getCommodityPool(std::string(clanId));
    if (pool) {
        *outSupply = pool->supply[commodityType];
        *outDemand = pool->demand[commodityType];
    } else {
        *outSupply = 0;
        *outDemand = 0;
    }
}

void ecs_recordMarketTransaction(const char* clanId, int commodityType, int amount, int isBuy) {
    if (!clanId || commodityType < 0 || commodityType >= 6 || amount <= 0) return;
    auto& pool = MarketRegistry::getInstance().getOrCreatePool(std::string(clanId));
    auto ct = static_cast<CommodityType>(commodityType);
    if (isBuy) {
        pool.addDemand(ct, amount);
    } else {
        pool.addSupply(ct, amount);
    }
}

void ecs_getNPCItems(uint64_t entityId, int32_t* outBuf, int maxSlots) {
    if (!outBuf || maxSlots <= 0) return;
    auto& registry = ECS::Registry::getInstance();
    auto* resources = registry.getComponent<ResourcesComponent>(entityId);
    if (!resources) {
        outBuf[0] = 0;
        return;
    }
    outBuf[0] = static_cast<int32_t>(resources->spiritStones & 0xFFFFFFFF);
    outBuf[1] = static_cast<int32_t>(resources->spiritStones >> 32);
    outBuf[2] = resources->familyContribution;
    int slotCount = static_cast<int>(resources->items.size());
    int writeSlots = slotCount < maxSlots ? slotCount : maxSlots;
    for (int i = 0; i < writeSlots; i++) {
        outBuf[3 + i * 2] = static_cast<int32_t>(resources->items[i].itemId);
        outBuf[3 + i * 2 + 1] = resources->items[i].count;
    }
}

}
