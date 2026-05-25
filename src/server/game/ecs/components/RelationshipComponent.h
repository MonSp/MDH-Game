#pragma once

#include "../../ecs/Component.h"
#include "../../ecs/Entity.h"
#include <vector>
#include <cstdint>

enum class RelationType : uint8_t {
    Neutral = 0,
    Family = 1,
    Lover = 2,
    Mentor = 3,
    Disciple = 4,
    Friend = 5,
    Enemy = 6
};

struct Relationship {
    ECS::EntityId targetId;
    RelationType type;
    float intimacy;
};

struct RelationshipComponent : public ECS::ComponentBase<RelationshipComponent> {
    std::vector<Relationship> relationships;
    ECS::EntityId spouseId;
    ECS::EntityId mentorId;
    ECS::EntityId fatherId;
    ECS::EntityId motherId;
    std::vector<ECS::EntityId> childrenIds;
    std::vector<ECS::EntityId> disciples;

    RelationshipComponent() : spouseId(0), mentorId(0), fatherId(0), motherId(0) {}

    float getIntimacy(ECS::EntityId targetId) const {
        for (auto& r : relationships) {
            if (r.targetId == targetId) return r.intimacy;
        }
        return 0.0f;
    }

    RelationType getRelationType(ECS::EntityId targetId) const {
        for (auto& r : relationships) {
            if (r.targetId == targetId) return r.type;
        }
        return RelationType::Neutral;
    }

    bool hasRelation(ECS::EntityId targetId) const {
        for (auto& r : relationships) {
            if (r.targetId == targetId) return true;
        }
        return false;
    }

    void addRelation(ECS::EntityId targetId, RelationType type, float initialIntimacy = 30.0f) {
        if (!hasRelation(targetId)) {
            relationships.push_back({targetId, type, initialIntimacy});
        }
    }

    void increaseIntimacy(ECS::EntityId targetId, float amount) {
        for (auto& r : relationships) {
            if (r.targetId == targetId) {
                r.intimacy += amount;
                if (r.intimacy > 100.0f) r.intimacy = 100.0f;
                return;
            }
        }
    }

    size_t getRelationCount() const {
        return relationships.size();
    }
};
