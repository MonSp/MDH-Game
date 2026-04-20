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

struct Equipment {
    std::string id;
    std::string name;
    int32_t quality;
    int32_t attackBonus;
    int32_t defenseBonus;
    bool damaged;
};

struct ResourcesComponent : public ECS::ComponentBase<ResourcesComponent> {
    int64_t spiritStones;
    std::vector<Item> items;
    Equipment* equipment;
    int32_t familyContribution;

    ResourcesComponent() : spiritStones(0), equipment(nullptr), familyContribution(0) {}

    ~ResourcesComponent() {
        if (equipment) {
            delete equipment;
        }
    }

    ResourcesComponent(const ResourcesComponent& other)
        : spiritStones(other.spiritStones), items(other.items),
        equipment(other.equipment ? new Equipment(*other.equipment) : nullptr),
        familyContribution(other.familyContribution) {}

    ResourcesComponent& operator=(const ResourcesComponent& other) {
        if (this != &other) {
            spiritStones = other.spiritStones;
            items = other.items;
            if (equipment) delete equipment;
            equipment = other.equipment ? new Equipment(*other.equipment) : nullptr;
            familyContribution = other.familyContribution;
        }
        return *this;
    }

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
