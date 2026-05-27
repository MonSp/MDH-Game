#pragma once
#include "MarketRegistry.h"
#include "PriceEngine.h"
#include <cstdint>
#include <string>
#include <cmath>
#include <unordered_map>

struct CaravanRoute {
    std::string fromClan;
    std::string toClan;
    CommodityType commodity;
    float buyPrice;
    float sellPrice;
    float margin;
    uint64_t cooldownUntil;
    bool operator<(const CaravanRoute& other) const { return margin < other.margin; }
};

class CaravanSystem {
public:
    static CaravanSystem& getInstance() {
        static CaravanSystem instance;
        return instance;
    }

    CaravanRoute findBestRoute(const std::string& myClanId, uint64_t currentFrame) {
        CaravanRoute best;
        best.margin = -1.0f;

        const auto* myPool = MarketRegistry::getCommodityPool(myClanId);
        if (!myPool) return best;

        auto& mkt = MarketRegistry::getInstance();
        const auto& allPools = mkt.allPools();

        for (const auto& pair : allPools) {
            const std::string& otherClan = pair.first;
            if (otherClan == myClanId) continue;

            const auto* otherPool = MarketRegistry::getCommodityPool(otherClan);
            if (!otherPool) continue;

            for (uint8_t i = 0; i < 6; i++) {
                CommodityType ct = static_cast<CommodityType>(i);
                float myPrice = PriceEngine::getPrice(*myPool, ct);
                float otherPrice = PriceEngine::getPrice(*otherPool, ct);

                if (myPrice < otherPrice) {
                    float margin = (otherPrice - myPrice) / myPrice;
                    if (margin > best.margin && margin > 0.2f) {
                        auto it = cooldowns_.find(myClanId + "->" + otherClan + "_" + std::to_string(i));
                        if (it == cooldowns_.end() || currentFrame >= it->second) {
                            best.fromClan = myClanId;
                            best.toClan = otherClan;
                            best.commodity = ct;
                            best.buyPrice = myPrice;
                            best.sellPrice = otherPrice;
                            best.margin = margin;
                        }
                    }
                }
            }
        }

        return best;
    }

    bool executeRoute(const CaravanRoute& route, uint64_t currentFrame) {
        if (route.margin < 0.2f) return false;

        int64_t quantity = 100;
        float profit = quantity * (route.sellPrice - route.buyPrice) * 0.95f;

        if (rand() % 100 < 5) {
            profit *= 0.5f;
        }

        auto& fromPool = MarketRegistry::getInstance().getOrCreatePool(route.fromClan);
        fromPool.addDemand(route.commodity, quantity);

        auto& toPool = MarketRegistry::getInstance().getOrCreatePool(route.toClan);
        toPool.addSupply(route.commodity, quantity);

        MarketRegistry::getInstance().collectTax(route.toClan, static_cast<int64_t>(profit));

        std::string key = route.fromClan + "->" + route.toClan + "_" + std::to_string(static_cast<uint8_t>(route.commodity));
        cooldowns_[key] = currentFrame + 500;

        return true;
    }

private:
    CaravanSystem() {}
    std::unordered_map<std::string, uint64_t> cooldowns_;
};
