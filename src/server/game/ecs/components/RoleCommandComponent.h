#pragma once

#include "../../ecs/Component.h"
#include "../../ecs/Entity.h"
#include "BehaviorComponent.h"
#include <cstdint>
#include <cstddef>

static constexpr size_t MAX_COMMANDS_PER_NPC = 8;

struct CommandSlot {
    uint32_t commandId;
    uint8_t status;
    uint8_t priority;
    uint16_t padding;
};

enum class CommandLifecycle : uint8_t {
    Issued = 0,
    Received = 1,
    Delegated = 2,
    Executing = 3,
    Completed = 4,
    PartiallyCompleted = 5,
    Failed = 6,
    Refused = 7,
    Expired = 8
};

struct RoleCommandComponent : public ECS::ComponentBase<RoleCommandComponent> {
    static constexpr size_t MAX_QUEUE = MAX_COMMANDS_PER_NPC;

    CommandSlot queue[MAX_QUEUE];
    uint8_t queueHead;
    uint8_t queueCount;

    uint32_t parentCommandId;
    uint32_t childCommandIds[MAX_QUEUE];
    uint8_t childCount;

    ECS::EntityId issuerId;
    uint8_t issuerTier;
    uint64_t feedbackTime;
    uint8_t feedbackStatus;
    uint8_t feedbackNoteLen;

    uint32_t squadId;
    uint8_t squadRole;

    uint32_t commandType;

    RoleCommandComponent()
        : queueHead(0), queueCount(0)
        , parentCommandId(0), childCount(0)
        , issuerId(0), issuerTier(3)
        , feedbackTime(0), feedbackStatus(0), feedbackNoteLen(0)
        , squadId(0), squadRole(0)
        , commandType(0)
    {
        for (size_t i = 0; i < MAX_QUEUE; ++i) {
            queue[i] = {0, 0, 0, 0};
            childCommandIds[i] = 0;
        }
    }

    bool pushCommand(uint32_t cmdId, uint8_t prio) {
        if (queueCount >= MAX_QUEUE) {
            return false;
        }
        size_t idx = (queueHead + queueCount) % MAX_QUEUE;
        queue[idx] = {cmdId, static_cast<uint8_t>(CommandLifecycle::Received), prio, 0};
        queueCount++;
        return true;
    }

    bool popCommand(uint32_t& cmdId) {
        if (queueCount == 0) {
            return false;
        }
        cmdId = queue[queueHead].commandId;
        queueHead = (queueHead + 1) % MAX_QUEUE;
        queueCount--;
        return true;
    }

    const CommandSlot* peekCommand() const {
        if (queueCount == 0) {
            return nullptr;
        }
        return &queue[queueHead];
    }

    CommandSlot* peekCommandMut() {
        if (queueCount == 0) {
            return nullptr;
        }
        return &queue[queueHead];
    }

    bool updateStatus(uint32_t cmdId, CommandLifecycle newStatus) {
        for (size_t i = 0; i < MAX_QUEUE; ++i) {
            size_t idx = (queueHead + i) % MAX_QUEUE;
            if (i >= queueCount) break;
            if (queue[idx].commandId == cmdId) {
                queue[idx].status = static_cast<uint8_t>(newStatus);
                return true;
            }
        }
        return false;
    }

    bool isPending() const {
        if (queueCount == 0) return false;
        uint8_t st = queue[queueHead].status;
        return st == static_cast<uint8_t>(CommandLifecycle::Issued)
            || st == static_cast<uint8_t>(CommandLifecycle::Received);
    }

    bool isExecuting() const {
        if (queueCount == 0) return false;
        return queue[queueHead].status == static_cast<uint8_t>(CommandLifecycle::Executing);
    }

    bool hasActiveCommand() const {
        return queueCount > 0;
    }

    bool isExpired(uint64_t) const {
        return false;
    }

    void clearCommand() {
        if (queueCount > 0) {
            popCommand(queue[queueHead].commandId);
        }
    }

    bool addChildCommand(uint32_t childId) {
        if (childCount >= MAX_QUEUE) {
            return false;
        }
        childCommandIds[childCount++] = childId;
        return true;
    }

    bool expireCommand(uint32_t cmdId) {
        return updateStatus(cmdId, CommandLifecycle::Expired);
    }

    void setFeedback(uint8_t status, uint64_t time) {
        feedbackStatus = status;
        feedbackTime = time;
    }
};
