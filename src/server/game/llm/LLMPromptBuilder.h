#pragma once

#include "../ecs/components/LLMComponent.h"
#include <string>

class LLMPromptBuilder {
public:
    static LLMPromptBuilder& getInstance() {
        static LLMPromptBuilder instance;
        return instance;
    }

    std::string buildSystemPrompt(LLMTier tier, bool warActive) {
        std::string era = warActive ? "war time" : "peace time";
        std::string tierDesc = getTierDescription(tier);

        return std::string("You are an NPC planning expert in the cultivation world during ") + era + ".\n"
               "You are responsible for generating reasonable action plans for " + tierDesc + " NPCs.\n"
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
               "- CULTIVATE_BREAKTHROUGH: closed-door breakthrough";
    }

    std::string buildNPCContextPrompt(const std::string& name, const std::string& clan,
                                     const std::string& nation, const std::string& role,
                                     const std::string& realm, int32_t power,
                                     float ambition, float caution, float loyalty, float greed) {
        return std::string("NPC Info:\n") + name + "\n"
               "- Clan: " + clan + "\n"
               "- Nation: " + nation + "\n"
               "- Role: " + role + "\n"
               "- Realm: " + realm + "\n"
               "- Power: " + std::to_string(power) + "\n"
               "- Personality: ambition " + std::to_string((int)ambition) +
               ", caution " + std::to_string((int)caution) +
               ", loyalty " + std::to_string((int)loyalty) +
               ", greed " + std::to_string((int)greed);
    }

    std::string buildWorldContextPrompt(bool warActive, float resourceDensity,
                                       const std::string& economyStatus,
                                       const std::vector<std::string>& majorEvents) {
        std::string warStr = warActive ? "active" : "peaceful";
        std::string eventsStr = majorEvents.empty() ? "none" : joinStrings(majorEvents, ", ");

        return std::string("World Situation:\n") +
               "- War Status: " + warStr + "\n" +
               "- Resource Density: " + std::to_string(resourceDensity) + "\n" +
               "- Economy Status: " + economyStatus + "\n" +
               "- Major Events: " + eventsStr;
    }

private:
    LLMPromptBuilder() = default;

    std::string getTierDescription(LLMTier tier) const {
        switch (tier) {
            case LLMTier::T0: return "Tier-0 (Emperor, transcendent rulers)";
            case LLMTier::T1: return "Tier-1 (Family heads, generals)";
            case LLMTier::T2: return "Tier-2 (Elders, core disciples)";
            default: return "ordinary NPCs";
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
