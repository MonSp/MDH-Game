#pragma once

#include "../../ecs/Component.h"
#include <cstdint>

enum class NPCLifeState : uint8_t {
    Waiting = 0,
    Born = 1,
    Growing = 2,
    Active = 3,
    Dying = 4,
    Dead = 5
};

enum class BirthType : uint8_t {
    Natural = 0,
    WarOrphan = 1,
    Wanderer = 2,
    DemonBeast = 3
};

enum class DeathCause : uint8_t {
    AgeLimit = 0,
    Battle = 1,
    CultivationFail = 2,
    MonsterAttack = 3,
    Robbery = 4,
    LawEnforcement = 5,
    TribulationFail = 6,
    FireDeviation = 7
};

struct LifecycleComponent : public ECS::ComponentBase<LifecycleComponent> {
    uint64_t birthTime;
    float age;
    NPCLifeState lifeState;
    BirthType birthType;
    DeathCause* deathCause;
    uint64_t lastUpdateTime;

    LifecycleComponent() : birthTime(0), age(0), lifeState(NPCLifeState::Active),
        birthType(BirthType::Natural), deathCause(nullptr), lastUpdateTime(0) {}

    ~LifecycleComponent() {
        if (deathCause) {
            delete deathCause;
        }
    }

    LifecycleComponent(const LifecycleComponent& other) : birthTime(other.birthTime),
        age(other.age), lifeState(other.lifeState), birthType(other.birthType),
        deathCause(other.deathCause ? new DeathCause(*other.deathCause) : nullptr),
        lastUpdateTime(other.lastUpdateTime) {}

    LifecycleComponent& operator=(const LifecycleComponent& other) {
        if (this != &other) {
            birthTime = other.birthTime;
            age = other.age;
            lifeState = other.lifeState;
            birthType = other.birthType;
            if (deathCause) delete deathCause;
            deathCause = other.deathCause ? new DeathCause(*other.deathCause) : nullptr;
            lastUpdateTime = other.lastUpdateTime;
        }
        return *this;
    }

    void ageOneYear() {
        age += 1.0f;
    }

    void setDead(DeathCause cause) {
        lifeState = NPCLifeState::Dead;
        deathCause = new DeathCause(cause);
    }

    bool shouldBeDeadByAge(uint32_t maxAge) const {
        return age >= maxAge;
    }
};
