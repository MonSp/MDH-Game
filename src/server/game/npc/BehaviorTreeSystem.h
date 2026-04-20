#pragma once

#include "../../ecs/components/PositionComponent.h"
#include "../../ecs/components/StatsComponent.h"
#include "../../ecs/components/BehaviorComponent.h"
#include "../../ecs/components/PersonalityComponent.h"
#include "../../ecs/components/IdentityComponent.h"
#include "../../ecs/components/LifecycleComponent.h"
#include "../../ecs/components/ResourcesComponent.h"
#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/Registry.h"
#include <cstdlib>
#include <ctime>
#include <cmath>

class BehaviorTreeSystem {
public:
    static BehaviorTreeSystem& getInstance() {
        static BehaviorTreeSystem instance;
        return instance;
    }

    void evaluate(ECS::EntityId entityId) {
        auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(entityId);
        auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(entityId);
        auto* personality = ECS::Registry::getInstance().getComponent<PersonalityComponent>(entityId);
        auto* identity = ECS::Registry::getInstance().getComponent<IdentityComponent>(entityId);
        auto* llmPlan = ECS::Registry::getInstance().getComponent<LLMPlanComponent>(entityId);

        if (!stats || !behavior || !personality || !identity) return;

        if (stats->hp < stats->maxHp * 0.3f) {
            behavior->changeActivity(NPCActivity::Flee);
            return;
        }

        if (llmPlan && llmPlan->tier != LLMTier::T3 && llmPlan->status == PlanStatus::ACTIVE) {
            ActionType llmAction = llmPlan->getCurrentAction();
            NPCActivity activity = translateActionType(llmAction);
            behavior->changeActivity(activity);
            return;
        }

        BehaviorWeight newWeights;
        calculateFamilyDutyWeights(identity->role, *personality, newWeights);

        if (personality->ambition > 70.0f) {
            newWeights.retreat += 30;
        }
        if (personality->caution > 70.0f) {
            newWeights.retreat += 20;
        }
        if (personality->loyalty > 70.0f) {
            newWeights.logistics += 20;
        }
        if (personality->greed > 70.0f) {
            newWeights.work += 30;
        }

        NPCActivity selected = rouletteSelect(newWeights);
        behavior->changeActivity(selected);
    }

    void execute(ECS::EntityId entityId, uint64_t currentTime, float deltaTime) {
        auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(entityId);
        auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(entityId);
        auto* position = ECS::Registry::getInstance().getComponent<PositionComponent>(entityId);
        auto* resources = ECS::Registry::getInstance().getComponent<ResourcesComponent>(entityId);

        if (!behavior || !stats || !position) return;

        if (behavior->activityStartTime == 0) {
            behavior->activityStartTime = currentTime;
        }

        switch (behavior->currentActivity) {
            case NPCActivity::Rest:
                executeRest(stats, deltaTime);
                break;
            case NPCActivity::Work:
                executeWork(resources, deltaTime);
                break;
            case NPCActivity::Patrol:
                executePatrol(entityId, position, behavior, deltaTime);
                break;
            case NPCActivity::Flee:
                executeFlee(position, stats, deltaTime);
                break;
            default:
                break;
        }
    }

private:
    BehaviorTreeSystem() = default;

    NPCActivity translateActionType(ActionType action) {
        switch (action) {
            case ActionType::REST: return NPCActivity::Rest;
            case ActionType::PATROL: return NPCActivity::Patrol;
            case ActionType::EXPLORE: return NPCActivity::Compete;
            case ActionType::CULTIVATE: return NPCActivity::Retreat;
            case ActionType::TRADE: return NPCActivity::Trade;
            case ActionType::LOGISTICS: return NPCActivity::Logistics;
            case ActionType::IDLE:
            default: return NPCActivity::Rest;
        }
    }

    void calculateFamilyDutyWeights(NPCRole role, const PersonalityComponent& personality, BehaviorWeight& weights) {
        switch (role) {
            case NPCRole::FamilyHead:
            case NPCRole::Elder:
                weights.retreat += 30;
                weights.patrol += 10;
                break;
            case NPCRole::CoreDisciple:
            case NPCRole::InnerDisciple:
                weights.compite += 20;
                weights.patrol += 10;
                break;
            case NPCRole::BranchDisciple:
                weights.work += 20;
                weights.logistics += 20;
                break;
            default:
                break;
        }
    }

    NPCActivity rouletteSelect(const BehaviorWeight& weights) {
        uint32_t total = weights.patrol + weights.retreat + weights.logistics +
                         weights.compite + weights.work + weights.rest + weights.trade;

        if (total == 0) return NPCActivity::Rest;

        uint32_t random = static_cast<uint32_t>(rand() % total);

        if (random < weights.patrol) return NPCActivity::Patrol;
        random -= weights.patrol;
        if (random < weights.retreat) return NPCActivity::Retreat;
        random -= weights.retreat;
        if (random < weights.logistics) return NPCActivity::Logistics;
        random -= weights.logistics;
        if (random < weights.compite) return NPCActivity::Compete;
        random -= weights.compite;
        if (random < weights.work) return NPCActivity::Work;
        random -= weights.work;
        if (random < weights.rest) return NPCActivity::Rest;

        return NPCActivity::Trade;
    }

    void executeRest(StatsComponent* stats, float deltaTime) {
        if (!stats) return;
        float recovery = 0.05f * deltaTime / 1000.0f;
        stats->hp = std::min(stats->maxHp, stats->hp + static_cast<int32_t>(stats->maxHp * recovery));
        stats->mp = std::min(stats->maxMp, stats->mp + static_cast<int32_t>(stats->maxMp * recovery));
    }

    void executeWork(ResourcesComponent* resources, float deltaTime) {
        if (!resources) return;
        int64_t gain = static_cast<int64_t>(10.0f * deltaTime / 1000.0f);
        resources->addSpiritStones(gain);
    }

    void executePatrol(ECS::EntityId entityId, PositionComponent* position, BehaviorComponent* behavior, float deltaTime) {
        if (!position || !behavior) return;

        float patrolPoints[4][2] = {
            {-50.0f, -50.0f},
            {50.0f, -50.0f},
            {50.0f, 50.0f},
            {-50.0f, 50.0f}
        };

        uint32_t idx = behavior->currentPatrolIndex % 4;
        float targetX = patrolPoints[idx][0];
        float targetY = patrolPoints[idx][1];

        if (position->hasReachedTarget(10.0f)) {
            behavior->currentPatrolIndex = (behavior->currentPatrolIndex + 1) % 4;
        } else {
            position->moveTo(targetX, targetY);
        }
    }

    void executeFlee(PositionComponent* position, StatsComponent* stats, float deltaTime) {
        if (!position || !stats) return;
        float fleeSpeed = position->speed * 1.5f;
        float recovery = 0.05f * deltaTime / 1000.0f;
        stats->hp = std::min(stats->maxHp, stats->hp + static_cast<int32_t>(stats->maxHp * recovery));
    }
};
