#pragma once

#include "../../ecs/Component.h"
#include "PersonalityComponent.h"
#include "StatsComponent.h"
#include "IdentityComponent.h"
#include <cstdint>
#include <cstdlib>
#include <cstring>

constexpr uint8_t HYSTERESIS_SURVIVAL_ENTER = 0;
constexpr uint64_t DECISION_REVEAL_WINDOW_FRAMES = 86400;
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

    SocialHelp = 83,

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

enum class CareerTag : uint16_t {
    None = 0,
    Miner = 1 << 0,
    Fisher = 1 << 1,
    Smith = 1 << 2,
    Farmer = 1 << 3,
    Hunter = 1 << 4,
    Cultivator = 1 << 5,
    Merchant = 1 << 6,
    Soldier = 1 << 7,
    General = 1 << 8,
};

enum class ResourceTag : uint16_t {
    None = 0,
    ProducesSpiritStones = 1 << 0,
    ProducesFood = 1 << 1,
    ProducesEquipment = 1 << 2,
    ProducesMaterials = 1 << 3,
    ProducesCultivation = 1 << 4,
    CostsStamina = 1 << 5,
    CostsSpiritStones = 1 << 6,
    NeedsWater = 1 << 7,
    NeedsMine = 1 << 8,
    NeedsForest = 1 << 9,
    NeedsBuilding = 1 << 10,
};

enum class PersonalityTag : uint16_t {
    None = 0,
    PreferSolitude = 1 << 0,
    PreferCooperation = 1 << 1,
    RiskSeeking = 1 << 2,
    RiskAverse = 1 << 3,
    HighStamina = 1 << 4,
    LowStamina = 1 << 5,
    RepetitiveWork = 1 << 6,
    CreativeWork = 1 << 7,
};

struct ActivityTagBundle {
    uint16_t careerTags;
    uint16_t resourceTags;
    uint16_t personalityTags;

    ActivityTagBundle() : careerTags(0), resourceTags(0), personalityTags(0) {}
    ActivityTagBundle(uint16_t c, uint16_t r, uint16_t p)
        : careerTags(c), resourceTags(r), personalityTags(p) {}
};

static ActivityTagBundle getActivityTagBundle(NPCActivity act) {
    switch (act) {
        case NPCActivity::Flee:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskAverse) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Heal:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones),
                static_cast<uint16_t>(PersonalityTag::RiskAverse) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Defend:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Eat:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Rest:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Sleep:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Walk:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Chat:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::AwaitOrders:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Cultivate:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation) | static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::RiskSeeking));
        case NPCActivity::Breakthrough:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Tribulation:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation) | static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Meditate:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation),
                static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::RiskAverse) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Alchemy:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::ProducesMaterials) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::CreativeWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::SeekFortune:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation) | static_cast<uint16_t>(ResourceTag::ProducesMaterials),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::VisitFriend:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Date:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::FamilyGathering:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::MentorTeach:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::DiscipleAsk:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Cultivator),
                static_cast<uint16_t>(ResourceTag::ProducesCultivation),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Trade:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Merchant),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Gossip:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::ReportTask:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::RefuseCommand:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::CoordinateSquad:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Build:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::CreativeWork) | static_cast<uint16_t>(PersonalityTag::HighStamina));
        case NPCActivity::Mine:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Miner),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsMine),
                static_cast<uint16_t>(PersonalityTag::HighStamina) | static_cast<uint16_t>(PersonalityTag::RepetitiveWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Farm:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Farmer),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::ProducesFood) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsForest),
                static_cast<uint16_t>(PersonalityTag::RepetitiveWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Fish:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Fisher),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::ProducesFood) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsWater),
                static_cast<uint16_t>(PersonalityTag::LowStamina) | static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::RepetitiveWork));
        case NPCActivity::Lumber:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Farmer),
                static_cast<uint16_t>(ResourceTag::ProducesMaterials) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsForest),
                static_cast<uint16_t>(PersonalityTag::HighStamina) | static_cast<uint16_t>(PersonalityTag::RepetitiveWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Gather:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::ProducesMaterials) | static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::LowStamina) | static_cast<uint16_t>(PersonalityTag::RepetitiveWork));
        case NPCActivity::Attack:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::HighStamina));
        case NPCActivity::DefendPosition:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskAverse) | static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Patrol:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskAverse) | static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::RepetitiveWork));
        case NPCActivity::Escort:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskAverse) | static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Scout:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Craft:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Smith),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::CreativeWork));
        case NPCActivity::Refine:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Smith),
                static_cast<uint16_t>(ResourceTag::ProducesMaterials) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::RepetitiveWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Cook:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Farmer),
                static_cast<uint16_t>(ResourceTag::ProducesFood) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::CreativeWork));
        case NPCActivity::Tailor:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Smith),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::CreativeWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Construct:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Smith),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::CostsStamina) | static_cast<uint16_t>(ResourceTag::NeedsBuilding),
                static_cast<uint16_t>(PersonalityTag::HighStamina) | static_cast<uint16_t>(PersonalityTag::CreativeWork));
        case NPCActivity::Repair:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Smith),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RepetitiveWork) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Buy:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Merchant),
                static_cast<uint16_t>(ResourceTag::ProducesEquipment) | static_cast<uint16_t>(ResourceTag::ProducesMaterials) | static_cast<uint16_t>(ResourceTag::CostsSpiritStones),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Sell:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Merchant),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation) | static_cast<uint16_t>(PersonalityTag::LowStamina));
        case NPCActivity::Bargain:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Merchant),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        case NPCActivity::Duel:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::HighStamina));
        case NPCActivity::Hunt:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Hunter),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::ProducesFood) | static_cast<uint16_t>(ResourceTag::ProducesMaterials) | static_cast<uint16_t>(ResourceTag::CostsStamina),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::HighStamina));
        case NPCActivity::Ambush:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::Assassinate:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::Soldier),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::HighStamina));
        case NPCActivity::Explore:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::ProducesMaterials),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::TreasureHunt:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::ProducesSpiritStones) | static_cast<uint16_t>(ResourceTag::ProducesMaterials),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude));
        case NPCActivity::MapExplore:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::ProducesMaterials),
                static_cast<uint16_t>(PersonalityTag::RiskSeeking) | static_cast<uint16_t>(PersonalityTag::PreferSolitude) | static_cast<uint16_t>(PersonalityTag::HighStamina));
        case NPCActivity::SocialHelp:
            return ActivityTagBundle(
                static_cast<uint16_t>(CareerTag::General),
                static_cast<uint16_t>(ResourceTag::None),
                static_cast<uint16_t>(PersonalityTag::PreferCooperation));
        default:
            return ActivityTagBundle();
    }
}

// DEPRECATED: use getActivityTagBundle() instead
static uint32_t getActivityTags(NPCActivity act) {
    ActivityTagBundle bundle = getActivityTagBundle(act);
    uint32_t result = static_cast<uint32_t>(BehaviorTag::None);

    if (bundle.resourceTags & static_cast<uint16_t>(ResourceTag::ProducesSpiritStones))
        result |= static_cast<uint32_t>(BehaviorTag::ProducesSpiritStones);
    if (bundle.resourceTags & static_cast<uint16_t>(ResourceTag::ProducesCultivation))
        result |= static_cast<uint32_t>(BehaviorTag::ProducesCultivation);
    if (bundle.resourceTags & static_cast<uint16_t>(ResourceTag::ProducesEquipment))
        result |= static_cast<uint32_t>(BehaviorTag::ProducesEquipment);
    if (bundle.resourceTags & static_cast<uint16_t>(ResourceTag::ProducesFood))
        result |= static_cast<uint32_t>(BehaviorTag::ProducesFood);
    if (bundle.resourceTags & static_cast<uint16_t>(ResourceTag::ProducesMaterials))
        result |= static_cast<uint32_t>(BehaviorTag::ProducesMaterials);

    if (bundle.careerTags & static_cast<uint16_t>(CareerTag::Cultivator))
        result |= static_cast<uint32_t>(BehaviorTag::CategoryCultivation);
    if (bundle.careerTags & static_cast<uint16_t>(CareerTag::Soldier))
        result |= static_cast<uint32_t>(BehaviorTag::CategoryCombat);

    uint16_t productiveMask = static_cast<uint16_t>(ResourceTag::ProducesSpiritStones)
                            | static_cast<uint16_t>(ResourceTag::ProducesCultivation)
                            | static_cast<uint16_t>(ResourceTag::ProducesEquipment)
                            | static_cast<uint16_t>(ResourceTag::ProducesFood)
                            | static_cast<uint16_t>(ResourceTag::ProducesMaterials);
    if (bundle.resourceTags & productiveMask)
        result |= static_cast<uint32_t>(BehaviorTag::CategoryProduction);

    if (bundle.personalityTags & static_cast<uint16_t>(PersonalityTag::PreferSolitude))
        result |= static_cast<uint32_t>(BehaviorTag::SoloActivity);
    if (bundle.personalityTags & static_cast<uint16_t>(PersonalityTag::PreferCooperation)) {
        result |= static_cast<uint32_t>(BehaviorTag::GroupActivity);
        result |= static_cast<uint32_t>(BehaviorTag::RequiresSocial);
    }

    if (bundle.personalityTags & static_cast<uint16_t>(PersonalityTag::HighStamina))
        result |= static_cast<uint32_t>(BehaviorTag::IntensityHigh);
    else if (bundle.personalityTags & static_cast<uint16_t>(PersonalityTag::LowStamina))
        result |= static_cast<uint32_t>(BehaviorTag::IntensityLow);
    else
        result |= static_cast<uint32_t>(BehaviorTag::IntensityMedium);

    if (bundle.resourceTags & static_cast<uint16_t>(ResourceTag::CostsSpiritStones))
        result |= static_cast<uint32_t>(BehaviorTag::RequiresResources);

    return result;
}

static float jaccardUint16(uint16_t a, uint16_t b) {
    if (a == 0 && b == 0) return 0.0f;
    uint16_t intersection = a & b;
    uint16_t union_ = a | b;
    int intCount = 0, unionCount = 0;
    uint16_t check = 1;
    for (int i = 0; i < 16; i++) {
        if (intersection & check) intCount++;
        if (union_ & check) unionCount++;
        check <<= 1;
    }
    if (unionCount == 0) return 0.0f;
    return static_cast<float>(intCount) / static_cast<float>(unionCount);
}

static float jaccardSimilarity(NPCActivity a, NPCActivity b) {
    ActivityTagBundle tagsA = getActivityTagBundle(a);
    ActivityTagBundle tagsB = getActivityTagBundle(b);

    float careerJaccard = jaccardUint16(tagsA.careerTags, tagsB.careerTags);
    float resourceJaccard = jaccardUint16(tagsA.resourceTags, tagsB.resourceTags);
    float personalityJaccard = jaccardUint16(tagsA.personalityTags, tagsB.personalityTags);

    return careerJaccard * 0.6f + resourceJaccard * 0.3f + personalityJaccard * 0.1f;
}

static float computeTagSimilarity(NPCActivity current, NPCActivity candidate,
                                   const PersonalityComponent* personality,
                                   uint16_t factionHeritage,
                                   uint8_t stickinessDecay) {
    ActivityTagBundle curTags = getActivityTagBundle(current);
    ActivityTagBundle candTags = getActivityTagBundle(candidate);

    float identityScore = jaccardUint16(curTags.careerTags, candTags.careerTags);

    float personalityScore = 0.0f;
    int personalityFactors = 0;
    if (personality) {
        if (personality->diligence > 60.0f) {
            personalityFactors++;
            uint16_t productiveMask = static_cast<uint16_t>(ResourceTag::ProducesSpiritStones)
                                    | static_cast<uint16_t>(ResourceTag::ProducesFood)
                                    | static_cast<uint16_t>(ResourceTag::ProducesEquipment)
                                    | static_cast<uint16_t>(ResourceTag::ProducesMaterials)
                                    | static_cast<uint16_t>(ResourceTag::ProducesCultivation);
            if (candTags.resourceTags & productiveMask) {
                personalityScore += 1.0f;
            }
        }
        if (personality->caution > 60.0f) {
            personalityFactors++;
            if ((candTags.personalityTags & static_cast<uint16_t>(PersonalityTag::RiskAverse))
                || (candTags.personalityTags & static_cast<uint16_t>(PersonalityTag::LowStamina))
                || !(candTags.personalityTags & static_cast<uint16_t>(PersonalityTag::RiskSeeking))) {
                personalityScore += 1.0f;
            }
        }
        if (personality->ambition > 60.0f) {
            personalityFactors++;
            if ((candTags.personalityTags & static_cast<uint16_t>(PersonalityTag::RiskSeeking))
                || (candTags.careerTags & static_cast<uint16_t>(CareerTag::General))) {
                personalityScore += 1.0f;
            }
        }
        if (personality->sociability > 60.0f) {
            personalityFactors++;
            if (candTags.personalityTags & static_cast<uint16_t>(PersonalityTag::PreferCooperation)) {
                personalityScore += 1.0f;
            }
        }
        if (personality->greed > 60.0f) {
            personalityFactors++;
            if (candTags.resourceTags & static_cast<uint16_t>(ResourceTag::ProducesSpiritStones)) {
                personalityScore += 1.0f;
            }
        }
        if (personalityFactors > 0) {
            personalityScore /= static_cast<float>(personalityFactors);
        } else {
            personalityScore = 0.5f;
        }
    } else {
        personalityScore = 0.5f;
    }

    float resourceScore = 1.0f;

    float result = identityScore * 0.6f + personalityScore * 0.3f + resourceScore * 0.1f;

    if (factionHeritage != 0 && (candTags.careerTags & factionHeritage)) {
        float heritageBonus = 1.5f;
        if (stickinessDecay > 0) {
            float decayMul = 1.0f;
            for (uint8_t d = 0; d < stickinessDecay; d++) {
                decayMul *= 0.8f;
            }
            if (decayMul < 0.1f) decayMul = 0.1f;
            heritageBonus *= decayMul;
        }
        result *= heritageBonus;
    }

    if (result > 1.0f) result = 1.0f;
    if (result < 0.0f) result = 0.0f;

    return result;
}

enum class CommandStatus : uint8_t {
    Pending = 0,
    Executing = 1,
    Completed = 2,
    Failed = 3,
    Rejected = 4
};

enum class DecisionReason : uint8_t {
    SurvivalLowHP = 1,
    SurvivalRecovery = 2,
    EmotionAnger = 10,
    EmotionFear = 11,
    EmotionJoy = 12,
    CommandExecute = 20,
    CommandRefuse = 21,
    LLMPlanStep = 30,
    SocialVisit = 40,
    SocialDate = 41,
    SocialTeach = 42,
    SocialGossip = 43,
    CultivationDaily = 50,
    CultivationBreakthrough = 51,
    CultivationTribulation = 52,
    CultivationSeekFortune = 53,
    DailyNeed = 60,
    DailyReflection = 61,
    DailyReflectionRecover = 62,
    DailyMicroPlan = 63,
    DailyRoleDefault = 64,
    SocialHelp = 65,
};

static const char* generateNarrativeSnippet(DecisionReason reason, NPCActivity oldAct, NPCActivity newAct) {
    (void)oldAct;
    (void)newAct;
    switch (reason) {
        case DecisionReason::SurvivalLowHP:     return "伤势太重，先撤！";
        case DecisionReason::SurvivalRecovery:  return "伤好得差不多了，继续干活";
        case DecisionReason::EmotionAnger:      return "欺人太甚，跟他拼了！";
        case DecisionReason::EmotionFear:       return "太可怕了，快跑！";
        case DecisionReason::EmotionJoy:        return "今天高兴，找人聊聊去";
        case DecisionReason::CommandExecute:    return "上头有令，必须照办";
        case DecisionReason::CommandRefuse:     return "这命令不合规矩，恕难从命";
        case DecisionReason::LLMPlanStep:       return "按既定方针行动";
        case DecisionReason::SocialVisit:       return "去看看老朋友";
        case DecisionReason::SocialDate:         return "想和道侣相处一会儿";
        case DecisionReason::SocialTeach:        return "该教导弟子了";
        case DecisionReason::SocialGossip:       return "找人唠唠嗑";
        case DecisionReason::CultivationDaily:   return "该修炼了";
        case DecisionReason::CultivationBreakthrough: return "时机已到，突破在即！";
        case DecisionReason::CultivationTribulation:  return "天劫降临，只能硬抗！";
        case DecisionReason::CultivationSeekFortune:  return "瓶颈难破，出去碰碰机缘";
        case DecisionReason::DailyNeed:          return "身体需要，不得不做";
        case DecisionReason::DailyReflection:    return "这行当不赚钱，改行吧";
        case DecisionReason::DailyReflectionRecover: return "好久没做了，再去试试";
        case DecisionReason::DailyMicroPlan:     return "此路不通，换个活法试试";
        case DecisionReason::DailyRoleDefault:   return "按本分行事";
        case DecisionReason::SocialHelp:        return "走投无路，找人指条明路";
        default: return "";
    }
}

static const char* getMoodQualifier(DecisionReason reason) {
    switch (reason) {
        case DecisionReason::SurvivalLowHP:           return "受重伤";
        case DecisionReason::EmotionAnger:            return "愤怒中";
        case DecisionReason::EmotionFear:             return "恐惧中";
        case DecisionReason::DailyReflection:         return "沮丧中";
        case DecisionReason::DailyReflectionRecover:  return "重拾信心";
        case DecisionReason::DailyMicroPlan:          return "思变中";
        case DecisionReason::DailyRoleDefault:        return "如常";
        case DecisionReason::CommandExecute:          return "执行命令中";
        case DecisionReason::SocialVisit:             return "社交中";
        case DecisionReason::CultivationDaily:        return "修炼中";
        case DecisionReason::SocialHelp:              return "求助中";
        default: return "";
    }
}

static const char* getCareerChineseName(uint16_t careerTags) {
    if (careerTags & static_cast<uint16_t>(CareerTag::Miner))       return "矿工";
    if (careerTags & static_cast<uint16_t>(CareerTag::Farmer))      return "农夫";
    if (careerTags & static_cast<uint16_t>(CareerTag::Fisher))      return "渔夫";
    if (careerTags & static_cast<uint16_t>(CareerTag::Smith))       return "铁匠";
    if (careerTags & static_cast<uint16_t>(CareerTag::Cultivator))  return "修士";
    if (careerTags & static_cast<uint16_t>(CareerTag::Merchant))    return "商贾";
    if (careerTags & static_cast<uint16_t>(CareerTag::Soldier))     return "兵士";
    if (careerTags & static_cast<uint16_t>(CareerTag::General))     return "通用";
    return "平民";
}

static bool shouldRevealDecision(const PersonalityComponent* p, DecisionReason reason,
                                  uint64_t currentFrame, uint64_t entryFrame) {
    if (currentFrame - entryFrame > DECISION_REVEAL_WINDOW_FRAMES) return false;
    (void)reason;
    float caution = p ? p->caution : 50.0f;
    float probability;
    if (caution >= 70.0f)      probability = 0.3f;
    else if (caution < 30.0f)  probability = 0.8f;
    else                       probability = 0.5f;
    int roll = rand() % 100;
    return static_cast<float>(roll) < probability * 100.0f;
}

#pragma pack(push, 1)
struct DecisionLogEntry {
    uint64_t frame;
    NPCActivity oldActivity;
    NPCActivity newActivity;
    DecisionReason reason;
    uint8_t triggerLayer;
    float weightDelta;
    int8_t tagSimilarityScore;
    char narrativeSnippet[64];
};
#pragma pack(pop)

#pragma pack(push, 1)
struct ActivityOutcome {
    NPCActivity activity;
    int8_t resultScore;
    uint8_t _pad;
};
#pragma pack(pop)

struct BehaviorComponent;

namespace RoleBaselineWeights {
    static float getBaselineWeight(NPCActivity activity, NPCRole role) {
        switch (role) {
            case NPCRole::BranchDisciple:
                switch (activity) {
                    case NPCActivity::Mine:       return 1.5f;
                    case NPCActivity::Farm:       return 1.0f;
                    case NPCActivity::Fish:       return 0.5f;
                    case NPCActivity::Lumber:     return 0.6f;
                    case NPCActivity::Gather:     return 0.8f;
                    case NPCActivity::Craft:      return 0.4f;
                    case NPCActivity::Trade:      return 0.5f;
                    case NPCActivity::Cultivate:  return 0.6f;
                    case NPCActivity::Meditate:   return 0.4f;
                    case NPCActivity::Hunt:       return 0.5f;
                    case NPCActivity::Explore:    return 0.3f;
                    case NPCActivity::Walk:       return 0.8f;
                    case NPCActivity::Rest:       return 0.9f;
                    case NPCActivity::Sleep:      return 0.9f;
                    case NPCActivity::Eat:        return 0.9f;
                    default: return 0.7f;
                }
            case NPCRole::InnerDisciple:
                switch (activity) {
                    case NPCActivity::Mine:       return 0.8f;
                    case NPCActivity::Farm:       return 0.7f;
                    case NPCActivity::Fish:       return 0.6f;
                    case NPCActivity::Cultivate:  return 1.2f;
                    case NPCActivity::Meditate:   return 1.0f;
                    case NPCActivity::SeekFortune: return 0.7f;
                    case NPCActivity::Alchemy:    return 0.8f;
                    case NPCActivity::Patrol:     return 0.9f;
                    case NPCActivity::Gather:     return 0.7f;
                    case NPCActivity::Trade:      return 0.6f;
                    case NPCActivity::Rest:       return 0.8f;
                    default: return 0.7f;
                }
            case NPCRole::CoreDisciple:
                switch (activity) {
                    case NPCActivity::Cultivate:   return 1.5f;
                    case NPCActivity::Meditate:    return 1.2f;
                    case NPCActivity::SeekFortune: return 0.9f;
                    case NPCActivity::Breakthrough: return 1.3f;
                    case NPCActivity::Alchemy:     return 1.0f;
                    case NPCActivity::Tribulation: return 1.0f;
                    case NPCActivity::Patrol:      return 0.8f;
                    case NPCActivity::Trade:       return 0.5f;
                    default: return 0.6f;
                }
            case NPCRole::FamilyHead:
            case NPCRole::Elder:
                switch (activity) {
                    case NPCActivity::Patrol:      return 1.2f;
                    case NPCActivity::Trade:       return 1.0f;
                    case NPCActivity::Meditate:    return 1.0f;
                    case NPCActivity::Cultivate:   return 0.9f;
                    case NPCActivity::MentorTeach: return 1.3f;
                    case NPCActivity::Gossip:      return 0.8f;
                    case NPCActivity::Rest:        return 0.7f;
                    default: return 0.6f;
                }
            case NPCRole::LawEnforcementElder:
                switch (activity) {
                    case NPCActivity::Patrol:      return 1.4f;
                    case NPCActivity::Defend:      return 1.1f;
                    case NPCActivity::DefendPosition: return 1.0f;
                    case NPCActivity::Rest:        return 0.7f;
                    default: return 0.6f;
                }
            default:
                return 1.0f;
        }
    }

    static float getRoleBaselineWeight(NPCActivity activity, const IdentityComponent* identity) {
        if (!identity) return 1.0f;
        return getBaselineWeight(activity, identity->role);
    }
}

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
    uint8_t microPlanFailCount;
    uint8_t stickinessDecay;

    NPCActivity boostedActivity;
    uint64_t boostExpireFrame;
    float boostAmount;
    uint8_t boostConsecutiveFailures;

    uint64_t socialHelpCooldownUntil;
    uint8_t microPlanCountDuringCooldown;

    ReflectionData() : trackedCount(0), stuckCount(0), lastStuckFrame(0),
        microPlanTriggered(0), microPlanActivity(NPCActivity::Rest), microPlanTargetSlot(0),
        microPlanFailCount(0),
        stickinessDecay(0),
        boostedActivity(NPCActivity::Idle), boostExpireFrame(0), boostAmount(0.0f),
        boostConsecutiveFailures(0),
        socialHelpCooldownUntil(0), microPlanCountDuringCooldown(0) {
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

    void setTemporaryBoost(NPCActivity activity, float amount, uint64_t expireFrame) {
        boostedActivity = activity;
        boostAmount = amount;
        boostExpireFrame = expireFrame;
        boostConsecutiveFailures = 0;
    }

    void cancelTemporaryBoost() {
        boostedActivity = NPCActivity::Idle;
        boostExpireFrame = 0;
        boostAmount = 0.0f;
        boostConsecutiveFailures = 0;
    }

    void recordResult(NPCActivity act, int8_t score, uint64_t currentFrame = 0,
                      BehaviorComponent* logBehavior = nullptr,
                      const IdentityComponent* identity = nullptr) {
        int idx = findOrCreate(act);
        if (idx < 0) return;
        recentResults[idx][0] = recentResults[idx][1];
        recentResults[idx][1] = recentResults[idx][2];
        recentResults[idx][2] = score;

        float oldWeight = weightMultiplier[idx];

        float baselineWeight = identity ? RoleBaselineWeights::getRoleBaselineWeight(act, identity) : 1.0f;
        float floorWeight = baselineWeight * 0.5f;
        if (floorWeight < 0.3f) floorWeight = 0.3f;

        int8_t sum = recentResults[idx][0] + recentResults[idx][1] + recentResults[idx][2];
        if (sum <= -9) weightMultiplier[idx] = floorWeight;
        else if (sum <= -3) weightMultiplier[idx] = baselineWeight * 0.7f;
        else if (sum >= 9) weightMultiplier[idx] = 1.5f;
        else if (sum >= 3) weightMultiplier[idx] = 1.2f;
        else weightMultiplier[idx] = 1.0f;

        if (boostedActivity == act && boostExpireFrame > currentFrame) {
            if (score < 0) {
                boostConsecutiveFailures++;
                if (boostConsecutiveFailures >= 3) {
                    cancelTemporaryBoost();
                }
            } else {
                boostConsecutiveFailures = 0;
            }
        }

        if (microPlanTriggered && act == microPlanActivity) {
            if (score > 0) {
                microPlanTriggered = 0;
                microPlanActivity = NPCActivity::Idle;
                microPlanFailCount = 0;
            } else if (score < 0) {
                microPlanFailCount++;
                if (microPlanFailCount >= 3) {
                    microPlanTriggered = 0;
                    microPlanActivity = NPCActivity::Idle;
                    microPlanFailCount = 0;
                }
            }
        } else if (act != microPlanActivity) {
            microPlanFailCount = 0;
        }

        if (weightMultiplier[idx] < 1.0f) {
            penaltyCount[idx]++;
            lastPenaltyFrame[idx] = currentFrame;
#ifdef NPC_DECISION_LOG_ENABLED
            if (logBehavior && oldWeight >= 1.0f) {
                float delta = oldWeight - weightMultiplier[idx];
                logBehavior->appendDecisionLog(currentFrame, act, act, DecisionReason::DailyReflection, 7, delta, 0, generateNarrativeSnippet(DecisionReason::DailyReflection, act, act));
            }
#endif
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

    float getWeightWithDecay(NPCActivity act, uint64_t currentFrame, float diligence,
                             BehaviorComponent* logBehavior = nullptr,
                             const IdentityComponent* identity = nullptr) const {
        int idx = -1;
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (trackedTypes[i] == act) { idx = static_cast<int>(i); break; }
        }
        if (idx < 0) {
            if (identity) return RoleBaselineWeights::getRoleBaselineWeight(act, identity);
            return 1.0f;
        }

        float baseWeight = weightMultiplier[idx];
        float recoveryTarget = identity ? RoleBaselineWeights::getRoleBaselineWeight(act, identity) : 1.0f;

        if (act == boostedActivity && currentFrame < boostExpireFrame) {
            recoveryTarget += boostAmount;
        }

        if (baseWeight >= recoveryTarget) return baseWeight;

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

        float gap = recoveryTarget - baseWeight;
        float recoverFactor = 1.0f;
        for (float i = 0; i < effectiveHalfLives; i += 1.0f) {
            recoverFactor *= 0.5f;
        }
        float frac = effectiveHalfLives - static_cast<float>(static_cast<int>(effectiveHalfLives));
        if (frac > 0.0f) {
            recoverFactor *= (1.0f - frac * 0.5f);
        }

        float recovered = recoveryTarget - gap * recoverFactor;
        if (recovered > recoveryTarget) recovered = recoveryTarget;

#ifdef NPC_DECISION_LOG_ENABLED
        if (logBehavior && recovered > baseWeight + 0.05f) {
            float delta = recovered - baseWeight;
            logBehavior->appendDecisionLog(currentFrame, act, act, DecisionReason::DailyReflectionRecover, 7, delta, 0, generateNarrativeSnippet(DecisionReason::DailyReflectionRecover, act, act));
        }
#endif

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

#ifdef NPC_DECISION_LOG_ENABLED
    static constexpr int DECISION_LOG_CAPACITY = 500;
    DecisionLogEntry decisionLog[DECISION_LOG_CAPACITY];
    uint16_t decisionLogWriteIndex;
    uint16_t decisionLogCount;
#endif

    BehaviorComponent() : currentActivity(NPCActivity::Rest), previousActivity(NPCActivity::Rest),
        activityStartTime(0), activityStep(0), activityProgress(0.0f),
        activityStartFrame(0), hysteresisFrames(0), hysteresisLocked(0), lastInterruptSource(0)
#ifdef NPC_DECISION_LOG_ENABLED
        , decisionLogWriteIndex(0), decisionLogCount(0)
#endif
    {}

#ifdef NPC_DECISION_LOG_ENABLED
    void appendDecisionLog(uint64_t frame, NPCActivity oldAct, NPCActivity newAct,
                           DecisionReason reason, uint8_t triggerLayer,
                           float weightDelta, int8_t tagScore, const char* snippet) {
        DecisionLogEntry& entry = decisionLog[decisionLogWriteIndex];
        entry.frame = frame;
        entry.oldActivity = oldAct;
        entry.newActivity = newAct;
        entry.reason = reason;
        entry.triggerLayer = triggerLayer;
        entry.weightDelta = weightDelta;
        entry.tagSimilarityScore = tagScore;
        if (snippet) {
            size_t len = strlen(snippet);
            if (len > 63) len = 63;
            memcpy(entry.narrativeSnippet, snippet, len);
            entry.narrativeSnippet[len] = '\0';
        } else {
            entry.narrativeSnippet[0] = '\0';
        }
        decisionLogWriteIndex = (decisionLogWriteIndex + 1) % DECISION_LOG_CAPACITY;
        if (decisionLogCount < DECISION_LOG_CAPACITY) {
            decisionLogCount++;
        }
    }

    const char* getReadableDecisionSummary() const {
        if (decisionLogCount == 0) return "";
        uint16_t lastIdx;
        if (decisionLogCount < DECISION_LOG_CAPACITY) {
            lastIdx = decisionLogWriteIndex > 0 ? decisionLogWriteIndex - 1 : 0;
        } else {
            lastIdx = (decisionLogWriteIndex == 0) ? DECISION_LOG_CAPACITY - 1
                                                    : decisionLogWriteIndex - 1;
        }
        const DecisionLogEntry& entry = decisionLog[lastIdx];
        ActivityTagBundle bundle = getActivityTagBundle(entry.oldActivity);
        const char* career = getCareerChineseName(bundle.careerTags);
        const char* mood = getMoodQualifier(entry.reason);
        static char buffer[160];
        snprintf(buffer, sizeof(buffer), "(%s·%s) %s", career, mood, entry.narrativeSnippet);
        return buffer;
    }
#endif

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
