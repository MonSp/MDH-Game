#pragma once
#include "CommodityPool.h"
#include "PriceEngine.h"
#include <cstdint>
#include <cmath>
#include <cstring>

enum class EconomicPosture : uint8_t {
    Surplus = 0,
    Balanced = 1,
    Tight = 2,
    Crisis = 3
};

enum class WeaknessType : uint8_t {
    None = 0,
    FoodDependency = 1,
    LowTreasury = 2,
    MaterialShortage = 3,
    SpiritStoneInflation = 4,
    EquipmentShortage = 5
};

[[maybe_unused]] static const char* economicPostureToString(EconomicPosture p) {
    switch (p) {
        case EconomicPosture::Surplus:  return "盈馀";
        case EconomicPosture::Balanced: return "平衡";
        case EconomicPosture::Tight:    return "紧张";
        case EconomicPosture::Crisis:   return "危机";
        default: return "未知";
    }
}

[[maybe_unused]] static const char* weaknessTypeToString(WeaknessType w) {
    switch (w) {
        case WeaknessType::FoodDependency:       return "食物依赖进口";
        case WeaknessType::LowTreasury:           return "库房灵石见底";
        case WeaknessType::MaterialShortage:      return "材料严重短缺";
        case WeaknessType::SpiritStoneInflation:   return "灵石通胀";
        case WeaknessType::EquipmentShortage:      return "装备严重短缺";
        default: return "";
    }
}

static const char* commodityTypeChineseName(CommodityType type) {
    switch (type) {
        case CommodityType::Ore:          return "矿石";
        case CommodityType::Food:         return "食物";
        case CommodityType::Equipment:    return "装备";
        case CommodityType::Materials:    return "材料";
        case CommodityType::Pills:        return "丹药";
        case CommodityType::SpiritStones: return "灵石";
        default: return "未知";
    }
}

struct CommodityAlert {
    CommodityType commodityType;
    int64_t supply;
    int64_t demand;
    float priceRatio;
    char desc[32];

    CommodityAlert() : commodityType(CommodityType::Ore), supply(0), demand(0), priceRatio(1.0f) {
        desc[0] = '\0';
    }
};

struct TradeOpportunity {
    uint32_t fromClanId;
    uint32_t toClanId;
    CommodityType commodityType;
    float profitRate;

    TradeOpportunity() : fromClanId(0), toClanId(0), commodityType(CommodityType::Ore), profitRate(0.0f) {}
};

struct EnemyWeakness {
    uint32_t clanId;
    WeaknessType weaknessType;
    char desc[48];

    EnemyWeakness() : clanId(0), weaknessType(WeaknessType::None) {
        desc[0] = '\0';
    }
};

struct EconomicDigest {
    EconomicPosture posture;
    int64_t treasuryBalance;
    float weeklyIncomeRate;
    float weeklyExpenseRate;
    CommodityAlert alerts[3];
    TradeOpportunity opportunities[2];
    EnemyWeakness enemyWeaknesses[2];

    EconomicDigest()
        : posture(EconomicPosture::Balanced)
        , treasuryBalance(0)
        , weeklyIncomeRate(0.0f)
        , weeklyExpenseRate(0.0f)
    {}
};

#pragma pack(push, 1)
struct EconomicDigestWasm {
    uint8_t posture;
    int64_t treasuryBalance;
    float weeklyIncomeRate;
    float weeklyExpenseRate;
    uint8_t alertCount;
    uint8_t opportunityCount;
    uint8_t weaknessCount;
    uint8_t _pad;

    struct AlertWasm {
        uint8_t commodityType;
        int32_t supply;
        int32_t demand;
        float priceRatio;
    };
    AlertWasm alerts[3];

    struct OpportunityWasm {
        uint32_t fromClanId;
        uint32_t toClanId;
        uint8_t commodityType;
        float profitRate;
    };
    OpportunityWasm opportunities[2];

    struct WeaknessWasm {
        uint32_t clanId;
        uint8_t weaknessType;
    };
    WeaknessWasm enemyWeaknesses[2];
};
#pragma pack(pop)

static_assert(sizeof(EconomicDigestWasm) <= 256, "EconomicDigestWasm exceeds 256 bytes");

static EconomicDigest computeEconomicDigest(
    const std::string& clanId,
    uint64_t currentFrame,
    int64_t treasury,
    const std::unordered_map<std::string, CommodityPool>& allPools,
    const std::unordered_map<std::string, int64_t>& allTreasuries,
    int64_t weeklyIncome = 0,
    int64_t weeklyExpense = 0)
{
    EconomicDigest digest;
    digest.treasuryBalance = treasury;

    auto poolIt = allPools.find(clanId);
    if (poolIt == allPools.end()) return digest;

    const CommodityPool& pool = poolIt->second;

    CommodityAlert tempAlerts[6];
    int alertCount = 0;

    float maxDSRatio = 0.0f;

    for (uint8_t i = 0; i < static_cast<uint8_t>(CommodityType::COUNT); i++) {
        CommodityType type = static_cast<CommodityType>(i);
        int64_t s = pool.supply[i];
        int64_t d = pool.demand[i];
        if (s < 1) s = 1;
        float ratio = static_cast<float>(d) / static_cast<float>(s);

        float price = PriceEngine::getPrice(pool, type);
        float basePrice = CommodityBasePrice[i];
        float priceRatio = price / basePrice;

        if (ratio > maxDSRatio) maxDSRatio = ratio;

        if (ratio > 1.5f || priceRatio > 1.3f) {
            CommodityAlert& alert = tempAlerts[alertCount];
            alert.commodityType = type;
            alert.supply = s;
            alert.demand = d;
            alert.priceRatio = priceRatio;

            const char* name = commodityTypeChineseName(type);
            if (priceRatio >= 2.5f) {
                snprintf(alert.desc, sizeof(alert.desc), "%s严重短缺", name);
            } else if (priceRatio >= 1.8f) {
                snprintf(alert.desc, sizeof(alert.desc), "%s供不应求", name);
            } else if (ratio <= 0.5f) {
                snprintf(alert.desc, sizeof(alert.desc), "%s严重过剩", name);
            } else {
                snprintf(alert.desc, sizeof(alert.desc), "%s供需偏紧", name);
            }
            alertCount++;
        }
    }

    for (int i = 0; i < alertCount - 1; i++) {
        for (int j = i + 1; j < alertCount; j++) {
            if (tempAlerts[j].priceRatio > tempAlerts[i].priceRatio) {
                CommodityAlert tmp = tempAlerts[i];
                tempAlerts[i] = tempAlerts[j];
                tempAlerts[j] = tmp;
            }
        }
    }

    int copyCount = (alertCount < 3) ? alertCount : 3;
    for (int i = 0; i < copyCount; i++) {
        digest.alerts[i] = tempAlerts[i];
    }

    int oppCount = 0;
    for (uint8_t i = 0; i < static_cast<uint8_t>(CommodityType::COUNT) && oppCount < 2; i++) {
        CommodityType type = static_cast<CommodityType>(i);
        int64_t myS = pool.supply[i];
        if (myS < 1) myS = 1;
        float myPrice = PriceEngine::getPrice(pool, type);

        for (const auto& otherPair : allPools) {
            if (otherPair.first == clanId || oppCount >= 2) break;
            const CommodityPool& otherPool = otherPair.second;
            float otherPrice = PriceEngine::getPrice(otherPool, type);

            if (otherPrice > 0.0f && myPrice > 0.0f) {
                float priceDiff = (otherPrice - myPrice) / myPrice;
                if (priceDiff > 0.2f) {
                    TradeOpportunity& opp = digest.opportunities[oppCount];
                    opp.fromClanId = static_cast<uint32_t>(std::hash<std::string>{}(clanId) & 0xFFFFFFFF);
                    opp.toClanId = static_cast<uint32_t>(std::hash<std::string>{}(otherPair.first) & 0xFFFFFFFF);
                    opp.commodityType = type;
                    opp.profitRate = priceDiff * 0.95f;
                    oppCount++;
                }
            }
        }
    }

    int weakCount = 0;
    for (const auto& otherPair : allPools) {
        if (otherPair.first == clanId || weakCount >= 2) break;
        const CommodityPool& otherPool = otherPair.second;

        auto otherTreasuryIt = allTreasuries.find(otherPair.first);
        int64_t otherTreasury = (otherTreasuryIt != allTreasuries.end()) ? otherTreasuryIt->second : 0;

        if (otherTreasury < 500 && otherTreasury > 0) {
            EnemyWeakness& w = digest.enemyWeaknesses[weakCount];
            w.clanId = static_cast<uint32_t>(std::hash<std::string>{}(otherPair.first) & 0xFFFFFFFF);
            w.weaknessType = WeaknessType::LowTreasury;
            snprintf(w.desc, sizeof(w.desc), "%s灵石见底", otherPair.first.c_str());
            weakCount++;
        }

        if (weakCount < 2) {
            int64_t foodS = otherPool.supply[static_cast<uint8_t>(CommodityType::Food)];
            int64_t foodD = otherPool.demand[static_cast<uint8_t>(CommodityType::Food)];
            if (foodS < 1) foodS = 1;
            float foodRatio = static_cast<float>(foodD) / static_cast<float>(foodS);
            if (foodRatio > 2.5f) {
                EnemyWeakness& w = digest.enemyWeaknesses[weakCount];
                w.clanId = static_cast<uint32_t>(std::hash<std::string>{}(otherPair.first) & 0xFFFFFFFF);
                w.weaknessType = WeaknessType::FoodDependency;
                snprintf(w.desc, sizeof(w.desc), "%s食物依赖进口", otherPair.first.c_str());
                weakCount++;
            }
        }
    }

    auto treasuryIt = allTreasuries.find(clanId);
    if (treasuryIt != allTreasuries.end()) {
        digest.treasuryBalance = treasuryIt->second;
    }
    digest.weeklyIncomeRate = static_cast<float>(weeklyIncome);
    digest.weeklyExpenseRate = static_cast<float>(weeklyExpense);
    if (weeklyExpense <= 0) weeklyExpense = 400;

    float reserveRatio = (weeklyExpense > 0)
        ? static_cast<float>(treasury) / static_cast<float>(weeklyExpense * 4)
        : 10.0f;

    if (reserveRatio < 0.5f || maxDSRatio > 3.0f) {
        digest.posture = EconomicPosture::Crisis;
    } else if (reserveRatio < 1.0f || maxDSRatio > 2.0f) {
        digest.posture = EconomicPosture::Tight;
    } else if (reserveRatio > 3.0f && maxDSRatio < 1.2f) {
        digest.posture = EconomicPosture::Surplus;
    } else {
        digest.posture = EconomicPosture::Balanced;
    }

    return digest;
}

[[maybe_unused]] static void digestToWasm(const EconomicDigest& digest, EconomicDigestWasm& wasm) {
    wasm.posture = static_cast<uint8_t>(digest.posture);
    wasm.treasuryBalance = digest.treasuryBalance;
    wasm.weeklyIncomeRate = digest.weeklyIncomeRate;
    wasm.weeklyExpenseRate = digest.weeklyExpenseRate;

    wasm.alertCount = 0;
    for (int i = 0; i < 3; i++) {
        if (digest.alerts[i].priceRatio > 1.0f) wasm.alertCount++;
    }
    for (int i = 0; i < 3; i++) {
        wasm.alerts[i].commodityType = static_cast<uint8_t>(digest.alerts[i].commodityType);
        wasm.alerts[i].supply = static_cast<int32_t>(digest.alerts[i].supply);
        wasm.alerts[i].demand = static_cast<int32_t>(digest.alerts[i].demand);
        wasm.alerts[i].priceRatio = digest.alerts[i].priceRatio;
    }

    wasm.opportunityCount = 0;
    for (int i = 0; i < 2; i++) {
        if (digest.opportunities[i].profitRate > 0.0f) wasm.opportunityCount++;
    }
    for (int i = 0; i < 2; i++) {
        wasm.opportunities[i].fromClanId = digest.opportunities[i].fromClanId;
        wasm.opportunities[i].toClanId = digest.opportunities[i].toClanId;
        wasm.opportunities[i].commodityType = static_cast<uint8_t>(digest.opportunities[i].commodityType);
        wasm.opportunities[i].profitRate = digest.opportunities[i].profitRate;
    }

    wasm.weaknessCount = 0;
    for (int i = 0; i < 2; i++) {
        if (digest.enemyWeaknesses[i].weaknessType != WeaknessType::None) wasm.weaknessCount++;
    }
    for (int i = 0; i < 2; i++) {
        wasm.enemyWeaknesses[i].clanId = digest.enemyWeaknesses[i].clanId;
        wasm.enemyWeaknesses[i].weaknessType = static_cast<uint8_t>(digest.enemyWeaknesses[i].weaknessType);
    }
}
