#pragma once
#include <cstdint>
#include <string>
#include <cmath>
#include <algorithm>

enum class EconomicSpecialty : uint8_t {
    Mining = 0,
    Agriculture = 1,
    Alchemy = 2,
    Trade = 3,
    Military = 4,
    Balanced = 5
};

struct NationEconomyProfile {
    const char* nation;
    float supplyBias[6];
    const char* dominantResource;
    EconomicSpecialty specialty;
};

static NationEconomyProfile NATION_PROFILES[7] = {
    { "秦", {1.5f, 0.8f, 1.0f, 1.0f, 0.7f, 0.9f}, "矿脉", EconomicSpecialty::Mining },
    { "楚", {0.8f, 1.0f, 0.9f, 1.2f, 1.5f, 0.8f}, "灵田", EconomicSpecialty::Alchemy },
    { "齐", {0.9f, 1.2f, 1.0f, 0.9f, 1.0f, 1.4f}, "遗迹", EconomicSpecialty::Trade },
    { "燕", {1.0f, 0.7f, 1.4f, 1.0f, 0.8f, 0.9f}, "矿脉", EconomicSpecialty::Military },
    { "赵", {0.9f, 1.4f, 0.9f, 1.0f, 0.9f, 1.0f}, "灵田", EconomicSpecialty::Agriculture },
    { "魏", {1.0f, 1.0f, 1.1f, 1.0f, 1.0f, 1.1f}, "遗迹", EconomicSpecialty::Balanced },
    { "韩", {0.8f, 1.0f, 1.0f, 1.1f, 1.2f, 1.3f}, "遗迹", EconomicSpecialty::Trade }
};

static const NationEconomyProfile& getNationProfile(const std::string& nation) {
    for (int i = 0; i < 7; i++) {
        if (nation == NATION_PROFILES[i].nation) {
            return NATION_PROFILES[i];
        }
    }
    return NATION_PROFILES[5];
}

static void applySupplyBiasJitter(float supplyBias[6], uint64_t& seed) {
    for (int i = 0; i < 6; i++) {
        seed = seed * 6364136223846793005ULL + 1442695040888963407ULL;
        float jitter = 0.8f + static_cast<float>(seed >> 33) / static_cast<float>(1ULL << 31) * 0.4f;
        supplyBias[i] *= jitter;
    }
}

static float getEconomyMultiplier(int64_t treasury, int64_t baseTreasury) {
    if (baseTreasury <= 0) return 1.0f;
    float ratio = static_cast<float>(treasury) / static_cast<float>(baseTreasury);
    float result = std::sqrt(ratio);
    return std::clamp(result, 0.5f, 2.0f);
}
