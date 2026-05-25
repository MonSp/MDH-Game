#pragma once

#include "../ecs/components/PositionComponent.h"
#include "../ecs/Registry.h"
#include <cmath>

class MovementSystem {
public:
    static MovementSystem& getInstance() {
        static MovementSystem instance;
        return instance;
    }

    void update(ECS::EntityId entityId, float deltaTime) {
        auto* position = ECS::Registry::getInstance().getComponent<PositionComponent>(entityId);
        if (!position) return;

        if (position->hasReachedTarget(1.0f)) {
            return;
        }

        float dx = position->targetX - position->x;
        float dy = position->targetY - position->y;
        float dist = std::sqrt(dx * dx + dy * dy);

        if (dist < 0.1f) {
            position->x = position->targetX;
            position->y = position->targetY;
            return;
        }

        float moveDistance = position->speed * deltaTime / 1000.0f;

        if (moveDistance >= dist) {
            position->x = position->targetX;
            position->y = position->targetY;
        } else {
            position->x += (dx / dist) * moveDistance;
            position->y += (dy / dist) * moveDistance;
        }
    }

    bool moveTo(ECS::EntityId entityId, float targetX, float targetY) {
        auto* position = ECS::Registry::getInstance().getComponent<PositionComponent>(entityId);
        if (!position) return false;

        position->moveTo(targetX, targetY);
        return true;
    }

    bool moveToEntity(ECS::EntityId entityId, ECS::EntityId targetEntityId) {
        auto* position = ECS::Registry::getInstance().getComponent<PositionComponent>(entityId);
        auto* targetPos = ECS::Registry::getInstance().getComponent<PositionComponent>(targetEntityId);
        if (!position || !targetPos) return false;
        position->moveTo(targetPos->x, targetPos->y);
        return true;
    }

    float getDistance(ECS::EntityId entity1, ECS::EntityId entity2) {
        auto* pos1 = ECS::Registry::getInstance().getComponent<PositionComponent>(entity1);
        auto* pos2 = ECS::Registry::getInstance().getComponent<PositionComponent>(entity2);

        if (!pos1 || !pos2) return -1.0f;

        return pos1->distanceTo(*pos2);
    }

    float getDistanceTo(ECS::EntityId entityId, float x, float y) {
        auto* position = ECS::Registry::getInstance().getComponent<PositionComponent>(entityId);
        if (!position) return -1.0f;

        return position->distanceTo(x, y);
    }

private:
    MovementSystem() = default;
};
