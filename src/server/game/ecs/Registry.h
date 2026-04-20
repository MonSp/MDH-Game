#pragma once

#include "Component.h"
#include "Entity.h"
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <functional>

namespace ECS {

class Registry {
public:
    static Registry& getInstance() {
        static Registry instance;
        return instance;
    }

    Entity createEntity() {
        EntityId id;
        if (freeIds.empty()) {
            id = nextEntityId++;
        } else {
            id = freeIds.front();
            freeIds.pop();
        }
        entityComponents[id] = {};
        return Entity(id);
    }

    void destroyEntity(EntityId id) {
        if (entityComponents.find(id) != entityComponents.end()) {
            entityComponents.erase(id);
            freeIds.push(id);
        }
    }

    template<typename T>
    bool hasComponent(EntityId id) const {
        auto it = entityComponents.find(id);
        if (it == entityComponents.end()) return false;
        return it->second.find(ComponentBase<T>::getStaticTypeId()) != it->second.end();
    }

    template<typename T>
    T* getComponent(EntityId id) {
        auto typeId = ComponentBase<T>::getStaticTypeId();
        auto it = entityComponents.find(id);
        if (it == entityComponents.end()) return nullptr;

        auto compIt = it->second.find(typeId);
        if (compIt == it->second.end()) return nullptr;

        return static_cast<T*>(compIt->second.get());
    }

    template<typename T>
    const T* getComponent(EntityId id) const {
        auto typeId = ComponentBase<T>::getStaticTypeId();
        auto it = entityComponents.find(id);
        if (it == entityComponents.end()) return nullptr;

        auto compIt = it->second.find(typeId);
        if (compIt == it->second.end()) return nullptr;

        return static_cast<const T*>(compIt->second.get());
    }

    template<typename T, typename... Args>
    void addComponent(EntityId id, Args&&... args) {
        auto typeId = ComponentBase<T>::getStaticTypeId();
        ComponentRegistry::getInstance().registerComponent<T>();

        if (entityComponents.find(id) == entityComponents.end()) {
            entityComponents[id] = {};
        }

        entityComponents[id][typeId] = std::make_unique<T>(std::forward<Args>(args)...);
    }

    template<typename T>
    void removeComponent(EntityId id) {
        auto typeId = ComponentBase<T>::getStaticTypeId();
        auto it = entityComponents.find(id);
        if (it != entityComponents.end()) {
            it->second.erase(typeId);
        }
    }

    template<typename T>
    void removeComponentSafe(EntityId id) {
        auto typeId = ComponentBase<T>::getStaticTypeId();
        auto it = entityComponents.find(id);
        if (it != entityComponents.end()) {
            it->second.erase(typeId);
        }
    }

    std::vector<EntityId> getAllEntities() const {
        std::vector<EntityId> entities;
        for (const auto& pair : entityComponents) {
            entities.push_back(pair.first);
        }
        return entities;
    }

    size_t getEntityCount() const {
        return entityComponents.size();
    }

    void clear() {
        entityComponents.clear();
        while (!freeIds.empty()) freeIds.pop();
        nextEntityId = 0;
    }

    template<typename T>
    std::vector<EntityId> getEntitiesWithComponent() const {
        std::vector<EntityId> result;
        auto typeId = ComponentBase<T>::getStaticTypeId();
        for (const auto& pair : entityComponents) {
            if (pair.second.find(typeId) != pair.second.end()) {
                result.push_back(pair.first);
            }
        }
        return result;
    }

    template<typename T1, typename T2>
    std::vector<EntityId> getEntitiesWithComponents() const {
        std::vector<EntityId> result;
        auto typeId1 = ComponentBase<T1>::getStaticTypeId();
        auto typeId2 = ComponentBase<T2>::getStaticTypeId();
        for (const auto& pair : entityComponents) {
            const auto& components = pair.second;
            if (components.find(typeId1) != components.end() &&
                components.find(typeId2) != components.end()) {
                result.push_back(pair.first);
            }
        }
        return result;
    }

private:
    Registry() = default;

    EntityId nextEntityId = 0;
    std::queue<EntityId> freeIds;
    std::unordered_map<EntityId, std::unordered_map<ComponentTypeId, std::unique_ptr<IComponent>>> entityComponents;
};

EntityBuilder createEntity();

}
