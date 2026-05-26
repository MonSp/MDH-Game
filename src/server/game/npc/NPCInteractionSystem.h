#pragma once

#include <cstdint>
#include <cstdlib>
#include <cmath>
#include "../spatial/SpatialIndexCache.h"
#include "../ecs/Registry.h"

class NPCInteractionSystem {
public:
    static constexpr float INTERACTION_DIST = 2.0f;
    static constexpr uint64_t INTERACTION_COOLDOWN_MS = 25000;
    static constexpr size_t MAX_COOLDOWNS = 4096;
    static constexpr size_t MAX_EVENT_BUFFER = 256;

    struct CooldownEntry {
        uint32_t pairKey;
        uint64_t expireTime;
    };

    struct InteractionEvent {
        uint32_t slotA;
        uint32_t slotB;
        uint8_t  type;
    };

    static NPCInteractionSystem& getInstance() {
        static NPCInteractionSystem s;
        return s;
    }

    void tickInteraction(uint64_t currentTimeMs, uint16_t frameCounter, uint64_t currentFrame) {
        if (frameCounter % 5 != 0) return;

        eventCount_ = 0;

        auto& reg = ECS::Registry::getInstance();
        auto& positions = reg.getArray_<PositionComponent>();
        auto& stats = reg.getArray_<StatsComponent>();
        auto& relationships = reg.getArray_<RelationshipComponent>();
        auto& resources = reg.getArray_<ResourcesComponent>();
        auto& memoryRings = reg.getArray_<MemoryRingComponent>();
        const auto& activeSlots = reg.activeSlots_;

        auto& spatialIndex = SpatialIndexCache::getInstance();

        size_t slotCount = positions.size();
        for (size_t i = 0; i < slotCount; ++i) {
            if (!activeSlots[i]) continue;

            float x = positions[i].x;
            float y = positions[i].y;

            auto neighbors = spatialIndex.queryNeighbors(x, y, INTERACTION_DIST * 3.0f);

            for (uint32_t j : neighbors) {
                if (j <= i) continue;
                if (!activeSlots[j]) continue;

                float dx = positions[j].x - x;
                float dy = positions[j].y - y;
                float dist = std::sqrt(dx * dx + dy * dy);
                if (dist > INTERACTION_DIST) continue;

                if (!isCooldownExpired(static_cast<uint32_t>(i), j, currentTimeMs)) continue;
                setCooldown(static_cast<uint32_t>(i), j, currentTimeMs);

                int8_t affinity = relationships[i].getAffinity(j);
                float roll = random01();

                uint8_t eventType = 0xFF;
                bool didInteract = false;

                if (affinity > 40 && roll < 0.35f) {
                    eventType = 0;
                    relationships[i].modifyAffinity(j, 3);

                    InteractionSlot slotI;
                    slotI.timestamp = currentFrame;
                    slotI.otherSlot = j;
                    slotI.type = 0;
                    slotI.impactScore = 3;
                    memoryRings[i].interactions.push(slotI);

                    InteractionSlot slotJ;
                    slotJ.timestamp = currentFrame;
                    slotJ.otherSlot = static_cast<uint32_t>(i);
                    slotJ.type = 0;
                    slotJ.impactScore = 3;
                    memoryRings[j].interactions.push(slotJ);

                    didInteract = true;
                } else if (affinity > 20 && roll < 0.25f) {
                    eventType = 1;

                    int64_t stonesA = randRange(3, 12);
                    int64_t stonesB = randRange(3, 12);
                    resources[i].addSpiritStones(stonesA);
                    resources[j].addSpiritStones(stonesB);

                    didInteract = true;
                } else if (affinity < -20 && roll < 0.25f) {
                    eventType = 2;

                    int32_t dmgA = randRange(10, 50);
                    int32_t dmgB = randRange(10, 50);
                    stats[i].hp -= dmgA;
                    if (stats[i].hp < 0) stats[i].hp = 0;
                    stats[j].hp -= dmgB;
                    if (stats[j].hp < 0) stats[j].hp = 0;

                    relationships[i].modifyAffinity(j, -8);

                    didInteract = true;
                } else if (affinity < -50 && roll < 0.15f) {
                    eventType = 3;

                    int32_t dmgA = randRange(30, 110);
                    int32_t dmgB = randRange(30, 110);
                    stats[i].hp -= dmgA;
                    if (stats[i].hp < 0) stats[i].hp = 0;
                    stats[j].hp -= dmgB;
                    if (stats[j].hp < 0) stats[j].hp = 0;

                    relationships[i].modifyAffinity(j, -15);

                    didInteract = true;
                }

                if (didInteract && eventCount_ < MAX_EVENT_BUFFER) {
                    eventBuffer_[eventCount_].slotA = static_cast<uint32_t>(i);
                    eventBuffer_[eventCount_].slotB = j;
                    eventBuffer_[eventCount_].type = eventType;
                    eventCount_++;
                }
            }
        }
    }

    size_t consumeInteractionEvents(InteractionEvent* out, size_t maxCount) {
        size_t count = eventCount_ < maxCount ? eventCount_ : maxCount;
        for (size_t i = 0; i < count; ++i) {
            out[i] = eventBuffer_[i];
        }
        eventCount_ = 0;
        return count;
    }

    static float random01() {
        return static_cast<float>(rand()) / static_cast<float>(RAND_MAX);
    }

    static int randRange(int min, int max) {
        return min + rand() % (max - min + 1);
    }

private:
    NPCInteractionSystem() : eventCount_(0) {
        for (size_t i = 0; i < MAX_COOLDOWNS; ++i) {
            cooldowns_[i].pairKey = 0;
            cooldowns_[i].expireTime = 0;
        }
    }

    bool getCooldown(uint32_t slotA, uint32_t slotB, uint64_t& outExpireTime) const {
        uint32_t pairKey = (slotA < slotB) ? (slotA << 16) | slotB : (slotB << 16) | slotA;
        size_t idx = pairKey % MAX_COOLDOWNS;

        for (size_t i = 0; i < MAX_COOLDOWNS; ++i) {
            size_t probe = (idx + i) % MAX_COOLDOWNS;
            if (cooldowns_[probe].pairKey == 0) return false;
            if (cooldowns_[probe].pairKey == pairKey) {
                outExpireTime = cooldowns_[probe].expireTime;
                return true;
            }
        }
        return false;
    }

    void setCooldown(uint32_t slotA, uint32_t slotB, uint64_t now) {
        uint32_t pairKey = (slotA < slotB) ? (slotA << 16) | slotB : (slotB << 16) | slotA;
        size_t idx = pairKey % MAX_COOLDOWNS;

        for (size_t i = 0; i < MAX_COOLDOWNS; ++i) {
            size_t probe = (idx + i) % MAX_COOLDOWNS;
            if (cooldowns_[probe].pairKey == 0 || cooldowns_[probe].pairKey == pairKey) {
                cooldowns_[probe].pairKey = pairKey;
                cooldowns_[probe].expireTime = now + INTERACTION_COOLDOWN_MS;
                return;
            }
        }
    }

    bool isCooldownExpired(uint32_t slotA, uint32_t slotB, uint64_t now) const {
        uint64_t expireTime = 0;
        if (!getCooldown(slotA, slotB, expireTime)) return true;
        return now >= expireTime;
    }

    CooldownEntry cooldowns_[MAX_COOLDOWNS];
    InteractionEvent eventBuffer_[MAX_EVENT_BUFFER];
    size_t eventCount_;
};
