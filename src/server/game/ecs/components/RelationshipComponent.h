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
    uint8_t _pad;
};

struct RelationshipComponent : public ECS::ComponentBase<RelationshipComponent> {
    static constexpr int MAX_RELATIONS = 50;

    RelationSlot relations[MAX_RELATIONS];
    uint8_t relationCount;
    uint32_t spouseSlot;
    uint32_t mentorSlot;

    RelationshipComponent() : relationCount(0), spouseSlot(0), mentorSlot(0) {
        for (int i = 0; i < MAX_RELATIONS; i++) {
            relations[i].targetSlot = 0;
            relations[i].affinity = 0;
            relations[i]._pad = 0;
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
            return true;
        }
        if (relationCount >= MAX_RELATIONS) return false;
        relations[relationCount].targetSlot = targetSlot;
        relations[relationCount].affinity = val;
        relations[relationCount]._pad = 0;
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
            return true;
        }
        int16_t newVal = static_cast<int16_t>(delta);
        if (newVal > 100) newVal = 100;
        if (newVal < -100) newVal = -100;
        if (relationCount >= MAX_RELATIONS) return false;
        relations[relationCount].targetSlot = targetSlot;
        relations[relationCount].affinity = static_cast<int8_t>(newVal);
        relations[relationCount]._pad = 0;
        relationCount++;
        return true;
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
