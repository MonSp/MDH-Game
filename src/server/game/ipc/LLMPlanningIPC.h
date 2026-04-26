#pragma once

#include "../ecs/components/LLMComponent.h"
#include "../ecs/Registry.h"
#include "../ipc/MessageQueue.h"
#include "../ipc/UnixSocketServer.h"
#include <chrono>
#include <vector>
#include <cstring>
#include <unordered_map>
#include <mutex>

class LLMPlanningIPC {
public:
    static LLMPlanningIPC& getInstance() {
        static LLMPlanningIPC instance;
        return instance;
    }

    struct NPCContext {
        std::string npc_id;
        std::string name;
        std::string clan_id;
        std::string nation;
        std::string role;
        std::string realm;
        int32_t power;
        float ambition;
        float caution;
        float loyalty;
        float greed;
    };

    struct WorldContext {
        bool war_active;
        float resource_density;
        uint8_t economy_status;
        std::vector<std::string> major_events;
    };

    void setSocketServer(UnixSocketServer* server) {
        socketServer_ = server;
    }

    void sendPlanningRequest(ECS::EntityId entityId, const NPCContext& npc,
                             const WorldContext& world, uint32_t horizonDays) {
        IPCMessage msg;
        msg.type = MessageType::LLM_PLAN_REQUEST;
        msg.entity_id = entityId;
        msg.timestamp = getCurrentTimeMs();

        std::string payload = serializeRequest(npc, world, horizonDays);
        msg.payload_size = static_cast<uint32_t>(payload.size());
        msg.payload = new char[payload.size()];
        memcpy(msg.payload, payload.c_str(), payload.size());

        MessageQueue::getInstance().enqueue(&msg);
        markRequestSent(entityId);
    }

    // Called by the IPC bridge when Node.js sends back a parsed plan.
    // The payload is JSON matching the PlanParser schema:
    // {"npcId":"...","goal":"...","actions":[...],"emotionalState":"..."}
    void pushResponse(ECS::EntityId entityId, const std::string& jsonPayload) {
        std::lock_guard<std::mutex> lock(responseMutex_);
        responseMap_[entityId] = jsonPayload;
        markResponseReceived(entityId);
    }

    // Poll for a parsed plan response from Node.js.
    // Returns true and populates `plan` with SubTask entries if a response is available.
    bool pollResponse(ECS::EntityId entityId, LLMPlanComponent* plan) {
        if (!plan) return false;

        // Check Unix socket for incoming messages
        if (socketServer_ && socketServer_->hasMessages()) {
            auto msg = socketServer_->receiveMessage();
            if (msg && msg->isValid() && msg->header.type == MessageType::LLM_PLAN_RESPONSE) {
                std::string jsonPayload(msg->payload.begin(), msg->payload.end());
                uint64_t msgEntityId = 0;
                // Extract entityId from the message header or payload
                // The entity_id is encoded in the first 8 bytes of payload
                if (msg->payload.size() >= 8) {
                    memcpy(&msgEntityId, msg->payload.data(), 8);
                    std::string planJson(msg->payload.begin() + 8, msg->payload.end());
                    pushResponse(msgEntityId, planJson);
                }
            }
        }

        // Check the response map
        std::lock_guard<std::mutex> lock(responseMutex_);
        auto it = responseMap_.find(entityId);
        if (it == responseMap_.end()) return false;

        std::string jsonPayload = it->second;
        responseMap_.erase(it);

        return parseAndApplyPlan(entityId, jsonPayload, plan);
    }

    bool hasPendingRequest(ECS::EntityId entityId) const {
        return pending_requests_.find(entityId) != pending_requests_.end();
    }

    void markRequestSent(ECS::EntityId entityId) {
        pending_requests_[entityId] = getCurrentTimeMs();
    }

    void markResponseReceived(ECS::EntityId entityId) {
        pending_requests_.erase(entityId);
    }

    bool isRequestTimeout(ECS::EntityId entityId, uint64_t timeoutMs = 5000) const {
        auto it = pending_requests_.find(entityId);
        if (it == pending_requests_.end()) return false;
        return (getCurrentTimeMs() - it->second) > timeoutMs;
    }

private:
    LLMPlanningIPC() : socketServer_(nullptr) {}

    // Maps narrative actionType strings to C++ ActionType enum
    static ActionType mapActionType(const std::string& type) {
        if (type == "cultivate") return ActionType::CULTIVATE;
        if (type == "request")  return ActionType::RESOURCE_ALLOCATION;
        if (type == "scheme")   return ActionType::INTELLIGENCE;
        if (type == "defect")   return ActionType::IDLE;
        if (type == "train")    return ActionType::CULTIVATE;
        return ActionType::REST;
    }

    // Minimal JSON parser for the specific LLM plan response schema.
    // Does NOT handle arbitrary JSON. Assumes Node.js already validated.
    bool parseAndApplyPlan(ECS::EntityId entityId, const std::string& json, LLMPlanComponent* plan) {
        if (!plan) return false;

        // Clear existing tasks
        plan->tasks.clear();
        plan->current_task_index = 0;

        // Extract npcId for logging
        std::string npcId = extractString(json, "npcId");
        std::string goal = extractString(json, "goal");
        std::string emotionalState = extractString(json, "emotionalState");

        std::cout << "[PARSE]    npc=" << npcId
                  << " goal=\"" << goal << "\""
                  << " emotional=" << emotionalState << std::endl;

        // Extract actions array
        std::string actionsJson = extractArray(json, "actions");
        if (actionsJson.empty()) {
            std::cout << "[PARSE]    npc=" << npcId << " actions=0 valid=true (empty plan)" << std::endl;
            return true; // Empty plan is valid — NPC rests
        }

        // Parse each action object
        std::vector<std::string> actionObjects = splitArrayObjects(actionsJson);
        for (size_t i = 0; i < actionObjects.size(); i++) {
            SubTask task;
            task.task_id = static_cast<uint32_t>(i);
            task.target_completion_day = 1 + i;
            task.action_progress = 0.0f;

            std::string actionType = extractString(actionObjects[i], "actionType");
            task.action_type = mapActionType(actionType);
            task.priority = static_cast<uint32_t>(extractInt(actionObjects[i], "priority"));
            task.description = extractString(actionObjects[i], "reason");

            plan->tasks.push_back(task);

            std::cout << "[PARSE]    npc=" << npcId
                      << " action[" << i << "]=" << actionType
                      << " priority=" << task.priority
                      << " reason=\"" << task.description << "\"" << std::endl;
        }

        std::cout << "[PARSE]    npc=" << npcId
                  << " actions=" << plan->tasks.size() << " valid=true" << std::endl;

        return true;
    }

    // --- Minimal JSON helpers — handle only the LLM response schema ---

    static std::string extractString(const std::string& json, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = json.find(search);
        if (pos == std::string::npos) return "";

        pos += search.length();
        // Skip whitespace
        while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\n' || json[pos] == '\t')) pos++;

        if (pos >= json.length() || json[pos] != '"') return "";
        pos++; // skip opening quote

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
        if (arrayJson.length() < 2) return objects; // "[]"

        // Strip outer brackets
        std::string inner = arrayJson.substr(1, arrayJson.length() - 2);

        size_t pos = 0;
        while (pos < inner.length()) {
            // Skip whitespace and commas
            while (pos < inner.length() && (inner[pos] == ' ' || inner[pos] == '\n' || inner[pos] == '\t' || inner[pos] == ',')) pos++;
            if (pos >= inner.length()) break;

            if (inner[pos] == '{') {
                size_t start = pos;
                int depth = 0;
                while (pos < inner.length()) {
                    if (inner[pos] == '{') depth++;
                    else if (inner[pos] == '}') {
                        depth--;
                        if (depth == 0) {
                            pos++;
                            break;
                        }
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

    std::string serializeRequest(const NPCContext& npc, const WorldContext& world, uint32_t horizonDays) {
        std::string json = "{";
        json += "\"npc_id\":\"" + npc.npc_id + "\",";
        json += "\"npc_data\":{";
        json += "\"id\":\"" + npc.npc_id + "\",";
        json += "\"name\":\"" + npc.name + "\",";
        json += "\"clan_id\":\"" + npc.clan_id + "\",";
        json += "\"nation\":\"" + npc.nation + "\",";
        json += "\"role\":\"" + npc.role + "\",";
        json += "\"realm\":\"" + npc.realm + "\",";
        json += "\"power\":" + std::to_string(npc.power) + ",";
        json += "\"personality\":{";
        json += "\"ambition\":" + std::to_string(npc.ambition) + ",";
        json += "\"caution\":" + std::to_string(npc.caution) + ",";
        json += "\"loyalty\":" + std::to_string(npc.loyalty) + ",";
        json += "\"greed\":" + std::to_string(npc.greed);
        json += "}},";
        json += "\"world_context\":{";
        json += "\"war_active\":" + std::string(world.war_active ? "true" : "false") + ",";
        json += "\"resource_density\":" + std::to_string(world.resource_density) + ",";
        json += "\"economy_status\":" + std::to_string(static_cast<int>(world.economy_status));
        json += "},";
        json += "\"planning_horizon\":\"" + std::to_string(horizonDays) + "天\"";
        json += "}";
        return json;
    }

    uint64_t getCurrentTimeMs() const {
        auto now = std::chrono::system_clock::now();
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch());
        return ms.count();
    }

    UnixSocketServer* socketServer_;
    std::unordered_map<ECS::EntityId, uint64_t> pending_requests_;
    std::unordered_map<ECS::EntityId, std::string> responseMap_;
    std::mutex responseMutex_;
};
