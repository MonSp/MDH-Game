#pragma once

#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/Registry.h"
#include "../../llm/LLMPlanningClient.h"
#include <vector>
#include <algorithm>
#include <chrono>
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
        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        if (!plan) return;

        std::string npcId = identity ? identity->id : std::to_string(entityId);
        plan->pending_request = false;
        if (pending_request_count_ > 0) pending_request_count_--;

        if (parseAndApplyPlan(response, plan)) {
            plan->status = PlanStatus::ACTIVE;
            plan->plan_generated_time = getCurrentTimeMs();
            plan->plan_expires_time = plan->plan_generated_time +
                (uint64_t)plan->planning_horizon_days * 24 * 60 * 60 * 1000;
            plan->current_task_index = 0;
            plan->last_planning_time = plan->plan_generated_time;
            std::cout << "[PARSE]    npc=" << npcId
                      << " actions=" << plan->tasks.size() << " valid=true" << std::endl;
        } else {
            plan->status = PlanStatus::FAILED;
            std::cout << "[PARSE]    npc=" << npcId
                      << " status=failed reason=schema_validation" << std::endl;
        }
    }

    void onPlanError(ECS::EntityId entityId, const std::string& error) {
        auto& registry = ECS::Registry::getInstance();
        auto* plan = registry.getComponent<LLMPlanComponent>(entityId);
        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        if (!plan) return;

        std::string npcId = identity ? identity->id : std::to_string(entityId);
        std::cout << "[FALLBACK] npc=" << npcId
                  << " reason=llm_error error=\"" << error << "\"" << std::endl;

        plan->pending_request = false;
        if (pending_request_count_ > 0) pending_request_count_--;
        plan->status = PlanStatus::FAILED;

        // Set fallback action so NPC doesn't idle
        plan->fallback_action = getFallbackForTier(plan->tier);
        std::cout << "[FALLBACK] npc=" << npcId
                  << " fallback=" << static_cast<int>(plan->fallback_action) << std::endl;
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

    // Maps narrative actionType strings to C++ ActionType enum
    static ActionType mapActionType(const std::string& type) {
        if (type == "cultivate") return ActionType::CULTIVATE;
        if (type == "request")  return ActionType::RESOURCE_ALLOCATION;
        if (type == "scheme")   return ActionType::INTELLIGENCE;
        if (type == "defect")   return ActionType::IDLE;
        if (type == "train")    return ActionType::CULTIVATE;
        return ActionType::REST;
    }

    static ActionType getFallbackForTier(LLMTier tier) {
        switch (tier) {
            case LLMTier::T0: return ActionType::DOMAIN_WAR;
            case LLMTier::T1: return ActionType::MILITARY_ORDER;
            case LLMTier::T2: return ActionType::CULTIVATE;
            default: return ActionType::REST;
        }
    }

    bool parseAndApplyPlan(const std::string& jsonResponse, LLMPlanComponent* plan) {
        if (!plan) return false;

        // Clear existing tasks
        plan->tasks.clear();
        plan->current_task_index = 0;

        // Extract actions array
        std::string actionsJson = extractArray(jsonResponse, "actions");
        if (actionsJson.empty() || actionsJson == "[]") {
            return true; // Empty plan is valid
        }

        // Parse each action object
        std::vector<std::string> actionObjects = splitArrayObjects(actionsJson);
        for (size_t i = 0; i < actionObjects.size(); i++) {
            SubTask task;
            task.task_id = static_cast<uint32_t>(i);
            task.target_completion_day = 1 + i;
            task.action_progress = 0.0f;

            std::string actionType = extractString(actionObjects[i], "actionType");
            if (actionType.empty()) return false;
            task.action_type = mapActionType(actionType);
            task.priority = static_cast<uint32_t>(extractInt(actionObjects[i], "priority"));
            task.description = extractString(actionObjects[i], "reason");
            if (task.description.empty()) return false;

            plan->tasks.push_back(task);
        }

        return !plan->tasks.empty();
    }

    // --- Minimal JSON helpers for LLM response schema ---

    static std::string extractString(const std::string& json, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = json.find(search);
        if (pos == std::string::npos) return "";

        pos += search.length();
        while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\n' || json[pos] == '\t')) pos++;
        if (pos >= json.length() || json[pos] != '"') return "";
        pos++;

        std::string result;
        while (pos < json.length() && json[pos] != '"') {
            if (json[pos] == '\\' && pos + 1 < json.length()) {
                pos++;
                switch (json[pos]) {
                    case '"': result += '"'; break;
                    case '\\': result += '\\'; break;
                    case 'n': result += '\n'; break;
                    case 't': result += '\t'; break;
                    default: result += json[pos]; break;
                }
            } else {
                result += json[pos];
            }
            pos++;
        }
        return result;
    }

    static int extractInt(const std::string& json, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = json.find(search);
        if (pos == std::string::npos) return 0;

        pos += search.length();
        while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\n' || json[pos] == '\t')) pos++;

        int value = 0;
        bool negative = false;
        if (pos < json.length() && json[pos] == '-') { negative = true; pos++; }
        while (pos < json.length() && json[pos] >= '0' && json[pos] <= '9') {
            value = value * 10 + (json[pos] - '0');
            pos++;
        }
        return negative ? -value : value;
    }

    static std::string extractArray(const std::string& json, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = json.find(search);
        if (pos == std::string::npos) return "";

        pos += search.length();
        while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\n' || json[pos] == '\t')) pos++;
        if (pos >= json.length() || json[pos] != '[') return "";

        size_t start = pos;
        int depth = 0;
        while (pos < json.length()) {
            if (json[pos] == '[') depth++;
            else if (json[pos] == ']') {
                depth--;
                if (depth == 0) return json.substr(start, pos - start + 1);
            }
            pos++;
        }
        return "";
    }

    static std::vector<std::string> splitArrayObjects(const std::string& arrayJson) {
        std::vector<std::string> objects;
        if (arrayJson.length() < 2) return objects;

        std::string inner = arrayJson.substr(1, arrayJson.length() - 2);
        size_t pos = 0;
        while (pos < inner.length()) {
            while (pos < inner.length() && (inner[pos] == ' ' || inner[pos] == '\n' || inner[pos] == '\t' || inner[pos] == ',')) pos++;
            if (pos >= inner.length()) break;
            if (inner[pos] == '{') {
                size_t start = pos;
                int depth = 0;
                while (pos < inner.length()) {
                    if (inner[pos] == '{') depth++;
                    else if (inner[pos] == '}') {
                        depth--;
                        if (depth == 0) { pos++; break; }
                    }
                    pos++;
                }
                objects.push_back(inner.substr(start, pos - start));
            } else {
                pos++;
            }
        }
        return objects;
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
