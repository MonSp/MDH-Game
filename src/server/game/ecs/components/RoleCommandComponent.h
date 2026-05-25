#pragma once

#include "../../ecs/Component.h"
#include "../../ecs/Entity.h"
#include "BehaviorComponent.h"
#include <cstdint>

struct RoleCommandComponent : public ECS::ComponentBase<RoleCommandComponent> {
    NPCActivity commandType;
    ECS::EntityId issuerId;
    float targetX;
    float targetY;
    uint64_t deadline;
    CommandStatus status;
    uint64_t assignedTime;

    RoleCommandComponent() : commandType(NPCActivity::Idle), issuerId(0),
        targetX(0.0f), targetY(0.0f), deadline(0), status(CommandStatus::Pending),
        assignedTime(0) {}

    bool isExpired(uint64_t currentTime) const {
        return deadline > 0 && currentTime > deadline;
    }

    bool isPending() const {
        return status == CommandStatus::Pending;
    }

    bool isActive() const {
        return status == CommandStatus::Pending ||
               status == CommandStatus::Executing;
    }

    void assign(NPCActivity type, ECS::EntityId issuer, float tx, float ty,
                uint64_t currentTime, uint64_t durationMs) {
        commandType = type;
        issuerId = issuer;
        targetX = tx;
        targetY = ty;
        assignedTime = currentTime;
        deadline = currentTime + durationMs;
        status = CommandStatus::Pending;
    }

    void complete() {
        status = CommandStatus::Completed;
    }

    void fail() {
        status = CommandStatus::Failed;
    }

    void reject() {
        status = CommandStatus::Rejected;
    }

    void execute() {
        status = CommandStatus::Executing;
    }
};
