#pragma once

#include "LLMService.h"
#include "LLMPromptBuilder.h"
#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/Registry.h"
#include <unordered_map>

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
        userPrompt += "\n\n请为这个NPC规划未来" + horizon + "的行动计划。";

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
    }

    bool parseAndApplyPlan(const std::string& jsonResponse, LLMPlanComponent* plan) {
        return false;
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
            case LLMTier::T0: return "一个月";
            case LLMTier::T1: return "一周";
            case LLMTier::T2: return "一天";
            default: return "一天";
        }
    }

    LLMService* llmService_;
    LLMPromptBuilder* promptBuilder_;
};
