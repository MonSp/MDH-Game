#pragma once

#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/Registry.h"
#include "../../llm/LLMPlanningClient.h"
#include <vector>
#include <algorithm>
#include <iostream>
#include <fstream>
#include <sstream>

class LLMPlanningSystem {
public:
    static LLMPlanningSystem& getInstance() {
        static LLMPlanningSystem instance;
        return instance;
    }

    void initialize(const std::string& configPath = "") {
        std::string actualConfigPath = configPath.empty() ? getDefaultConfigPath() : configPath;

        std::string provider = "openai";
        std::string apiKey = "";
        std::string model = "gpt-4";
        std::string localEndpoint = "http://localhost:11434";

        if (loadConfigFromFile(actualConfigPath, provider, apiKey, model, localEndpoint)) {
            std::cout << "LLM config loaded from: " << actualConfigPath << std::endl;
        } else {
            std::cout << "Using default LLM config (no config file found)" << std::endl;
        }

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

    std::string getDefaultConfigPath() const {
        return "src/server/config/llm_config.txt";
    }

    bool loadConfigFromFile(const std::string& path, std::string& provider,
                           std::string& apiKey, std::string& model,
                           std::string& localEndpoint) const {
        std::ifstream file(path);
        if (!file.is_open()) {
            return false;
        }

        std::string line;
        while (std::getline(file, line)) {
            line = trim(line);
            if (line.empty() || line[0] == '#') {
                continue;
            }

            size_t eqPos = line.find('=');
            if (eqPos == std::string::npos) {
                continue;
            }

            std::string key = trim(line.substr(0, eqPos));
            std::string value = trim(line.substr(eqPos + 1));

            if (key == "provider") {
                provider = value;
            } else if (key == "api_key") {
                apiKey = value;
            } else if (key == "model") {
                model = value;
            } else if (key == "local_endpoint") {
                localEndpoint = value;
            }
        }

        file.close();
        return true;
    }

    std::string trim(const std::string& str) const {
        size_t start = 0;
        while (start < str.length() && std::isspace(str[start])) {
            start++;
        }
        size_t end = str.length();
        while (end > start && std::isspace(str[end - 1])) {
            end--;
        }
        return str.substr(start, end - start);
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
