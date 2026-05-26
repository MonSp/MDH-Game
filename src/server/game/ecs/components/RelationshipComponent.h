#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <algorithm>

namespace ECS {
class Registry;
}

struct RelationSlot {
    uint32_t targetSlot;
    int8_t affinity;
    uint8_t decayRate;
    uint64_t lastInteractionFrame;
};

struct RelationshipComponent : public ECS::ComponentBase<RelationshipComponent> {
    static constexpr int MAX_RELATIONS = 50;
    static constexpr uint8_t BASE_DECAY_RATE = 3;
    static constexpr uint64_t DECAY_START_FRAMES = 30;
    static constexpr uint64_t DECAY_INTERVAL = 1;

    RelationSlot relations[MAX_RELATIONS];
    uint8_t relationCount;
    uint32_t spouseSlot;
    uint32_t mentorSlot;

    static uint8_t computeDecayRate(float loyalty, float greed) {
        float rate = 3.0f;
        if (loyalty >= 70.0f) rate -= 1.5f;
        else if (loyalty < 30.0f) rate += 1.0f;
        if (greed >= 70.0f) rate += 1.5f;
        if (rate < 1.0f) rate = 1.0f;
        if (rate > 10.0f) rate = 10.0f;
        return static_cast<uint8_t>(rate);
    }

    RelationshipComponent() : relationCount(0), spouseSlot(0), mentorSlot(0) {
        for (int i = 0; i < MAX_RELATIONS; i++) {
            relations[i].targetSlot = 0;
            relations[i].affinity = 0;
            relations[i].decayRate = 0;
            relations[i].lastInteractionFrame = 0;
        }
    }

    int8_t getAffinity(uint32_t targetSlot) const {
        for (uint8_t i = 0; i < relationCount; i++) {
            if (relations[i].targetSlot == targetSlot) return relations[i].affinity;
        }
        return 0;
    }

    bool setAffinity(uint32_t targetSlot, int8_t val) {
        if (val > 100) val = 100;
        if (val < -100) val = -100;
        int idx = findSlot(targetSlot);
        if (idx >= 0) {
            if (relations[idx].affinity == val) return false;
            relations[idx].affinity = val;
            relations[idx].lastInteractionFrame = 0;
            return true;
        }
        if (relationCount >= MAX_RELATIONS) return false;
        relations[relationCount].targetSlot = targetSlot;
        relations[relationCount].affinity = val;
        relations[relationCount].decayRate = 0;
        relations[relationCount].lastInteractionFrame = 0;
        relationCount++;
        return true;
    }

    bool modifyAffinity(uint32_t targetSlot, int8_t delta) {
        int idx = findSlot(targetSlot);
        if (idx >= 0) {
            int16_t newVal = static_cast<int16_t>(relations[idx].affinity) + delta;
            if (newVal > 100) newVal = 100;
            if (newVal < -100) newVal = -100;
            int8_t clamped = static_cast<int8_t>(newVal);
            if (relations[idx].affinity == clamped) return false;
            relations[idx].affinity = clamped;
            relations[idx].lastInteractionFrame = 0;
            return true;
        }
        int16_t newVal = static_cast<int16_t>(delta);
        if (newVal > 100) newVal = 100;
        if (newVal < -100) newVal = -100;
        if (relationCount >= MAX_RELATIONS) return false;
        relations[relationCount].targetSlot = targetSlot;
        relations[relationCount].affinity = static_cast<int8_t>(newVal);
        relations[relationCount].decayRate = 0;
        relations[relationCount].lastInteractionFrame = 0;
        relationCount++;
        return true;
    }

    void markInteraction(uint32_t targetSlot, uint64_t currentFrame) {
        int idx = findSlot(targetSlot);
        if (idx >= 0) {
            relations[idx].lastInteractionFrame = currentFrame;
        }
    }

    int applyDecay(uint64_t currentFrame) {
        int changes = 0;
        for (uint8_t i = 0; i < relationCount; i++) {
            bool isSpecial = (relations[i].targetSlot == spouseSlot || relations[i].targetSlot == mentorSlot);
            if (currentFrame - relations[i].lastInteractionFrame < DECAY_START_FRAMES) continue;
            uint8_t rate = relations[i].decayRate;
            if (rate == 0) rate = BASE_DECAY_RATE;
            uint8_t effectiveRate = isSpecial ? (rate + 1) / 2 : rate;
            if ((currentFrame - relations[i].lastInteractionFrame) % effectiveRate != 0) continue;
            if (relations[i].affinity > 0) {
                relations[i].affinity--;
                changes++;
            } else if (relations[i].affinity < 0) {
                relations[i].affinity++;
                changes++;
            }
        }
        return changes;
    }

    int getTopRelationships(uint32_t* outSlots, int8_t* outAffinities, int count) const {
        if (relationCount == 0 || count <= 0) return 0;
        RelationSlot temp[MAX_RELATIONS];
        for (uint8_t i = 0; i < relationCount; i++) {
            temp[i] = relations[i];
        }
        int toSort = relationCount < count ? relationCount : count;
        std::partial_sort(temp, temp + toSort, temp + relationCount,
            [](const RelationSlot& a, const RelationSlot& b) {
                return std::abs(static_cast<int>(a.affinity)) > std::abs(static_cast<int>(b.affinity));
            });
        for (int i = 0; i < toSort; i++) {
            outSlots[i] = temp[i].targetSlot;
            outAffinities[i] = temp[i].affinity;
        }
        return toSort;
    }

    bool hasDisciples() const;

private:
    int findSlot(uint32_t targetSlot) const {
        for (uint8_t i = 0; i < relationCount; i++) {
            if (relations[i].targetSlot == targetSlot) return static_cast<int>(i);
        }
        return -1;
    }
};
