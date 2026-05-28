#include "game/ecs/systems/WorldUpdateLoop.h"
#include "game/ecs/Registry.h"
#include "game/ecs/components/IdentityComponent.h"
#include "game/ecs/components/StatsComponent.h"
#include "game/ecs/components/BehaviorComponent.h"
#include "game/ecs/components/PersonalityComponent.h"
#include "game/ecs/components/ResourcesComponent.h"
#include "game/ecs/components/SocialComponent.h"
#include "game/ecs/components/LifecycleComponent.h"
#include "game/ecs/components/PositionComponent.h"
#include "game/ecs/components/RelationshipComponent.h"
#include "game/ecs/components/CultivationComponent.h"
#include "game/npc/NPCCreationSystem.h"
#include "game/npc/NPCInteractionSystem.h"
#include "game/economy/MarketRegistry.h"
#include "game/economy/PriceEngine.h"
#include "game/economy/CaravanSystem.h"
#include "game/economy/EconomicDigest.h"
#include "game/economy/NationEconomyProfile.h"
#include "game/world/WorldGenerator.h"
#include "game/ecs/components/LLMComponent.h"
#include <iostream>
#include <iomanip>
#include <chrono>
#include <map>
#include <vector>
#include <string>
#include <algorithm>
#include <cstring>
#include <cmath>
#include <random>
#include <numeric>
#include <sstream>
#include <fstream>
#include <cstdlib>
#include <cstdio>
#include <unistd.h>

static const char* ACTIVITY_NAMES[] = {
    "Idle", "Dead",
    "Flee", "Heal", "Defend",
    "Eat", "Rest", "Sleep", "Walk", "Chat", "AwaitOrders",
    "Cultivate", "Breakthrough", "Tribulation", "Meditate", "Alchemy", "SeekFortune",
    "VisitFriend", "Date", "FamilyGathering", "MentorTeach", "DiscipleAsk", "Trade",
    "Gossip", "ReportTask", "SocialHelp",
    "Build", "Mine", "Farm", "Fish", "Lumber", "Gather", "Craft", "Refine", "Cook",
    "Tailor", "Construct", "Repair", "Sell", "Buy", "Bargain",
    "Duel", "Hunt", "Ambush", "Assassinate", "Attack", "DefendPosition",
    "Patrol", "Escort", "Scout",
    "Explore", "TreasureHunt", "MapExplore",
    "RefuseCommand", "CoordinateSquad",
    "SetTaxRate", "TradeEmbargo", "StockpileMaterial", "PriceStabilize", "EconomicMobilize",
    "Incapacitated"
};

struct LLMConfig {
    std::string baseUrl;
    std::string apiKey;
    std::string model;
};

static LLMConfig loadLLMConfig() {
    LLMConfig cfg;
    const char* envUrl = std::getenv("LLM_BASE_URL");
    const char* envKey = std::getenv("LLM_API_KEY");
    const char* envModel = std::getenv("LLM_MODEL");

    if (envUrl) cfg.baseUrl = envUrl;
    if (envKey) cfg.apiKey = envKey;
    if (envModel) cfg.model = envModel;

    if (cfg.baseUrl.empty() || cfg.apiKey.empty()) {
        std::ifstream f("src/server/config/llm_config.txt");
        if (f.is_open()) {
            std::string line;
            while (std::getline(f, line)) {
                if (line.empty() || line[0] == '#') continue;
                auto eq = line.find('=');
                if (eq == std::string::npos) continue;
                std::string key = line.substr(0, eq);
                std::string val = line.substr(eq + 1);
                while (!val.empty() && val.back() == '\r') val.pop_back();
                if (key == "local_endpoint" && cfg.baseUrl.empty()) cfg.baseUrl = val;
                if (key == "api_key" && cfg.apiKey.empty()) cfg.apiKey = val;
                if (key == "model" && cfg.model.empty()) cfg.model = val;
            }
        }
    }
    if (cfg.model.empty()) cfg.model = "deepseek-chat";
    return cfg;
}

static std::string callLLM(const LLMConfig& cfg, const std::string& systemPrompt,
                           const std::string& userPrompt, std::string& errorMsg) {
    errorMsg.clear();
    std::string escapedSys, escapedUser;
    for (char c : systemPrompt) {
        if (c == '"') escapedSys += "\\\"";
        else if (c == '\\') escapedSys += "\\\\";
        else if (c == '\n') escapedSys += "\\n";
        else if (c == '\'') escapedSys += "'\\''";
        else escapedSys += c;
    }
    for (char c : userPrompt) {
        if (c == '"') escapedUser += "\\\"";
        else if (c == '\\') escapedUser += "\\\\";
        else if (c == '\n') escapedUser += "\\n";
        else if (c == '\'') escapedUser += "'\\''";
        else escapedUser += c;
    }

    std::string body = "{\"model\":\"" + cfg.model + "\",\"messages\":["
                       + "{\"role\":\"system\",\"content\":\"" + escapedSys + "\"},"
                       + "{\"role\":\"user\",\"content\":\"" + escapedUser + "\"}"
                       + "],\"temperature\":0.7,\"max_tokens\":500}";

    std::string url = cfg.baseUrl;
    if (url.back() != '/') url += '/';
    url += "chat/completions";

    std::string tmpFile = "/tmp/llm_body_" + std::to_string(getpid()) + ".json";
    {
        std::ofstream ofs(tmpFile);
        ofs << body;
    }

    std::string cmd = "curl -s -m 30 -X POST '" + url + "'"
                      + " -H 'Content-Type: application/json'"
                      + " -H 'Authorization: Bearer " + cfg.apiKey + "'"
                      + " -d @" + tmpFile + " 2>&1";

    FILE* pipe = popen(cmd.c_str(), "r");
    if (!pipe) {
        errorMsg = "popen failed";
        std::remove(tmpFile.c_str());
        return "";
    }

    std::string response;
    char buf[4096];
    while (fgets(buf, sizeof(buf), pipe)) {
        response += buf;
    }
    int exitCode = pclose(pipe);
    std::remove(tmpFile.c_str());

    if (exitCode != 0) {
        errorMsg = "curl exit " + std::to_string(exitCode) + ": " + response.substr(0, 200);
        return "";
    }

    if (response.empty()) {
        errorMsg = "empty response";
        return "";
    }

    if (response.find("\"error\"") != std::string::npos) {
        errorMsg = "API error: " + response.substr(0, 300);
        return "";
    }

    auto contentPos = response.find("\"content\":\"");
    if (contentPos == std::string::npos) {
        if (response.find("\"content\":null") != std::string::npos) {
            errorMsg = "content is null";
        } else {
            errorMsg = "no content field: " + response.substr(0, 200);
        }
        return "";
    }
    contentPos += 11;

    std::string content;
    for (size_t i = contentPos; i < response.size(); i++) {
        if (response[i] == '"' && (i == 0 || response[i-1] != '\\')) break;
        if (response[i] == '\\' && i + 1 < response.size()) {
            i++;
            if (response[i] == 'n') content += '\n';
            else if (response[i] == '"') content += '"';
            else if (response[i] == '\\') content += '\\';
            else content += response[i];
        } else {
            content += response[i];
        }
    }

    if (content.empty()) {
        errorMsg = "parsed content is empty";
        return "";
    }
    return content;
}

static const char* COMMODITY_NAMES[] = { "矿石", "食物", "装备", "材料", "丹药", "灵石" };
static const char* POSTURE_NAMES[] = { "盈馀", "平衡", "紧张", "危机" };
static const char* REALM_NAMES[] = { "凡人", "炼气", "筑基", "金丹", "元婴", "渡劫" };
static const char* roleToString(NPCRole role) {
    switch (role) {
        case NPCRole::FamilyHead: return "FamilyHead";
        case NPCRole::Elder: return "Elder";
        case NPCRole::CoreDisciple: return "CoreDisciple";
        case NPCRole::InnerDisciple: return "InnerDisciple";
        case NPCRole::BranchDisciple: return "BranchDisciple";
        case NPCRole::LawEnforcementElder: return "LawEnforcementElder";
        default: return "Unknown";
    }
}
static const char* ACTION_NAMES[] = {
    "IDLE", "REST", "PATROL", "EXPLORE", "CULTIVATE", "TRADE",
    "LOGISTICS", "MILITARY_ORDER", "DIPLOMACY", "INTELLIGENCE",
    "RESOURCE_ALLOCATION", "RESOURCE_PURCHASE", "RESOURCE_RAID",
    "CAPTURE_RESOURCE_POINT", "DOMAIN_WAR", "ALLIANCE_FORMATION",
    "CULTIVATE_BREAKTHROUGH", "MINING", "FARMING", "FISHING",
    "LUMBERING", "BUILDING", "CRAFTING", "REFINING", "HEALING",
    "DATING", "TEACHING", "EXPLORING", "COMMAND_DELEGATE",
    "REPORT_STATUS", "COORDINATE_SQUAD", "RESIST_ORDER",
    "ECONOMIC_MOBILIZE", "TRADE_EMBARGO", "STOCKPILE_MATERIAL",
    "PRICE_STABILIZE", "SET_TAX_RATE"
};

class MockLLMPlanner {
public:
    MockLLMPlanner() : rng_(42), planCounter_(0), useRealLLM_(false), llmCallsTotal_(0), llmCallsSuccess_(0) {}

    void setRealLLM(const LLMConfig& cfg) {
        llmConfig_ = cfg;
        useRealLLM_ = true;
    }

    void generatePlanForNPC(ECS::EntityId entityId, uint64_t currentFrame) {
        auto& reg = ECS::Registry::getInstance();
        auto* plan = reg.getComponent<LLMPlanComponent>(entityId);
        auto* identity = reg.getComponent<IdentityComponent>(entityId);
        if (!plan || !identity) return;

        auto& mkt = MarketRegistry::getInstance();
        const EconomicDigest& digest = mkt.getEconomicDigest(identity->clanId, currentFrame);

        plan->tasks.clear();
        plan->current_task_index = 0;
        plan->plan_id = "mock_" + std::to_string(planCounter_++);

        if (useRealLLM_) {
            llmCallsTotal_++;
            std::string sysPrompt = "You are a strategic AI advisor for a Chinese fantasy (Xianxia) world simulation. "
                "The NPC is " + identity->name + ", role: " + roleToString(identity->role) +
                ", nation: " + identity->nation + ", clan: " + identity->clanId + ". "
                "Economic posture: " + POSTURE_NAMES[static_cast<int>(digest.posture)] +
                ", treasury: " + std::to_string(digest.treasuryBalance) + ". "
                "Respond with a JSON plan: {\"actions\":[{\"actionType\":\"cultivate|patrol|trade|mining|farming|diplomacy|mobilize\",\"priority\":1-10,\"reason\":\"brief reason\"}]}";

            std::string userPrompt = "Plan the next " + std::to_string(plan->planning_horizon_days) +
                " days for this " + std::string(roleToString(identity->role)) + ". "
                "Current economic situation: " + POSTURE_NAMES[static_cast<int>(digest.posture)] + ". ";

            if (digest.alerts[0].commodityType != CommodityType::COUNT) {
                userPrompt += "Alert: commodity shortage detected. ";
            }

            std::string errorMsg;
            std::string response = callLLM(llmConfig_, sysPrompt, userPrompt, errorMsg);
            if (!response.empty()) {
                llmCallsSuccess_++;
                parseLLMResponse(plan, response);
                std::cout << "  [LLM] " << identity->id << " (" << roleToString(identity->role)
                          << ") got plan with " << plan->tasks.size() << " tasks" << std::endl;
            } else {
                std::cout << "  [LLM] " << identity->id << " (" << roleToString(identity->role)
                          << ") FAILED: " << errorMsg << std::endl;
                generateFallbackPlan(plan, identity, digest);
            }
        } else {
            generateFallbackPlan(plan, identity, digest);
        }

        plan->status = PlanStatus::ACTIVE;
        plan->plan_generated_time = currentFrame * 16;
        plan->plan_expires_time = plan->plan_generated_time +
            (uint64_t)plan->planning_horizon_days * 24 * 60 * 60 * 1000;
        plan->last_planning_time = currentFrame * 16;
        plan->pending_request = false;
    }

    void tickAllNPCs(uint64_t currentFrame) {
        auto& reg = ECS::Registry::getInstance();
        auto entities = reg.getEntitiesWithComponent<LLMPlanComponent>();

        for (auto entityId : entities) {
            auto* plan = reg.getComponent<LLMPlanComponent>(entityId);
            if (!plan) continue;
            if (plan->tier == LLMTier::T3) continue;

            if (plan->status == PlanStatus::ACTIVE) {
                if (plan->plan_expires_time < currentFrame * 16) {
                    plan->status = PlanStatus::COMPLETED;
                }
                if (plan->current_task_index < plan->tasks.size()) {
                    plan->tasks[plan->current_task_index].action_progress += 0.02f;
                    if (plan->tasks[plan->current_task_index].action_progress >= 1.0f) {
                        plan->advanceToNextTask();
                    }
                }
            }

            bool needsPlan = (plan->status != PlanStatus::ACTIVE);
            if (needsPlan && !plan->pending_request) {
                generatePlanForNPC(entityId, currentFrame);
            }
        }
    }

    int getLLMCallsTotal() const { return llmCallsTotal_; }
    int getLLMCallsSuccess() const { return llmCallsSuccess_; }

private:
    std::mt19937 rng_;
    uint32_t planCounter_;
    bool useRealLLM_;
    LLMConfig llmConfig_;
    int llmCallsTotal_;
    int llmCallsSuccess_;

    void generateFallbackPlan(LLMPlanComponent* plan, const IdentityComponent* identity,
                              const EconomicDigest& digest) {
        switch (plan->tier) {
            case LLMTier::T0: generateT0Plan(plan, identity, digest); plan->planning_horizon_days = 30; break;
            case LLMTier::T1: generateT1Plan(plan, identity, digest); plan->planning_horizon_days = 7; break;
            case LLMTier::T2: generateT2Plan(plan, identity, digest); plan->planning_horizon_days = 1; break;
            default: plan->tasks.push_back({0, "rest", 1, 1, ActionType::REST, 0.0f}); plan->planning_horizon_days = 1; break;
        }
    }

    void parseLLMResponse(LLMPlanComponent* plan, const std::string& response) {
        static const std::pair<const char*, ActionType> actionMap[] = {
            {"cultivate", ActionType::CULTIVATE}, {"patrol", ActionType::PATROL},
            {"trade", ActionType::TRADE}, {"mining", ActionType::MINING},
            {"farming", ActionType::FARMING}, {"diplomacy", ActionType::DIPLOMACY},
            {"mobilize", ActionType::ECONOMIC_MOBILIZE}, {"explore", ActionType::EXPLORE},
            {"craft", ActionType::CRAFTING}, {"rest", ActionType::REST},
            {"war", ActionType::DOMAIN_WAR}, {"intelligence", ActionType::INTELLIGENCE},
            {"stockpile", ActionType::STOCKPILE_MATERIAL}, {"tax", ActionType::SET_TAX_RATE},
        };

        size_t pos = 0;
        uint32_t taskId = 0;
        while (pos < response.size()) {
            auto actionPos = response.find("actionType", pos);
            if (actionPos == std::string::npos) break;

            auto colonPos = response.find(':', actionPos);
            if (colonPos == std::string::npos) break;
            colonPos++;
            while (colonPos < response.size() && (response[colonPos] == ' ' || response[colonPos] == '"')) colonPos++;

            auto endQuote = response.find_first_of("\"}", colonPos);
            if (endQuote == std::string::npos) break;
            std::string actionStr = response.substr(colonPos, endQuote - colonPos);

            ActionType actionType = ActionType::REST;
            for (auto& [name, type] : actionMap) {
                if (actionStr.find(name) != std::string::npos) { actionType = type; break; }
            }

            auto reasonPos = response.find("reason", endQuote);
            std::string reason = "LLM plan";
            if (reasonPos != std::string::npos) {
                auto rColon = response.find(':', reasonPos);
                if (rColon != std::string::npos) {
                    rColon++;
                    while (rColon < response.size() && (response[rColon] == ' ' || response[rColon] == '"')) rColon++;
                    auto rEnd = response.find_first_of("\"}", rColon);
                    if (rEnd != std::string::npos) reason = response.substr(rColon, rEnd - rColon);
                }
            }

            plan->tasks.push_back({taskId++, reason, 5, 1 + taskId, actionType, 0.0f});
            pos = endQuote + 1;
        }

        if (plan->tasks.empty()) {
            plan->tasks.push_back({0, "fallback rest", 1, 1, ActionType::REST, 0.0f});
        }
    }

    void generateT0Plan(LLMPlanComponent* plan, const IdentityComponent* identity,
                        const EconomicDigest& digest) {
        if (digest.posture == EconomicPosture::Crisis) {
            plan->tasks.push_back({0, "economic mobilization", 10, 3, ActionType::ECONOMIC_MOBILIZE, 0.0f});
            plan->tasks.push_back({1, "price stabilization", 9, 5, ActionType::PRICE_STABILIZE, 0.0f});
            plan->tasks.push_back({2, "resource allocation", 8, 10, ActionType::RESOURCE_ALLOCATION, 0.0f});
        } else if (digest.posture == EconomicPosture::Tight) {
            plan->tasks.push_back({0, "set tax rate", 7, 2, ActionType::SET_TAX_RATE, 0.0f});
            plan->tasks.push_back({1, "trade diplomacy", 6, 5, ActionType::DIPLOMACY, 0.0f});
            plan->tasks.push_back({2, "intelligence gathering", 5, 10, ActionType::INTELLIGENCE, 0.0f});
        } else {
            int roll = rng_() % 4;
            switch (roll) {
                case 0:
                    plan->tasks.push_back({0, "expand territory", 8, 10, ActionType::DOMAIN_WAR, 0.0f});
                    plan->tasks.push_back({1, "military preparation", 7, 5, ActionType::MILITARY_ORDER, 0.0f});
                    break;
                case 1:
                    plan->tasks.push_back({0, "form alliance", 7, 7, ActionType::ALLIANCE_FORMATION, 0.0f});
                    plan->tasks.push_back({1, "trade agreement", 6, 10, ActionType::TRADE, 0.0f});
                    break;
                case 2:
                    plan->tasks.push_back({0, "stockpile materials", 6, 14, ActionType::STOCKPILE_MATERIAL, 0.0f});
                    plan->tasks.push_back({1, "cultivate breakthrough", 5, 30, ActionType::CULTIVATE_BREAKTHROUGH, 0.0f});
                    break;
                default:
                    plan->tasks.push_back({0, "strategic planning", 5, 7, ActionType::COMMAND_DELEGATE, 0.0f});
                    plan->tasks.push_back({1, "intelligence review", 4, 14, ActionType::INTELLIGENCE, 0.0f});
                    break;
            }
        }
    }

    void generateT1Plan(LLMPlanComponent* plan, const IdentityComponent* identity,
                        const EconomicDigest& digest) {
        if (digest.posture == EconomicPosture::Crisis || digest.posture == EconomicPosture::Tight) {
            plan->tasks.push_back({0, "resource procurement", 8, 3, ActionType::RESOURCE_PURCHASE, 0.0f});
            plan->tasks.push_back({1, "patrol territory", 6, 5, ActionType::PATROL, 0.0f});
        } else {
            int roll = rng_() % 5;
            switch (roll) {
                case 0:
                    plan->tasks.push_back({0, "capture resource point", 8, 5, ActionType::CAPTURE_RESOURCE_POINT, 0.0f});
                    plan->tasks.push_back({1, "scout area", 6, 3, ActionType::EXPLORE, 0.0f});
                    break;
                case 1:
                    plan->tasks.push_back({0, "military operations", 8, 7, ActionType::MILITARY_ORDER, 0.0f});
                    break;
                case 2:
                    plan->tasks.push_back({0, "logistics coordination", 7, 5, ActionType::LOGISTICS, 0.0f});
                    plan->tasks.push_back({1, "resource allocation", 6, 7, ActionType::RESOURCE_ALLOCATION, 0.0f});
                    break;
                case 3:
                    plan->tasks.push_back({0, "train disciples", 6, 7, ActionType::CULTIVATE, 0.0f});
                    break;
                default:
                    plan->tasks.push_back({0, "patrol and defend", 5, 3, ActionType::PATROL, 0.0f});
                    break;
            }
        }
    }

    void generateT2Plan(LLMPlanComponent* plan, const IdentityComponent* identity,
                        const EconomicDigest& digest) {
        if (digest.posture == EconomicPosture::Crisis) {
            plan->tasks.push_back({0, "emergency production", 9, 1, ActionType::MINING, 0.0f});
        } else {
            int roll = rng_() % 6;
            switch (roll) {
                case 0: plan->tasks.push_back({0, "mine ore", 7, 1, ActionType::MINING, 0.0f}); break;
                case 1: plan->tasks.push_back({0, "farm food", 7, 1, ActionType::FARMING, 0.0f}); break;
                case 2: plan->tasks.push_back({0, "craft equipment", 6, 1, ActionType::CRAFTING, 0.0f}); break;
                case 3: plan->tasks.push_back({0, "cultivate", 6, 1, ActionType::CULTIVATE, 0.0f}); break;
                case 4: plan->tasks.push_back({0, "patrol area", 5, 1, ActionType::PATROL, 0.0f}); break;
                default: plan->tasks.push_back({0, "rest and recover", 4, 1, ActionType::REST, 0.0f}); break;
            }
        }
    }
};

struct SimSnapshot {
    int frame;
    double timeMs;
    int activeNPCs;
    int deadNPCs;
    std::map<int, int> activityDist;
    std::map<int, int> realmDist;
    std::map<std::string, std::map<int, float>> prices;
    std::map<std::string, int64_t> treasury;
    std::map<std::string, std::map<int, int64_t>> supply;
    std::map<std::string, std::map<int, int64_t>> demand;
    int caravanTrips;
    double avgAffinity;
    double avgSpiritStones;
    int64_t totalSpiritStones;
    int socialLayerActive;
    int emotionLayerActive;
    int productionLayerActive;
    int cultivationLayerActive;
    int llmPlanActive;
    int llmPlanCompleted;
    int llmPlanT0;
    int llmPlanT1;
    int llmPlanT2;
    std::map<int, int> llmActionDist;
};

struct SimReport {
    std::vector<SimSnapshot> snapshots;
    std::vector<std::string> anomalies;
    int totalFrames;
    double totalDurationMs;
};

static const char* activityName(int code) {
    if (code >= 0 && code < (int)(sizeof(ACTIVITY_NAMES)/sizeof(ACTIVITY_NAMES[0])))
        return ACTIVITY_NAMES[code];
    return "Unknown";
}

static void collectSnapshot(SimReport& report, int frame, double timeMs,
                           const std::vector<std::string>& clanIds) {
    auto& reg = ECS::Registry::getInstance();
    auto& mkt = MarketRegistry::getInstance();

    SimSnapshot snap;
    snap.frame = frame;
    snap.timeMs = timeMs;
    snap.activeNPCs = 0;
    snap.deadNPCs = 0;
    snap.caravanTrips = 0;
    snap.avgAffinity = 0.0;
    snap.avgSpiritStones = 0.0;
    snap.totalSpiritStones = 0;
    snap.socialLayerActive = 0;
    snap.emotionLayerActive = 0;
    snap.productionLayerActive = 0;
    snap.cultivationLayerActive = 0;
    snap.llmPlanActive = 0;
    snap.llmPlanCompleted = 0;
    snap.llmPlanT0 = 0;
    snap.llmPlanT1 = 0;
    snap.llmPlanT2 = 0;

    int affinitySum = 0;
    int affinityCount = 0;
    int64_t stoneSum = 0;

    auto entities = reg.getEntitiesWithComponent<IdentityComponent>();
    for (auto id : entities) {
        auto* lifecycle = reg.getComponent<LifecycleComponent>(id);
        if (!lifecycle) continue;
        if (lifecycle->lifeState == NPCLifeState::Dead) {
            snap.deadNPCs++;
            continue;
        }
        if (lifecycle->lifeState != NPCLifeState::Active) continue;
        snap.activeNPCs++;

        auto* behavior = reg.getComponent<BehaviorComponent>(id);
        if (behavior) {
            int act = static_cast<int>(behavior->currentActivity);
            snap.activityDist[act]++;

            if (act >= 40 && act <= 49) snap.socialLayerActive++;
            if (act >= 10 && act <= 12) snap.emotionLayerActive++;
            if ((act >= 50 && act <= 60) || (act >= 70 && act <= 82)) snap.productionLayerActive++;
            if (act >= 30 && act <= 35) snap.cultivationLayerActive++;
        }

        auto* stats = reg.getComponent<StatsComponent>(id);
        if (stats) {
            if (stats->hp < 0 || !std::isfinite((float)stats->hp)) {
                report.anomalies.push_back("[Frame " + std::to_string(frame) +
                    "] NPC HP异常: " + std::to_string(stats->hp));
            }
            int realm = static_cast<int>(stats->realm);
            snap.realmDist[realm]++;
        }

        auto* resources = reg.getComponent<ResourcesComponent>(id);
        if (resources) {
            if (resources->spiritStones < 0) {
                report.anomalies.push_back("[Frame " + std::to_string(frame) +
                    "] NPC灵石为负: " + std::to_string(resources->spiritStones));
            }
            stoneSum += resources->spiritStones;
        }

        auto* rel = reg.getComponent<RelationshipComponent>(id);
        if (rel) {
            uint32_t slots[10];
            int8_t affs[10];
            int n = rel->getTopRelationships(slots, affs, 5);
            for (int i = 0; i < n; i++) {
                affinitySum += affs[i];
                affinityCount++;
            }
        }

        auto* llmPlan = reg.getComponent<LLMPlanComponent>(id);
        if (llmPlan && llmPlan->tier != LLMTier::T3) {
            if (llmPlan->status == PlanStatus::ACTIVE) {
                snap.llmPlanActive++;
                ActionType currentAction = llmPlan->getCurrentAction();
                snap.llmActionDist[static_cast<int>(currentAction)]++;
            } else if (llmPlan->status == PlanStatus::COMPLETED) {
                snap.llmPlanCompleted++;
            }
            switch (llmPlan->tier) {
                case LLMTier::T0: snap.llmPlanT0++; break;
                case LLMTier::T1: snap.llmPlanT1++; break;
                case LLMTier::T2: snap.llmPlanT2++; break;
                default: break;
            }
        }
    }

    snap.avgAffinity = (affinityCount > 0) ? (double)affinitySum / affinityCount : 0.0;
    snap.totalSpiritStones = stoneSum;
    snap.avgSpiritStones = (snap.activeNPCs > 0) ? (double)stoneSum / snap.activeNPCs : 0.0;

    for (auto& clanId : clanIds) {
        snap.treasury[clanId] = mkt.getTreasury(clanId);
        for (int ct = 0; ct < 6; ct++) {
            snap.prices[clanId][ct] = mkt.getMarketPrice(clanId, static_cast<CommodityType>(ct));
            const CommodityPool* pool = mkt.getPool(clanId);
            if (pool) {
                snap.supply[clanId][ct] = pool->supply[ct];
                snap.demand[clanId][ct] = pool->demand[ct];
            }
        }
    }

    report.snapshots.push_back(snap);
}

static void printSnapshot(const SimSnapshot& snap, const std::vector<WorldGen::ClanInfo>& clans) {
    std::cout << "\n=== Frame " << snap.frame << " | Time: " << std::fixed << std::setprecision(1)
              << snap.timeMs << "ms | Active: " << snap.activeNPCs << " | Dead: " << snap.deadNPCs << " ===" << std::endl;

    std::cout << "  行为分布 TOP10: ";
    std::vector<std::pair<int,int>> sorted(snap.activityDist.begin(), snap.activityDist.end());
    std::sort(sorted.begin(), sorted.end(), [](auto& a, auto& b) { return a.second > b.second; });
    int shown = 0;
    for (auto& [act, count] : sorted) {
        if (shown++ >= 10) break;
        std::cout << activityName(act) << "=" << count << " ";
    }
    std::cout << std::endl;

    std::cout << "  境界分布: ";
    for (auto& [realm, count] : snap.realmDist) {
        std::cout << REALM_NAMES[realm] << "=" << count << " ";
    }
    std::cout << std::endl;

    std::cout << "  决策层活跃: 社交=" << snap.socialLayerActive
              << " 情绪=" << snap.emotionLayerActive
              << " 生产=" << snap.productionLayerActive
              << " 修炼=" << snap.cultivationLayerActive << std::endl;

    if (snap.llmPlanT0 + snap.llmPlanT1 + snap.llmPlanT2 > 0) {
        std::cout << "  LLM计划: 活跃=" << snap.llmPlanActive
                  << " 完成=" << snap.llmPlanCompleted
                  << " (T0=" << snap.llmPlanT0
                  << " T1=" << snap.llmPlanT1
                  << " T2=" << snap.llmPlanT2 << ")" << std::endl;
        if (!snap.llmActionDist.empty()) {
            std::cout << "  LLM行动: ";
            std::vector<std::pair<int,int>> actSorted(snap.llmActionDist.begin(), snap.llmActionDist.end());
            std::sort(actSorted.begin(), actSorted.end(), [](auto& a, auto& b) { return a.second > b.second; });
            int shown = 0;
            for (auto& [act, count] : actSorted) {
                if (shown++ >= 5) break;
                const char* name = (act >= 0 && act < (int)(sizeof(ACTION_NAMES)/sizeof(ACTION_NAMES[0])))
                    ? ACTION_NAMES[act] : "???";
                std::cout << name << "=" << count << " ";
            }
            std::cout << std::endl;
        }
    }

    std::cout << "  经济: 总灵石=" << snap.totalSpiritStones
              << " 均灵石=" << std::setprecision(0) << snap.avgSpiritStones
              << " 均亲和=" << std::setprecision(1) << snap.avgAffinity << std::endl;

    std::map<std::string, std::vector<const WorldGen::ClanInfo*>> byNation;
    for (auto& c : clans) byNation[c.country].push_back(&c);

    for (auto& [nation, nationClans] : byNation) {
        int64_t nationTreasury = 0;
        for (auto* c : nationClans) {
            auto it = snap.treasury.find(c->id);
            if (it != snap.treasury.end()) nationTreasury += it->second;
        }
        std::cout << "  [" << nation << "] 国库合计=" << nationTreasury;

        if (!nationClans.empty()) {
            auto& royalId = nationClans[0]->id;
            auto pit = snap.prices.find(royalId);
            if (pit != snap.prices.end()) {
                std::cout << " 皇族价格(矿/食/装/材/丹/石):";
                for (int ct = 0; ct < 6; ct++) {
                    auto vit = pit->second.find(ct);
                    std::cout << std::setprecision(1) << (vit != pit->second.end() ? vit->second : 0.0f);
                    if (ct < 5) std::cout << "/";
                }
            }
        }
        std::cout << std::endl;
    }
}

static void printNationSummary(const std::vector<WorldGen::ClanInfo>& clans,
                               const std::vector<std::string>& clanIds,
                               int totalFrames) {
    auto& mkt = MarketRegistry::getInstance();
    auto& reg = ECS::Registry::getInstance();

    std::map<std::string, std::vector<const WorldGen::ClanInfo*>> byNation;
    for (auto& c : clans) byNation[c.country].push_back(&c);

    std::cout << "\n--- 国家级经济汇总 ---" << std::endl;
    std::cout << std::left << std::setw(8) << "国家"
              << std::setw(10) << "家族数"
              << std::setw(12) << "总国库"
              << std::setw(10) << "NPC数"
              << std::setw(10) << "存活"
              << std::setw(12) << "均灵石"
              << std::setw(10) << "态势" << std::endl;

    for (auto& [nation, nationClans] : byNation) {
        int64_t totalTreasury = 0;
        int npcCount = 0;
        int aliveCount = 0;
        int64_t totalStones = 0;
        EconomicPosture worstPosture = EconomicPosture::Balanced;

        for (auto* c : nationClans) {
            totalTreasury += mkt.getTreasury(c->id);
            const auto& digest = mkt.getEconomicDigest(c->id, totalFrames);
            if (static_cast<int>(digest.posture) > static_cast<int>(worstPosture))
                worstPosture = digest.posture;
        }

        for (auto id : reg.getEntitiesWithComponent<IdentityComponent>()) {
            auto* identity = reg.getComponent<IdentityComponent>(id);
            if (!identity || identity->nation != nation) continue;
            npcCount++;
            auto* lc = reg.getComponent<LifecycleComponent>(id);
            if (lc && lc->lifeState == NPCLifeState::Active) aliveCount++;
            auto* res = reg.getComponent<ResourcesComponent>(id);
            if (res) totalStones += res->spiritStones;
        }

        double avgStones = (aliveCount > 0) ? (double)totalStones / aliveCount : 0.0;

        std::cout << std::left << std::setw(8) << nation
                  << std::setw(10) << nationClans.size()
                  << std::setw(12) << totalTreasury
                  << std::setw(10) << npcCount
                  << std::setw(10) << aliveCount
                  << std::setw(12) << std::setprecision(0) << avgStones
                  << std::setw(10) << POSTURE_NAMES[static_cast<int>(worstPosture)] << std::endl;
    }

    std::cout << "\n--- 跨国价格对比 (皇族池) ---" << std::endl;
    std::cout << std::left << std::setw(8) << "国家";
    for (int ct = 0; ct < 6; ct++) std::cout << std::setw(10) << COMMODITY_NAMES[ct];
    std::cout << std::endl;

    for (auto& [nation, nationClans] : byNation) {
        if (nationClans.empty()) continue;
        auto& royalId = nationClans[0]->id;
        std::cout << std::left << std::setw(8) << nation;
        for (int ct = 0; ct < 6; ct++) {
            float p = mkt.getMarketPrice(royalId, static_cast<CommodityType>(ct));
            std::cout << std::fixed << std::setprecision(1) << std::setw(10) << p;
        }
        std::cout << std::endl;
    }

    std::cout << "\n--- 阵营偏见矩阵 (皇族间) ---" << std::endl;
    std::vector<std::string> nations;
    for (auto& [n, _] : byNation) nations.push_back(n);
    std::cout << std::left << std::setw(8) << "";
    for (auto& n : nations) std::cout << std::setw(8) << n;
    std::cout << std::endl;
    for (auto& n1 : nations) {
        std::cout << std::left << std::setw(8) << n1;
        uint32_t h1 = 0;
        for (auto& c : clans) { if (c.country == n1 && c.type == "皇族") { h1 = byNation[n1][0]->id.empty() ? 0 : std::hash<std::string>{}(byNation[n1][0]->id); break; } }
        for (auto& n2 : nations) {
            uint32_t h2 = 0;
            for (auto& c : clans) { if (c.country == n2 && c.type == "皇族") { h2 = byNation[n2][0]->id.empty() ? 0 : std::hash<std::string>{}(byNation[n2][0]->id); break; } }
            if (n1 == n2) { std::cout << std::setw(8) << "---"; }
            else {
                int8_t aff = RelationshipComponent::getFactionAffinity(h1, h2);
                std::cout << std::setw(8) << static_cast<int>(aff);
            }
        }
        std::cout << std::endl;
    }
}

int main(int argc, char* argv[]) {
    uint64_t seed = 12345;
    int32_t width = 600;
    int32_t height = 600;
    int32_t heavenLevel = 9;
    int totalFrames = 1000;
    int snapshotInterval = 200;
    uint32_t threadCount = 4;
    bool useRealLLM = false;
    std::string llmConfigPath = "src/server/config/llm_config.txt";

    for (int i = 1; i < argc; i++) {
        if (std::string(argv[i]) == "--llm") {
            useRealLLM = true;
        } else if (std::string(argv[i]) == "--llm-config" && i + 1 < argc) {
            llmConfigPath = argv[++i];
        } else if (i == 1) {
            seed = std::stoull(argv[i]);
        } else if (i == 2) {
            totalFrames = std::atoi(argv[i]);
        } else if (i == 3) {
            snapshotInterval = std::atoi(argv[i]);
        } else if (i == 4) {
            threadCount = std::atoi(argv[i]);
        }
    }

    std::cout << "========================================" << std::endl;
    std::cout << "  七国完整世界模拟" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "种子: " << seed << std::endl;
    std::cout << "地图: " << width << "x" << height << std::endl;
    std::cout << "天层: " << heavenLevel << std::endl;
    std::cout << "模拟帧数: " << totalFrames << std::endl;
    std::cout << "快照间隔: " << snapshotInterval << " 帧" << std::endl;
    std::cout << "线程数: " << threadCount << std::endl;
    std::cout << "LLM模式: " << (useRealLLM ? "真实LLM (" + llmConfigPath + ")" : "MockLLM (确定性)") << std::endl;

    std::cout << "\n[1/5] 生成世界..." << std::endl;
    WorldGen::WorldGenerator worldGen(seed, width, height, heavenLevel);
    auto world = worldGen.generateWorld();

    std::cout << "  家族: " << world.clans.size() << std::endl;
    std::cout << "  建筑: " << world.buildings.size() << std::endl;
    std::cout << "  资源点: " << world.resources.size() << std::endl;

    std::map<std::string, int> clanCountByNation;
    for (auto& c : world.clans) clanCountByNation[c.country]++;
    std::cout << "  国家分布: ";
    for (auto& [n, cnt] : clanCountByNation) std::cout << n << "=" << cnt << " ";
    std::cout << std::endl;

    std::cout << "\n[2/5] 初始化 ECS 引擎..." << std::endl;
    WorldUpdateLoop::getInstance().initialize(threadCount);

    std::cout << "\n[3/5] 按家族创建 NPC..." << std::endl;
    auto& creator = NPCCreationSystem::getInstance();
    for (auto& clan : world.clans) {
        const auto& profile = getNationProfile(clan.country);
        creator.createFamilyNPCs(clan, profile, heavenLevel);
    }
    std::cout << "  总NPC: " << creator.getNPCCount() << std::endl;

    std::cout << "\n[3.5/5] 注册 LLM 计划组件 (T0/T1/T2)..." << std::endl;
    MockLLMPlanner mockLLM;
    LLMConfig llmCfg;
    if (useRealLLM) {
        llmCfg = loadLLMConfig();
        std::cout << "  LLM配置: baseUrl=" << llmCfg.baseUrl
                  << " model=" << llmCfg.model
                  << " apiKey=" << (llmCfg.apiKey.empty() ? "(空)" : llmCfg.apiKey.substr(0, 8) + "...") << std::endl;
        mockLLM.setRealLLM(llmCfg);
    }
    int llmRegistered = 0;
    {
        auto& reg = ECS::Registry::getInstance();
        auto entities = reg.getEntitiesWithComponent<IdentityComponent>();
        for (auto entityId : entities) {
            auto* identity = reg.getComponent<IdentityComponent>(entityId);
            if (!identity) continue;

            LLMTier tier = LLMTier::T3;
            if (identity->role == NPCRole::FamilyHead) tier = LLMTier::T0;
            else if (identity->role == NPCRole::Elder || identity->role == NPCRole::LawEnforcementElder) tier = LLMTier::T1;
            else if (identity->role == NPCRole::CoreDisciple) tier = LLMTier::T2;

            if (tier == LLMTier::T3) continue;

            LLMPlanComponent llmPlan;
            llmPlan.tier = tier;
            llmPlan.setFallbackByTier();
            llmPlan.planning_horizon_days = (tier == LLMTier::T0) ? 30 : (tier == LLMTier::T1) ? 7 : 1;
            reg.addComponent<LLMPlanComponent>(entityId, llmPlan);
            llmRegistered++;
        }
    }
    std::cout << "  LLM NPC: " << llmRegistered << " (T0=家主, T1=长老, T2=核心弟子)" << std::endl;

    std::vector<std::string> clanIds;
    for (auto& c : world.clans) clanIds.push_back(c.id);

    std::cout << "\n[4/5] 配置经济税率..." << std::endl;
    auto& mkt = MarketRegistry::getInstance();
    std::map<std::string, float> nationTaxRates = {
        {"秦", 0.05f}, {"楚", 0.05f}, {"齐", 0.06f}, {"燕", 0.04f},
        {"赵", 0.05f}, {"魏", 0.05f}, {"韩", 0.06f}
    };
    for (auto& clan : world.clans) {
        auto it = nationTaxRates.find(clan.country);
        float rate = (it != nationTaxRates.end()) ? it->second : 0.05f;
        mkt.applyTaxRate(clan.id, rate);
    }
    for (auto& [n, r] : nationTaxRates) {
        std::cout << "  " << n << ": 税率=" << std::fixed << std::setprecision(2) << r << std::endl;
    }

    std::cout << "\n[5/5] 开始模拟..." << std::endl;
    std::cout << "========================================" << std::endl;

    SimReport report;
    report.totalFrames = totalFrames;

    auto simStart = std::chrono::high_resolution_clock::now();

    collectSnapshot(report, 0, 0.0, clanIds);
    printSnapshot(report.snapshots.back(), world.clans);

    for (int frame = 1; frame <= totalFrames; frame++) {
        WorldUpdateLoop::getInstance().updateOnce();

        if (frame % 50 == 0) {
            mockLLM.tickAllNPCs(frame);
        }

        if (frame % snapshotInterval == 0 || frame == totalFrames) {
            auto now = std::chrono::high_resolution_clock::now();
            double elapsed = std::chrono::duration<double, std::milli>(now - simStart).count();
            collectSnapshot(report, frame, elapsed, clanIds);
            printSnapshot(report.snapshots.back(), world.clans);
        }

        if (frame % 100 == 0) {
            auto& caravan = CaravanSystem::getInstance();
            int trips = 0;
            for (auto& clanId : clanIds) {
                auto route = caravan.findBestRoute(clanId, frame);
                if (route.margin > 0.15f) {
                    if (caravan.executeRoute(route, frame)) trips++;
                }
            }
            if (!report.snapshots.empty()) report.snapshots.back().caravanTrips += trips;
        }

        if (frame % 300 == 0) {
            mkt.tickDecay(frame);
        }
    }

    auto simEnd = std::chrono::high_resolution_clock::now();
    report.totalDurationMs = std::chrono::duration<double, std::milli>(simEnd - simStart).count();

    std::cout << "\n========================================" << std::endl;
    std::cout << "  模拟完成 — 完整世界报告" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "总帧数: " << totalFrames << std::endl;
    std::cout << "总耗时: " << std::fixed << std::setprecision(1) << report.totalDurationMs << "ms" << std::endl;
    std::cout << "平均帧时间: " << std::setprecision(3)
              << (report.totalDurationMs / totalFrames) << "ms" << std::endl;
    std::cout << "FPS: " << std::setprecision(1)
              << (1000.0 * totalFrames / report.totalDurationMs) << std::endl;

    printNationSummary(world.clans, clanIds, totalFrames);

    if (report.snapshots.size() >= 2) {
        auto& first = report.snapshots.front();
        auto& last = report.snapshots.back();

        std::cout << "\n--- 灵石总量变化 ---" << std::endl;
        std::cout << "  初始: " << first.totalSpiritStones << std::endl;
        std::cout << "  最终: " << last.totalSpiritStones << std::endl;
        double stoneChange = (double)(last.totalSpiritStones - first.totalSpiritStones) / std::max((int64_t)1, first.totalSpiritStones) * 100;
        std::cout << "  变化: " << std::setprecision(1) << (stoneChange >= 0 ? "+" : "") << stoneChange << "%" << std::endl;

        std::cout << "\n--- 决策层活跃度趋势 ---" << std::endl;
        auto showLayer = [&](const char* name, auto getter) {
            std::cout << "  " << name << ": ";
            for (size_t i = 0; i < report.snapshots.size(); i += std::max(1, (int)report.snapshots.size() / 5)) {
                std::cout << "F" << report.snapshots[i].frame << "=" << getter(report.snapshots[i]) << " ";
            }
            std::cout << "F" << last.frame << "=" << getter(last) << std::endl;
        };
        showLayer("社交", [](const SimSnapshot& s) { return s.socialLayerActive; });
        showLayer("情绪", [](const SimSnapshot& s) { return s.emotionLayerActive; });
        showLayer("生产", [](const SimSnapshot& s) { return s.productionLayerActive; });
        showLayer("修炼", [](const SimSnapshot& s) { return s.cultivationLayerActive; });

        std::cout << "\n--- LLM 计划执行趋势 ---" << std::endl;
        auto showLLM = [&](const char* name, auto getter) {
            std::cout << "  " << name << ": ";
            for (size_t i = 0; i < report.snapshots.size(); i += std::max(1, (int)report.snapshots.size() / 5)) {
                std::cout << "F" << report.snapshots[i].frame << "=" << getter(report.snapshots[i]) << " ";
            }
            std::cout << "F" << last.frame << "=" << getter(last) << std::endl;
        };
        showLLM("活跃计划", [](const SimSnapshot& s) { return s.llmPlanActive; });
        showLLM("完成计划", [](const SimSnapshot& s) { return s.llmPlanCompleted; });
        showLLM("T0家主", [](const SimSnapshot& s) { return s.llmPlanT0; });
        showLLM("T1长老", [](const SimSnapshot& s) { return s.llmPlanT1; });
        showLLM("T2核心", [](const SimSnapshot& s) { return s.llmPlanT2; });

        std::cout << "\n--- 商队贸易统计 ---" << std::endl;
        int totalCaravans = 0;
        for (auto& snap : report.snapshots) totalCaravans += snap.caravanTrips;
        std::cout << "  总商队次数: " << totalCaravans << std::endl;
    }

    if (!report.anomalies.empty()) {
        std::cout << "\n--- 异常检测 (" << report.anomalies.size() << " 条) ---" << std::endl;
        for (size_t i = 0; i < std::min(report.anomalies.size(), (size_t)20); i++) {
            std::cout << "  " << report.anomalies[i] << std::endl;
        }
        if (report.anomalies.size() > 20) std::cout << "  ... 共 " << report.anomalies.size() << " 条" << std::endl;
    } else {
        std::cout << "\n  无异常检测" << std::endl;
    }

    std::cout << "\n========================================" << std::endl;
    std::cout << "  世界参数: " << creator.getNPCCount() << " NPC, "
              << clanCountByNation.size() << " 国家, " << clanIds.size() << " 家族, "
              << world.resources.size() << " 资源点" << std::endl;
    std::cout << "========================================" << std::endl;

    WorldUpdateLoop::getInstance().stop();

    if (useRealLLM) {
        std::cout << "\n--- LLM 调用统计 ---" << std::endl;
        std::cout << "  总请求: " << mockLLM.getLLMCallsTotal() << std::endl;
        std::cout << "  成功: " << mockLLM.getLLMCallsSuccess() << std::endl;
        std::cout << "  失败: " << (mockLLM.getLLMCallsTotal() - mockLLM.getLLMCallsSuccess()) << std::endl;
    }

    return report.anomalies.empty() ? 0 : 1;
}
