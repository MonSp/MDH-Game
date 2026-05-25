#pragma once

#include "../../ecs/Component.h"
#include <cstdint>

struct SocialComponent : public ECS::ComponentBase<SocialComponent> {
    float hunger;
    float fatigue;
    float energy;
    float socialDesire;
    float mood;
    float homeX;
    float homeY;

    SocialComponent() : hunger(0.0f), fatigue(0.0f), energy(80.0f),
        socialDesire(30.0f), mood(60.0f), homeX(0.0f), homeY(0.0f) {}

    void tickDaily(float deltaHours) {
        hunger = clamp100(hunger + 4.0f * deltaHours);
        fatigue = clamp100(fatigue + 3.0f * deltaHours);
        energy = clamp100(energy - 3.0f * deltaHours);
        socialDesire = clamp100(socialDesire + 2.0f * deltaHours);
        mood = clamp100(mood - 2.0f * deltaHours);
    }

    void onEat() {
        hunger = clamp100(hunger - 40.0f);
        mood = clamp100(mood + 10.0f);
        energy = clamp100(energy + 10.0f);
    }

    void onSleep() {
        fatigue = clamp100(fatigue - 50.0f);
        energy = clamp100(energy + 40.0f);
    }

    void onRest(float deltaHours) {
        fatigue = clamp100(fatigue - 5.0f * deltaHours);
        energy = clamp100(energy + 8.0f * deltaHours);
    }

    void onSocialize() {
        socialDesire = clamp100(socialDesire - 25.0f);
        mood = clamp100(mood + 15.0f);
    }

    bool isHungry() const { return hunger > 70.0f; }
    bool isExhausted() const { return fatigue > 80.0f; }
    bool wantsSocial() const { return socialDesire > 60.0f; }

private:
    static float clamp100(float v) {
        if (v < 0.0f) return 0.0f;
        if (v > 100.0f) return 100.0f;
        return v;
    }
};
