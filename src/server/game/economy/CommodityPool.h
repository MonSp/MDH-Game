#pragma once
#include <cstdint>

enum class CommodityType : uint8_t {
    Ore = 0,
    Food = 1,
    Equipment = 2,
    Materials = 3,
    Pills = 4,
    SpiritStones = 5,
    COUNT = 6
};

static constexpr const char* CommodityTypeNames[] = {
    "Ore", "Food", "Equipment", "Materials", "Pills", "SpiritStones"
};

static constexpr float CommodityBasePrice[] = {
    5.0f,   // Ore
    3.0f,   // Food
    40.0f,  // Equipment
    4.0f,   // Materials
    80.0f,  // Pills
    1.0f    // SpiritStones
};

struct CommodityPool {
    int64_t supply[6];
    int64_t demand[6];

    CommodityPool() {
        for (int i = 0; i < 6; i++) {
            supply[i] = 100;
            demand[i] = 0;
        }
    }

    void addSupply(CommodityType type, int64_t amount) {
        uint8_t idx = static_cast<uint8_t>(type);
        if (idx < 6) supply[idx] += amount;
    }

    void addDemand(CommodityType type, int64_t amount) {
        uint8_t idx = static_cast<uint8_t>(type);
        if (idx < 6) demand[idx] += amount;
    }

    void decayDemand(float factor) {
        for (int i = 0; i < 6; i++) {
            demand[i] = static_cast<int64_t>(demand[i] * factor);
            if (demand[i] < 0) demand[i] = 0;
        }
    }
};
