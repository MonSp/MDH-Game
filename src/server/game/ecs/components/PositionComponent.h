#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <cmath>

struct PositionComponent : public ECS::ComponentBase<PositionComponent> {
    float x;
    float y;
    float targetX;
    float targetY;
    float speed;

    PositionComponent() : x(0), y(0), targetX(0), targetY(0), speed(100.0f) {}
    PositionComponent(float px, float py, float spd = 100.0f)
        : x(px), y(py), targetX(px), targetY(py), speed(spd) {}

    void moveTo(float tx, float ty) {
        targetX = tx;
        targetY = ty;
    }

    bool hasReachedTarget(float threshold = 1.0f) const {
        float dx = x - targetX;
        float dy = y - targetY;
        return (dx * dx + dy * dy) <= (threshold * threshold);
    }

    float distanceTo(const PositionComponent& other) const {
        float dx = x - other.x;
        float dy = y - other.y;
        return std::sqrt(dx * dx + dy * dy);
    }

    float distanceTo(float ox, float oy) const {
        float dx = x - ox;
        float dy = y - oy;
        return std::sqrt(dx * dx + dy * dy);
    }
};
