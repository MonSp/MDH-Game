#pragma once

#include "../../ecs/components/LLMComponent.h"
#include <string>

class LLMPromptBuilder {
public:
    static LLMPromptBuilder& getInstance() {
        static LLMPromptBuilder instance;
        return instance;
    }

    std::string buildSystemPrompt(LLMTier tier, bool warActive) {
        std::string era = warActive ? "战争时期" : "和平时期";
        std::string tierDesc = getTierDescription(tier);

        return "你是修仙世界" + era + "的NPC规划专家。\n"
               "你负责为" + tierDesc + "的NPC生成合理的行动规划。\n"
               "规划应该包含多个子任务，每个子任务有明确的行动类型和优先级。\n"
               "行动类型包括：\n"
               "- IDLE: 空闲\n"
               "- REST: 休息恢复\n"
               "- PATROL: 巡逻\n"
               "- EXPLORE: 探索机缘\n"
               "- CULTIVATE: 修炼突破\n"
               "- TRADE: 坊市交易\n"
               "- LOGISTICS: 后勤支援\n"
               "- MILITARY_ORDER: 军事命令\n"
               "- DIPLOMACY: 外交活动\n"
               "- INTELLIGENCE: 情报收集\n"
               "- RESOURCE_ALLOCATION: 资源调配\n"
               "- RESOURCE_PURCHASE: 资源采购\n"
               "- RESOURCE_RAID: 资源掠夺\n"
               "- CAPTURE_RESOURCE_POINT: 占领资源点\n"
               "- DOMAIN_WAR: 领域战争\n"
               "- ALLIANCE_FORMATION: 联盟结交\n"
               "- CULTIVATE_BREAKTHROUGH: 闭关突破";
    }

    std::string buildNPCContextPrompt(const std::string& name, const std::string& clan,
                                     const std::string& nation, const std::string& role,
                                     const std::string& realm, int32_t power,
                                     float ambition, float caution, float loyalty, float greed) {
        return "NPC信息：\n"
               "- 名字：" + name + "\n"
               "- 家族：" + clan + "\n"
               "- 国家：" + nation + "\n"
               "- 角色：" + role + "\n"
               "- 境界：" + realm + "\n"
               "- 实力：" + std::to_string(power) + "\n"
               "- 性格：野心" + std::to_string((int)ambition) +
               "，谨慎" + std::to_string((int)caution) +
               "，忠诚" + std::to_string((int)loyalty) +
               "，贪婪" + std::to_string((int)greed);
    }

    std::string buildWorldContextPrompt(bool warActive, float resourceDensity,
                                       const std::string& economyStatus,
                                       const std::vector<std::string>& majorEvents) {
        std::string warStr = warActive ? "进行中" : "和平";
        std::string eventsStr = majorEvents.empty() ? "无" : joinStrings(majorEvents, ", ");

        return "世界局势：\n"
               "- 战争状态：" + warStr + "\n"
               "- 资源密度：" + std::to_string(resourceDensity) + "\n"
               "- 经济状态：" + economyStatus + "\n"
               "- 重大事件：" + eventsStr;
    }

private:
    LLMPromptBuilder() = default;

    std::string getTierDescription(LLMTier tier) const {
        switch (tier) {
            case LLMTier::T0: return "天道级（皇帝、太虚境霸主）";
            case LLMTier::T1: return "战略级（家族家主、大将军）";
            case LLMTier::T2: return "战术级（长老、金丹期核心子弟）";
            default: return "普通NPC";
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
