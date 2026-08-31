#pragma once

#include "Component.h"
#include "Entity.h"
#include <vector>
#include <unordered_map>
#include <queue>

namespace ECS {

class Registry {
public:
    static Registry& getInstance() {
        static Registry instance;
        return instance;
    }

    Entity createEntity() {
        size_t slot;
        if (freeSlots_.empty()) {
            slot = entityIds_.size();
            entityIds_.push_back(0);
            activeSlots_.push_back(false);
        } else {
            slot = freeSlots_.front();
            freeSlots_.pop();
        }

        EntityId id;
        if (freeIds_.empty()) {
            id = nextEntityId_++;
        } else {
            id = freeIds_.front();
            freeIds_.pop();
        }

        entityIds_[slot] = id;
        entityToSlot_[id] = slot;
        activeSlots_[slot] = true;
        return Entity(id);
    }

    void destroyEntity(EntityId id) {
        auto it = entityToSlot_.find(id);
        if (it == entityToSlot_.end()) return;
        size_t slot = it->second;
        if (!activeSlots_[slot]) return;

        activeSlots_[slot] = false;
        freeSlots_.push(slot);
        freeIds_.push(id);
        entityToSlot_.erase(it);
    }

    bool isEntityValid(EntityId id) const {
        auto it = entityToSlot_.find(id);
        if (it == entityToSlot_.end()) return false;
        return activeSlots_[it->second];
    }

    std::vector<EntityId> getAllEntities() const {
        std::vector<EntityId> result;
        result.reserve(entityIds_.size());
        for (size_t i = 0; i < entityIds_.size(); ++i) {
            if (activeSlots_[i]) {
                result.push_back(entityIds_[i]);
            }
        }
        return result;
    }

    size_t getEntityCount() const {
        return entityToSlot_.size();
    }

    void clear() {
        entityIds_.clear();
        activeSlots_.clear();
        entityToSlot_.clear();
        while (!freeSlots_.empty()) freeSlots_.pop();
        while (!freeIds_.empty()) freeIds_.pop();
        nextEntityId_ = 0;
    }

    // Component arrays will be added in T2
    // Template dispatch pattern preserved for future extension:
    //
    // template<typename T>
    // T* getComponent(EntityId id) {
    //     auto it = entityToSlot_.find(id);
    //     if (it == entityToSlot_.end() || !activeSlots_[it->second]) return nullptr;
    //     return &getArray<T>()[it->second];
    // }
    //
    // template<typename T>
    // void addComponent(EntityId id, Args&&... args) { ... }
    //
    // template<typename T>
    // bool hasComponent(EntityId id) const { ... }

private:
    Registry() = default;

    std::vector<EntityId> entityIds_;
    std::vector<bool> activeSlots_;
    std::unordered_map<EntityId, size_t> entityToSlot_;

    EntityId nextEntityId_ = 0;
    std::queue<EntityId> freeIds_;
    std::queue<size_t> freeSlots_;
};

} // namespace ECS
