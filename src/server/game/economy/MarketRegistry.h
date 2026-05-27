#pragma once
#include "CommodityPool.h"
#include "PriceEngine.h"
#include "EconomicDigest.h"
#include "../ecs/Registry.h"
#include "../ecs/components/IdentityComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include <unordered_map>
#include <string>
#include <set>
#include <cstdint>
#include <cstring>

struct CachedEconSignals {
    float ironOreDemand = 1.0f;
    float spiritStoneInflation = 1.0f;
    float foodDemand = 1.0f;
    float equipmentDemand = 1.0f;
    float materialDemand = 1.0f;
    float cultivationDemand = 1.0f;
    uint64_t cachedFrame = 0;
    bool dirty = true;
};

class MarketRegistry {
public:
    static MarketRegistry& getInstance() {
        static MarketRegistry instance;
        return instance;
    }

    CommodityPool& getOrCreatePool(const std::string& clanId) {
        return pools_[clanId];
    }

    const CommodityPool* getPool(const std::string& clanId) const {
        auto it = pools_.find(clanId);
        return (it != pools_.end()) ? &it->second : nullptr;
    }

    static void recordProduction(ECS::EntityId entityId, CommodityType type, int64_t amount) {
        auto& registry = ECS::Registry::getInstance();
        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        if (!identity || identity->clanId.empty()) return;

        auto& members = getInstance().clanMembers_[identity->clanId];
        bool found = false;
        for (auto id : members) { if (id == entityId) { found = true; break; } }
        if (!found) members.push_back(entityId);

        auto& pool = getInstance().getOrCreatePool(identity->clanId);
        pool.addSupply(type, amount);

        float price = PriceEngine::getPrice(pool, type);
        int64_t income = static_cast<int64_t>(amount * price);
        auto* resources = registry.getComponent<ResourcesComponent>(entityId);
        if (resources) resources->addSpiritStones(income);

        if (type == CommodityType::SpiritStones) {
            int64_t collected = getInstance().collectTax(identity->clanId, income);
            if (resources) resources->familyContribution += static_cast<int32_t>(collected * 2);
        }
    }

    static void recordConsumption(ECS::EntityId entityId, CommodityType type, int64_t amount) {
        auto& registry = ECS::Registry::getInstance();
        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        if (!identity || identity->clanId.empty()) return;

        auto& members = getInstance().clanMembers_[identity->clanId];
        bool found = false;
        for (auto id : members) { if (id == entityId) { found = true; break; } }
        if (!found) members.push_back(entityId);

        auto& pool = getInstance().getOrCreatePool(identity->clanId);
        pool.addDemand(type, amount);

        if (type == CommodityType::SpiritStones) {
            float price = PriceEngine::getPrice(pool, type);
            int64_t tradeValue = static_cast<int64_t>(amount * price);
            int64_t collected = getInstance().collectTax(identity->clanId, tradeValue);
            auto* resources = registry.getComponent<ResourcesComponent>(entityId);
            if (resources) resources->familyContribution += static_cast<int32_t>(collected * 2);
        }
    }

    static float getMarketPrice(const std::string& clanId, CommodityType type) {
        auto* pool = getInstance().getPool(clanId);
        if (!pool) return CommodityBasePrice[static_cast<uint8_t>(type)];
        return PriceEngine::getPrice(*pool, type);
    }

    static const CommodityPool* getCommodityPool(const std::string& clanId) {
        return getInstance().getPool(clanId);
    }

    int64_t collectTax(const std::string& clanId, int64_t amount) {
        float rate = getClanTaxRate(clanId);
        int64_t tax = static_cast<int64_t>(amount * rate);
        familyTreasury_[clanId] += tax;
        treasuryIncomeAccumulator_ += tax;
        return tax;
    }

    int64_t getTreasury(const std::string& clanId) const {
        auto it = familyTreasury_.find(clanId);
        return (it != familyTreasury_.end()) ? it->second : 0;
    }

    bool spendTreasury(const std::string& clanId, int64_t amount) {
        auto it = familyTreasury_.find(clanId);
        if (it != familyTreasury_.end() && it->second >= amount) {
            it->second -= amount;
            treasuryExpenseAccumulator_ += amount;
            return true;
        }
        return false;
    }

    static void addFamilyContribution(ECS::EntityId entityId, int32_t amount) {
        auto& registry = ECS::Registry::getInstance();
        auto* resources = registry.getComponent<ResourcesComponent>(entityId);
        if (resources) resources->familyContribution += amount;
    }

    void tickDecay(uint64_t currentFrame) {
        frameCounter_++;
        if (frameCounter_ >= DECAY_INTERVAL) {
            frameCounter_ = 0;
            for (auto& pair : pools_) {
                pair.second.decayDemand(DECAY_FACTOR);
            }
            for (auto& pair : signalCache_) {
                pair.second.dirty = true;
            }
            digestDirty_ = true;
        }
    }

    CachedEconSignals getEconomicSignals(const std::string& clanId, uint64_t currentFrame) {
        auto it = signalCache_.find(clanId);
        if (it != signalCache_.end() && !it->second.dirty && (currentFrame - it->second.cachedFrame) < SIGNAL_CACHE_TTL) {
            return it->second;
        }
        CachedEconSignals cached;
        const CommodityPool* pool = getPool(clanId);
        if (pool) {
            auto ratio = [&](CommodityType t) -> float {
                int64_t s = pool->supply[static_cast<uint8_t>(t)];
                int64_t d = pool->demand[static_cast<uint8_t>(t)];
                if (s < 1) s = 1;
                float r = static_cast<float>(d) / static_cast<float>(s);
                return r > 0.01f ? r : 1.0f;
            };
            cached.ironOreDemand = ratio(CommodityType::Ore);
            cached.foodDemand = ratio(CommodityType::Food);
            cached.equipmentDemand = ratio(CommodityType::Equipment);
            cached.materialDemand = ratio(CommodityType::Materials);
            cached.cultivationDemand = ratio(CommodityType::Pills);
            cached.spiritStoneInflation = ratio(CommodityType::SpiritStones);
        }
        cached.cachedFrame = currentFrame;
        cached.dirty = false;
        signalCache_[clanId] = cached;
        return cached;
    }

    const EconomicDigest& getEconomicDigest(const std::string& clanId, uint64_t currentFrame) {
        if (!digestDirty_ && (currentFrame - digestCachedFrame_) < DIGEST_CACHE_TTL) {
            return cachedDigest_;
        }
        cachedDigest_ = computeEconomicDigest(clanId, currentFrame,
            getTreasury(clanId), pools_, familyTreasury_);
        digestCachedFrame_ = currentFrame;
        digestDirty_ = false;
        return cachedDigest_;
    }

    float getClanTaxRate(const std::string& clanId) const {
        auto it = clanTaxRates_.find(clanId);
        return (it != clanTaxRates_.end()) ? it->second : 0.05f;
    }

    void applyTaxRate(const std::string& clanId, float newRate) {
        if (newRate < 0.01f) newRate = 0.01f;
        if (newRate > 0.15f) newRate = 0.15f;
        clanTaxRates_[clanId] = newRate;
    }

    void applyEmbargo(const std::string& clanId, const std::string& targetClan, bool active) {
        if (active) {
            embargoTargets_[clanId].insert(targetClan);
        } else {
            auto it = embargoTargets_.find(clanId);
            if (it != embargoTargets_.end()) {
                it->second.erase(targetClan);
                if (it->second.empty()) {
                    embargoTargets_.erase(it);
                }
            }
        }
    }

    bool isEmbargoed(const std::string& clanId, const std::string& targetClan) const {
        auto it = embargoTargets_.find(clanId);
        if (it == embargoTargets_.end()) return false;
        return it->second.find(targetClan) != it->second.end();
    }

    void applyStockpile(const std::string& clanId, CommodityType type, float ratio) {
        if (ratio < 0.0f) ratio = 0.0f;
        if (ratio > 1.0f) ratio = 1.0f;
        stockpileRatios_[clanId][static_cast<uint8_t>(type)] = ratio;
    }

    int64_t getEffectiveSupply(const std::string& clanId, CommodityType type) {
        const CommodityPool* pool = getPool(clanId);
        if (!pool) return 100;
        uint8_t idx = static_cast<uint8_t>(type);
        int64_t raw = pool->supply[idx];
        float ratio = 0.0f;
        auto it = stockpileRatios_.find(clanId);
        if (it != stockpileRatios_.end()) {
            ratio = it->second[idx];
        }
        int64_t effective = static_cast<int64_t>(raw * (1.0f - ratio));
        return effective > 1 ? effective : 1;
    }

    const std::unordered_map<std::string, CommodityPool>& allPools() const {
        return pools_;
    }

    float getWeeklyIncomeRate() const { return static_cast<float>(treasuryIncomeAccumulator_); }
    float getWeeklyExpenseRate() const { return static_cast<float>(treasuryExpenseAccumulator_); }
    void resetWeeklyAccumulators() { treasuryIncomeAccumulator_ = 0; treasuryExpenseAccumulator_ = 0; }

    const std::vector<ECS::EntityId>& getClanMembers(const std::string& clanId) const {
        static const std::vector<ECS::EntityId> empty;
        auto it = clanMembers_.find(clanId);
        return (it != clanMembers_.end()) ? it->second : empty;
    }

private:
    MarketRegistry() : frameCounter_(0) {}

    std::unordered_map<std::string, CommodityPool> pools_;
    std::unordered_map<std::string, int64_t> familyTreasury_;
    std::unordered_map<std::string, CachedEconSignals> signalCache_;
    std::unordered_map<std::string, float> clanTaxRates_;
    std::unordered_map<std::string, std::set<std::string>> embargoTargets_;
    std::unordered_map<std::string, float[6]> stockpileRatios_;
    EconomicDigest cachedDigest_;
    uint64_t digestCachedFrame_ = 0;
    bool digestDirty_ = true;
    uint32_t frameCounter_;
    int64_t treasuryIncomeAccumulator_ = 0;
    int64_t treasuryExpenseAccumulator_ = 0;
    std::unordered_map<std::string, std::vector<ECS::EntityId>> clanMembers_;
    static constexpr uint32_t DECAY_INTERVAL = 600;
    static constexpr uint64_t SIGNAL_CACHE_TTL = 100;
    static constexpr uint64_t DIGEST_CACHE_TTL = 600;
    static constexpr float DECAY_FACTOR = 0.95f;
};
