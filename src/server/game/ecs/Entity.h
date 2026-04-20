#pragma once

#include "Component.h"
#include <vector>
#include <algorithm>

namespace ECS {

class EntityBuilder;

class Entity {
public:
    EntityId getId() const { return id; }
    bool isValid() const { return valid; }

private:
    EntityId id;
    bool valid;

    Entity(EntityId id) : id(id), valid(true) {}
    void invalidate() { valid = false; }

    friend class EntityBuilder;
    friend class Registry;
};

class EntityBuilder {
public:
    EntityBuilder(Registry& registry, EntityId id) : registry_(registry), entityId_(id) {}

    template<typename T, typename... Args>
    EntityBuilder& withComponent(Args&&... args) {
        registry_.addComponent<T>(entityId_, std::forward<Args>(args)...);
        return *this;
    }

    Entity build() {
        return Entity(entityId_);
    }

private:
    Registry& registry_;
    EntityId entityId_;
};

}
