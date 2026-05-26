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

static constexpr ExecuteDescriptor kExecuteTable[] = {
    // Survival (3)
    {NPCActivity::Flee,   "Flee",   ActivityCategory::Survival, REQ_POSITION|REQ_STATS, exec_flee},
    {NPCActivity::Heal,   "Heal",   ActivityCategory::Survival, REQ_STATS,              exec_heal},
    {NPCActivity::Defend, "Defend", ActivityCategory::Survival, REQ_STATS,              exec_defend},
    // Daily (6)
    {NPCActivity::Eat,         "Eat",         ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_eat},
    {NPCActivity::Rest,        "Rest",        ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_rest},
    {NPCActivity::Sleep,       "Sleep",       ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_sleep},
    {NPCActivity::Walk,        "Walk",        ActivityCategory::Daily, REQ_POSITION,         exec_walk},
    {NPCActivity::Chat,        "Chat",        ActivityCategory::Daily, REQ_SOCIAL,           exec_gossip},
    {NPCActivity::AwaitOrders,"AwaitOrders",  ActivityCategory::Daily, REQ_STATS,            exec_awaitOrders},
    // Cultivation (6)
    {NPCActivity::Cultivate,    "Cultivate",    ActivityCategory::Cultivation, REQ_CULT,                              exec_cultivate},
    {NPCActivity::Breakthrough, "Breakthrough", ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_breakthrough},
    {NPCActivity::Tribulation,  "Tribulation",  ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_tribulation},
    {NPCActivity::Meditate,     "Meditate",     ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_meditate},
    {NPCActivity::Alchemy,      "Alchemy",      ActivityCategory::Cultivation, REQ_RESOURCES,                         exec_alchemy},
    {NPCActivity::SeekFortune,  "SeekFortune",  ActivityCategory::Cultivation, REQ_POSITION,                          exec_seekFortune},
    // Social (8)
    {NPCActivity::VisitFriend,     "VisitFriend",    ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP, exec_visitFriend},
    {NPCActivity::Date,            "Date",           ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP, exec_date},
    {NPCActivity::FamilyGathering, "FamilyGathering",ActivityCategory::Social, REQ_POSITION,                  exec_familyGathering},
    {NPCActivity::MentorTeach,     "MentorTeach",    ActivityCategory::Social, REQ_RELATIONSHIP,              exec_mentorTeach},
    {NPCActivity::DiscipleAsk,     "DiscipleAsk",    ActivityCategory::Social, REQ_RELATIONSHIP|REQ_CULT,     exec_discipleAsk},
    {NPCActivity::Trade,           "Trade",          ActivityCategory::Social, REQ_RESOURCES,                 exec_trade},
    {NPCActivity::Gossip,          "Gossip",         ActivityCategory::Social, REQ_SOCIAL,                    exec_gossip},
    {NPCActivity::ReportTask,      "ReportTask",     ActivityCategory::Social, REQ_POSITION,                  exec_reportTask},
    // Production (13)
    {NPCActivity::Build,     "Build",      ActivityCategory::Production, REQ_RESOURCES,                exec_build},
    {NPCActivity::Mine,      "Mine",       ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION,    exec_mine},
    {NPCActivity::Farm,      "Farm",       ActivityCategory::Production, REQ_RESOURCES,                exec_farm},
    {NPCActivity::Fish,      "Fish",       ActivityCategory::Production, REQ_RESOURCES,                exec_fish},
    {NPCActivity::Lumber,    "Lumber",     ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION,    exec_lumber},
    {NPCActivity::Gather,    "Gather",     ActivityCategory::Production, REQ_RESOURCES,                exec_gather},
    {NPCActivity::Craft,     "Craft",      ActivityCategory::Production, REQ_RESOURCES,                exec_craft},
    {NPCActivity::Refine,    "Refine",     ActivityCategory::Production, REQ_RESOURCES,                exec_refine},
    {NPCActivity::Cook,      "Cook",       ActivityCategory::Production, REQ_RESOURCES,                exec_cook},
    {NPCActivity::Construct, "Construct",  ActivityCategory::Production, REQ_RESOURCES,                exec_construct},
    {NPCActivity::Repair,    "Repair",     ActivityCategory::Production, REQ_RESOURCES,                exec_repair},
    {NPCActivity::Sell,      "Sell",       ActivityCategory::Production, REQ_RESOURCES,                exec_sell},
    {NPCActivity::Buy,       "Buy",        ActivityCategory::Production, REQ_RESOURCES,                exec_buy},
    // Combat (9)
    {NPCActivity::Duel,           "Duel",           ActivityCategory::Combat, REQ_STATS,               exec_duel},
    {NPCActivity::Hunt,           "Hunt",           ActivityCategory::Combat, REQ_POSITION|REQ_STATS,   exec_hunt},
    {NPCActivity::Ambush,         "Ambush",         ActivityCategory::Combat, REQ_STATS,               exec_ambush},
    {NPCActivity::Assassinate,    "Assassinate",    ActivityCategory::Combat, REQ_STATS,               exec_assassinate},
    {NPCActivity::Attack,         "Attack",         ActivityCategory::Combat, REQ_POSITION|REQ_STATS,   exec_attack},
    {NPCActivity::DefendPosition, "DefendPosition", ActivityCategory::Combat, REQ_STATS,               exec_defendPosition},
    {NPCActivity::Patrol,         "Patrol",         ActivityCategory::Combat, REQ_POSITION,             exec_patrol},
    {NPCActivity::Escort,         "Escort",         ActivityCategory::Combat, REQ_POSITION,             exec_escort},
    {NPCActivity::Scout,          "Scout",          ActivityCategory::Combat, REQ_POSITION,             exec_scout},
    // Exploration (3)
    {NPCActivity::Explore,      "Explore",       ActivityCategory::Exploration, REQ_POSITION, exec_explore},
    {NPCActivity::TreasureHunt, "TreasureHunt",  ActivityCategory::Exploration, REQ_POSITION, exec_treasureHunt},
    {NPCActivity::MapExplore,   "MapExplore",    ActivityCategory::Exploration, REQ_POSITION, exec_mapExplore},
    // Command (2)
    {NPCActivity::RefuseCommand,   "RefuseCommand",    ActivityCategory::Command, REQ_POSITION, exec_refuseCommand},
    {NPCActivity::CoordinateSquad, "CoordinateSquad",  ActivityCategory::Command, REQ_POSITION, exec_coordinateSquad},
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
            behavior->changeActivity(translateActionType(action));
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
        auto* cmdRespGet = registry.getComponent<CommandResponseComponent>(entityId);
        if (evaluateCommand(entityId, cmd, cmdRespGet, behavior, personality, currentTime)) return;
        if (evaluateLLMPlan(llmPlan, behavior)) return;
        if (evaluateSocial(social, personality, behavior, rel, identity)) return;
        if (evaluateCultivation(cult, stats, behavior, personality, identity)) return;
        evaluateDaily(social, personality, behavior, identity, cult);
    }

    void execute(ECS::EntityId entityId, uint64_t currentTime, float deltaTime) {
        auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(entityId);
        if (!behavior) return;
        if (behavior->activityStep == 0) {
            behavior->activityStep = 1;
            behavior->activityStartTime = currentTime;
        }

        ExecuteContext ctx(entityId, currentTime, deltaTime);

        for (size_t i = 0; i < kExecuteTableSize; ++i) {
            if (kExecuteTable[i].activity == behavior->currentActivity) {
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

    bool evaluateSurvival(StatsComponent* stats, BehaviorComponent* behavior) {
        if (stats->hpPercent() < 0.3f) {
            behavior->changeActivity(NPCActivity::Flee);
            return true;
        }
        if (stats->hpPercent() < 0.5f) {
            behavior->changeActivity(NPCActivity::Heal);
            return true;
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
            behavior->changeActivity(NPCActivity::RefuseCommand);
            cmd->setFeedback(static_cast<uint8_t>(CommandLifecycle::Refused), currentTime);
            return true;
        }

        if (cmd->squadId != 0) {
            behavior->changeActivity(NPCActivity::CoordinateSquad);
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
                behavior->changeActivity(NPCActivity::ReportTask);
                return true;
            }
            return true;
        }

        cmd->updateStatus(slot->commandId, CommandLifecycle::Executing);

        if (cmd->issuerTier <= 2) {
            behavior->changeActivity(NPCActivity::Patrol);
        } else {
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
                behavior->changeActivity(NPCActivity::Date);
                return true;
            }
            if (rel->hasDisciples() && random01() < 0.15f) {
                behavior->changeActivity(NPCActivity::MentorTeach);
                return true;
            }
            if (rel->mentorSlot != 0 && random01() < 0.15f) {
                behavior->changeActivity(NPCActivity::DiscipleAsk);
                return true;
            }
            if (random01() < 0.3f) {
                behavior->changeActivity(NPCActivity::VisitFriend);
                return true;
            }
            behavior->changeActivity(NPCActivity::Gossip);
            return true;
        }
        return false;
    }

    bool evaluateCultivation(CultivationComponent* cult, StatsComponent* stats,
                             BehaviorComponent* behavior, PersonalityComponent* personality,
                             IdentityComponent* identity) {
        if (!cult || !stats) return false;
        if (cult->isBreakingThrough) {
            behavior->changeActivity(NPCActivity::Breakthrough);
            return true;
        }
        if (cult->tribulationTimer > 0) {
            behavior->changeActivity(NPCActivity::Tribulation);
            return true;
        }
        if (cult->isReadyForBreakthrough() &&
            cult->bottleneckTimer > 1000 && !cult->isBreakingThrough) {
            behavior->changeActivity(NPCActivity::Breakthrough);
            return true;
        }
        if (personality->isDiligent() && random01() < 0.4f) {
            behavior->changeActivity(NPCActivity::Cultivate);
            return true;
        }
        if (cult->bottleneckTimer > 500 && personality->ambition > 70.0f && random01() < 0.2f) {
            behavior->changeActivity(NPCActivity::SeekFortune);
            return true;
        }
        if (personality->caution > 60.0f && random01() < 0.1f) {
            behavior->changeActivity(NPCActivity::Alchemy);
            return true;
        }
        return false;
    }

    void evaluateDaily(SocialComponent* social, PersonalityComponent* personality,
                       BehaviorComponent* behavior, IdentityComponent* identity,
                       CultivationComponent* cult) {
        if (social) {
            if (social->isHungry()) {
                behavior->changeActivity(NPCActivity::Eat);
                return;
            }
            if (social->isExhausted()) {
                behavior->changeActivity(NPCActivity::Sleep);
                return;
            }
        }

        if (identity && personality) {
            NPCActivity chosen = chooseByRole(identity->role, personality);
            behavior->changeActivity(chosen);
            return;
        }

        behavior->changeActivity(NPCActivity::Rest);
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

    NPCActivity chooseByRole(NPCRole role, PersonalityComponent* p) {
        switch (role) {
            case NPCRole::FamilyHead:
            case NPCRole::Elder:
                if (random01() < 0.3f) return NPCActivity::Patrol;
                if (random01() < 0.2f) return NPCActivity::Meditate;
                if (random01() < 0.15f) return NPCActivity::Trade;
                return NPCActivity::Rest;
            case NPCRole::LawEnforcementElder:
                return (random01() < 0.4f) ? NPCActivity::Patrol : NPCActivity::Rest;
            case NPCRole::CoreDisciple:
            case NPCRole::InnerDisciple:
                if (p->isDiligent() && random01() < 0.35f) return NPCActivity::Cultivate;
                if (random01() < 0.25f) return NPCActivity::Patrol;
                if (random01() < 0.15f) return NPCActivity::Gather;
                if (random01() < 0.1f)  return NPCActivity::Explore;
                return NPCActivity::Rest;
            case NPCRole::BranchDisciple:
            default:
                if (p->isDiligent() && random01() < 0.25f) return NPCActivity::Mine;
                if (random01() < 0.2f) return NPCActivity::Farm;
                if (random01() < 0.15f) return NPCActivity::Fish;
                if (random01() < 0.1f)  return NPCActivity::Lumber;
                return NPCActivity::Walk;
        }
    }
};
