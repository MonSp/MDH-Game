#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <cstring>

constexpr uint8_t HYSTERESIS_SURVIVAL_ENTER = 0;
constexpr uint8_t HYSTERESIS_SURVIVAL_EXIT = 5;
constexpr uint8_t HYSTERESIS_LEVEL_DOWNGRADE = 3;
constexpr uint8_t HYSTERESIS_LEVEL_UPGRADE = 0;
constexpr uint8_t HYSTERESIS_SAME_LEVEL = 2;

enum class NPCActivity : uint8_t {
    Idle = 0,
    Dead = 1,

    Flee = 10,
    Heal = 11,
    Defend = 12,

    Eat = 20,
    Rest = 21,
    Sleep = 22,
    Walk = 23,
    Chat = 24,
    AwaitOrders = 25,

    Cultivate = 30,
    Breakthrough = 31,
    Tribulation = 32,
    Meditate = 33,
    Alchemy = 34,
    SeekFortune = 35,

    VisitFriend = 40,
    Date = 41,
    FamilyGathering = 42,
    MentorTeach = 43,
    DiscipleAsk = 44,
    Trade = 45,
    Gossip = 46,
    ReportTask = 47,
    RefuseCommand = 48,
    CoordinateSquad = 49,

    Build = 50,
    Mine = 51,
    Farm = 52,
    Fish = 53,
    Lumber = 54,
    Gather = 55,
    Attack = 56,
    DefendPosition = 57,
    Patrol = 58,
    Escort = 59,
    Scout = 60,

    Craft = 70,
    Refine = 71,
    Cook = 72,
    Tailor = 73,
    Construct = 74,
    Repair = 75,

    Buy = 80,
    Sell = 81,
    Bargain = 82,

    Duel = 90,
    Hunt = 91,
    Ambush = 92,
    Assassinate = 93,

    Explore = 100,
    TreasureHunt = 101,
    MapExplore = 102,

    Incapacitated = 200
};

enum class BehaviorTag : uint32_t {
    None = 0,
    ProducesSpiritStones = 1 << 0,
    ProducesCultivation = 1 << 1,
    ProducesEquipment = 1 << 2,
    ProducesFood = 1 << 3,
    ProducesMaterials = 1 << 4,
    SceneOutdoor = 1 << 5,
    SceneIndoor = 1 << 6,
    SceneAny = 1 << 7,
    IntensityLow = 1 << 8,
    IntensityMedium = 1 << 9,
    IntensityHigh = 1 << 10,
    CategoryProduction = 1 << 11,
    CategorySocial = 1 << 12,
    CategoryCombat = 1 << 13,
    CategoryExploration = 1 << 14,
    CategoryCultivation = 1 << 15,
    RequiresSocial = 1 << 16,
    RequiresMovement = 1 << 17,
    RequiresResources = 1 << 18,
    SoloActivity = 1 << 19,
    GroupActivity = 1 << 20,
};

static uint32_t getActivityTags(NPCActivity act) {
    switch (act) {
        case NPCActivity::Mine:    return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Farm:    return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::CategoryProduction);
        case NPCActivity::Fish:    return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::CategoryProduction);
        case NPCActivity::Lumber:  return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Gather:  return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Craft:   return static_cast<uint32_t>(BehaviorTag::ProducesEquipment) | static_cast<uint32_t>(BehaviorTag::SceneIndoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Refine:  return static_cast<uint32_t>(BehaviorTag::ProducesMaterials) | static_cast<uint32_t>(BehaviorTag::SceneIndoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Cook:    return static_cast<uint32_t>(BehaviorTag::ProducesFood) | static_cast<uint32_t>(BehaviorTag::SceneIndoor) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Build:   return static_cast<uint32_t>(BehaviorTag::ProducesEquipment) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityHigh) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Construct: return static_cast<uint32_t>(BehaviorTag::ProducesEquipment) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityHigh) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Repair:  return static_cast<uint32_t>(BehaviorTag::ProducesEquipment) | static_cast<uint32_t>(BehaviorTag::SceneAny) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Sell:    return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::SceneIndoor) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::Buy:     return static_cast<uint32_t>(BehaviorTag::ProducesEquipment) | static_cast<uint32_t>(BehaviorTag::SceneIndoor) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::CategoryProduction) | static_cast<uint32_t>(BehaviorTag::RequiresResources) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::VisitFriend: return static_cast<uint32_t>(BehaviorTag::CategorySocial) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::RequiresMovement) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::Date:    return static_cast<uint32_t>(BehaviorTag::CategorySocial) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::RequiresMovement) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::Gossip:  return static_cast<uint32_t>(BehaviorTag::CategorySocial) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::SceneAny) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::MentorTeach: return static_cast<uint32_t>(BehaviorTag::ProducesCultivation) | static_cast<uint32_t>(BehaviorTag::CategorySocial) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::DiscipleAsk: return static_cast<uint32_t>(BehaviorTag::ProducesCultivation) | static_cast<uint32_t>(BehaviorTag::CategorySocial) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::Trade:   return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::CategorySocial) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::Hunt:    return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::CategoryCombat) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityHigh) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Explore: return static_cast<uint32_t>(BehaviorTag::CategoryExploration) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::RequiresMovement) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::TreasureHunt: return static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones) | static_cast<uint32_t>(BehaviorTag::CategoryExploration) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::MapExplore: return static_cast<uint32_t>(BehaviorTag::CategoryExploration) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityHigh) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Patrol:  return static_cast<uint32_t>(BehaviorTag::CategoryCombat) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Scout:   return static_cast<uint32_t>(BehaviorTag::CategoryExploration) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Cultivate: return static_cast<uint32_t>(BehaviorTag::ProducesCultivation) | static_cast<uint32_t>(BehaviorTag::CategoryCultivation) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::Meditate: return static_cast<uint32_t>(BehaviorTag::ProducesCultivation) | static_cast<uint32_t>(BehaviorTag::CategoryCultivation) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::SeekFortune: return static_cast<uint32_t>(BehaviorTag::ProducesCultivation) | static_cast<uint32_t>(BehaviorTag::CategoryExploration) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::RequiresMovement);
        case NPCActivity::Alchemy: return static_cast<uint32_t>(BehaviorTag::ProducesEquipment) | static_cast<uint32_t>(BehaviorTag::CategoryCultivation) | static_cast<uint32_t>(BehaviorTag::SceneIndoor) | static_cast<uint32_t>(BehaviorTag::IntensityMedium) | static_cast<uint32_t>(BehaviorTag::RequiresResources);
        case NPCActivity::Walk:    return static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::RequiresMovement) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::Rest:    return static_cast<uint32_t>(BehaviorTag::SceneAny) | static_cast<uint32_t>(BehaviorTag::IntensityLow) | static_cast<uint32_t>(BehaviorTag::SoloActivity);
        case NPCActivity::Duel:    return static_cast<uint32_t>(BehaviorTag::CategoryCombat) | static_cast<uint32_t>(BehaviorTag::IntensityHigh) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        case NPCActivity::Attack:  return static_cast<uint32_t>(BehaviorTag::CategoryCombat) | static_cast<uint32_t>(BehaviorTag::SceneOutdoor) | static_cast<uint32_t>(BehaviorTag::IntensityHigh) | static_cast<uint32_t>(BehaviorTag::RequiresMovement) | static_cast<uint32_t>(BehaviorTag::GroupActivity);
        default: return static_cast<uint32_t>(BehaviorTag::None);
    }
}

static float jaccardSimilarity(NPCActivity a, NPCActivity b) {
    uint32_t tagsA = getActivityTags(a);
    uint32_t tagsB = getActivityTags(b);
    if (tagsA == 0 && tagsB == 0) return 0.0f;

    uint32_t intersection = tagsA & tagsB;
    uint32_t union_ = tagsA | tagsB;

    int intCount = 0, unionCount = 0;
    uint32_t check = 1;
    for (int i = 0; i < 24; i++) {
        if (intersection & check) intCount++;
        if (union_ & check) unionCount++;
        check <<= 1;
    }

    if (unionCount == 0) return 0.0f;
    return static_cast<float>(intCount) / static_cast<float>(unionCount);
}

enum class CommandStatus : uint8_t {
    Pending = 0,
    Executing = 1,
    Completed = 2,
    Failed = 3,
    Rejected = 4
};

#pragma pack(push, 1)
struct ActivityOutcome {
    NPCActivity activity;
    int8_t resultScore;
    uint8_t _pad;
};
#pragma pack(pop)

struct ReflectionData {
    static constexpr int MAX_TRACKED = 8;

    NPCActivity trackedTypes[MAX_TRACKED];
    int8_t recentResults[MAX_TRACKED][3];
    float weightMultiplier[MAX_TRACKED];
    uint8_t penaltyCount[MAX_TRACKED];
    uint64_t lastPenaltyFrame[MAX_TRACKED];
    uint8_t trackedCount;

    uint8_t stuckCount;
    uint64_t lastStuckFrame;
    uint8_t microPlanTriggered;
    NPCActivity microPlanActivity;
    uint32_t microPlanTargetSlot;

    ReflectionData() : trackedCount(0), stuckCount(0), lastStuckFrame(0),
        microPlanTriggered(0), microPlanActivity(NPCActivity::Rest), microPlanTargetSlot(0) {
        memset(trackedTypes, 0, sizeof(trackedTypes));
        memset(recentResults, 0, sizeof(recentResults));
        for (int i = 0; i < MAX_TRACKED; i++) weightMultiplier[i] = 1.0f;
        memset(penaltyCount, 0, sizeof(penaltyCount));
        memset(lastPenaltyFrame, 0, sizeof(lastPenaltyFrame));
    }

    int findOrCreate(NPCActivity act) {
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (trackedTypes[i] == act) return i;
        }
        if (trackedCount >= MAX_TRACKED) return -1;
        trackedTypes[trackedCount] = act;
        return trackedCount++;
    }

    void recordResult(NPCActivity act, int8_t score, uint64_t currentFrame = 0) {
        int idx = findOrCreate(act);
        if (idx < 0) return;
        recentResults[idx][0] = recentResults[idx][1];
        recentResults[idx][1] = recentResults[idx][2];
        recentResults[idx][2] = score;

        int8_t sum = recentResults[idx][0] + recentResults[idx][1] + recentResults[idx][2];
        if (sum <= -9) weightMultiplier[idx] = 0.5f;
        else if (sum <= -3) weightMultiplier[idx] = 0.7f;
        else if (sum >= 9) weightMultiplier[idx] = 1.5f;
        else if (sum >= 3) weightMultiplier[idx] = 1.2f;
        else weightMultiplier[idx] = 1.0f;

        if (weightMultiplier[idx] < 1.0f) {
            penaltyCount[idx]++;
            lastPenaltyFrame[idx] = currentFrame;
        } else if (weightMultiplier[idx] >= 1.0f) {
            penaltyCount[idx] = 0;
        }
    }

    float getWeight(NPCActivity act) const {
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (trackedTypes[i] == act) return weightMultiplier[i];
        }
        return 1.0f;
    }

    float getWeightWithDecay(NPCActivity act, uint64_t currentFrame, float diligence) const {
        int idx = -1;
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (trackedTypes[i] == act) { idx = static_cast<int>(i); break; }
        }
        if (idx < 0) return 1.0f;

        float baseWeight = weightMultiplier[idx];
        if (baseWeight >= 1.0f) return baseWeight;

        uint64_t framesSincePenalty = currentFrame - lastPenaltyFrame[idx];
        if (framesSincePenalty < 500) return baseWeight;

        float halfLives = static_cast<float>(framesSincePenalty) / 500.0f;

        float diligenceMod = 1.0f;
        if (diligence >= 70.0f) diligenceMod = 1.5f;
        else if (diligence < 30.0f) diligenceMod = 0.5f;

        float satMod = 1.0f;
        if (penaltyCount[idx] > 1) {
            float decay = 1.0f;
            for (uint8_t p = 1; p < penaltyCount[idx]; p++) {
                decay *= 0.8f;
            }
            satMod = (decay < 0.2f) ? 0.2f : decay;
        }

        float effectiveHalfLives = halfLives * diligenceMod * satMod;

        float gap = 1.0f - baseWeight;
        float recoverFactor = 1.0f;
        for (float i = 0; i < effectiveHalfLives; i += 1.0f) {
            recoverFactor *= 0.5f;
        }
        float frac = effectiveHalfLives - static_cast<float>(static_cast<int>(effectiveHalfLives));
        if (frac > 0.0f) {
            recoverFactor *= (1.0f - frac * 0.5f);
        }

        float recovered = 1.0f - gap * recoverFactor;
        if (recovered > 1.0f) recovered = 1.0f;

        return recovered;
    }

    bool allBehaviorsLow() const {
        if (trackedCount == 0) return false;
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (weightMultiplier[i] >= 0.7f) return false;
        }
        return trackedCount >= 3;
    }

    NPCActivity getHighestWeightedActivity() const {
        NPCActivity best = NPCActivity::Rest;
        float bestWeight = 0.0f;
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (weightMultiplier[i] > bestWeight) {
                bestWeight = weightMultiplier[i];
                best = trackedTypes[i];
            }
        }
        return best;
    }
};

struct BehaviorComponent : public ECS::ComponentBase<BehaviorComponent> {
    NPCActivity currentActivity;
    NPCActivity previousActivity;
    uint64_t activityStartTime;
    uint32_t activityStep;
    float activityProgress;

    uint64_t activityStartFrame;
    uint8_t hysteresisFrames;
    uint8_t hysteresisLocked;
    uint8_t lastInterruptSource;

    ReflectionData reflection;

    BehaviorComponent() : currentActivity(NPCActivity::Rest), previousActivity(NPCActivity::Rest),
        activityStartTime(0), activityStep(0), activityProgress(0.0f),
        activityStartFrame(0), hysteresisFrames(0), hysteresisLocked(0), lastInterruptSource(0) {}

    void changeActivity(NPCActivity newActivity) {
        previousActivity = currentActivity;
        currentActivity = newActivity;
        activityStartTime = 0;
        activityStep = 0;
        activityProgress = 0.0f;
        hysteresisFrames = 0;
        hysteresisLocked = 0;
    }

    bool isIdle() const {
        return currentActivity == NPCActivity::Idle ||
               currentActivity == NPCActivity::Rest;
    }

    bool isBusy() const {
        return !isIdle() && currentActivity != NPCActivity::Dead &&
               currentActivity != NPCActivity::Incapacitated;
    }
};
