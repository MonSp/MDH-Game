#pragma once

#include "../../ecs/Component.h"
#include <string>
#include <vector>
#include <cstdint>

enum class LLMTier : uint8_t {
    T0 = 0,
    T1 = 1,
    T2 = 2,
    T3 = 3
};

enum class ActionType : uint8_t {
    IDLE = 0,
    REST = 1,
    PATROL = 2,
    EXPLORE = 3,
    CULTIVATE = 4,
    TRADE = 5,
    LOGISTICS = 6,
    MILITARY_ORDER = 7,
    DIPLOMACY = 8,
    INTELLIGENCE = 9,
    RESOURCE_ALLOCATION = 10,
    RESOURCE_PURCHASE = 11,
    RESOURCE_RAID = 12,
    CAPTURE_RESOURCE_POINT = 13,
    DOMAIN_WAR = 14,
    ALLIANCE_FORMATION = 15,
    CULTIVATE_BREAKTHROUGH = 16,
    MINING = 17,
    FARMING = 18,
    FISHING = 19,
    LUMBERING = 20,
    BUILDING = 21,
    CRAFTING = 22,
    REFINING = 23,
    HEALING = 24,
    DATING = 25,
    TEACHING = 26,
    EXPLORING = 27
};

enum class PlanStatus : uint8_t {
    INACTIVE = 0,
    ACTIVE = 1,
    COMPLETED = 2,
    INTERRUPTED = 3,
    FAILED = 4
};

struct SubTask {
    uint32_t task_id;
    std::string description;
    uint32_t priority;
    uint32_t target_completion_day;
    ActionType action_type;
    float action_progress;
};

struct LLMPlanComponent : public ECS::ComponentBase<LLMPlanComponent> {
    LLMTier tier;
    PlanStatus status;
    uint64_t last_planning_time;
    uint32_t planning_horizon_days;
    std::string plan_id;
    std::vector<SubTask> tasks;
    uint32_t current_task_index;
    uint64_t plan_generated_time;
    uint64_t plan_expires_time;
    bool pending_request;
    ActionType fallback_action;

    LLMPlanComponent() : tier(LLMTier::T3), status(PlanStatus::INACTIVE),
        last_planning_time(0), planning_horizon_days(1), current_task_index(0),
        plan_generated_time(0), plan_expires_time(0), pending_request(false),
        fallback_action(ActionType::REST) {}

    bool shouldRequestPlanning(uint64_t currentTime) const {
        if (tier == LLMTier::T3) return false;
        if (status == PlanStatus::ACTIVE) return false;
        if (pending_request) return false;

        uint64_t intervalMs = getPlanningIntervalMs();
        return (currentTime - last_planning_time) >= intervalMs;
    }

    uint64_t getPlanningIntervalMs() const {
        switch (tier) {
            case LLMTier::T0: return 30LL * 24 * 60 * 60 * 1000;
            case LLMTier::T1: return 7LL * 24 * 60 * 60 * 1000;
            case LLMTier::T2: return 1LL * 24 * 60 * 60 * 1000;
            default: return 0;
        }
    }

    ActionType getCurrentAction() const {
        if (status != PlanStatus::ACTIVE || tasks.empty()) {
            return fallback_action;
        }
        if (current_task_index >= tasks.size()) {
            return fallback_action;
        }
        return tasks[current_task_index].action_type;
    }

    bool advanceToNextTask() {
        if (current_task_index < tasks.size()) {
            current_task_index++;
        }
        if (current_task_index >= tasks.size()) {
            status = PlanStatus::COMPLETED;
            return false;
        }
        return true;
    }

    void setFallbackByTier() {
        switch (tier) {
            case LLMTier::T0:
                fallback_action = ActionType::DOMAIN_WAR;
                break;
            case LLMTier::T1:
                fallback_action = ActionType::MILITARY_ORDER;
                break;
            case LLMTier::T2:
                fallback_action = ActionType::CULTIVATE;
                break;
            default:
                fallback_action = ActionType::REST;
        }
    }
};

struct LLMRequestComponent : public ECS::ComponentBase<LLMRequestComponent> {
    std::string request_id;
    uint64_t timestamp;
    bool sent_to_gateway;
    bool received_response;

    LLMRequestComponent() : timestamp(0), sent_to_gateway(false), received_response(false) {}
};
