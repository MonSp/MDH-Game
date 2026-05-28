#pragma once

#include "../../ecs/Component.h"
#include "RoleCommandComponent.h"
#include <cstdint>
#include <cstddef>

static constexpr size_t MAX_DELEGATION_TARGETS = 64;
static constexpr size_t MAX_DELEGATION_CHILDREN = 16;

struct DelegationSlot {
    uint32_t parentCommandId;
    uint32_t childCommandIds[MAX_DELEGATION_CHILDREN];
    uint8_t childCount;
    uint32_t targetSlots[MAX_DELEGATION_TARGETS];
    uint16_t targetCount;
    uint8_t delegationComplete;
    uint8_t feedbackAggregated;
    uint8_t completedCount;
    uint8_t failedCount;
    uint8_t partialCount;
    uint8_t refusedCount;
    uint8_t expiredCount;
};

struct CommandDelegationComponent : public ECS::ComponentBase<CommandDelegationComponent> {
    static constexpr size_t MAX_ACTIVE_SLOTS = 4;

    DelegationSlot slots[MAX_ACTIVE_SLOTS];
    uint8_t slotCount;

    CommandDelegationComponent() : slotCount(0) {
        for (size_t i = 0; i < MAX_ACTIVE_SLOTS; ++i) {
            slots[i] = {};
        }
    }

    DelegationSlot* findSlot(uint32_t parentCommandId) {
        for (size_t i = 0; i < slotCount; ++i) {
            if (slots[i].parentCommandId == parentCommandId) {
                return &slots[i];
            }
        }
        return nullptr;
    }

    const DelegationSlot* findSlot(uint32_t parentCommandId) const {
        for (size_t i = 0; i < slotCount; ++i) {
            if (slots[i].parentCommandId == parentCommandId) {
                return &slots[i];
            }
        }
        return nullptr;
    }

    DelegationSlot* createSlot(uint32_t parentCommandId) {
        if (slotCount >= MAX_ACTIVE_SLOTS) {
            return nullptr;
        }
        DelegationSlot& slot = slots[slotCount++];
        slot.parentCommandId = parentCommandId;
        return &slot;
    }

    bool addTarget(DelegationSlot* slot, uint32_t targetSlotId) {
        if (!slot || slot->targetCount >= MAX_DELEGATION_TARGETS) {
            return false;
        }
        slot->targetSlots[slot->targetCount++] = targetSlotId;
        return true;
    }

    bool addChildCommand(DelegationSlot* slot, uint32_t childCmdId) {
        if (!slot || slot->childCount >= MAX_DELEGATION_CHILDREN) {
            return false;
        }
        slot->childCommandIds[slot->childCount++] = childCmdId;
        return true;
    }

    void collectFeedback(DelegationSlot* slot, uint8_t status) {
        if (!slot) return;
        switch (static_cast<CommandLifecycle>(status)) {
            case CommandLifecycle::Completed:
                slot->completedCount++;
                break;
            case CommandLifecycle::Failed:
                slot->failedCount++;
                break;
            case CommandLifecycle::PartiallyCompleted:
                slot->partialCount++;
                break;
            case CommandLifecycle::Refused:
                slot->refusedCount++;
                break;
            case CommandLifecycle::Expired:
                slot->expiredCount++;
                break;
            default:
                break;
        }
        if (slot->completedCount + slot->failedCount + slot->partialCount
            + slot->refusedCount + slot->expiredCount >= slot->childCount) {
            slot->feedbackAggregated = 1;
        }
    }

    uint8_t getAggregatedStatus(uint32_t parentCommandId) const {
        const DelegationSlot* slot = findSlot(parentCommandId);
        if (!slot || !slot->feedbackAggregated) {
            return static_cast<uint8_t>(CommandLifecycle::Executing);
        }
        if (slot->completedCount == slot->childCount) {
            return static_cast<uint8_t>(CommandLifecycle::Completed);
        }
        if (slot->completedCount > 0 || slot->partialCount > 0) {
            return static_cast<uint8_t>(CommandLifecycle::PartiallyCompleted);
        }
        if (slot->failedCount == slot->childCount) {
            return static_cast<uint8_t>(CommandLifecycle::Failed);
        }
        return static_cast<uint8_t>(CommandLifecycle::PartiallyCompleted);
    }

    void clearSlot(uint32_t parentCommandId) {
        for (size_t i = 0; i < slotCount; ++i) {
            if (slots[i].parentCommandId == parentCommandId) {
                for (size_t j = i; j < static_cast<size_t>(slotCount) - 1; ++j) {
                    slots[j] = slots[j + 1];
                }
                slots[slotCount - 1] = {};
                slotCount--;
                return;
            }
        }
    }
};
