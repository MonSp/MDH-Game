#pragma once

#include "LLMService.h"
#include "LLMPromptBuilder.h"
#include "../ecs/components/LLMComponent.h"
#include "../ecs/Registry.h"
#include <unordered_map>
#include <iostream>

class LLMPlanningClient {
public:
    static LLMPlanningClient& getInstance() {
        static LLMPlanningClient instance;
        return instance;
    }

    void initialize(const std::string& provider, const std::string& apiKey,
                   const std::string& model, const std::string& localEndpoint = "") {
        llmService_ = &LLMService::getInstance();
        if (!llmService_->initialize(provider, apiKey, model, localEndpoint)) {
            return;
        }

        promptBuilder_ = &LLMPromptBuilder::getInstance();

        llmService_->responseCallback_ = [this](const std::string& npcId, const std::string& response) {
            this->onPlanResponse(npcId, response);
        };

        llmService_->errorCallback_ = [this](const std::string& npcId, const std::string& error) {
            this->onPlanError(npcId, error);
        };
    }

    void shutdown() {
        if (llmService_) {
            llmService_->shutdown();
        }
    }

    void requestPlanForNPC(ECS::EntityId entityId, LLMTier tier) {
        auto* identity = ECS::Registry::getInstance().getComponent<IdentityComponent>(entityId);
        auto* personality = ECS::Registry::getInstance().getComponent<PersonalityComponent>(entityId);
        auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(entityId);

        if (!identity || !personality || !stats) return;

        std::string npcId = identity->id;
        if (llmService_->hasActiveRequest(npcId)) return;

        std::string systemPrompt = promptBuilder_->buildSystemPrompt(tier, false);
        std::string userPrompt = promptBuilder_->buildNPCContextPrompt(
            identity->name, identity->clanId, identity->nation,
            getRoleString(identity->role), getRealmString(stats->realm), stats->power,
            personality->ambition, personality->caution, personality->loyalty, personality->greed
        );

        std::string horizon = getHorizonString(tier);
        userPrompt += "\n\nPlease plan the NPC's actions for the next " + horizon + ".";

        llmService_->requestPlan(npcId, systemPrompt, userPrompt);
    }

    bool isRequestPending(const std::string& npcId) const {
        return llmService_ && llmService_->hasActiveRequest(npcId);
    }

    size_t getPendingRequestCount() const {
        return llmService_ ? llmService_->getPendingRequestCount() : 0;
    }

private:
    LLMPlanningClient() : llmService_(nullptr), promptBuilder_(nullptr) {}

    void onPlanResponse(const std::string& npcId, const std::string& response) {
        auto entities = ECS::Registry::getInstance().getEntitiesWithComponent<IdentityComponent>();
        ECS::EntityId targetEntity = 0;

        for (auto entityId : entities) {
            auto* identity = ECS::Registry::getInstance().getComponent<IdentityComponent>(entityId);
            if (identity && identity->id == npcId) {
                targetEntity = entityId;
                break;
            }
        }

        if (targetEntity == 0) return;

        auto* llmPlan = ECS::Registry::getInstance().getComponent<LLMPlanComponent>(targetEntity);
        if (!llmPlan) return;

        if (parseAndApplyPlan(response, llmPlan)) {
            llmPlan->status = PlanStatus::ACTIVE;
            llmPlan->plan_generated_time = llmPlan->last_planning_time;
            llmPlan->plan_expires_time = llmPlan->plan_generated_time +
                (uint64_t)llmPlan->planning_horizon_days * 24 * 60 * 60 * 1000;
        } else {
            llmPlan->status = PlanStatus::FAILED;
        }
    }

    void onPlanError(const std::string& npcId, const std::string& error) {
        std::cout << "[FALLBACK] npc=" << npcId
                  << " reason=llm_error error=\"" << error << "\"" << std::endl;

        // Find the entity and set fallback
        auto entities = ECS::Registry::getInstance().getEntitiesWithComponent<IdentityComponent>();
        for (auto entityId : entities) {
            auto* identity = ECS::Registry::getInstance().getComponent<IdentityComponent>(entityId);
            if (identity && identity->id == npcId) {
                auto* plan = ECS::Registry::getInstance().getComponent<LLMPlanComponent>(entityId);
                if (plan) {
                    plan->status = PlanStatus::FAILED;
                    plan->fallback_action = getFallbackAction(plan->tier);
                    std::cout << "[FALLBACK] npc=" << npcId
                              << " fallback=" << static_cast<int>(plan->fallback_action) << std::endl;
                }
                break;
            }
        }
    }

    bool parseAndApplyPlan(const std::string& jsonResponse, LLMPlanComponent* plan) {
        if (!plan) return false;

        plan->tasks.clear();
        plan->current_task_index = 0;

        // Extract actions array using the minimal JSON helpers
        std::string actionsJson = extractArray(jsonResponse, "actions");
        if (actionsJson.empty() || actionsJson == "[]") {
            return true;
        }

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

    static ActionType getFallbackAction(LLMTier tier) {
        switch (tier) {
            case LLMTier::T0: return ActionType::DOMAIN_WAR;
            case LLMTier::T1: return ActionType::MILITARY_ORDER;
            case LLMTier::T2: return ActionType::CULTIVATE;
            default: return ActionType::REST;
        }
    }

    static ActionType mapActionType(const std::string& type) {
        if (type == "cultivate") return ActionType::CULTIVATE;
        if (type == "request")  return ActionType::RESOURCE_ALLOCATION;
        if (type == "scheme")   return ActionType::INTELLIGENCE;
        if (type == "defect")   return ActionType::IDLE;
        if (type == "train")    return ActionType::CULTIVATE;
        return ActionType::REST;
    }

    // --- Minimal JSON helpers ---

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

    std::string getRoleString(NPCRole role) const {
        switch (role) {
            case NPCRole::FamilyHead: return "family_head";
            case NPCRole::Elder: return "elder";
            case NPCRole::CoreDisciple: return "core_disciple";
            case NPCRole::InnerDisciple: return "inner_disciple";
            case NPCRole::BranchDisciple: return "branch_disciple";
            case NPCRole::LawEnforcementElder: return "law_enforcement_elder";
            default: return "unknown";
        }
    }

    std::string getRealmString(RealmLevel realm) const {
        switch (realm) {
            case RealmLevel::Mortal: return "mortal";
            case RealmLevel::QiRefining: return "qi_refining";
            case RealmLevel::FoundationBuilding: return "foundation_building";
            case RealmLevel::GoldenCore: return "golden_core";
            case RealmLevel::YuanInfant: return "yuan_infant";
            case RealmLevel::Transcension: return "transcension";
            default: return "unknown";
        }
    }

    std::string getHorizonString(LLMTier tier) const {
        switch (tier) {
            case LLMTier::T0: return "one month";
            case LLMTier::T1: return "one week";
            case LLMTier::T2: return "one day";
            default: return "one day";
        }
    }

    LLMService* llmService_;
    LLMPromptBuilder* promptBuilder_;
};
