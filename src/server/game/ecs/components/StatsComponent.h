#pragma once

#include "../../ecs/Component.h"
#include <cstdint>

enum class RealmLevel : uint8_t {
    Mortal = 0,
    QiRefining = 1,
    FoundationBuilding = 2,
    GoldenCore = 3,
    YuanInfant = 4,
    Transcension = 5
};

enum class NPCRole : uint8_t {
    FamilyHead = 0,
    Elder = 1,
    CoreDisciple = 2,
    InnerDisciple = 3,
    BranchDisciple = 4,
    LawEnforcementElder = 5
};

struct StatsComponent : public ECS::ComponentBase<StatsComponent> {
    int32_t power;
    int32_t hp;
    int32_t maxHp;
    int32_t mp;
    int32_t maxMp;
    RealmLevel realm;
    int32_t cultivationPower;

    StatsComponent() : power(0), hp(0), maxHp(0), mp(0), maxMp(0),
        realm(RealmLevel::Mortal), cultivationPower(0) {}

    StatsComponent(int32_t pwr, int32_t mhp, int32_t mmp, RealmLevel rl)
        : power(pwr), hp(mhp), maxHp(mhp), mp(mmp), maxMp(mmp), realm(rl),
          cultivationPower(0) {}

    void takeDamage(int32_t dmg) {
        hp = (hp - dmg < 0) ? 0 : hp - dmg;
    }

    void heal(int32_t amount) {
        hp = (hp + amount > maxHp) ? maxHp : hp + amount;
    }

    void consumeMp(int32_t amount) {
        mp = (mp - amount < 0) ? 0 : mp - amount;
    }

    bool isDead() const {
        return hp <= 0;
    }

    float hpPercent() const {
        return (maxHp > 0) ? static_cast<float>(hp) / maxHp : 0.0f;
    }

    float mpPercent() const {
        return (maxMp > 0) ? static_cast<float>(mp) / maxMp : 0.0f;
    }
};
