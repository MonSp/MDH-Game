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

    float anger;
    float fear;
    float joy;

    SocialComponent() : hunger(0.0f), fatigue(0.0f), energy(80.0f),
        socialDesire(30.0f), mood(60.0f), homeX(0.0f), homeY(0.0f),
        anger(0.0f), fear(0.0f), joy(0.0f) {}

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

    void tickEmotions(float deltaTime) {
        (void)deltaTime;
        float decayRate = 0.995f;
        anger *= decayRate;
        fear *= decayRate;
        joy *= decayRate;
        clampEmotions();
    }

    void addAnger(float amount) { anger = clamp100(anger + amount); }
    void addFear(float amount)  { fear = clamp100(fear + amount); }
    void addJoy(float amount)   { joy = clamp100(joy + amount); }

    bool isEnraged(float caution) const {
        float threshold = 70.0f - caution * 0.3f;
        return anger > threshold;
    }
    bool isTerrified() const { return fear > 60.0f; }
    bool isElated(float sociability) const {
        float threshold = 80.0f - sociability * 0.2f;
        return joy > threshold;
    }

    void onInsulted(float caution) {
        float modifier = 1.0f - (caution / 100.0f) * 0.5f;
        addAnger(20.0f * modifier);
    }
    void onAttacked(float damage, float caution) {
        (void)damage;
        addFear(30.0f);
        float angerMod = 1.0f - (caution / 100.0f) * 0.3f;
        addAnger(15.0f * angerMod);
    }
    void onGiftReceived() { addJoy(25.0f); }
    void onSocialSuccess() { addJoy(10.0f); }

private:
    static float clamp100(float v) {
        if (v < 0.0f) return 0.0f;
        if (v > 100.0f) return 100.0f;
        return v;
    }

    void clampEmotions() {
        if (anger < 0.0f) anger = 0.0f;
        if (fear < 0.0f) fear = 0.0f;
        if (joy < 0.0f) joy = 0.0f;
        if (anger > 100.0f) anger = 100.0f;
        if (fear > 100.0f) fear = 100.0f;
        if (joy > 100.0f) joy = 100.0f;
    }
};
