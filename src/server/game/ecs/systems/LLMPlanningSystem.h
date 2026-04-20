#pragma once

#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/Registry.h"
#include "../../llm/LLMPlanningClient.h"
#include <vector>
#include <algorithm>
#include <iostream>

class LLMPlanningSystem {
public:
    static LLMPlanningSystem& getInstance() {
        static LLMPlanningSystem instance;
        return instance;
    }

    void initialize(const std::string& provider = "openai",
                  const std::string& apiKey = "",
                  const std::string& model = "gpt-4",
                  const std::string& localEndpoint = "") {
        llmClient_ = &LLMPlanningClient::getInstance();
        llmClient_->initialize(provider, apiKey, model, localEndpoint);
    }

    void shutdown() {
        if (llmClient_) {
            llmClient_->shutdown();
        }
    }

    void updatePlanningRequests(uint64_t currentTime) {
        auto& registry = ECS::Registry::getInstance();
        auto entities = registry.getEntitiesWithComponent<LLMPlanComponent>();

        for (ECS::EntityId entityId : entities) {
            auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
            if (!plan) continue;

            if (plan->pending_request) {
                continue;
            }

            if (plan->shouldRequestPlanning(currentTime)) {
                auto* identity = registry.getComponent<IdentityComponent>(entityId);
                if (identity) {
                    llmClient_->requestPlanForNPC(entityId, plan->tier);
                    plan->pending_request = true;
                    pending_request_count_++;
                }
            }

            if (plan->status == PlanStatus::ACTIVE && plan->plan_expires_time < currentTime) {
                plan->status = PlanStatus::COMPLETED;
            }
        }
    }

    void onPlanResponseReceived(ECS::EntityId entityId, const std::string& response) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (!plan) return;

        plan->pending_request = false;
        if (pending_request_count_ > 0) pending_request_count_--;

        if (parseAndApplyPlan(response, plan)) {
            plan->status = PlanStatus::ACTIVE;
            plan->plan_generated_time = getCurrentTimeMs();
            plan->plan_expires_time = plan->plan_generated_time +
                (uint64_t)plan->planning_horizon_days * 24 * 60 * 60 * 1000;
            plan->current_task_index = 0;
            plan->last_planning_time = plan->plan_generated_time;
        } else {
            plan->status = PlanStatus::FAILED;
        }
    }

    void onPlanError(ECS::EntityId entityId, const std::string& error) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (!plan) return;

        plan->pending_request = false;
        if (pending_request_count_ > 0) pending_request_count_--;
        plan->status = PlanStatus::FAILED;
    }

    ActionType getActionForNPC(ECS::EntityId entityId) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (!plan) return ActionType::REST;

        return plan->getCurrentAction();
    }

    bool advanceNPCPlan(ECS::EntityId entityId) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (!plan) return false;

        return plan->advanceToNextTask();
    }

    void interruptPlan(ECS::EntityId entityId) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (plan) {
            plan->status = PlanStatus::INTERRUPTED;
        }
    }

    void failPlan(ECS::EntityId entityId) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (plan) {
            plan->status = PlanStatus::FAILED;
        }
    }

    void setNPCTier(ECS::EntityId entityId, LLMTier tier) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        if (plan) {
            plan->tier = tier;
            plan->setFallbackByTier();
            plan->planning_horizon_days = getHorizonDays(tier);
        }
    }

    size_t getActivePlanCount() const {
        auto& registry = ECS::Registry::getInstance();
        auto entities = registry.getEntitiesWithComponent<LLMPlanComponent>();
        size_t count = 0;
        for (ECS::EntityId entityId : entities) {
            auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
            if (plan && plan->status == PlanStatus::ACTIVE) {
                count++;
            }
        }
        return count;
    }

    size_t getPendingRequestCount() const {
        return pending_request_count_;
    }

    size_t getLLMPendingCount() const {
        return llmClient_ ? llmClient_->getPendingRequestCount() : 0;
    }

private:
    LLMPlanningSystem() : llmClient_(nullptr), pending_request_count_(0) {}

    bool parseAndApplyPlan(const std::string& jsonResponse, LLMPlanComponent* plan) {
        return true;
    }

    uint32_t getHorizonDays(LLMTier tier) const {
        switch (tier) {
            case LLMTier::T0: return 30;
            case LLMTier::T1: return 7;
            case LLMTier::T2: return 1;
            default: return 1;
        }
    }

    uint64_t getCurrentTimeMs() const {
        auto now = std::chrono::system_clock::now();
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()).count();
    }

    LLMPlanningClient* llmClient_;
    size_t pending_request_count_;
};
