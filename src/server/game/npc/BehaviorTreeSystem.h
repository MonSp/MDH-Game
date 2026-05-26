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
#include <cstdlib>
#include <ctime>
#include <cmath>

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
            BTEvaluator::evaluate(entityId, currentTime);
            return;
        }

        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        auto* personality = registry.getComponent<PersonalityComponent>(entityId);
        auto* social = registry.getComponent<SocialComponent>(entityId);
        auto* rel = registry.getComponent<RelationshipComponent>(entityId);
        auto* cult = registry.getComponent<CultivationComponent>(entityId);

        if (!identity || !personality) return;

        if (evaluateSurvival(stats, behavior)) return;
        auto* cmdRespGet = registry.getComponent<CommandResponseComponent>(entityId);
        if (evaluateCommand(cmd, cmdRespGet, behavior, personality, currentTime)) return;
        if (evaluateLLMPlan(llmPlan, behavior)) return;
        if (evaluateSocial(social, personality, behavior, rel, identity)) return;
        if (evaluateCultivation(cult, stats, behavior, personality, identity)) return;
        evaluateDaily(social, personality, behavior, identity, cult);
    }

    void execute(ECS::EntityId entityId, uint64_t currentTime, float deltaTime) {
        auto& registry = ECS::Registry::getInstance();
        auto* behavior = registry.getComponent<BehaviorComponent>(entityId);
        auto* stats = registry.getComponent<StatsComponent>(entityId);
        auto* position = registry.getComponent<PositionComponent>(entityId);
        auto* resources = registry.getComponent<ResourcesComponent>(entityId);
        auto* social = registry.getComponent<SocialComponent>(entityId);
        auto* cult = registry.getComponent<CultivationComponent>(entityId);
        auto* rel = registry.getComponent<RelationshipComponent>(entityId);
        auto* cmd = registry.getComponent<RoleCommandComponent>(entityId);
        auto* identity = registry.getComponent<IdentityComponent>(entityId);

        if (!behavior || !stats) return;
        if (behavior->activityStep == 0) {
            behavior->activityStep = 1;
            behavior->activityStartTime = currentTime;
        }

        switch (behavior->currentActivity) {
            case NPCActivity::Flee:            executeFlee(position, stats, deltaTime); break;
            case NPCActivity::Heal:            executeHeal(stats, deltaTime); break;
            case NPCActivity::Defend:          executeDefend(stats, deltaTime); break;
            case NPCActivity::Eat:             executeEat(social, stats, deltaTime); break;
            case NPCActivity::Rest:            executeRest(social, stats, deltaTime); break;
            case NPCActivity::Sleep:           executeSleep(social, stats, deltaTime); break;
            case NPCActivity::Walk:            executeWalk(position, deltaTime); break;
            case NPCActivity::Cultivate:       executeCultivate(cult, deltaTime); break;
            case NPCActivity::Breakthrough:    executeBreakthrough(cult, stats, behavior); break;
            case NPCActivity::Tribulation:     executeTribulation(cult, stats, behavior); break;
            case NPCActivity::Meditate:        executeMeditate(cult, stats, deltaTime); break;
            case NPCActivity::Alchemy:         executeAlchemy(resources, identity, behavior); break;
            case NPCActivity::SeekFortune:     executeSeekFortune(position, deltaTime); break;
            case NPCActivity::VisitFriend:     executeVisitFriend(entityId, rel, position, deltaTime); break;
            case NPCActivity::Date:            executeDate(entityId, rel, position, deltaTime); break;
            case NPCActivity::FamilyGathering: executeFamilyGathering(cmd, position, deltaTime); break;
            case NPCActivity::MentorTeach:     executeMentorTeach(entityId, rel, cult); break;
            case NPCActivity::DiscipleAsk:     executeDiscipleAsk(entityId, rel, cult); break;
            case NPCActivity::Trade:           executeTrade(resources, identity, behavior); break;
            case NPCActivity::Gossip:          executeGossip(entityId, rel, social); break;
            case NPCActivity::Build:           executeBuild(resources, position, behavior); break;
            case NPCActivity::Mine:            executeMine(resources, position, behavior, deltaTime); break;
            case NPCActivity::Farm:            executeFarm(resources, position, behavior, deltaTime); break;
            case NPCActivity::Fish:            executeFish(resources, position, behavior, deltaTime); break;
            case NPCActivity::Lumber:          executeLumber(resources, position, behavior, deltaTime); break;
            case NPCActivity::Gather:          executeGather(resources, deltaTime); break;
            case NPCActivity::Attack:          executeAttack(position, stats, deltaTime); break;
            case NPCActivity::DefendPosition:  executeDefendPosition(stats, deltaTime); break;
            case NPCActivity::Patrol:          executePatrol(entityId, position, behavior, deltaTime); break;
            case NPCActivity::Escort:          executeEscort(position, deltaTime); break;
            case NPCActivity::Scout:           executeScout(position, deltaTime); break;
            case NPCActivity::Craft:           executeCraft(resources, identity, behavior); break;
            case NPCActivity::Refine:          executeRefine(resources, identity, behavior); break;
            case NPCActivity::Cook:            executeCook(resources, identity, behavior); break;
            case NPCActivity::Construct:       executeConstruct(resources, identity, behavior); break;
            case NPCActivity::Repair:          executeRepair(resources, identity, behavior); break;
            case NPCActivity::Sell:            executeSell(resources, identity, behavior); break;
            case NPCActivity::Buy:             executeBuy(resources, identity, behavior); break;
            case NPCActivity::Duel:            executeDuel(entityId, stats, deltaTime); break;
            case NPCActivity::Hunt:            executeHunt(position, stats, deltaTime); break;
            case NPCActivity::Ambush:          executeAmbush(stats, deltaTime); break;
            case NPCActivity::Assassinate:     executeAssassinate(stats, deltaTime); break;
            case NPCActivity::Explore:         executeExplore(position, deltaTime); break;
            case NPCActivity::TreasureHunt:    executeTreasureHunt(position, deltaTime); break;
            case NPCActivity::MapExplore:      executeMapExplore(position, deltaTime); break;
            case NPCActivity::ReportTask:       executeReportTask(entityId, cmd, position, deltaTime); break;
            case NPCActivity::RefuseCommand:    executeRefuseCommand(position, deltaTime); break;
            case NPCActivity::CoordinateSquad:  executeCoordinateSquad(position, deltaTime); break;
            case NPCActivity::AwaitOrders:      executeAwaitOrders(social, stats, deltaTime); break;
            default: break;
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

    static const char* activityName(NPCActivity a) {
        switch (a) {
            case NPCActivity::Flee: return "Flee";
            case NPCActivity::Heal: return "Heal";
            case NPCActivity::Defend: return "Defend";
            case NPCActivity::Eat: return "Eat";
            case NPCActivity::Rest: return "Rest";
            case NPCActivity::Sleep: return "Sleep";
            case NPCActivity::Walk: return "Walk";
            case NPCActivity::Chat: return "Chat";
            case NPCActivity::Cultivate: return "Cultivate";
            case NPCActivity::Breakthrough: return "Breakthrough";
            case NPCActivity::Tribulation: return "Tribulation";
            case NPCActivity::Meditate: return "Meditate";
            case NPCActivity::Alchemy: return "Alchemy";
            case NPCActivity::SeekFortune: return "SeekFortune";
            case NPCActivity::VisitFriend: return "VisitFriend";
            case NPCActivity::Date: return "Date";
            case NPCActivity::FamilyGathering: return "FamilyGathering";
            case NPCActivity::MentorTeach: return "MentorTeach";
            case NPCActivity::DiscipleAsk: return "DiscipleAsk";
            case NPCActivity::Trade: return "Trade";
            case NPCActivity::Gossip: return "Gossip";
            case NPCActivity::Build: return "Build";
            case NPCActivity::Mine: return "Mine";
            case NPCActivity::Farm: return "Farm";
            case NPCActivity::Fish: return "Fish";
            case NPCActivity::Lumber: return "Lumber";
            case NPCActivity::Gather: return "Gather";
            case NPCActivity::Attack: return "Attack";
            case NPCActivity::DefendPosition: return "DefendPosition";
            case NPCActivity::Patrol: return "Patrol";
            case NPCActivity::Escort: return "Escort";
            case NPCActivity::Scout: return "Scout";
            case NPCActivity::Craft: return "Craft";
            case NPCActivity::Refine: return "Refine";
            case NPCActivity::Cook: return "Cook";
            case NPCActivity::Construct: return "Construct";
            case NPCActivity::Repair: return "Repair";
            case NPCActivity::Buy: return "Buy";
            case NPCActivity::Sell: return "Sell";
            case NPCActivity::Duel: return "Duel";
            case NPCActivity::Hunt: return "Hunt";
            case NPCActivity::Ambush: return "Ambush";
            case NPCActivity::Assassinate: return "Assassinate";
            case NPCActivity::Explore: return "Explore";
            case NPCActivity::TreasureHunt: return "TreasureHunt";
            case NPCActivity::MapExplore: return "MapExplore";
            case NPCActivity::ReportTask: return "ReportTask";
            case NPCActivity::RefuseCommand: return "RefuseCommand";
            case NPCActivity::CoordinateSquad: return "CoordinateSquad";
            case NPCActivity::AwaitOrders: return "AwaitOrders";
            default: return "Rest";
        }
    }

    // ── Priority Layers ──────────────────────────────────────────

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

    bool evaluateCommand(RoleCommandComponent* cmd, CommandResponseComponent* cmdResp,
                         BehaviorComponent* behavior, PersonalityComponent* personality, uint64_t currentTime) {
        if (!cmd || !cmd->hasActiveCommand()) return false;

        CommandSlot* slot = cmd->peekCommandMut();
        if (!slot) return false;

        if (cmdResp && !cmdResp->resolved) {
            cmdResp->evaluateResponse(
                slot->status,
                personality->loyalty,
                personality->ambition,
                personality->caution,
                personality->greed,
                0.0f,
                0.0f
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

        cmd->updateStatus(slot->commandId, CommandLifecycle::Executing);

        if (cmd->issuerTier <= 2) {
            behavior->changeActivity(NPCActivity::Patrol);
        } else {
            behavior->changeActivity(NPCActivity::Patrol);
        }

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

    // ── Execute: Survival ────────────────────────────────────────

    void executeFlee(PositionComponent* pos, StatsComponent* stats, float dt) {
        if (pos) {
            pos->x -= pos->speed * 1.5f * dt / 1000.0f;
        }
        if (stats) {
            stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 20);
        }
    }

    void executeHeal(StatsComponent* stats, float dt) {
        if (!stats) return;
        int32_t hpRecovery = stats->maxHp / 40;
        int32_t mpRecovery = stats->maxMp / 20;
        stats->hp = std::min(stats->maxHp, stats->hp + hpRecovery);
        stats->mp = std::min(stats->maxMp, stats->mp + mpRecovery);
    }

    void executeDefend(StatsComponent* stats, float dt) {
        if (!stats) return;
        int32_t regen = static_cast<int32_t>(stats->maxHp * 0.01f);
        stats->hp = std::min(stats->maxHp, stats->hp + regen);
    }

    // ── Execute: Daily ───────────────────────────────────────────

    void executeEat(SocialComponent* social, StatsComponent* stats, float dt) {
        if (social) social->onEat();
        if (stats) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 50);
    }

    void executeRest(SocialComponent* social, StatsComponent* stats, float dt) {
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        if (social) social->onRest(hours);
        if (stats) {
            int32_t hr = static_cast<int32_t>(stats->maxHp * hours * 0.05f);
            int32_t mr = static_cast<int32_t>(stats->maxMp * hours * 0.05f);
            stats->hp = std::min(stats->maxHp, stats->hp + hr);
            stats->mp = std::min(stats->maxMp, stats->mp + mr);
        }
    }

    void executeSleep(SocialComponent* social, StatsComponent* stats, float dt) {
        if (social) social->onSleep();
        if (stats) {
            stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 10);
            stats->mp = std::min(stats->maxMp, stats->mp + stats->maxMp / 5);
        }
    }

    void executeWalk(PositionComponent* pos, float dt) {
        if (!pos || pos->hasReachedTarget(10.0f)) {
            if (pos) pos->moveTo(pos->x + randRange(-100, 100), pos->y + randRange(-100, 100));
        }
    }

    // ── Execute: Cultivation ─────────────────────────────────────

    void executeCultivate(CultivationComponent* cult, float dt) {
        if (!cult) return;
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        cult->addProgress(2.0f * hours);
        cult->bottleneckTimer += static_cast<uint32_t>(hours * 60.0f);
    }

    void executeBreakthrough(CultivationComponent* cult, StatsComponent* stats,
                             BehaviorComponent* behavior) {
        if (!cult || !stats) return;
        float chance = cult->getBreakthroughChance(stats->realm);
        if (random01() < chance) {
            uint8_t current = static_cast<uint8_t>(stats->realm);
            if (current < static_cast<uint8_t>(RealmLevel::Transcension)) {
                stats->realm = static_cast<RealmLevel>(current + 1);
                stats->power = static_cast<int32_t>(stats->power * 1.5f);
                stats->maxHp = static_cast<int32_t>(stats->maxHp * 1.3f);
                stats->maxMp = static_cast<int32_t>(stats->maxMp * 1.4f);
                stats->hp = stats->maxHp;
                stats->mp = stats->maxMp;
            }
            cult->resetProgress();
            cult->isBreakingThrough = false;
            behavior->changeActivity(NPCActivity::Rest);
        } else {
            stats->hp = static_cast<int32_t>(stats->hp * 0.4f);
            cult->isBreakingThrough = false;
            behavior->changeActivity(NPCActivity::Heal);
        }
    }

    void executeTribulation(CultivationComponent* cult, StatsComponent* stats,
                            BehaviorComponent* behavior) {
        if (!cult || !stats) return;
        cult->tribulationDamage += randRange(10, 50);
        stats->takeDamage(cult->tribulationDamage);
        if (stats->isDead()) {
            behavior->changeActivity(NPCActivity::Dead);
            return;
        }
        cult->tribulationTimer--;
        if (cult->tribulationTimer == 0) {
            uint8_t current = static_cast<uint8_t>(stats->realm);
            if (current < static_cast<uint8_t>(RealmLevel::Transcension)) {
                stats->realm = static_cast<RealmLevel>(current + 1);
                stats->power = static_cast<int32_t>(stats->power * 2.0f);
                stats->hp = stats->maxHp;
                stats->mp = stats->maxMp;
            }
            behavior->changeActivity(NPCActivity::Rest);
        }
    }

    void executeMeditate(CultivationComponent* cult, StatsComponent* stats, float dt) {
        if (!cult || !stats) return;
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        cult->addProgress(1.0f * hours);
        int32_t mr = static_cast<int32_t>(stats->maxMp * hours * 0.1f);
        stats->mp = std::min(stats->maxMp, stats->mp + mr);
    }

    void executeAlchemy(ResourcesComponent* resources, IdentityComponent* identity,
                        BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        bool success = random01() < 0.6f;
        if (success) {
            resources->spiritStones += randRange(50, 200);
        }
        behavior->changeActivity(NPCActivity::Rest);
    }

    void executeSeekFortune(PositionComponent* pos, float dt) {
        if (!pos) return;
        if (pos->hasReachedTarget(5.0f)) {
            pos->moveTo(pos->x + randRange(-500, 500), pos->y + randRange(-500, 500));
        }
    }

    // ── Execute: Social ──────────────────────────────────────────

    void executeVisitFriend(ECS::EntityId selfId, RelationshipComponent* rel,
                            PositionComponent* pos, float dt) {
        if (!rel || rel->relationCount == 0 || !pos) return;
        uint32_t targetSlot = 0;
        int8_t bestAffinity = -128;
        for (uint8_t i = 0; i < rel->relationCount; ++i) {
            int8_t a = rel->relations[i].affinity;
            if (a > bestAffinity) {
                bestAffinity = a;
                targetSlot = rel->relations[i].targetSlot;
            }
        }
        if (targetSlot == 0) return;
        auto* targetPos = ECS::Registry::getInstance().getComponent<PositionComponent>(
            ECS::Registry::getInstance().entityIds_[targetSlot]);
        if (targetPos) {
            pos->moveTo(targetPos->x, targetPos->y);
            if (pos->distanceTo(*targetPos) < 5.0f) {
                rel->modifyAffinity(targetSlot, 2);
            }
        }
    }

    void executeDate(ECS::EntityId selfId, RelationshipComponent* rel,
                     PositionComponent* pos, float dt) {
        if (!rel || rel->spouseSlot == 0 || !pos) return;
        auto* targetPos = ECS::Registry::getInstance().getComponent<PositionComponent>(
            ECS::Registry::getInstance().entityIds_[rel->spouseSlot]);
        if (targetPos) {
            pos->moveTo(targetPos->x, targetPos->y);
            if (pos->distanceTo(*targetPos) < 3.0f) {
                rel->modifyAffinity(rel->spouseSlot, 3);
                if (random01() < 0.02f && rel->getAffinity(rel->spouseSlot) > 70) {
                    // potential offspring
                }
            }
        }
    }

    void executeFamilyGathering(RoleCommandComponent* cmd, PositionComponent* pos, float dt) {
        (void)cmd; (void)pos; (void)dt;
    }

    void executeMentorTeach(ECS::EntityId selfId, RelationshipComponent* rel,
                            CultivationComponent* cult) {
        (void)selfId; (void)rel; (void)cult;
    }

    void executeDiscipleAsk(ECS::EntityId selfId, RelationshipComponent* rel,
                            CultivationComponent* cult) {
        (void)selfId; (void)rel; (void)cult;
    }
    void executeTrade(ResourcesComponent* resources, IdentityComponent* identity,
                      BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        int64_t profit = randRange(-20, 50);
        resources->addSpiritStones(profit);
        behavior->changeActivity(NPCActivity::Rest);
    }

    void executeGossip(ECS::EntityId selfId, RelationshipComponent* rel, SocialComponent* social) {
        if (!social) return;
        social->onSocialize();
    }

    // ── Execute: Production / Command ────────────────────────────

    void executeBuild(ResourcesComponent* resources, PositionComponent* pos,
                      BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        behavior->activityProgress += 0.05f;
        resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 5);
        if (behavior->activityProgress >= 1.0f) {
            behavior->changeActivity(NPCActivity::Rest);
        }
    }

    void executeMine(ResourcesComponent* resources, PositionComponent* pos,
                     BehaviorComponent* behavior, float dt) {
        if (!resources || !behavior) return;
        if (pos) pos->moveTo(pos->x + randRange(-10, 10), pos->y + randRange(-10, 10));
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        resources->addSpiritStones(static_cast<int64_t>(15.0f * hours));
        behavior->activityProgress += hours * 0.02f;
        if (behavior->activityProgress >= 1.0f) {
            behavior->changeActivity(NPCActivity::Rest);
        }
    }

    void executeFarm(ResourcesComponent* resources, PositionComponent* pos,
                     BehaviorComponent* behavior, float dt) {
        if (!resources || !behavior) return;
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        behavior->activityProgress += hours * 0.1f;
        if (behavior->activityProgress >= 1.0f) {
            resources->addSpiritStones(randRange(20, 60));
            behavior->changeActivity(NPCActivity::Rest);
        }
    }

    void executeFish(ResourcesComponent* resources, PositionComponent* pos,
                     BehaviorComponent* behavior, float dt) {
        if (!resources || !behavior) return;
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        resources->addSpiritStones(static_cast<int64_t>(10.0f * hours));
        behavior->activityProgress += hours * 0.03f;
        if (behavior->activityProgress >= 1.0f) {
            behavior->changeActivity(NPCActivity::Rest);
        }
    }

    void executeLumber(ResourcesComponent* resources, PositionComponent* pos,
                       BehaviorComponent* behavior, float dt) {
        if (!resources || !behavior) return;
        if (pos) pos->moveTo(pos->x + randRange(-10, 10), pos->y + randRange(-10, 10));
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        resources->addSpiritStones(static_cast<int64_t>(8.0f * hours));
    }

    void executeGather(ResourcesComponent* resources, float dt) {
        if (!resources) return;
        float hours = dt / (1000.0f * 60.0f * 60.0f);
        resources->addSpiritStones(static_cast<int64_t>(5.0f * hours));
    }

    void executeAttack(PositionComponent* pos, StatsComponent* stats, float dt) {
        if (pos) pos->x += pos->speed * 0.5f * dt / 1000.0f;
        if (stats) stats->mp = std::max(0, stats->mp - 1);
    }

    void executeDefendPosition(StatsComponent* stats, float dt) {
        if (!stats) return;
        int32_t regen = static_cast<int32_t>(stats->maxHp * 0.005f);
        stats->hp = std::min(stats->maxHp, stats->hp + regen);
    }

    void executePatrol(ECS::EntityId entityId, PositionComponent* pos,
                       BehaviorComponent* behavior, float dt) {
        if (!pos || !behavior) return;
        float patrolPoints[4][2] = {{-50, -50}, {50, -50}, {50, 50}, {-50, 50}};
        uint32_t idx = behavior->activityStep % 4;
        float tx = patrolPoints[idx][0] + randRange(-20, 20);
        float ty = patrolPoints[idx][1] + randRange(-20, 20);
        pos->moveTo(tx, ty);
        if (pos->hasReachedTarget(10.0f)) {
            behavior->activityStep++;
        }
    }

    void executeEscort(PositionComponent* pos, float dt) {
        if (!pos) return;
        pos->x += pos->speed * 0.3f * dt / 1000.0f;
    }

    void executeScout(PositionComponent* pos, float dt) {
        if (!pos) return;
        if (pos->hasReachedTarget(5.0f)) {
            pos->moveTo(pos->x + randRange(-300, 300), pos->y + randRange(-300, 300));
        }
    }

    // ── Execute: Crafting ────────────────────────────────────────

    void executeCraft(ResourcesComponent* resources, IdentityComponent* identity,
                      BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 8);
        if (random01() < 0.7f) resources->addSpiritStones(randRange(30, 80));
        behavior->changeActivity(NPCActivity::Rest);
    }

    void executeRefine(ResourcesComponent* resources, IdentityComponent* identity,
                       BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 10);
        if (random01() < 0.5f) resources->addSpiritStones(randRange(50, 120));
        behavior->changeActivity(NPCActivity::Rest);
    }

    void executeCook(ResourcesComponent* resources, IdentityComponent* identity,
                     BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 3);
        resources->addSpiritStones(randRange(8, 25));
        behavior->changeActivity(NPCActivity::Rest);
    }

    void executeConstruct(ResourcesComponent* resources, IdentityComponent* identity,
                          BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        behavior->activityProgress += 0.05f;
        resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 12);
        if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
    }

    void executeRepair(ResourcesComponent* resources, IdentityComponent* identity,
                       BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 2);
        behavior->activityProgress += 0.1f;
        if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
    }

    // ── Execute: Economy ─────────────────────────────────────────

    void executeSell(ResourcesComponent* resources, IdentityComponent* identity,
                     BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        resources->addSpiritStones(randRange(10, 50));
        behavior->changeActivity(NPCActivity::Rest);
    }

    void executeBuy(ResourcesComponent* resources, IdentityComponent* identity,
                    BehaviorComponent* behavior) {
        if (!resources || !behavior) return;
        int64_t cost = randRange(10, 100);
        if (resources->removeSpiritStones(cost)) {
            resources->addSpiritStones(randRange(0, 20));
        }
        behavior->changeActivity(NPCActivity::Rest);
    }

    // ── Execute: Combat ──────────────────────────────────────────

    void executeDuel(ECS::EntityId selfId, StatsComponent* stats, float dt) {
        if (!stats) return;
        stats->mp = std::max(0, stats->mp - 2);
        if (random01() < 0.3f) stats->takeDamage(stats->power / 10);
    }

    void executeHunt(PositionComponent* pos, StatsComponent* stats, float dt) {
        if (!pos || !stats) return;
        pos->moveTo(pos->x + stats->power / 10, pos->y + stats->power / 10);
        if (random01() < 0.1f) stats->takeDamage(stats->power / 20);
        if (random01() < 0.05f) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 30);
    }

    void executeAmbush(StatsComponent* stats, float dt) {
        if (!stats) return;
        if (random01() < 0.4f) {
            stats->hp = std::max(1, stats->hp / 2);
        }
    }

    void executeAssassinate(StatsComponent* stats, float dt) {
        if (!stats) return;
        stats->mp = std::max(0, stats->mp - 5);
        if (random01() < 0.15f) {
            stats->hp = std::max(1, stats->hp / 3);
        }
    }

    // ── Execute: Exploration ─────────────────────────────────────

    void executeExplore(PositionComponent* pos, float dt) {
        if (!pos) return;
        if (pos->hasReachedTarget(5.0f)) {
            pos->moveTo(pos->x + randRange(-500, 500), pos->y + randRange(-500, 500));
        }
    }

    void executeTreasureHunt(PositionComponent* pos, float dt) {
        if (!pos) return;
        if (pos->hasReachedTarget(3.0f)) {
            pos->moveTo(pos->x + randRange(-200, 200), pos->y + randRange(-200, 200));
        }
    }

    void executeMapExplore(PositionComponent* pos, float dt) {
        if (!pos) return;
        if (pos->hasReachedTarget(2.0f)) {
            pos->moveTo(pos->x + randRange(-1000, 1000), pos->y + randRange(-1000, 1000));
        }
    }

    void executeReportTask(ECS::EntityId entityId, RoleCommandComponent* cmd,
                           PositionComponent* pos, float dt) {
        if (!pos) return;
        if (pos->x > 0) pos->x -= pos->speed * dt / 1000.0f;
        else pos->x += pos->speed * dt / 1000.0f;
        if (pos->y > 0) pos->y -= pos->speed * dt / 1000.0f;
        else pos->y += pos->speed * dt / 1000.0f;
    }

    void executeRefuseCommand(PositionComponent* pos, float dt) {
        if (!pos) return;
        pos->x += (random01() * 2.0f - 1.0f) * pos->speed * 0.3f * dt / 1000.0f;
        pos->y += (random01() * 2.0f - 1.0f) * pos->speed * 0.3f * dt / 1000.0f;
    }

    void executeCoordinateSquad(PositionComponent* pos, float dt) {
        if (!pos) return;
        pos->x += (random01() * 2.0f - 1.0f) * pos->speed * 0.1f * dt / 1000.0f;
        pos->y += (random01() * 2.0f - 1.0f) * pos->speed * 0.1f * dt / 1000.0f;
    }

    void executeAwaitOrders(SocialComponent* social, StatsComponent* stats, float dt) {
        if (stats) {
            stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 60);
        }
    }
};
