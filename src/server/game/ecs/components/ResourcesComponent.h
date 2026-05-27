#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <vector>

struct ItemSlot {
    uint32_t itemId;
    int32_t count;
};

struct ResourcesComponent : public ECS::ComponentBase<ResourcesComponent> {
    int64_t spiritStones;
    std::vector<ItemSlot> items;
    int32_t attackBonus;
    int32_t defenseBonus;
    int32_t equipmentQuality;
    uint32_t equipmentItemId;
    bool hasEquipment;
    int32_t familyContribution;

    ResourcesComponent() : spiritStones(0), attackBonus(0), defenseBonus(0),
        equipmentQuality(0), equipmentItemId(0), hasEquipment(false), familyContribution(0) {}

    void addSpiritStones(int64_t amount) {
        spiritStones += amount;
    }

    bool removeSpiritStones(int64_t amount) {
        if (spiritStones >= amount) {
            spiritStones -= amount;
            return true;
        }
        return false;
    }

    void addItem(uint32_t itemId, int32_t count) {
        for (auto& slot : items) {
            if (slot.itemId == itemId) {
                slot.count += count;
                return;
            }
        }
        items.push_back({itemId, count});
    }

    bool removeItem(uint32_t itemId, int32_t count) {
        for (auto it = items.begin(); it != items.end(); ++it) {
            if (it->itemId == itemId) {
                if (it->count < count) return false;
                it->count -= count;
                if (it->count == 0) {
                    items.erase(it);
                }
                return true;
            }
        }
        return false;
    }

    int32_t getItemCount(uint32_t itemId) const {
        for (const auto& slot : items) {
            if (slot.itemId == itemId) return slot.count;
        }
        return 0;
    }

    int32_t getTotalItemKinds() const {
        return static_cast<int32_t>(items.size());
    }

    bool hasItem(uint32_t itemId, int32_t count) const {
        return getItemCount(itemId) >= count;
    }
};
