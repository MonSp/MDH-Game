#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <vector>
#include <string>

struct Item {
    std::string id;
    std::string name;
    int32_t quality;
    int32_t value;
};

struct ResourcesComponent : public ECS::ComponentBase<ResourcesComponent> {
    int64_t spiritStones;
    std::vector<Item> items;
    int32_t attackBonus;
    int32_t defenseBonus;
    int32_t equipmentQuality;
    bool hasEquipment;
    int32_t familyContribution;

    ResourcesComponent() : spiritStones(0), attackBonus(0), defenseBonus(0),
        equipmentQuality(0), hasEquipment(false), familyContribution(0) {}

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

    void addItem(const Item& item) {
        items.push_back(item);
    }

    bool removeItem(const std::string& itemId) {
        for (auto it = items.begin(); it != items.end(); ++it) {
            if (it->id == itemId) {
                items.erase(it);
                return true;
            }
        }
        return false;
    }
};
