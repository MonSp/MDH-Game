#pragma once

#include <cstdint>
#include <typeindex>
#include <typeinfo>
#include <memory>
#include <vector>
#include <unordered_map>
#include <set>

namespace ECS {

using EntityId = uint64_t;
using ComponentTypeId = uint32_t;

class IComponent {
public:
    virtual ~IComponent() = default;
    virtual ComponentTypeId getTypeId() const = 0;
};

template<typename T>
class ComponentBase : public IComponent {
public:
    static ComponentTypeId getStaticTypeId() {
        static uint32_t id = nextTypeId++;
        return id;
    }

    ComponentTypeId getTypeId() const override {
        return T::getStaticTypeId();
    }

private:
    static uint32_t nextTypeId;
};

template<typename T>
uint32_t ComponentBase<T>::nextTypeId = 0;

template<typename T>
class Component : public ComponentBase<T> {
public:
    T value;

    Component() : value() {}
    Component(const T& val) : value(val) {}
    Component(T&& val) : value(std::move(val)) {}

    T& get() { return value; }
    const T& get() const { return value; }
};

struct ComponentTypeInfo {
    std::type_index type;
    size_t size;
    size_t alignment;
};

class ComponentRegistry {
public:
    static ComponentRegistry& getInstance() {
        static ComponentRegistry instance;
        return instance;
    }

    template<typename T>
    void registerComponent() {
        ComponentTypeId id = ComponentBase<T>::getStaticTypeId();
        if (componentInfos.find(id) == componentInfos.end()) {
            componentInfos[id] = ComponentTypeInfo{
                std::type_index(typeid(T)),
                sizeof(T),
                alignof(T)
            };
        }
    }

    ComponentTypeInfo getComponentInfo(ComponentTypeId id) const {
        return componentInfos.at(id);
    }

    size_t getComponentCount() const {
        return componentInfos.size();
    }

private:
    ComponentRegistry() = default;
    std::unordered_map<ComponentTypeId, ComponentTypeInfo> componentInfos;
};

}
