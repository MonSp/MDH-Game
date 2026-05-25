#pragma once

#include "Component.h"
#include "Entity.h"
#include "components/IdentityComponent.h"
#include "components/PositionComponent.h"
#include "components/StatsComponent.h"
#include "components/BehaviorComponent.h"
#include "components/PersonalityComponent.h"
#include "components/LifecycleComponent.h"
#include "components/ResourcesComponent.h"
#include "components/LLMComponent.h"
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
            slot = identity_.size();
            identity_.emplace_back();
            position_.emplace_back();
            stats_.emplace_back();
            behavior_.emplace_back();
            personality_.emplace_back();
            lifecycle_.emplace_back();
            resources_.emplace_back();
            llmPlan_.emplace_back();
            hasLLMPlan_.push_back(false);
            entityIds_.push_back(0);
            activeSlots_.push_back(false);
        } else {
            slot = freeSlots_.front();
            freeSlots_.pop();
            identity_[slot] = IdentityComponent();
            position_[slot] = PositionComponent();
            stats_[slot] = StatsComponent();
            behavior_[slot] = BehaviorComponent();
            personality_[slot] = PersonalityComponent();
            lifecycle_[slot] = LifecycleComponent();
            resources_[slot] = ResourcesComponent();
            llmPlan_[slot] = LLMPlanComponent();
            hasLLMPlan_[slot] = false;
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

    template<typename T>
    T* getComponent(EntityId id) {
        auto it = entityToSlot_.find(id);
        if (it == entityToSlot_.end() || !activeSlots_[it->second]) return nullptr;
        return &getArray<T>()[it->second];
    }

    template<typename T>
    const T* getComponent(EntityId id) const {
        auto it = entityToSlot_.find(id);
        if (it == entityToSlot_.end() || !activeSlots_[it->second]) return nullptr;
        return &getArray<T>()[it->second];
    }

    template<typename T, typename... Args>
    void addComponent(EntityId id, Args&&... args) {
        auto it = entityToSlot_.find(id);
        if (it == entityToSlot_.end()) return;
        size_t slot = it->second;
        if constexpr (std::is_same_v<T, LLMPlanComponent>) {
            hasLLMPlan_[slot] = true;
        }
        getArray<T>()[slot] = T(std::forward<Args>(args)...);
    }

    template<typename T>
    std::vector<EntityId> getEntitiesWithComponent() const {
        std::vector<EntityId> result;
        result.reserve(entityIds_.size());

        if constexpr (std::is_same_v<T, LLMPlanComponent>) {
            for (size_t i = 0; i < entityIds_.size(); ++i) {
                if (activeSlots_[i] && hasLLMPlan_[i]) {
                    result.push_back(entityIds_[i]);
                }
            }
        } else {
            for (size_t i = 0; i < entityIds_.size(); ++i) {
                if (activeSlots_[i]) {
                    result.push_back(entityIds_[i]);
                }
            }
        }
        return result;
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
        identity_.clear();
        position_.clear();
        stats_.clear();
        behavior_.clear();
        personality_.clear();
        lifecycle_.clear();
        resources_.clear();
        llmPlan_.clear();
        hasLLMPlan_.clear();
        entityIds_.clear();
        activeSlots_.clear();
        entityToSlot_.clear();
        while (!freeSlots_.empty()) freeSlots_.pop();
        while (!freeIds_.empty()) freeIds_.pop();
        nextEntityId_ = 0;
    }

    template<typename T>
    bool hasComponent(EntityId id) const {
        return getComponent<T>(id) != nullptr;
    }

    template<typename T>
    void removeComponent(EntityId) {}

private:
    Registry() = default;

    template<typename T> std::vector<T>& getArray() {
        if constexpr (std::is_same_v<T, IdentityComponent>)    return identity_;
        if constexpr (std::is_same_v<T, PositionComponent>)     return position_;
        if constexpr (std::is_same_v<T, StatsComponent>)        return stats_;
        if constexpr (std::is_same_v<T, BehaviorComponent>)      return behavior_;
        if constexpr (std::is_same_v<T, PersonalityComponent>)   return personality_;
        if constexpr (std::is_same_v<T, LifecycleComponent>)     return lifecycle_;
        if constexpr (std::is_same_v<T, ResourcesComponent>)     return resources_;
        if constexpr (std::is_same_v<T, LLMPlanComponent>)       return llmPlan_;
    }

    template<typename T> const std::vector<T>& getArray() const {
        if constexpr (std::is_same_v<T, IdentityComponent>)    return identity_;
        if constexpr (std::is_same_v<T, PositionComponent>)     return position_;
        if constexpr (std::is_same_v<T, StatsComponent>)        return stats_;
        if constexpr (std::is_same_v<T, BehaviorComponent>)      return behavior_;
        if constexpr (std::is_same_v<T, PersonalityComponent>)   return personality_;
        if constexpr (std::is_same_v<T, LifecycleComponent>)     return lifecycle_;
        if constexpr (std::is_same_v<T, ResourcesComponent>)     return resources_;
        if constexpr (std::is_same_v<T, LLMPlanComponent>)       return llmPlan_;
    }

    std::vector<IdentityComponent> identity_;
    std::vector<PositionComponent> position_;
    std::vector<StatsComponent> stats_;
    std::vector<BehaviorComponent> behavior_;
    std::vector<PersonalityComponent> personality_;
    std::vector<LifecycleComponent> lifecycle_;
    std::vector<ResourcesComponent> resources_;
    std::vector<LLMPlanComponent> llmPlan_;
    std::vector<bool> hasLLMPlan_;

    std::vector<EntityId> entityIds_;
    std::vector<bool> activeSlots_;
    std::unordered_map<EntityId, size_t> entityToSlot_;

    EntityId nextEntityId_ = 0;
    std::queue<EntityId> freeIds_;
    std::queue<size_t> freeSlots_;
};

}
