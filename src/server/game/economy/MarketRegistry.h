#pragma once
#include "CommodityPool.h"
#include "PriceEngine.h"
#include "../ecs/Registry.h"
#include "../ecs/components/IdentityComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include <unordered_map>
#include <string>
#include <cstdint>

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

        auto& pool = getInstance().getOrCreatePool(identity->clanId);
        pool.addSupply(type, amount);

        float price = PriceEngine::getPrice(pool, type);
        int64_t income = static_cast<int64_t>(amount * price);
        auto* resources = registry.getComponent<ResourcesComponent>(entityId);
        if (resources) resources->addSpiritStones(income);

        if (type == CommodityType::SpiritStones) {
            int64_t tax = static_cast<int64_t>(income * 0.05f);
            getInstance().collectTax(identity->clanId, tax);
            if (resources) resources->familyContribution += static_cast<int32_t>(tax * 2);
        }
    }

    static void recordConsumption(ECS::EntityId entityId, CommodityType type, int64_t amount) {
        auto& registry = ECS::Registry::getInstance();
        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        if (!identity || identity->clanId.empty()) return;

        auto& pool = getInstance().getOrCreatePool(identity->clanId);
        pool.addDemand(type, amount);

        if (type == CommodityType::SpiritStones) {
            int64_t tax = static_cast<int64_t>(amount * 0.05f);
            getInstance().collectTax(identity->clanId, tax);
            auto* resources = registry.getComponent<ResourcesComponent>(entityId);
            if (resources) resources->familyContribution += static_cast<int32_t>(tax * 2);
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
        familyTreasury_[clanId] += amount;
        return amount;
    }

    int64_t getTreasury(const std::string& clanId) const {
        auto it = familyTreasury_.find(clanId);
        return (it != familyTreasury_.end()) ? it->second : 0;
    }

    bool spendTreasury(const std::string& clanId, int64_t amount) {
        auto it = familyTreasury_.find(clanId);
        if (it != familyTreasury_.end() && it->second >= amount) {
            it->second -= amount;
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
        }
    }

    const std::unordered_map<std::string, CommodityPool>& allPools() const {
        return pools_;
    }

private:
    MarketRegistry() : frameCounter_(0) {}

    std::unordered_map<std::string, CommodityPool> pools_;
    std::unordered_map<std::string, int64_t> familyTreasury_;
    uint32_t frameCounter_;
    static constexpr uint32_t DECAY_INTERVAL = 600;
    static constexpr float DECAY_FACTOR = 0.95f;
};
