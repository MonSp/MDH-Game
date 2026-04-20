#pragma once

#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/Registry.h"
#include "../../ipc/MessageQueue.h"
#include <vector>
#include <cstring>

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

    void sendPlanningRequest(ECS::EntityId entityId, const NPCContext& npc, const WorldContext& world, uint32_t horizonDays) {
        IPCMessage msg;
        msg.type = MessageType::LLM_PLAN_REQUEST;
        msg.entity_id = entityId;
        msg.timestamp = getCurrentTimeMs();

        std::string payload = serializeRequest(npc, world, horizonDays);
        msg.payload_size = static_cast<uint32_t>(payload.size());
        msg.payload = new char[payload.size()];
        memcpy(msg.payload, payload.c_str(), payload.size());

        MessageQueue::getInstance().enqueue(&msg);
    }

    bool pollResponse(ECS::EntityId entityId, LLMPlanComponent* plan) {
        return false;
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
    LLMPlanningIPC() = default;

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

    std::unordered_map<ECS::EntityId, uint64_t> pending_requests_;
};
