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
#include "ExecuteDescriptor.h"
#include "BehaviorTree_Survival.h"
#include "BehaviorTree_Daily.h"
#include "BehaviorTree_Cultivation.h"
#include "BehaviorTree_Social.h"
#include "BehaviorTree_Production.h"
#include "BehaviorTree_Combat.h"
#include "BehaviorTree_Exploration.h"
#include "BehaviorTree_Command.h"
#include <cstdlib>
#include <ctime>
#include <cmath>

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
    // Social (8)
    {NPCActivity::VisitFriend,     "VisitFriend",    ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP, exec_visitFriend, nullptr},
    {NPCActivity::Date,            "Date",           ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP, exec_date, nullptr},
    {NPCActivity::FamilyGathering, "FamilyGathering",ActivityCategory::Social, REQ_POSITION,                  exec_familyGathering, nullptr},
    {NPCActivity::MentorTeach,     "MentorTeach",    ActivityCategory::Social, REQ_RELATIONSHIP,              exec_mentorTeach, nullptr},
    {NPCActivity::DiscipleAsk,     "DiscipleAsk",    ActivityCategory::Social, REQ_RELATIONSHIP|REQ_CULT,     exec_discipleAsk, nullptr},
    {NPCActivity::Trade,           "Trade",          ActivityCategory::Social, REQ_RESOURCES,                 exec_trade, nullptr},
    {NPCActivity::Gossip,          "Gossip",         ActivityCategory::Social, REQ_SOCIAL,                    exec_gossip, nullptr},
    {NPCActivity::ReportTask,      "ReportTask",     ActivityCategory::Social, REQ_POSITION,                  exec_reportTask, nullptr},
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
};
static constexpr size_t kExecuteTableSize = sizeof(kExecuteTable) / sizeof(kExecuteTable[0]);

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

        if (llmPlan && llmPlan->tier != LLMTier::T3 &&
            llmPlan->status == PlanStatus::ACTIVE) {
            ActionType action = llmPlan->getCurrentAction();
            NPCActivity newAct = translateActionType(action);
            if (shouldInterrupt(behavior, newAct, 6)) {
                behavior->changeActivity(newAct);
            }
            return;
        }

        if (bt && bt->tmpl) {
            if (BTEvaluator::evaluate(entityId, currentTime)) return;
        }

        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        auto* personality = registry.getComponent<PersonalityComponent>(entityId);
        auto* social = registry.getComponent<SocialComponent>(entityId);
        auto* rel = registry.getComponent<RelationshipComponent>(entityId);
        auto* cult = registry.getComponent<CultivationComponent>(entityId);

        if (!identity || !personality) return;

        if (evaluateSurvival(stats, behavior)) return;
        if (evaluateEmotion(social, personality, behavior, stats, rel, registry, entityId, currentTime)) return;
        auto* cmdRespGet = registry.getComponent<CommandResponseComponent>(entityId);
        if (evaluateCommand(entityId, cmd, cmdRespGet, behavior, personality, currentTime)) return;
        if (evaluateLLMPlan(llmPlan, behavior)) return;
        if (evaluateSocial(social, personality, behavior, rel, identity)) return;
        if (evaluateCultivation(cult, stats, behavior, personality, identity)) return;
        evaluateDaily(social, personality, behavior, identity, cult, currentTime);
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

    static float random01() {
        return static_cast<float>(rand()) / static_cast<float>(RAND_MAX);
    }

    static int randRange(int min, int max) {
        return min + rand() % (max - min + 1);
    }

    float applyReflection(BehaviorComponent* behavior, NPCActivity activity,
                          uint64_t currentFrame = 0, PersonalityComponent* personality = nullptr) {
        if (!behavior) return 1.0f;
        if (currentFrame == 0 || !personality) {
            return behavior->reflection.getWeight(activity);
        }
        return behavior->reflection.getWeightWithDecay(activity, currentFrame, personality->diligence);
    }

    NPCActivity tryMicroPlan(BehaviorComponent* behavior, PersonalityComponent* p,
                             uint64_t currentFrame) {
        if (!behavior) return NPCActivity::Idle;
        auto& ref = behavior->reflection;

        if (ref.microPlanTriggered) return ref.microPlanActivity;

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

        NPCActivity creative = NPCActivity::Rest;

        NPCActivity allActivities[] = {
            NPCActivity::Mine, NPCActivity::Farm, NPCActivity::Fish, NPCActivity::Lumber,
            NPCActivity::Gather, NPCActivity::Craft, NPCActivity::Refine, NPCActivity::Cook,
            NPCActivity::Trade, NPCActivity::Explore, NPCActivity::TreasureHunt, NPCActivity::MapExplore,
            NPCActivity::Patrol, NPCActivity::Scout, NPCActivity::Hunt,
            NPCActivity::Cultivate, NPCActivity::Meditate, NPCActivity::SeekFortune, NPCActivity::Alchemy,
            NPCActivity::Walk, NPCActivity::Rest, NPCActivity::Gossip
        };
        constexpr int numAll = sizeof(allActivities) / sizeof(allActivities[0]);

        float bestSimilarity = -1.0f;
        for (int i = 0; i < numAll; i++) {
            if (allActivities[i] == best) continue;
            float sim = jaccardSimilarity(best, allActivities[i]);
            if (sim > bestSimilarity) {
                bestSimilarity = sim;
                creative = allActivities[i];
            }
        }

        if (bestSimilarity <= 0.0f) {
            if (p && p->ambition > 60.0f) creative = NPCActivity::Explore;
            else if (p && p->caution > 60.0f) creative = NPCActivity::Meditate;
            else creative = NPCActivity::Walk;
        }

        ref.microPlanTriggered = 1;
        ref.microPlanActivity = creative;
        ref.stuckCount = 0;

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
            case NPCActivity::RefuseCommand:
            case NPCActivity::CoordinateSquad:
                return 2;
            case NPCActivity::VisitFriend:
            case NPCActivity::Date:
            case NPCActivity::FamilyGathering:
            case NPCActivity::MentorTeach:
            case NPCActivity::DiscipleAsk:
            case NPCActivity::Trade:
            case NPCActivity::Gossip:
            case NPCActivity::ReportTask:
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

    bool shouldInterrupt(BehaviorComponent* behavior, NPCActivity newActivity, uint8_t interruptSource) {
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

    bool evaluateSurvival(StatsComponent* stats, BehaviorComponent* behavior) {
        bool wasInSurvival = (behavior->currentActivity == NPCActivity::Flee ||
                              behavior->currentActivity == NPCActivity::Heal ||
                              behavior->currentActivity == NPCActivity::Defend);

        if (stats->hpPercent() < 0.3f) {
            if (!shouldInterrupt(behavior, NPCActivity::Flee, 1)) return true;
            behavior->changeActivity(NPCActivity::Flee);
            return true;
        }
        if (stats->hpPercent() < 0.5f) {
            if (behavior->currentActivity == NPCActivity::Flee && stats->hpPercent() >= 0.4f) {
                if (!shouldInterrupt(behavior, NPCActivity::Heal, 1)) return true;
                behavior->changeActivity(NPCActivity::Heal);
                return true;
            }
            if (!wasInSurvival) {
                behavior->changeActivity(NPCActivity::Heal);
                return true;
            }
            return true;
        }
        if (wasInSurvival) {
            float exitThreshold = (behavior->currentActivity == NPCActivity::Heal) ? 0.6f : 0.4f;
            if (stats->hpPercent() >= exitThreshold) {
                if (!shouldInterrupt(behavior, NPCActivity::Rest, 1)) return true;
                return false;
            }
            return true;
        }
        return false;
    }

    bool evaluateEmotion(SocialComponent* social, PersonalityComponent* personality,
                         BehaviorComponent* behavior, StatsComponent* stats,
                         RelationshipComponent* rel, ECS::Registry& reg, ECS::EntityId entityId,
                         uint64_t currentFrame) {
        if (!social || !personality) return false;

        social->cleanupExpiredCooldowns(currentFrame);

        if (social->isTerrified() && stats && stats->hpPercent() > 0.15f) {
            uint32_t targetSlot = 0;
            if (rel && rel->relationCount > 0) {
                int8_t lowestAffinity = 127;
                for (uint8_t i = 0; i < rel->relationCount; i++) {
                    if (rel->relations[i].affinity < lowestAffinity) {
                        lowestAffinity = rel->relations[i].affinity;
                        targetSlot = rel->relations[i].targetSlot;
                    }
                }
            }
            if (targetSlot != 0 && social->isInCooldown(targetSlot, EmotionType::Fear, NPCActivity::Flee, currentFrame)) {
            } else if (shouldInterrupt(behavior, NPCActivity::Flee, 4)) {
                behavior->changeActivity(NPCActivity::Flee);
                if (targetSlot != 0) {
                    social->addCooldown(targetSlot, EmotionType::Fear, NPCActivity::Flee, currentFrame);
                }
                return true;
            }
        }

        if (social->isEnraged(personality->caution)) {
            uint32_t targetSlot = 0;
            if (rel && rel->relationCount > 0) {
                int8_t lowestAffinity = 127;
                for (uint8_t i = 0; i < rel->relationCount; i++) {
                    if (rel->relations[i].affinity < lowestAffinity) {
                        lowestAffinity = rel->relations[i].affinity;
                        targetSlot = rel->relations[i].targetSlot;
                    }
                }
            }
            if (targetSlot != 0 && social->isInCooldown(targetSlot, EmotionType::Anger, NPCActivity::Duel, currentFrame)) {
                float threshold = 70.0f - personality->caution * 0.3f;
                social->addFear((social->anger - threshold) * 0.5f);
                return false;
            }
            if (shouldInterrupt(behavior, NPCActivity::Duel, 4)) {
                behavior->changeActivity(NPCActivity::Duel);
                if (targetSlot != 0) {
                    social->addCooldown(targetSlot, EmotionType::Anger, NPCActivity::Duel, currentFrame);
                }
                return true;
            }
        }

        if (social->isElated(personality->sociability)) {
            if (shouldInterrupt(behavior, NPCActivity::Gossip, 4)) {
                behavior->changeActivity(NPCActivity::Gossip);
                return true;
            }
        }

        return false;
    }

    bool evaluateCommand(ECS::EntityId entityId, RoleCommandComponent* cmd, CommandResponseComponent* cmdResp,
                         BehaviorComponent* behavior, PersonalityComponent* personality, uint64_t currentTime) {
        if (!cmd || !cmd->hasActiveCommand()) return false;

        CommandSlot* slot = cmd->peekCommandMut();
        if (!slot) return false;

        if (cmdResp && !cmdResp->resolved) {
            auto& reg = ECS::Registry::getInstance();
            float relVal = 0.0f;
            if (cmd && cmd->issuerId != 0) {
                auto* issuerRel = reg.getComponent<RelationshipComponent>(cmd->issuerId);
                if (issuerRel) {
                    for (size_t s = 0; s < reg.entityIds_.size(); ++s) {
                        if (reg.entityIds_[s] == entityId) {
                            relVal = static_cast<float>(issuerRel->getAffinity(static_cast<uint32_t>(s)));
                            break;
                        }
                    }
                }
            }
            float risk = getRiskLevel(static_cast<NPCActivity>(cmd->commandType));

            cmdResp->evaluateResponse(
                slot->status,
                personality->loyalty,
                personality->ambition,
                personality->caution,
                personality->greed,
                relVal,
                risk
            );
        }

        if (cmdResp && cmdResp->isRefusing()) {
            cmd->updateStatus(slot->commandId, CommandLifecycle::Refused);
            if (shouldInterrupt(behavior, NPCActivity::RefuseCommand, 6)) {
                behavior->changeActivity(NPCActivity::RefuseCommand);
            }
            cmd->setFeedback(static_cast<uint8_t>(CommandLifecycle::Refused), currentTime);
            return true;
        }

        if (cmd->squadId != 0) {
            if (shouldInterrupt(behavior, NPCActivity::CoordinateSquad, 6)) {
                behavior->changeActivity(NPCActivity::CoordinateSquad);
            }
            return true;
        }

        if (behavior->currentActivity == NPCActivity::Patrol ||
            behavior->currentActivity == NPCActivity::CoordinateSquad) {
            if (behavior->activityProgress >= 1.0f) {
                cmd->updateStatus(slot->commandId,
                    cmdResp && cmdResp->overachieveMult > 1.0f
                        ? CommandLifecycle::PartiallyCompleted
                        : CommandLifecycle::Completed);
                cmd->setFeedback(slot->status, currentTime);
                if (shouldInterrupt(behavior, NPCActivity::ReportTask, 6)) {
                    behavior->changeActivity(NPCActivity::ReportTask);
                }
                return true;
            }
            return true;
        }

        cmd->updateStatus(slot->commandId, CommandLifecycle::Executing);

        if (shouldInterrupt(behavior, NPCActivity::Patrol, 6)) {
            behavior->changeActivity(NPCActivity::Patrol);
        }

        return true;
    }

    bool evaluateLLMPlan(LLMPlanComponent* llmPlan, BehaviorComponent* behavior) {
        if (!llmPlan || llmPlan->tier == LLMTier::T3 ||
            llmPlan->status != PlanStatus::ACTIVE) return false;
        ActionType action = llmPlan->getCurrentAction();
        behavior->changeActivity(translateActionType(action));
        return true;
    }

    bool evaluateSocial(SocialComponent* social, PersonalityComponent* personality,
                        BehaviorComponent* behavior, RelationshipComponent* rel,
                        IdentityComponent* identity) {
        if (!social || !personality) return false;
        if (social->wantsSocial() && personality->isSocial() && rel &&
            rel->relationCount > 0) {
            if (rel->spouseSlot != 0 && random01() < 0.2f) {
                if (shouldInterrupt(behavior, NPCActivity::Date, 5)) {
                    behavior->changeActivity(NPCActivity::Date);
                }
                return true;
            }
            if (rel->hasDisciples() && random01() < 0.15f) {
                if (shouldInterrupt(behavior, NPCActivity::MentorTeach, 5)) {
                    behavior->changeActivity(NPCActivity::MentorTeach);
                }
                return true;
            }
            if (rel->mentorSlot != 0 && random01() < 0.15f) {
                if (shouldInterrupt(behavior, NPCActivity::DiscipleAsk, 5)) {
                    behavior->changeActivity(NPCActivity::DiscipleAsk);
                }
                return true;
            }
            if (random01() < 0.3f) {
                if (shouldInterrupt(behavior, NPCActivity::VisitFriend, 5)) {
                    behavior->changeActivity(NPCActivity::VisitFriend);
                }
                return true;
            }
            if (shouldInterrupt(behavior, NPCActivity::Gossip, 5)) {
                behavior->changeActivity(NPCActivity::Gossip);
            }
            return true;
        }
        return false;
    }

    bool evaluateCultivation(CultivationComponent* cult, StatsComponent* stats,
                             BehaviorComponent* behavior, PersonalityComponent* personality,
                             IdentityComponent* identity) {
        if (!cult || !stats) return false;
        if (cult->isBreakingThrough) {
            if (shouldInterrupt(behavior, NPCActivity::Breakthrough, 7)) {
                behavior->changeActivity(NPCActivity::Breakthrough);
            }
            return true;
        }
        if (cult->tribulationTimer > 0) {
            if (shouldInterrupt(behavior, NPCActivity::Tribulation, 7)) {
                behavior->changeActivity(NPCActivity::Tribulation);
            }
            return true;
        }
        if (cult->isReadyForBreakthrough() &&
            cult->bottleneckTimer > 1000 && !cult->isBreakingThrough) {
            if (shouldInterrupt(behavior, NPCActivity::Breakthrough, 7)) {
                behavior->changeActivity(NPCActivity::Breakthrough);
            }
            return true;
        }
        if (personality->isDiligent() && random01() < 0.4f) {
            if (shouldInterrupt(behavior, NPCActivity::Cultivate, 7)) {
                behavior->changeActivity(NPCActivity::Cultivate);
            }
            return true;
        }
        if (cult->bottleneckTimer > 500 && personality->ambition > 70.0f && random01() < 0.2f) {
            if (shouldInterrupt(behavior, NPCActivity::SeekFortune, 7)) {
                behavior->changeActivity(NPCActivity::SeekFortune);
            }
            return true;
        }
        if (personality->caution > 60.0f && random01() < 0.1f) {
            if (shouldInterrupt(behavior, NPCActivity::Alchemy, 7)) {
                behavior->changeActivity(NPCActivity::Alchemy);
            }
            return true;
        }
        return false;
    }

    void evaluateDaily(SocialComponent* social, PersonalityComponent* personality,
                       BehaviorComponent* behavior, IdentityComponent* identity,
                       CultivationComponent* cult, uint64_t currentTime) {
        if (social) {
            if (social->isHungry()) {
                if (shouldInterrupt(behavior, NPCActivity::Eat, 7)) {
                    behavior->changeActivity(NPCActivity::Eat);
                }
                return;
            }
            if (social->isExhausted()) {
                if (shouldInterrupt(behavior, NPCActivity::Sleep, 7)) {
                    behavior->changeActivity(NPCActivity::Sleep);
                }
                return;
            }
        }

        if (identity && personality) {
            NPCActivity chosen = chooseByRole(identity->role, personality, behavior, currentTime);
            float weight = applyReflection(behavior, chosen, currentTime, personality);
            if (weight < 0.7f && random01() < 0.5f) {
                chosen = chooseByRole(identity->role, personality, nullptr, currentTime);
            }
            if (weight < 0.5f && random01() < 0.3f) {
                NPCActivity microPlan = tryMicroPlan(behavior, personality, currentTime);
                if (microPlan != NPCActivity::Idle && shouldInterrupt(behavior, microPlan, 7)) {
                    behavior->changeActivity(microPlan);
                    return;
                }
            }
            if (shouldInterrupt(behavior, chosen, 7)) {
                behavior->changeActivity(chosen);
            }
            return;
        }

        if (shouldInterrupt(behavior, NPCActivity::Rest, 7)) {
            behavior->changeActivity(NPCActivity::Rest);
        }
    }

    NPCActivity translateActionType(ActionType action) {
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
            default: return NPCActivity::Rest;
        }
    }

    NPCActivity chooseByRole(NPCRole role, PersonalityComponent* p, BehaviorComponent* behavior = nullptr,
                             uint64_t currentTime = 0) {
        switch (role) {
            case NPCRole::FamilyHead:
            case NPCRole::Elder:
                if (random01() < 0.3f) return NPCActivity::Patrol;
                if (random01() < 0.2f) return NPCActivity::Meditate;
                if (random01() < 0.15f * (behavior ? applyReflection(behavior, NPCActivity::Trade, currentTime, p) : 1.0f))
                    return NPCActivity::Trade;
                return NPCActivity::Rest;
            case NPCRole::LawEnforcementElder:
                return (random01() < 0.4f) ? NPCActivity::Patrol : NPCActivity::Rest;
            case NPCRole::CoreDisciple:
            case NPCRole::InnerDisciple:
                if (p->isDiligent() && random01() < 0.35f) return NPCActivity::Cultivate;
                if (random01() < 0.25f * (behavior ? applyReflection(behavior, NPCActivity::Patrol, currentTime, p) : 1.0f))
                    return NPCActivity::Patrol;
                if (random01() < 0.15f * (behavior ? applyReflection(behavior, NPCActivity::Gather, currentTime, p) : 1.0f))
                    return NPCActivity::Gather;
                if (random01() < 0.1f * (behavior ? applyReflection(behavior, NPCActivity::Explore, currentTime, p) : 1.0f))
                    return NPCActivity::Explore;
                return NPCActivity::Rest;
            case NPCRole::BranchDisciple:
            default:
                if (p->isDiligent() && random01() < 0.25f * (behavior ? applyReflection(behavior, NPCActivity::Mine, currentTime, p) : 1.0f))
                    return NPCActivity::Mine;
                if (random01() < 0.2f * (behavior ? applyReflection(behavior, NPCActivity::Farm, currentTime, p) : 1.0f))
                    return NPCActivity::Farm;
                if (random01() < 0.15f * (behavior ? applyReflection(behavior, NPCActivity::Fish, currentTime, p) : 1.0f))
                    return NPCActivity::Fish;
                if (random01() < 0.1f * (behavior ? applyReflection(behavior, NPCActivity::Lumber, currentTime, p) : 1.0f))
                    return NPCActivity::Lumber;
                return NPCActivity::Walk;
        }
    }
};
