#pragma once

#include "../ecs/components/LLMComponent.h"
#include <string>

class LLMPromptBuilder {
public:
    static LLMPromptBuilder& getInstance() {
        static LLMPromptBuilder instance;
        return instance;
    }

    std::string buildSystemPrompt() {
        return "You are an NPC planning expert in a cultivation world.\n"
               "Your task is to generate action plans for NPCs based on their role, tier, and personality.\n"
               "Plans should contain multiple sub-tasks, each with clear action types and priorities.\n"
               "Action types include:\n"
               "- IDLE: idle\n"
               "- REST: rest and recovery\n"
               "- PATROL: patrol\n"
               "- EXPLORE: explore opportunities\n"
               "- CULTIVATE: cultivation breakthrough\n"
               "- TRADE: market trading\n"
               "- LOGISTICS: logistics support\n"
               "- MILITARY_ORDER: military orders\n"
               "- DIPLOMACY: diplomatic activities\n"
               "- INTELLIGENCE: intelligence gathering\n"
               "- RESOURCE_ALLOCATION: resource allocation\n"
               "- RESOURCE_PURCHASE: resource purchase\n"
               "- RESOURCE_RAID: resource raid\n"
               "- CAPTURE_RESOURCE_POINT: capture resource points\n"
               "- DOMAIN_WAR: domain war\n"
               "- ALLIANCE_FORMATION: alliance formation\n"
               "- CULTIVATE_BREAKTHROUGH: closed-door breakthrough\n\n"
               "Response format: JSON with 'actions' array containing objects with 'actionType', 'priority', and 'reason' fields.";
    }

    std::string buildNPCContextPrompt(LLMTier tier, const std::string& role,
                                     const std::string& realm, int32_t power,
                                     float ambition, float caution, float loyalty, float greed) {
        std::string tierDesc = getTierDescription(tier);

        return std::string("## NPC Profile\n") +
               "Role: " + role + "\n" +
               "Tier: " + tierDesc + "\n" +
               "Realm: " + realm + "\n" +
               "Power: " + std::to_string(power) + "\n" +
               "Personality:\n" +
               "- Ambition: " + std::to_string(static_cast<int>(ambition)) + "\n" +
               "- Caution: " + std::to_string(static_cast<int>(caution)) + "\n" +
               "- Loyalty: " + std::to_string(static_cast<int>(loyalty)) + "\n" +
               "- Greed: " + std::to_string(static_cast<int>(greed)) + "\n";
    }

    std::string buildWorldContextPrompt(bool warActive, float resourceDensity,
                                       const std::string& economyStatus,
                                       const std::vector<std::string>& majorEvents) {
        std::string warStr = warActive ? "active" : "peaceful";
        std::string eventsStr = majorEvents.empty() ? "none" : joinStrings(majorEvents, ", ");

        return std::string("## World Situation\n") +
               "- War Status: " + warStr + "\n" +
               "- Resource Density: " + std::to_string(resourceDensity) + "\n" +
               "- Economy Status: " + economyStatus + "\n" +
               "- Major Events: " + eventsStr + "\n";
    }

    std::string buildPlanningRequest(LLMTier tier) {
        std::string horizon = getHorizonString(tier);
        return "\n## Task\nPlease plan this NPC's actions for the next " + horizon + ".\n"
               "Consider the NPC's tier, role, personality, and current world situation.\n"
               "Provide 3-5 actions with priorities (1=highest, 10=lowest).";
    }

private:
    LLMPromptBuilder() = default;

    std::string getTierDescription(LLMTier tier) const {
        switch (tier) {
            case LLMTier::T0: return "Tier-0 (Emperor, transcendent rulers)";
            case LLMTier::T1: return "Tier-1 (Family heads, generals)";
            case LLMTier::T2: return "Tier-2 (Elders, core disciples)";
            default: return "Tier-3 (Ordinary NPCs)";
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

    std::string joinStrings(const std::vector<std::string>& strings, const std::string& delimiter) const {
        if (strings.empty()) return "";
        std::string result = strings[0];
        for (size_t i = 1; i < strings.size(); ++i) {
            result += delimiter + strings[i];
        }
        return result;
    }
};
