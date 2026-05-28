#ifndef WORLD_GENERATOR_H
#define WORLD_GENERATOR_H

#include <string>
#include <vector>
#include <cmath>
#include <cstdint>
#include <unordered_map>
#include <algorithm>
#include "SimplexNoise.h"
#include "../ecs/components/RelationshipComponent.h"

namespace WorldGen {

// === Data Structures ===

enum class TerrainType : uint8_t {
    DEEP_WATER = 0,
    SHALLOW_WATER = 1,
    SAND = 2,
    GRASS = 3,
    FOREST = 4,
    ROCK = 5,
    MOUNTAIN = 6,
    SNOW = 7,
    ROAD = 8
};

struct TerrainTile {
    int32_t x;
    int32_t y;
    float elevation;
    TerrainType biome;
    bool hasTree;
    bool isRoad;
};

struct ClanInfo {
    std::string id;
    std::string name;
    std::string country;
    std::string type;       // "皇族", "1级", "2级", "3级"
    int32_t reputation;
    int64_t treasury;
    int32_t territory;
    int32_t garrison;
    int32_t fortification;
    int32_t centerX;
    int32_t centerY;
    int32_t heavenLevel;
};

struct BuildingInfo {
    std::string id;
    std::string kind;       // "faction_hall", "barracks", etc.
    std::string clanId;
    std::string country;
    int32_t worldX;
    int32_t worldY;
    float compoundWidth;
    float compoundDepth;
    std::string label;
    uint8_t level;
    float height;
};

struct TreeInfo {
    int32_t x;
    int32_t y;
    float scale;
    uint8_t variant;
};

struct ResourceInfo {
    std::string id;
    std::string type;   // "灵田", "矿脉", "遗迹"
    int32_t amount;
    int32_t posX;
    int32_t posY;
};

struct WorldOutput {
    std::vector<ClanInfo> clans;
    std::vector<BuildingInfo> buildings;
    std::vector<TreeInfo> trees;
    std::vector<ResourceInfo> resources;
};

// === Constants ===

inline bool isWater(TerrainType t) {
    return t == TerrainType::DEEP_WATER || t == TerrainType::SHALLOW_WATER;
}

static const char* COUNTRIES[] = {"秦", "楚", "齐", "燕", "赵", "魏", "韩"};
static constexpr int COUNTRY_COUNT = 7;

static const char* SURNAMES[] = {"赢", "芈", "姜", "姬", "赵", "魏", "韩", "李", "王", "白", "蒙", "项", "田", "林"};
static constexpr int SURNAME_COUNT = 14;

struct CountryCapital {
    const char* name;
    int x, y;
};
static const CountryCapital CAPITALS[] = {
    {"秦", 20, 50}, {"楚", 50, 80}, {"齐", 80, 50},
    {"燕", 70, 20}, {"赵", 50, 30}, {"魏", 45, 50}, {"韩", 40, 60}
};

struct BuildingTypeDef {
    const char* kind;
    const char* label;
    float width, depth;
};
static const BuildingTypeDef BUILDING_TYPES[] = {
    {"faction_hall",  "议事厅", 3.0f, 3.0f},
    {"barracks",      "兵营",   2.0f, 2.5f},
    {"spirit_stone_mine", "灵石矿", 2.0f, 2.0f},
    {"treasury",      "库房",   2.0f, 2.0f},
    {"forge",         "锻造坊", 2.0f, 2.0f},
    {"alchemy_lab",   "炼丹房", 2.0f, 2.0f},
};
static constexpr int BUILDING_TYPE_COUNT = 6;

// Test island (same as terrain.ts)
static constexpr int TEST_ISLAND_X = 300;
static constexpr int TEST_ISLAND_Y = 300;
static constexpr int TEST_ISLAND_RADIUS = 55;
static constexpr int TEST_ISLAND_WATER_RING = 7;

// === World Generator ===

class WorldGenerator {
public:
    WorldGenerator(uint64_t seed, int32_t width, int32_t height, int32_t heavenLevel = 9)
        : noise_(seed)
        , seed_(seed)
        , width_(width)
        , height_(height)
        , heavenLevel_(heavenLevel)
    {}

    TerrainTile getTerrainTile(int32_t x, int32_t y) {
        // Test island
        float dx = static_cast<float>(x - TEST_ISLAND_X);
        float dy = static_cast<float>(y - TEST_ISLAND_Y);
        float distToIsland = std::sqrt(dx * dx + dy * dy);
        float radius = TEST_ISLAND_RADIUS;
        float waterRing = TEST_ISLAND_WATER_RING;

        if (distToIsland < radius + waterRing) {
            if (distToIsland <= radius) {
                float edgeFactor = 1.0f - distToIsland / radius;
                float innerNoise = noise_.noise2D(x * 0.3f, y * 0.3f);
                bool isSand = edgeFactor < 0.15f;
                bool hasTree = distToIsland > 2.0f && innerNoise > 0.55f && !isSand;
                return {
                    x, y,
                    0.3f + edgeFactor * 0.15f + innerNoise * 0.05f,
                    isSand ? TerrainType::SAND : TerrainType::GRASS,
                    hasTree,
                    false
                };
            }
            return {
                x, y,
                -0.3f - (distToIsland - radius) * 0.04f,
                TerrainType::SHALLOW_WATER,
                false, false
            };
        }

        float macroNoise = noise_.noise2D(x * 0.001f, y * 0.001f);
        float microNoise = noise_.noise2D(x * 0.005f, y * 0.005f) * 0.3f;
        float value = macroNoise + microNoise;

        struct BiomeEntry { TerrainType type; float threshold; float baseHeight; };
        static const BiomeEntry BIOMES[] = {
            {TerrainType::DEEP_WATER,    -0.4f,   -0.5f},
            {TerrainType::SHALLOW_WATER, -0.1f,   -0.3f},
            {TerrainType::SAND,          0.05f,    0.1f},
            {TerrainType::GRASS,         0.4f,     0.3f},
            {TerrainType::FOREST,        0.7f,     0.4f},
            {TerrainType::ROCK,          0.9f,     0.8f},
            {TerrainType::SNOW,          1e9f,     1.2f},
        };

        TerrainType biome = TerrainType::SNOW;
        float baseHeight = 1.2f;
        for (const auto& b : BIOMES) {
            if (value <= b.threshold) {
                biome = b.type;
                baseHeight = b.baseHeight;
                break;
            }
        }

        float elevation = baseHeight;
        if (!isWater(biome)) {
            elevation += microNoise * 0.5f;
        }

        bool isRoad = (std::abs(x % 8) <= 1 || std::abs(y % 8) <= 1) && !isWater(biome);
        if (isRoad) {
            biome = TerrainType::ROAD;
            elevation = 0.15f;
        }

        bool hasTree = false;
        if ((biome == TerrainType::GRASS || biome == TerrainType::FOREST) && !isRoad) {
            float treeNoise = noise_.noise2D(x * 0.5f, y * 0.5f);
            if (treeNoise > (biome == TerrainType::FOREST ? 0.3f : 0.8f)) {
                hasTree = true;
            }
        }

        return {x, y, elevation, biome, hasTree, isRoad};
    }

    WorldOutput generateWorld() {
        WorldOutput out;

        // --- Generate clans ---
        generateClans(out);

        // --- Generate buildings ---
        generateBuildings(out);

        // --- Generate trees ---
        generateTrees(out);

        // --- Generate resource points ---
        generateResources(out);

        // --- Initialize faction affinities ---
        initializeFactionAffinities(out);

        return out;
    }

    // Simple hash for deterministic clan positioning
    uint32_t hashStr(const std::string& s) const {
        uint32_t h = seed_;
        for (char c : s) {
            h = h * 31 + static_cast<uint8_t>(c);
        }
        return h;
    }

private:
    SimplexNoise noise_;
    uint64_t seed_;
    int32_t width_, height_;
    int32_t heavenLevel_;

    // Simple deterministic hash-based random
    struct SimpleRand {
        uint64_t state;
        SimpleRand(uint64_t seed) : state(seed) {}

        int nextInt(int min, int max) {
            state = state * 6364136223846793005ULL + 1442695040888963407ULL;
            return min + static_cast<int>(state % (max - min + 1));
        }

        float nextFloat() {
            state = state * 6364136223846793005ULL + 1442695040888963407ULL;
            return static_cast<float>(state) / 18446744073709551615.0f;
        }
    };

    void generateClans(WorldOutput& out) {
        SimpleRand rng(seed_ + 1000);

        for (int ci = 0; ci < COUNTRY_COUNT; ci++) {
            std::string country(COUNTRIES[ci]);
            const auto& cap = CAPITALS[ci];

            // Royal family
            ClanInfo royal;
            royal.id = std::to_string(heavenLevel_) + "-" + country + "-皇族";
            royal.name = country + "国王室";
            royal.country = country;
            royal.type = "皇族";
            royal.reputation = 50;
            royal.treasury = 100000 * heavenLevel_;
            royal.territory = 8;
            royal.garrison = 20;
            royal.fortification = 10;
            royal.heavenLevel = heavenLevel_;
            royal.centerX = cap.x;
            royal.centerY = cap.y;
            out.clans.push_back(royal);

            int familyCount = 16;
            int firstCount = familyCount / 4;
            int secondCount = familyCount / 3;
            int thirdCount = familyCount - firstCount - secondCount - 1;

            for (int i = 1; i <= firstCount; i++) {
                ClanInfo c;
                c.id = std::to_string(heavenLevel_) + "-" + country + "-1级-" + std::to_string(i);
                c.name = std::string(SURNAMES[rng.nextInt(0, SURNAME_COUNT - 1)]) + "家";
                c.country = country;
                c.type = "1级";
                c.reputation = 50;
                c.treasury = 50000 * heavenLevel_;
                c.territory = 5;
                c.garrison = 25;
                c.fortification = 15;
                c.heavenLevel = heavenLevel_;
                c.centerX = cap.x + (i % 5) * 3;
                c.centerY = cap.y + (i / 5) * 3;
                out.clans.push_back(c);
            }

            for (int i = 1; i <= secondCount; i++) {
                ClanInfo c;
                c.id = std::to_string(heavenLevel_) + "-" + country + "-2级-" + std::to_string(i);
                c.name = std::string(SURNAMES[rng.nextInt(0, SURNAME_COUNT - 1)]) + "氏";
                c.country = country;
                c.type = "2级";
                c.reputation = 50;
                c.treasury = 10000 * heavenLevel_;
                c.territory = 3;
                c.garrison = 25;
                c.fortification = 15;
                c.heavenLevel = heavenLevel_;
                c.centerX = cap.x + (i % 5) * 3;
                c.centerY = cap.y + (i / 5) * 3;
                out.clans.push_back(c);
            }

            for (int i = 1; i <= thirdCount; i++) {
                ClanInfo c;
                c.id = std::to_string(heavenLevel_) + "-" + country + "-3级-" + std::to_string(i);
                c.name = std::string(SURNAMES[rng.nextInt(0, SURNAME_COUNT - 1)]) + "族";
                c.country = country;
                c.type = "3级";
                c.reputation = 50;
                c.treasury = 5000 * heavenLevel_;
                c.territory = 2;
                c.garrison = 25;
                c.fortification = 15;
                c.heavenLevel = heavenLevel_;
                c.centerX = cap.x + (i % 5) * 3;
                c.centerY = cap.y + (i / 5) * 3;
                out.clans.push_back(c);
            }
        }
    }

    void generateBuildings(WorldOutput& out) {
        SimpleRand rng(seed_ + 2000);

        for (const auto& clan : out.clans) {
            int bx = clan.centerX;
            int by = clan.centerY;

            int buildingCount = (clan.type == "皇族") ? 6 : (clan.type == "1级") ? 5 : (clan.type == "2级") ? 4 : 3;

            for (int i = 0; i < buildingCount && i < BUILDING_TYPE_COUNT; i++) {
                BuildingInfo b;
                b.id = clan.id + "-building-" + std::to_string(i);
                b.kind = BUILDING_TYPES[i].kind;
                b.clanId = clan.id;
                b.country = clan.country;
                b.label = BUILDING_TYPES[i].label;
                b.compoundWidth = BUILDING_TYPES[i].width;
                b.compoundDepth = BUILDING_TYPES[i].depth;
                b.level = static_cast<uint8_t>(rng.nextInt(1, 3));

                b.worldX = bx + (i % 3) * 4;
                b.worldY = by + (i / 3) * 4;

                float baseHeight = 3.0f;
                if (b.kind == "faction_hall") baseHeight = 5.0f;
                else if (b.kind == "barracks") baseHeight = 4.0f;
                else if (b.kind == "treasury") baseHeight = 2.5f;
                else if (b.kind == "alchemy_lab") baseHeight = 2.5f;
                b.height = baseHeight + static_cast<float>(b.level - 1) * 1.5f;

                out.buildings.push_back(b);
            }
        }

        // Manor compound on test island — manor walls + inner buildings
        {
            BuildingInfo b;
            b.id = "manor@315,270";
            b.kind = "manor";
            b.clanId = "";
            b.country = "齐";
            b.label = "测试岛·别院(院墙)";
            b.compoundWidth = 24.0f;
            b.compoundDepth = 18.0f;
            b.level = 1;
            b.worldX = 315;
            b.worldY = 270;
            b.height = 3.0f;
            out.buildings.push_back(b);
        }
        {
            BuildingInfo b;
            b.id = "manor@315,270_main-hall";
            b.kind = "faction_hall";
            b.clanId = "";
            b.country = "齐";
            b.label = "议事厅";
            b.compoundWidth = 8.0f;
            b.compoundDepth = 3.0f;
            b.level = 1;
            b.worldX = 308;
            b.worldY = 263;
            b.height = 4.0f;
            out.buildings.push_back(b);
        }
        {
            BuildingInfo b;
            b.id = "manor@315,270_library";
            b.kind = "faction_hall";
            b.clanId = "";
            b.country = "齐";
            b.label = "藏经阁";
            b.compoundWidth = 3.0f;
            b.compoundDepth = 2.0f;
            b.level = 1;
            b.worldX = 318;
            b.worldY = 267;
            b.height = 4.0f;
            out.buildings.push_back(b);
        }
        {
            BuildingInfo b;
            b.id = "manor@315,270_training";
            b.kind = "barracks";
            b.clanId = "";
            b.country = "齐";
            b.label = "练功房";
            b.compoundWidth = 4.0f;
            b.compoundDepth = 2.0f;
            b.level = 1;
            b.worldX = 307;
            b.worldY = 267;
            b.height = 3.0f;
            out.buildings.push_back(b);
        }
        {
            BuildingInfo b;
            b.id = "manor@315,270_alchemy";
            b.kind = "alchemy_lab";
            b.clanId = "";
            b.country = "齐";
            b.label = "丹房";
            b.compoundWidth = 4.0f;
            b.compoundDepth = 2.0f;
            b.level = 1;
            b.worldX = 313;
            b.worldY = 267;
            b.height = 3.0f;
            out.buildings.push_back(b);
        }
    }

    void generateTrees(WorldOutput& out) {
        SimpleRand rng(seed_ + 3000);

        int step = 2;
        for (int x = -10; x <= width_ + 10; x += step) {
            for (int y = -10; y <= height_ + 10; y += step) {
                auto tile = getTerrainTile(x, y);
                if (tile.hasTree) {
                    TreeInfo t;
                    t.x = x;
                    t.y = y;
                    t.scale = 0.8f + rng.nextFloat() * 0.4f;
                    t.variant = static_cast<uint8_t>(rng.nextInt(0, 2));
                    out.trees.push_back(t);
                }
            }
        }
    }

    void generateResources(WorldOutput& out) {
        SimpleRand rng(seed_ + 4000);
        const char* types[] = {"灵田", "矿脉", "遗迹"};
        int idx = 0;

        struct NationRes { int ci; const char* type; };
        NationRes nationRes[] = {
            {0, "矿脉"}, {0, "矿脉"},
            {1, "灵田"}, {1, "灵田"},
            {2, "遗迹"},
            {3, "矿脉"}, {3, "遗迹"},
            {4, "灵田"}, {4, "灵田"},
            {5, "遗迹"},
            {6, "遗迹"}, {6, "灵田"},
        };
        int nationCount = static_cast<int>(sizeof(nationRes) / sizeof(nationRes[0]));

        for (int i = 0; i < nationCount; i++) {
            const auto& cap = CAPITALS[nationRes[i].ci];
            ResourceInfo r;
            r.id = "res-" + std::to_string(seed_) + "-" + std::to_string(idx);
            r.type = nationRes[i].type;
            r.amount = (rng.nextInt(50, 150)) * heavenLevel_;
            r.posX = std::clamp(cap.x + rng.nextInt(-15, 15), 10, width_ - 10);
            r.posY = std::clamp(cap.y + rng.nextInt(-15, 15), 10, height_ - 10);
            out.resources.push_back(r);
            idx++;
        }

        int remaining = rng.nextInt(5, 8);
        for (int i = 0; i < remaining; i++) {
            ResourceInfo r;
            r.id = "res-" + std::to_string(seed_) + "-" + std::to_string(idx);
            r.type = types[rng.nextInt(0, 2)];
            r.amount = (rng.nextInt(50, 150)) * heavenLevel_;
            r.posX = rng.nextInt(10, width_ - 10);
            r.posY = rng.nextInt(10, height_ - 10);
            out.resources.push_back(r);
            idx++;
        }
    }

    void initializeFactionAffinities(WorldOutput& out) {
        int matrix[COUNTRY_COUNT][COUNTRY_COUNT] = {};
        matrix[0][1] = matrix[1][0] = -30;
        matrix[0][5] = matrix[5][0] = 20;
        matrix[0][6] = matrix[6][0] = 10;
        matrix[1][4] = matrix[4][1] = -20;
        matrix[1][2] = matrix[2][1] = 10;
        matrix[1][6] = matrix[6][1] = 10;
        matrix[2][3] = matrix[3][2] = -20;
        matrix[2][4] = matrix[4][2] = 10;
        matrix[3][4] = matrix[4][3] = 10;
        matrix[4][6] = matrix[6][4] = -10;
        matrix[5][6] = matrix[6][5] = 10;

        SimpleRand rng(seed_ + 5000);

        auto getCountryIdx = [](const std::string& country) -> int {
            for (int i = 0; i < COUNTRY_COUNT; i++) {
                if (country == COUNTRIES[i]) return i;
            }
            return -1;
        };

        for (size_t i = 0; i < out.clans.size(); i++) {
            uint32_t hashA = hashStr(out.clans[i].id);
            int idxA = getCountryIdx(out.clans[i].country);
            for (size_t j = i + 1; j < out.clans.size(); j++) {
                uint32_t hashB = hashStr(out.clans[j].id);
                int idxB = getCountryIdx(out.clans[j].country);
                int affinity;
                if (idxA == idxB) {
                    affinity = 10 + rng.nextInt(0, 20);
                } else {
                    affinity = matrix[idxA][idxB] + rng.nextInt(-10, 10);
                }
                affinity = std::clamp(affinity, -100, 100);
                RelationshipComponent::setFactionAffinity(hashA, hashB, static_cast<int8_t>(affinity));
            }
        }
    }
};

} // namespace WorldGen

#endif // WORLD_GENERATOR_H
