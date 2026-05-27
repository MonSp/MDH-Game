#pragma once

#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/BehaviorComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/components/IdentityComponent.h"
#include "../ecs/components/LifecycleComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../ecs/components/LLMComponent.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/RelationshipComponent.h"
#include "../ecs/components/RoleCommandComponent.h"
#include "../ecs/components/CommandResponseComponent.h"
#include "../ecs/components/CultivationComponent.h"
#include "../bt/BTEvaluator.h"
#include "../ecs/Registry.h"
#include "../economy/MarketRegistry.h"
#include "../economy/CaravanSystem.h"
#include "ExecuteDescriptor.h"
#include "BehaviorTree_Survival.h"
#include "BehaviorTree_Daily.h"
#include "BehaviorTree_Cultivation.h"
#include "BehaviorTree_Social.h"
#include "BehaviorTree_Production.h"
#include "BehaviorTree_Combat.h"
#include "BehaviorTree_Exploration.h"
#include "BehaviorTree_Command.h"
#include "BehaviorTree_EconomyStrategy.h"
#include <cstdlib>
#include <ctime>
#include <cmath>

#ifdef NPC_DECISION_LOG_ENABLED
#define LOG_DECISION(behavior, frame, oldAct, newAct, reason, layer, weightDelta, tagScore) \
    do { \
        if (behavior) behavior->appendDecisionLog(frame, oldAct, newAct, reason, layer, weightDelta, tagScore, generateNarrativeSnippet(reason, oldAct, newAct)); \
    } while(0)
#else
#define LOG_DECISION(behavior, frame, oldAct, newAct, reason, layer, weightDelta, tagScore) ((void)0)
#endif

extern bool canExecute_mine(ExecuteContext& ctx);
extern bool canExecute_farm(ExecuteContext& ctx);
extern bool canExecute_fish(ExecuteContext& ctx);
extern bool canExecute_lumber(ExecuteContext& ctx);
extern bool canExecute_gather(ExecuteContext& ctx);
extern bool canExecute_explore(ExecuteContext& ctx);
extern bool canExecute_treasureHunt(ExecuteContext& ctx);
extern bool canExecute_mapExplore(ExecuteContext& ctx);

static constexpr ExecuteDescriptor kExecuteTable[] = {
    // Survival (3)
    {NPCActivity::Flee,   "Flee",   ActivityCategory::Survival, REQ_POSITION|REQ_STATS, exec_flee, nullptr},
    {NPCActivity::Heal,   "Heal",   ActivityCategory::Survival, REQ_STATS,              exec_heal, nullptr},
    {NPCActivity::Defend, "Defend", ActivityCategory::Survival, REQ_STATS,              exec_defend, nullptr},
    // Daily (6)
    {NPCActivity::Eat,         "Eat",         ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_eat, nullptr},
    {NPCActivity::Rest,        "Rest",        ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_rest, nullptr},
    {NPCActivity::Sleep,       "Sleep",       ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_sleep, nullptr},
    {NPCActivity::Walk,        "Walk",        ActivityCategory::Daily, REQ_POSITION,         exec_walk, nullptr},
    {NPCActivity::Chat,        "Chat",        ActivityCategory::Daily, REQ_SOCIAL,           exec_gossip, nullptr},
    {NPCActivity::AwaitOrders,"AwaitOrders",  ActivityCategory::Daily, REQ_STATS,            exec_awaitOrders, nullptr},
    // Cultivation (6)
    {NPCActivity::Cultivate,    "Cultivate",    ActivityCategory::Cultivation, REQ_CULT,                              exec_cultivate, nullptr},
    {NPCActivity::Breakthrough, "Breakthrough", ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_breakthrough, nullptr},
    {NPCActivity::Tribulation,  "Tribulation",  ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_tribulation, nullptr},
    {NPCActivity::Meditate,     "Meditate",     ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_meditate, nullptr},
    {NPCActivity::Alchemy,      "Alchemy",      ActivityCategory::Cultivation, REQ_RESOURCES,                         exec_alchemy, nullptr},
    {NPCActivity::SeekFortune,  "SeekFortune",  ActivityCategory::Cultivation, REQ_POSITION,                          exec_seekFortune, nullptr},
    // Social (9)
    {NPCActivity::VisitFriend,     "VisitFriend",    ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP, exec_visitFriend, nullptr},
    {NPCActivity::Date,            "Date",           ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP, exec_date, nullptr},
    {NPCActivity::FamilyGathering, "FamilyGathering",ActivityCategory::Social, REQ_POSITION,                  exec_familyGathering, nullptr},
    {NPCActivity::MentorTeach,     "MentorTeach",    ActivityCategory::Social, REQ_RELATIONSHIP,              exec_mentorTeach, nullptr},
    {NPCActivity::DiscipleAsk,     "DiscipleAsk",    ActivityCategory::Social, REQ_RELATIONSHIP|REQ_CULT,     exec_discipleAsk, nullptr},
    {NPCActivity::Trade,           "Trade",          ActivityCategory::Social, REQ_RESOURCES,                 exec_trade, nullptr},
    {NPCActivity::Gossip,          "Gossip",         ActivityCategory::Social, REQ_SOCIAL,                    exec_gossip, nullptr},
    {NPCActivity::ReportTask,      "ReportTask",     ActivityCategory::Social, REQ_POSITION,                  exec_reportTask, nullptr},
    {NPCActivity::SocialHelp,      "SocialHelp",     ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP,  exec_socialHelp, nullptr},
    // Production (13)
    {NPCActivity::Build,     "Build",      ActivityCategory::Production, REQ_RESOURCES,                exec_build, nullptr},
    {NPCActivity::Mine,      "Mine",       ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION,    exec_mine, canExecute_mine},
    {NPCActivity::Farm,      "Farm",       ActivityCategory::Production, REQ_RESOURCES,                exec_farm, canExecute_farm},
    {NPCActivity::Fish,      "Fish",       ActivityCategory::Production, REQ_RESOURCES,                exec_fish, canExecute_fish},
    {NPCActivity::Lumber,    "Lumber",     ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION,    exec_lumber, canExecute_lumber},
    {NPCActivity::Gather,    "Gather",     ActivityCategory::Production, REQ_RESOURCES,                exec_gather, canExecute_gather},
    {NPCActivity::Craft,     "Craft",      ActivityCategory::Production, REQ_RESOURCES,                exec_craft, nullptr},
    {NPCActivity::Refine,    "Refine",     ActivityCategory::Production, REQ_RESOURCES,                exec_refine, nullptr},
    {NPCActivity::Cook,      "Cook",       ActivityCategory::Production, REQ_RESOURCES,                exec_cook, nullptr},
    {NPCActivity::Construct, "Construct",  ActivityCategory::Production, REQ_RESOURCES,                exec_construct, nullptr},
    {NPCActivity::Repair,    "Repair",     ActivityCategory::Production, REQ_RESOURCES,                exec_repair, nullptr},
    {NPCActivity::Sell,      "Sell",       ActivityCategory::Production, REQ_RESOURCES,                exec_sell, nullptr},
    {NPCActivity::Buy,       "Buy",        ActivityCategory::Production, REQ_RESOURCES,                exec_buy, nullptr},
    {NPCActivity::Tailor,    "Tailor",     ActivityCategory::Production, REQ_RESOURCES,                exec_tailor, nullptr},
    {NPCActivity::Bargain,   "Bargain",    ActivityCategory::Production, REQ_RESOURCES,                exec_bargain, nullptr},
    // Combat (9)
    {NPCActivity::Duel,           "Duel",           ActivityCategory::Combat, REQ_STATS,               exec_duel, nullptr},
    {NPCActivity::Hunt,           "Hunt",           ActivityCategory::Combat, REQ_POSITION|REQ_STATS,   exec_hunt, nullptr},
    {NPCActivity::Ambush,         "Ambush",         ActivityCategory::Combat, REQ_STATS,               exec_ambush, nullptr},
    {NPCActivity::Assassinate,    "Assassinate",    ActivityCategory::Combat, REQ_STATS,               exec_assassinate, nullptr},
    {NPCActivity::Attack,         "Attack",         ActivityCategory::Combat, REQ_POSITION|REQ_STATS,   exec_attack, nullptr},
    {NPCActivity::DefendPosition, "DefendPosition", ActivityCategory::Combat, REQ_STATS,               exec_defendPosition, nullptr},
    {NPCActivity::Patrol,         "Patrol",         ActivityCategory::Combat, REQ_POSITION,             exec_patrol, nullptr},
    {NPCActivity::Escort,         "Escort",         ActivityCategory::Combat, REQ_POSITION,             exec_escort, nullptr},
    {NPCActivity::Scout,          "Scout",          ActivityCategory::Combat, REQ_POSITION,             exec_scout, nullptr},
    // Exploration (3)
    {NPCActivity::Explore,      "Explore",       ActivityCategory::Exploration, REQ_POSITION, exec_explore, canExecute_explore},
    {NPCActivity::TreasureHunt, "TreasureHunt",  ActivityCategory::Exploration, REQ_POSITION, exec_treasureHunt, canExecute_treasureHunt},
    {NPCActivity::MapExplore,   "MapExplore",    ActivityCategory::Exploration, REQ_POSITION, exec_mapExplore, canExecute_mapExplore},
    // Command (2)
    {NPCActivity::RefuseCommand,   "RefuseCommand",    ActivityCategory::Command, REQ_POSITION, exec_refuseCommand, nullptr},
    {NPCActivity::CoordinateSquad, "CoordinateSquad",  ActivityCategory::Command, REQ_POSITION, exec_coordinateSquad, nullptr},
    // Economy Strategy (5)
    {NPCActivity::SetTaxRate,        "SetTaxRate",        ActivityCategory::EconomyStrategy, REQ_IDENTITY, exec_setTaxRate, canExecute_setTaxRate},
    {NPCActivity::TradeEmbargo,      "TradeEmbargo",      ActivityCategory::EconomyStrategy, REQ_IDENTITY, exec_tradeEmbargo, canExecute_tradeEmbargo},
    {NPCActivity::StockpileMaterial, "StockpileMaterial", ActivityCategory::EconomyStrategy, REQ_IDENTITY, exec_stockpileMaterial, canExecute_stockpileMaterial},
    {NPCActivity::PriceStabilize,    "PriceStabilize",    ActivityCategory::EconomyStrategy, REQ_IDENTITY|REQ_RESOURCES, exec_priceStabilize, canExecute_priceStabilize},
    {NPCActivity::EconomicMobilize,  "EconomicMobilize",  ActivityCategory::EconomyStrategy, REQ_IDENTITY, exec_economicMobilize, canExecute_economicMobilize},
};
static constexpr size_t kExecuteTableSize = sizeof(kExecuteTable) / sizeof(kExecuteTable[0]);

struct EconomicSignals {
    float ironOreDemand = 1.0f;
    float spiritStoneInflation = 1.0f;
    float foodDemand = 1.0f;
    float equipmentDemand = 1.0f;
    float materialDemand = 1.0f;
    float cultivationDemand = 1.0f;

    void computeFromHeritage(uint16_t factionCareerHeritage) {
        if (factionCareerHeritage == 0) return;

        if (factionCareerHeritage & static_cast<uint16_t>(CareerTag::Miner))
            ironOreDemand = 1.5f;
        if (factionCareerHeritage & static_cast<uint16_t>(CareerTag::Farmer))
            foodDemand = 1.3f;
        if (factionCareerHeritage & static_cast<uint16_t>(CareerTag::Smith))
            equipmentDemand = 1.4f;
        if (factionCareerHeritage & static_cast<uint16_t>(CareerTag::Cultivator))
            cultivationDemand = 1.3f;
        if (factionCareerHeritage & static_cast<uint16_t>(CareerTag::Merchant))
            spiritStoneInflation = 0.7f;
        if (factionCareerHeritage & static_cast<uint16_t>(CareerTag::Soldier))
            equipmentDemand = 1.5f;
    }

    void computeFromMarket(const std::string& clanId) {
        const CommodityPool* pool = MarketRegistry::getCommodityPool(clanId);
        if (!pool) {
            computeFromHeritage(0);
            return;
        }

        auto ratio = [&](CommodityType t) -> float {
            int64_t s = pool->supply[static_cast<uint8_t>(t)];
            int64_t d = pool->demand[static_cast<uint8_t>(t)];
            if (s < 1) s = 1;
            float r = static_cast<float>(d) / static_cast<float>(s);
            return r > 0.01f ? r : 1.0f;
        };

        ironOreDemand = ratio(CommodityType::Ore);
        foodDemand = ratio(CommodityType::Food);
        equipmentDemand = ratio(CommodityType::Equipment);
        materialDemand = ratio(CommodityType::Materials);
        cultivationDemand = ratio(CommodityType::Pills);
        spiritStoneInflation = ratio(CommodityType::SpiritStones);
    }
};

class BehaviorTreeSystem {
public:
    static BehaviorTreeSystem& getInstance() {
        static BehaviorTreeSystem instance;
        return instance;
    }

    void evaluate(ECS::EntityId entityId, uint64_t currentTime) {
        auto& registry = ECS::Registry::getInstance();
        auto* stats = registry.getComponent<StatsComponent>(entityId);
        auto* behavior = registry.getComponent<BehaviorComponent>(entityId);
        auto* bt = registry.getComponent<BehaviorTreeComponent>(entityId);
        auto* bb = registry.getComponent<BlackboardCache>(entityId);
        auto* llmPlan = registry.getComponent<LLMPlanComponent>(entityId);
        auto* cmd = registry.getComponent<RoleCommandComponent>(entityId);

        if (!stats || !behavior) return;

        if (bt && bt->tmpl) {
            if (BTEvaluator::evaluate(entityId, currentTime)) return;
        }

        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        auto* personality = registry.getComponent<PersonalityComponent>(entityId);
        auto* social = registry.getComponent<SocialComponent>(entityId);
        auto* rel = registry.getComponent<RelationshipComponent>(entityId);
        auto* cult = registry.getComponent<CultivationComponent>(entityId);

        if (!identity || !personality) return;

        auto* cmdRespGet = registry.getComponent<CommandResponseComponent>(entityId);

        // WARNING: field order MUST match EvaluateContext struct declaration.
        // Reordering fields in EvaluateContext without updating this line will cause silent data corruption.
        EvaluateContext ctx{
            registry, currentTime, entityId,
            stats, behavior, bt, bb, llmPlan, cmd, cmdRespGet,
            identity, personality, social, rel, cult
        };

        for (const auto& layer : kEvaluateLayers) {
            if (layer(ctx)) return;
        }
    }

    void execute(ECS::EntityId entityId, uint64_t currentTime, float deltaTime) {
        auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(entityId);
        auto* social = ECS::Registry::getInstance().getComponent<SocialComponent>(entityId);
        if (social) social->tickEmotions(deltaTime);
        if (!behavior) return;
        if (behavior->activityStep == 0) {
            behavior->activityStep = 1;
            behavior->activityStartTime = currentTime;
        }

        ExecuteContext ctx(entityId, currentTime, deltaTime);

        for (size_t i = 0; i < kExecuteTableSize; ++i) {
            if (kExecuteTable[i].activity == behavior->currentActivity) {
                if (kExecuteTable[i].isExecutable && !kExecuteTable[i].isExecutable(ctx)) {
                    behavior->changeActivity(NPCActivity::Rest);
                    return;
                }
                kExecuteTable[i].execute(ctx);
                return;
            }
        }
    }

private:
    BehaviorTreeSystem() = default;

    struct EvaluateContext {
        ECS::Registry& reg;
        uint64_t currentTime;
        ECS::EntityId entityId;
        StatsComponent* stats;
        BehaviorComponent* behavior;
        BehaviorTreeComponent* bt;
        BlackboardCache* bb;
        LLMPlanComponent* llmPlan;
        RoleCommandComponent* cmd;
        CommandResponseComponent* cmdResp;
        IdentityComponent* identity;
        PersonalityComponent* personality;
        SocialComponent* social;
        RelationshipComponent* rel;
        CultivationComponent* cult;
        EconomicSignals econSignals;
    };

    using EvaluateFn = bool (*)(EvaluateContext&);

    static float random01() {
        return static_cast<float>(rand()) / static_cast<float>(RAND_MAX);
    }

    static int randRange(int min, int max) {
        return min + rand() % (max - min + 1);
    }

    static float applyReflection(BehaviorComponent* behavior, NPCActivity activity,
                          uint64_t currentFrame = 0, PersonalityComponent* personality = nullptr,
                          IdentityComponent* identity = nullptr) {
        if (!behavior) return 1.0f;
        if (currentFrame == 0 || !personality) {
            return behavior->reflection.getWeight(activity);
        }
        return behavior->reflection.getWeightWithDecay(activity, currentFrame, personality->diligence, behavior, identity);
    }

    static NPCActivity tryMicroPlan(BehaviorComponent* behavior, PersonalityComponent* p,
                             IdentityComponent* identity, RelationshipComponent* rel,
                             uint64_t currentFrame) {
        if (!behavior) return NPCActivity::Idle;
        auto& ref = behavior->reflection;

        if (ref.microPlanTriggered) {
            if (behavior->currentActivity != ref.microPlanActivity) {
                ref.microPlanTriggered = 0;
                ref.microPlanActivity = NPCActivity::Idle;
                return NPCActivity::Idle;
            }
            return ref.microPlanActivity;
        }

        if (!ref.allBehaviorsLow()) {
            ref.stuckCount = 0;
            return NPCActivity::Idle;
        }

        if (ref.stuckCount == 0) {
            ref.lastStuckFrame = currentFrame;
        }
        ref.stuckCount++;

        if (ref.stuckCount < 5 || (currentFrame - ref.lastStuckFrame) < 100) {
            return NPCActivity::Idle;
        }

        NPCActivity best = ref.getHighestWeightedActivity();

        uint16_t factionHeritage = 0;
        if (identity) {
            factionHeritage = identity->factionCareerHeritage;
        }

        float ambitionMod = 1.0f;
        float loyaltyMod = 1.0f;
        if (p) {
            if (p->ambition > 70.0f) ambitionMod = 0.5f;
            if (p->loyalty > 70.0f) loyaltyMod = 1.2f;
        }

        uint16_t bestCareerTags = getActivityTagBundle(best).careerTags;

        bool allSameCareerFailed = true;
        for (uint8_t i = 0; i < ref.trackedCount; i++) {
            uint16_t trackCareer = getActivityTagBundle(ref.trackedTypes[i]).careerTags;
            if (bestCareerTags & trackCareer) {
                if (ref.weightMultiplier[i] >= 0.7f) {
                    allSameCareerFailed = false;
                    break;
                }
            }
        }
        if (allSameCareerFailed && bestCareerTags != 0) {
            ref.stickinessDecay++;
        } else {
            ref.stickinessDecay = 0;
        }

        uint8_t effectiveDecay = ref.stickinessDecay;

        NPCActivity creative = NPCActivity::Rest;
        float bestScore = -1.0f;
        NPCActivity tieCandidate = NPCActivity::Rest;
        float tieScore = -1.0f;

        for (size_t i = 0; i < kExecuteTableSize; ++i) {
            NPCActivity candidate = kExecuteTable[i].activity;
            if (candidate == NPCActivity::Idle || candidate == NPCActivity::Dead || candidate == NPCActivity::Incapacitated) continue;
            if (candidate == NPCActivity::Flee || candidate == NPCActivity::Heal || candidate == NPCActivity::Defend) continue;
            if (candidate == best) continue;
            float score = computeTagSimilarity(best, candidate, p,
                                                factionHeritage, effectiveDecay);

            if (p) {
                if (p->ambition > 70.0f) score *= ambitionMod;
                if (p->loyalty > 70.0f) score *= loyaltyMod;
            }

            if (score > bestScore) {
                bestScore = score;
                creative = candidate;
                tieCandidate = candidate;
                tieScore = score;
            } else if (score == bestScore && bestScore > 0.0f) {
                float jacA = jaccardSimilarity(best, creative);
                float jacB = jaccardSimilarity(best, candidate);
                if (jacB > jacA) {
                    creative = candidate;
                    tieCandidate = candidate;
                    tieScore = score;
                }
            }
        }

        if (ref.socialHelpCooldownUntil > 0 && currentFrame >= ref.socialHelpCooldownUntil) {
            ref.socialHelpCooldownUntil = 0;
            if (ref.microPlanCountDuringCooldown >= 2) {
                bool hasSocialTarget = false;
                if (rel) {
                    if (rel->mentorSlot != 0) hasSocialTarget = true;
                    else {
                        for (uint8_t i = 0; i < rel->relationCount; i++) {
                            if (rel->relations[i].affinity > 60) { hasSocialTarget = true; break; }
                        }
                    }
                }
                if (!hasSocialTarget && identity && identity->factionCareerHeritage != 0) {
                    hasSocialTarget = true;
                }
                if (hasSocialTarget) {
                    ref.microPlanCountDuringCooldown = 0;
                    ref.microPlanTriggered = 1;
                    ref.microPlanActivity = NPCActivity::SocialHelp;
                    ref.stuckCount = 0;
                    ref.socialHelpCooldownUntil = currentFrame + 600;
                    LOG_DECISION(behavior, currentFrame, best, NPCActivity::SocialHelp, DecisionReason::SocialHelp, 7, 0.0f, 0);
                    return NPCActivity::SocialHelp;
                }
            }
            ref.microPlanCountDuringCooldown = 0;
        }

        if (bestScore < 0.3f) {
            bool hasSocialTarget = false;
            if (rel) {
                if (rel->mentorSlot != 0) {
                    hasSocialTarget = true;
                } else {
                    for (uint8_t i = 0; i < rel->relationCount; i++) {
                        if (rel->relations[i].affinity > 60) { hasSocialTarget = true; break; }
                    }
                }
            }
            if (!hasSocialTarget && identity && identity->factionCareerHeritage != 0) {
                hasSocialTarget = true;
            }
            if (hasSocialTarget && currentFrame >= ref.socialHelpCooldownUntil) {
                ref.microPlanTriggered = 1;
                ref.microPlanActivity = NPCActivity::SocialHelp;
                ref.stuckCount = 0;
                ref.socialHelpCooldownUntil = currentFrame + 600;
                ref.microPlanCountDuringCooldown = 0;
                LOG_DECISION(behavior, currentFrame, best, NPCActivity::SocialHelp, DecisionReason::SocialHelp, 7, 0.0f, 0);
                return NPCActivity::SocialHelp;
            }
            if (hasSocialTarget) {
                ref.microPlanCountDuringCooldown++;
            }
        }

        if (bestScore <= 0.0f) {
            if (p && p->ambition > 60.0f) creative = NPCActivity::Explore;
            else if (p && p->caution > 60.0f) creative = NPCActivity::Meditate;
            else creative = NPCActivity::Walk;
        }

        ref.microPlanTriggered = 1;
        ref.microPlanActivity = creative;
        ref.stuckCount = 0;
        ref.setTemporaryBoost(creative, 0.2f, currentFrame + 500);

        LOG_DECISION(behavior, currentFrame, best, creative, DecisionReason::DailyMicroPlan, 7, 0.0f, static_cast<int8_t>(bestScore > 0.0f ? bestScore * 100.0f : 0.0f));

        return creative;
    }

    static float getRiskLevel(NPCActivity a) {
        switch (a) {
            case NPCActivity::Attack: case NPCActivity::Hunt:
            case NPCActivity::Ambush: case NPCActivity::Assassinate:
            case NPCActivity::Duel:
                return 0.9f;
            case NPCActivity::Scout: case NPCActivity::Explore:
                return 0.5f;
            case NPCActivity::Mine: case NPCActivity::Farm:
            case NPCActivity::Fish: case NPCActivity::Lumber:
            case NPCActivity::Gather: case NPCActivity::Craft:
            case NPCActivity::Refine: case NPCActivity::Cook:
            case NPCActivity::Construct: case NPCActivity::Repair:
            case NPCActivity::Build: case NPCActivity::Sell:
            case NPCActivity::Buy:
                return 0.1f;
            default:
                return 0.3f;
        }
    }

    static uint8_t getPriorityLevel(NPCActivity activity) {
        switch (activity) {
            case NPCActivity::Flee:
            case NPCActivity::Heal:
            case NPCActivity::Defend:
                return 1;
            case NPCActivity::VisitFriend:
            case NPCActivity::Date:
            case NPCActivity::FamilyGathering:
            case NPCActivity::MentorTeach:
            case NPCActivity::DiscipleAsk:
            case NPCActivity::Trade:
            case NPCActivity::Gossip:
            case NPCActivity::ReportTask:
            case NPCActivity::SocialHelp:
                return 4;
            case NPCActivity::Cultivate:
            case NPCActivity::Breakthrough:
            case NPCActivity::Tribulation:
            case NPCActivity::Meditate:
            case NPCActivity::Alchemy:
            case NPCActivity::SeekFortune:
                return 5;
            default:
                return 6;
        }
    }

    static bool shouldInterrupt(BehaviorComponent* behavior, NPCActivity newActivity, uint8_t interruptSource) {
        if (!behavior) return false;
        if (behavior->currentActivity == NPCActivity::Idle ||
            behavior->currentActivity == NPCActivity::Dead ||
            behavior->currentActivity == NPCActivity::Incapacitated) {
            return true;
        }

        uint8_t oldPriority = getPriorityLevel(behavior->currentActivity);
        uint8_t newPriority = getPriorityLevel(newActivity);
        uint8_t hysteresisNeeded = 0;

        if (interruptSource == 1) {
            if (newActivity == NPCActivity::Flee || newActivity == NPCActivity::Heal || newActivity == NPCActivity::Defend) {
                hysteresisNeeded = HYSTERESIS_SURVIVAL_ENTER;
            } else {
                hysteresisNeeded = HYSTERESIS_SURVIVAL_EXIT;
            }
        } else if (interruptSource == 6) {
            return true;
        } else if (newPriority < oldPriority) {
            hysteresisNeeded = HYSTERESIS_LEVEL_UPGRADE;
        } else if (newPriority > oldPriority) {
            hysteresisNeeded = HYSTERESIS_LEVEL_DOWNGRADE;
        } else {
            hysteresisNeeded = HYSTERESIS_SAME_LEVEL;
        }

        if (hysteresisNeeded == 0) {
            behavior->hysteresisLocked = 0;
            return true;
        }

        if (behavior->currentActivity == newActivity) return false;

        if (!behavior->hysteresisLocked) {
            behavior->hysteresisLocked = 1;
            behavior->hysteresisFrames = hysteresisNeeded;
            return false;
        }

        if (behavior->hysteresisFrames > 0) {
            behavior->hysteresisFrames--;
            return false;
        }

        behavior->hysteresisLocked = 0;
        return true;
    }

    static bool evaluateSurvival(EvaluateContext& ctx) {
        bool wasInSurvival = (ctx.behavior->currentActivity == NPCActivity::Flee ||
                              ctx.behavior->currentActivity == NPCActivity::Heal ||
                              ctx.behavior->currentActivity == NPCActivity::Defend);

        if (ctx.stats->hpPercent() < 0.3f) {
            if (!shouldInterrupt(ctx.behavior, NPCActivity::Flee, 1)) return true;
            NPCActivity oldAct = ctx.behavior->currentActivity;
            ctx.behavior->changeActivity(NPCActivity::Flee);
            LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Flee, DecisionReason::SurvivalLowHP, 1, 0.0f, 0);
            return true;
        }
        if (ctx.stats->hpPercent() < 0.5f) {
            if (ctx.behavior->currentActivity == NPCActivity::Flee && ctx.stats->hpPercent() >= 0.4f) {
                if (!shouldInterrupt(ctx.behavior, NPCActivity::Heal, 1)) return true;
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Heal);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Heal, DecisionReason::SurvivalLowHP, 1, 0.0f, 0);
                return true;
            }
            if (!wasInSurvival) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Heal);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Heal, DecisionReason::SurvivalLowHP, 1, 0.0f, 0);
                return true;
            }
            return true;
        }
        if (wasInSurvival) {
            float exitThreshold = (ctx.behavior->currentActivity == NPCActivity::Heal) ? 0.6f : 0.4f;
            if (ctx.stats->hpPercent() >= exitThreshold) {
                if (!shouldInterrupt(ctx.behavior, NPCActivity::Rest, 1)) return true;
                LOG_DECISION(ctx.behavior, ctx.currentTime, ctx.behavior->currentActivity, NPCActivity::Rest, DecisionReason::SurvivalRecovery, 1, 0.0f, 0);
                return false;
            }
            return true;
        }
        return false;
    }

    static bool evaluateEmotion(EvaluateContext& ctx) {
        if (!ctx.social || !ctx.personality) return false;

        ctx.social->cleanupExpiredCooldowns(ctx.currentTime);

        if (ctx.social->isTerrified() && ctx.stats && ctx.stats->hpPercent() > 0.15f) {
            uint32_t targetSlot = 0;
            if (ctx.rel && ctx.rel->relationCount > 0) {
                int8_t lowestAffinity = 127;
                for (uint8_t i = 0; i < ctx.rel->relationCount; i++) {
                    if (ctx.rel->relations[i].affinity < lowestAffinity) {
                        lowestAffinity = ctx.rel->relations[i].affinity;
                        targetSlot = ctx.rel->relations[i].targetSlot;
                    }
                }
            }
            if (targetSlot != 0 && ctx.social->isInCooldown(targetSlot, EmotionType::Fear, NPCActivity::Flee, ctx.currentTime)) {
            } else if (shouldInterrupt(ctx.behavior, NPCActivity::Flee, 4)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Flee);
                if (targetSlot != 0) {
                    ctx.social->addCooldown(targetSlot, EmotionType::Fear, NPCActivity::Flee, ctx.currentTime);
                }
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Flee, DecisionReason::EmotionFear, 2, 0.0f, 0);
                return true;
            }
        }

        if (ctx.social->isEnraged(ctx.personality->caution)) {
            uint32_t targetSlot = 0;
            if (ctx.rel && ctx.rel->relationCount > 0) {
                int8_t lowestAffinity = 127;
                for (uint8_t i = 0; i < ctx.rel->relationCount; i++) {
                    if (ctx.rel->relations[i].affinity < lowestAffinity) {
                        lowestAffinity = ctx.rel->relations[i].affinity;
                        targetSlot = ctx.rel->relations[i].targetSlot;
                    }
                }
            }
            if (targetSlot != 0 && ctx.social->isInCooldown(targetSlot, EmotionType::Anger, NPCActivity::Duel, ctx.currentTime)) {
                float threshold = 70.0f - ctx.personality->caution * 0.3f;
                ctx.social->addFear((ctx.social->anger - threshold) * 0.5f);
                return false;
            }
            if (shouldInterrupt(ctx.behavior, NPCActivity::Duel, 4)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Duel);
                if (targetSlot != 0) {
                    ctx.social->addCooldown(targetSlot, EmotionType::Anger, NPCActivity::Duel, ctx.currentTime);
                }
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Duel, DecisionReason::EmotionAnger, 2, 0.0f, 0);
                return true;
            }
        }

        if (ctx.social->isElated(ctx.personality->sociability)) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::Gossip, 4)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Gossip);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Gossip, DecisionReason::EmotionJoy, 2, 0.0f, 0);
                return true;
            }
        }

        return false;
    }

    static bool evaluateCommand(EvaluateContext& ctx) {
        if (!ctx.cmd || !ctx.cmd->hasActiveCommand()) return false;

        CommandSlot* slot = ctx.cmd->peekCommandMut();
        if (!slot) return false;

        if (ctx.cmdResp && !ctx.cmdResp->resolved) {
            auto& reg = ctx.reg;
            float relVal = 0.0f;
            if (ctx.cmd && ctx.cmd->issuerId != 0) {
                auto* issuerRel = reg.getComponent<RelationshipComponent>(ctx.cmd->issuerId);
                if (issuerRel) {
                    for (size_t s = 0; s < reg.entityIds_.size(); ++s) {
                        if (reg.entityIds_[s] == ctx.entityId) {
                            relVal = static_cast<float>(issuerRel->getAffinity(static_cast<uint32_t>(s)));
                            break;
                        }
                    }
                }
            }
            float risk = getRiskLevel(static_cast<NPCActivity>(ctx.cmd->commandType));

            ctx.cmdResp->evaluateResponse(
                slot->status,
                ctx.personality->loyalty,
                ctx.personality->ambition,
                ctx.personality->caution,
                ctx.personality->greed,
                relVal,
                risk
            );
        }

        if (ctx.cmdResp && ctx.cmdResp->isRefusing()) {
            ctx.cmd->updateStatus(slot->commandId, CommandLifecycle::Refused);
            if (shouldInterrupt(ctx.behavior, NPCActivity::RefuseCommand, 6)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::RefuseCommand);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::RefuseCommand, DecisionReason::CommandRefuse, 3, 0.0f, 0);
            }
            ctx.cmd->setFeedback(static_cast<uint8_t>(CommandLifecycle::Refused), ctx.currentTime);
            return true;
        }

        if (ctx.cmd->squadId != 0) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::CoordinateSquad, 6)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::CoordinateSquad);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::CoordinateSquad, DecisionReason::CommandExecute, 3, 0.0f, 0);
            }
            return true;
        }

        if (ctx.behavior->currentActivity == NPCActivity::Patrol ||
            ctx.behavior->currentActivity == NPCActivity::CoordinateSquad) {
            if (ctx.behavior->activityProgress >= 1.0f) {
                ctx.cmd->updateStatus(slot->commandId,
                    ctx.cmdResp && ctx.cmdResp->overachieveMult > 1.0f
                        ? CommandLifecycle::PartiallyCompleted
                        : CommandLifecycle::Completed);
                ctx.cmd->setFeedback(slot->status, ctx.currentTime);
                if (shouldInterrupt(ctx.behavior, NPCActivity::ReportTask, 6)) {
                    ctx.behavior->changeActivity(NPCActivity::ReportTask);
                }
                return true;
            }
            return true;
        }

        ctx.cmd->updateStatus(slot->commandId, CommandLifecycle::Executing);

        if (shouldInterrupt(ctx.behavior, NPCActivity::Patrol, 6)) {
            NPCActivity oldAct = ctx.behavior->currentActivity;
            ctx.behavior->changeActivity(NPCActivity::Patrol);
            LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Patrol, DecisionReason::CommandExecute, 3, 0.0f, 0);
        }

        return true;
    }

    static bool evaluateLLMPlan(EvaluateContext& ctx) {
        if (!ctx.llmPlan || ctx.llmPlan->tier == LLMTier::T3 ||
            ctx.llmPlan->status != PlanStatus::ACTIVE) return false;

        ActionType action = ctx.llmPlan->getCurrentAction();
        NPCActivity newAct = translateActionType(action);
        if (shouldInterrupt(ctx.behavior, newAct, 6)) {
            NPCActivity oldAct = ctx.behavior->currentActivity;
            ctx.behavior->changeActivity(newAct);
            LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, newAct, DecisionReason::LLMPlanStep, 6, 0.0f, 0);
        }
        return true;
    }

    static bool evaluateSocial(EvaluateContext& ctx) {
        if (!ctx.social || !ctx.personality) return false;
        if (ctx.social->wantsSocial() && ctx.personality->isSocial() && ctx.rel &&
            ctx.rel->relationCount > 0) {
            if (ctx.rel->spouseSlot != 0 && random01() < 0.2f) {
                if (shouldInterrupt(ctx.behavior, NPCActivity::Date, 5)) {
                    NPCActivity oldAct = ctx.behavior->currentActivity;
                    ctx.behavior->changeActivity(NPCActivity::Date);
                    LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Date, DecisionReason::SocialDate, 4, 0.0f, 0);
                }
                return true;
            }
            if (ctx.rel->hasDisciples() && random01() < 0.15f) {
                if (shouldInterrupt(ctx.behavior, NPCActivity::MentorTeach, 5)) {
                    NPCActivity oldAct = ctx.behavior->currentActivity;
                    ctx.behavior->changeActivity(NPCActivity::MentorTeach);
                    LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::MentorTeach, DecisionReason::SocialTeach, 4, 0.0f, 0);
                }
                return true;
            }
            if (ctx.rel->mentorSlot != 0 && random01() < 0.15f) {
                if (shouldInterrupt(ctx.behavior, NPCActivity::DiscipleAsk, 5)) {
                    ctx.behavior->changeActivity(NPCActivity::DiscipleAsk);
                }
                return true;
            }
            if (random01() < 0.3f) {
                if (shouldInterrupt(ctx.behavior, NPCActivity::VisitFriend, 5)) {
                    NPCActivity oldAct = ctx.behavior->currentActivity;
                    ctx.behavior->changeActivity(NPCActivity::VisitFriend);
                    LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::VisitFriend, DecisionReason::SocialVisit, 4, 0.0f, 0);
                }
                return true;
            }
            if (shouldInterrupt(ctx.behavior, NPCActivity::Gossip, 5)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Gossip);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Gossip, DecisionReason::SocialGossip, 4, 0.0f, 0);
            }
            return true;
        }
        return false;
    }

    static bool evaluateCultivation(EvaluateContext& ctx) {
        if (!ctx.cult || !ctx.stats) return false;
        if (ctx.cult->isBreakingThrough) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::Breakthrough, 7)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Breakthrough);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Breakthrough, DecisionReason::CultivationBreakthrough, 5, 0.0f, 0);
            }
            return true;
        }
        if (ctx.cult->tribulationTimer > 0) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::Tribulation, 7)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Tribulation);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Tribulation, DecisionReason::CultivationTribulation, 5, 0.0f, 0);
            }
            return true;
        }
        if (ctx.cult->isReadyForBreakthrough() &&
            ctx.cult->bottleneckTimer > 1000 && !ctx.cult->isBreakingThrough) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::Breakthrough, 7)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Breakthrough);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Breakthrough, DecisionReason::CultivationBreakthrough, 5, 0.0f, 0);
            }
            return true;
        }
        if (ctx.personality->isDiligent() && random01() < 0.4f) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::Cultivate, 7)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::Cultivate);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Cultivate, DecisionReason::CultivationDaily, 5, 0.0f, 0);
            }
            return true;
        }
        if (ctx.cult->bottleneckTimer > 500 && ctx.personality->ambition > 70.0f && random01() < 0.2f) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::SeekFortune, 7)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(NPCActivity::SeekFortune);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::SeekFortune, DecisionReason::CultivationSeekFortune, 5, 0.0f, 0);
            }
            return true;
        }
        if (ctx.personality->caution > 60.0f && random01() < 0.1f) {
            if (shouldInterrupt(ctx.behavior, NPCActivity::Alchemy, 7)) {
                ctx.behavior->changeActivity(NPCActivity::Alchemy);
            }
            return true;
        }
        return false;
    }

    static bool evaluateDaily(EvaluateContext& ctx) {
        if (ctx.social) {
            if (ctx.social->isHungry()) {
                if (shouldInterrupt(ctx.behavior, NPCActivity::Eat, 7)) {
                    NPCActivity oldAct = ctx.behavior->currentActivity;
                    ctx.behavior->changeActivity(NPCActivity::Eat);
                    LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Eat, DecisionReason::DailyNeed, 7, 0.0f, 0);
                }
                return true;
            }
            if (ctx.social->isExhausted()) {
                if (shouldInterrupt(ctx.behavior, NPCActivity::Sleep, 7)) {
                    NPCActivity oldAct = ctx.behavior->currentActivity;
                    ctx.behavior->changeActivity(NPCActivity::Sleep);
                    LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Sleep, DecisionReason::DailyNeed, 7, 0.0f, 0);
                }
                return true;
            }
        }

        if (ctx.identity && ctx.personality && ctx.identity->clanId.size() > 0) {
            uint16_t heritage = ctx.identity->factionCareerHeritage;
            if ((ctx.identity->role == NPCRole::FamilyHead || ctx.identity->role == NPCRole::Elder) &&
                (heritage & static_cast<uint16_t>(CareerTag::Merchant)) &&
                random01() < 0.1f) {
                CaravanRoute route = CaravanSystem::getInstance().findBestRoute(ctx.identity->clanId, ctx.currentTime);
                if (route.margin >= 0.2f) {
                    CaravanSystem::getInstance().executeRoute(route, ctx.currentTime);
                }
            }
        }

        if (ctx.identity && ctx.personality) {
            CachedEconSignals cachedSignals = MarketRegistry::getInstance().getEconomicSignals(ctx.identity->clanId, ctx.currentTime);
            ctx.econSignals.ironOreDemand = cachedSignals.ironOreDemand;
            ctx.econSignals.spiritStoneInflation = cachedSignals.spiritStoneInflation;
            ctx.econSignals.foodDemand = cachedSignals.foodDemand;
            ctx.econSignals.equipmentDemand = cachedSignals.equipmentDemand;
            ctx.econSignals.materialDemand = cachedSignals.materialDemand;
            ctx.econSignals.cultivationDemand = cachedSignals.cultivationDemand;
            MarketRegistry::getInstance().tickDecay(ctx.currentTime);
            NPCActivity chosen = chooseByRole(ctx.identity->role, ctx.personality, ctx.behavior, ctx.currentTime, ctx.identity, ctx.econSignals);
            float weight = applyReflection(ctx.behavior, chosen, ctx.currentTime, ctx.personality, ctx.identity);
            DecisionReason reason = DecisionReason::DailyRoleDefault;
            float delta = 0.0f;
            if (weight < 0.7f && random01() < 0.5f) {
                NPCActivity alternative = NPCActivity::Rest;
                float bestScore = -1.0f;
                for (size_t i = 0; i < kExecuteTableSize; ++i) {
                    NPCActivity candidate = kExecuteTable[i].activity;
                    if (candidate == chosen) continue;
                    if (candidate == NPCActivity::Idle || candidate == NPCActivity::Dead || candidate == NPCActivity::Incapacitated) continue;
                    if (candidate == NPCActivity::Flee || candidate == NPCActivity::Heal || candidate == NPCActivity::Defend) continue;
                    float score = computeTagSimilarity(chosen, candidate, ctx.personality,
                        ctx.identity ? ctx.identity->factionCareerHeritage : 0, 0);
                    if (score > bestScore) {
                        bestScore = score;
                        alternative = candidate;
                    }
                }
                if (alternative != chosen && alternative != NPCActivity::Rest) {
                    reason = DecisionReason::DailyReflection;
                    delta = 1.0f - weight;
                    chosen = alternative;
                    weight = applyReflection(ctx.behavior, chosen, ctx.currentTime, ctx.personality, ctx.identity);
                }
            }
            if (weight < 0.5f && random01() < 0.3f) {
                NPCActivity microPlan = tryMicroPlan(ctx.behavior, ctx.personality, ctx.identity, ctx.rel, ctx.currentTime);
                if (microPlan != NPCActivity::Idle && shouldInterrupt(ctx.behavior, microPlan, 7)) {
                    NPCActivity oldAct = ctx.behavior->currentActivity;
                    ctx.behavior->changeActivity(microPlan);
                    LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, microPlan, DecisionReason::DailyMicroPlan, 7, 0.0f, 0);
                    return true;
                }
            }
            if (shouldInterrupt(ctx.behavior, chosen, 7)) {
                NPCActivity oldAct = ctx.behavior->currentActivity;
                ctx.behavior->changeActivity(chosen);
                LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, chosen, reason, 7, delta, 0);
            }
            return true;
        }

        if (shouldInterrupt(ctx.behavior, NPCActivity::Rest, 7)) {
            NPCActivity oldAct = ctx.behavior->currentActivity;
            ctx.behavior->changeActivity(NPCActivity::Rest);
            LOG_DECISION(ctx.behavior, ctx.currentTime, oldAct, NPCActivity::Rest, DecisionReason::DailyRoleDefault, 7, 0.0f, 0);
        }
        return true;
    }

    // LLM planning (T1/T2 ACTIVE) is now handled via evaluateLLMPlan layer.
    static bool evaluateEconomicCrisis(EvaluateContext& ctx) {
        auto* identity = ctx.identity;
        auto* behavior = ctx.behavior;
        if (!identity || !behavior) return false;
        if (identity->layer > 2) return false;

        auto& mkt = MarketRegistry::getInstance();
        const EconomicDigest& digest = mkt.getEconomicDigest(identity->clanId, ctx.currentTime);

        if (digest.posture != EconomicPosture::Crisis) return false;

        if (identity->layer <= 1) {
            CommodityType targetType = CommodityType::Ore;
            float maxRatio = 0.0f;
            for (int i = 0; i < 3; i++) {
                if (digest.alerts[i].priceRatio > maxRatio) {
                    maxRatio = digest.alerts[i].priceRatio;
                    targetType = digest.alerts[i].commodityType;
                }
            }

            int64_t treasury = mkt.getTreasury(identity->clanId);
            int64_t maxSpend = treasury / 3;
            if (maxSpend > 300) maxSpend = 300;

            if (maxSpend > 0) {
                auto& pool = mkt.getOrCreatePool(identity->clanId);
                float price = PriceEngine::getPrice(pool, targetType);
                int64_t buyAmount = static_cast<int64_t>(maxSpend / (price * 1.2f));
                if (buyAmount > 0) {
                    mkt.spendTreasury(identity->clanId, static_cast<int64_t>(buyAmount * price * 1.2f));
                    pool.addSupply(targetType, buyAmount);
                }
            }

            NPCActivity mobilizeActivity = NPCActivity::Mine;
            switch (targetType) {
                case CommodityType::Ore:          mobilizeActivity = NPCActivity::Mine; break;
                case CommodityType::Food:         mobilizeActivity = NPCActivity::Farm; break;
                case CommodityType::Equipment:    mobilizeActivity = NPCActivity::Craft; break;
                case CommodityType::Materials:    mobilizeActivity = NPCActivity::Lumber; break;
                case CommodityType::Pills:        mobilizeActivity = NPCActivity::Alchemy; break;
                case CommodityType::SpiritStones: mobilizeActivity = NPCActivity::Mine; break;
                default: break;
            }

            auto& registry = ECS::Registry::getInstance();
            auto entities = registry.getEntitiesWithComponent<IdentityComponent>();
            uint64_t expireFrame = ctx.currentTime + 300;

            for (auto id : entities) {
                auto* otherIdentity = registry.getComponent<IdentityComponent>(id);
                if (!otherIdentity || otherIdentity->clanId != identity->clanId) continue;
                auto* otherBehavior = registry.getComponent<BehaviorComponent>(id);
                if (otherBehavior) {
                    otherBehavior->reflection.setTemporaryBoost(mobilizeActivity, 0.5f, expireFrame);
                }
            }
        } else if (identity->layer == 2) {
            CommodityType targetType = CommodityType::Ore;
            float maxRatio = 0.0f;
            for (int i = 0; i < 3; i++) {
                if (digest.alerts[i].priceRatio > maxRatio) {
                    maxRatio = digest.alerts[i].priceRatio;
                    targetType = digest.alerts[i].commodityType;
                }
            }

            NPCActivity mobilizeActivity = NPCActivity::Mine;
            switch (targetType) {
                case CommodityType::Ore:          mobilizeActivity = NPCActivity::Mine; break;
                case CommodityType::Food:         mobilizeActivity = NPCActivity::Farm; break;
                case CommodityType::Equipment:    mobilizeActivity = NPCActivity::Craft; break;
                case CommodityType::Materials:    mobilizeActivity = NPCActivity::Lumber; break;
                case CommodityType::Pills:        mobilizeActivity = NPCActivity::Alchemy; break;
                case CommodityType::SpiritStones: mobilizeActivity = NPCActivity::Mine; break;
                default: break;
            }

            auto& registry = ECS::Registry::getInstance();
            auto entities = registry.getEntitiesWithComponent<IdentityComponent>();
            uint64_t expireFrame = ctx.currentTime + 300;

            for (auto id : entities) {
                auto* otherIdentity = registry.getComponent<IdentityComponent>(id);
                if (!otherIdentity || otherIdentity->clanId != identity->clanId) continue;
                auto* otherBehavior = registry.getComponent<BehaviorComponent>(id);
                if (otherBehavior) {
                    otherBehavior->reflection.setTemporaryBoost(mobilizeActivity, 0.5f, expireFrame);
                }
            }
        }

        return false;
    }

    static constexpr EvaluateFn kEvaluateLayers[] = {
        evaluateSurvival,
        evaluateEmotion,
        evaluateEconomicCrisis,
        evaluateCommand,
        evaluateLLMPlan,
        evaluateSocial,
        evaluateCultivation,
        evaluateDaily,
    };

    static NPCActivity translateActionType(ActionType action) {
        switch (action) {
            case ActionType::REST:              return NPCActivity::Rest;
            case ActionType::PATROL:            return NPCActivity::Patrol;
            case ActionType::EXPLORE:           return NPCActivity::Explore;
            case ActionType::CULTIVATE:         return NPCActivity::Cultivate;
            case ActionType::TRADE:             return NPCActivity::Trade;
            case ActionType::LOGISTICS:         return NPCActivity::Gather;
            case ActionType::RESOURCE_ALLOCATION: return NPCActivity::Build;
            case ActionType::RESOURCE_RAID:     return NPCActivity::Attack;
            case ActionType::CAPTURE_RESOURCE_POINT: return NPCActivity::Scout;
            case ActionType::DOMAIN_WAR:        return NPCActivity::Attack;
            case ActionType::ALLIANCE_FORMATION: return NPCActivity::Trade;
            case ActionType::CULTIVATE_BREAKTHROUGH: return NPCActivity::Breakthrough;
            case ActionType::COMMAND_DELEGATE:   return NPCActivity::Rest;
            case ActionType::REPORT_STATUS:      return NPCActivity::ReportTask;
            case ActionType::COORDINATE_SQUAD:   return NPCActivity::CoordinateSquad;
            case ActionType::RESIST_ORDER:       return NPCActivity::RefuseCommand;
            case ActionType::ECONOMIC_MOBILIZE:  return NPCActivity::EconomicMobilize;
            case ActionType::TRADE_EMBARGO:      return NPCActivity::TradeEmbargo;
            case ActionType::STOCKPILE_MATERIAL: return NPCActivity::StockpileMaterial;
            case ActionType::PRICE_STABILIZE:    return NPCActivity::PriceStabilize;
            case ActionType::SET_TAX_RATE:       return NPCActivity::SetTaxRate;
            default: return NPCActivity::Rest;
        }
    }

    static float economicBiasFor(NPCActivity act, const IdentityComponent* identity, const EconomicSignals& signals) {
        if (!identity || identity->factionCareerHeritage == 0) return 1.0f;

        ActivityTagBundle bundle = getActivityTagBundle(act);
        uint16_t heritage = identity->factionCareerHeritage;

        if (!(bundle.careerTags & heritage)) return 1.0f;

        float bias = 1.0f;
        uint16_t resTags = bundle.resourceTags;

        if (resTags & static_cast<uint16_t>(ResourceTag::ProducesSpiritStones))
            bias *= signals.spiritStoneInflation;
        if (resTags & static_cast<uint16_t>(ResourceTag::ProducesFood))
            bias *= signals.foodDemand;
        if (resTags & static_cast<uint16_t>(ResourceTag::ProducesEquipment))
            bias *= signals.equipmentDemand;
        if (resTags & static_cast<uint16_t>(ResourceTag::ProducesMaterials))
            bias *= signals.materialDemand;
        if (resTags & static_cast<uint16_t>(ResourceTag::ProducesCultivation))
            bias *= signals.cultivationDemand;

        return bias > 0.0f ? bias : 1.0f;
    }

    static NPCActivity chooseByRole(NPCRole role, PersonalityComponent* p, BehaviorComponent* behavior = nullptr,
                             uint64_t currentTime = 0, const IdentityComponent* identity = nullptr,
                             const EconomicSignals& econSignals = EconomicSignals{}) {
        switch (role) {
            case NPCRole::FamilyHead:
            case NPCRole::Elder:
                if (random01() < 0.3f * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Patrol, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Patrol, identity, econSignals))
                return NPCActivity::Patrol;
            if (random01() < 0.2f * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Meditate, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Meditate, identity, econSignals))
                return NPCActivity::Meditate;
            if (random01() < 0.15f * (behavior ? applyReflection(behavior, NPCActivity::Trade, currentTime, p) : 1.0f)
                * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Trade, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Trade, identity, econSignals))
                return NPCActivity::Trade;
                return NPCActivity::Rest;
            case NPCRole::LawEnforcementElder:
                if (random01() < 0.4f * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Patrol, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Patrol, identity, econSignals))
                return NPCActivity::Patrol;
                return NPCActivity::Rest;
            case NPCRole::CoreDisciple:
            case NPCRole::InnerDisciple:
                if (p->isDiligent() && random01() < 0.35f * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Cultivate, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Cultivate, identity, econSignals))
                return NPCActivity::Cultivate;
            if (random01() < 0.25f * (behavior ? applyReflection(behavior, NPCActivity::Patrol, currentTime, p) : 1.0f)
                * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Patrol, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Patrol, identity, econSignals))
                return NPCActivity::Patrol;
            if (random01() < 0.15f * (behavior ? applyReflection(behavior, NPCActivity::Gather, currentTime, p) : 1.0f)
                * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Gather, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Gather, identity, econSignals))
                return NPCActivity::Gather;
            if (random01() < 0.1f * (behavior ? applyReflection(behavior, NPCActivity::Explore, currentTime, p) : 1.0f)
                * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Explore, identity) : 1.0f)
                * economicBiasFor(NPCActivity::Explore, identity, econSignals))
                return NPCActivity::Explore;
                return NPCActivity::Rest;
            case NPCRole::BranchDisciple:
            default:
                {
                    float mineProb = 0.25f * (behavior ? applyReflection(behavior, NPCActivity::Mine, currentTime, p) : 1.0f)
                        * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Mine, identity) : 1.0f)
                        * economicBiasFor(NPCActivity::Mine, identity, econSignals);
                    if (p && !p->isDiligent()) mineProb *= 0.5f;
                    if (random01() < mineProb) return NPCActivity::Mine;
                }
                if (random01() < 0.2f * (behavior ? applyReflection(behavior, NPCActivity::Farm, currentTime, p) : 1.0f)
                    * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Farm, identity) : 1.0f)
                    * economicBiasFor(NPCActivity::Farm, identity, econSignals))
                    return NPCActivity::Farm;
                if (random01() < 0.15f * (behavior ? applyReflection(behavior, NPCActivity::Fish, currentTime, p) : 1.0f)
                    * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Fish, identity) : 1.0f)
                    * economicBiasFor(NPCActivity::Fish, identity, econSignals))
                    return NPCActivity::Fish;
                if (random01() < 0.1f * (behavior ? applyReflection(behavior, NPCActivity::Lumber, currentTime, p) : 1.0f)
                    * (identity ? RoleBaselineWeights::getRoleBaselineWeight(NPCActivity::Lumber, identity) : 1.0f)
                    * economicBiasFor(NPCActivity::Lumber, identity, econSignals))
                    return NPCActivity::Lumber;
                return NPCActivity::Walk;
        }
    }
};
