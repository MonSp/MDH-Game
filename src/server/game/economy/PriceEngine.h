#pragma once
#include "CommodityPool.h"
#include <cmath>
#include <algorithm>

class PriceEngine {
public:
    static constexpr float ELASTICITY = 0.3f;
    static constexpr float PRICE_FLOOR_MULT = 0.3f;
    static constexpr float PRICE_CEIL_MULT = 3.0f;

    static float getPrice(const CommodityPool& pool, CommodityType type) {
        uint8_t idx = static_cast<uint8_t>(type);
        if (idx >= 6) return CommodityBasePrice[0];

        float basePrice = CommodityBasePrice[idx];
        int64_t supply = pool.supply[idx];
        int64_t demand = pool.demand[idx];

        if (supply < 1) supply = 1;
        float ratio = static_cast<float>(demand) / static_cast<float>(supply);
        if (ratio < 0.01f) ratio = 0.01f;

        float price = basePrice * (1.0f + ELASTICITY * std::log(ratio));

        float floor = basePrice * PRICE_FLOOR_MULT;
        float ceil = basePrice * PRICE_CEIL_MULT;
        if (price < floor) price = floor;
        if (price > ceil) price = ceil;

        return price;
    }
};
