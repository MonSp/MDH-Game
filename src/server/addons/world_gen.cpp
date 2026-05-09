#include <node_api.h>
#include <cstring>
#include <string>
#include <vector>
#include "game/world/WorldGenerator.h"

// Helper: set a string property on a JS object
static napi_status setStr(napi_env env, napi_value obj, const char* key, const std::string& val) {
    napi_value jsStr;
    napi_status s = napi_create_string_utf8(env, val.c_str(), val.length(), &jsStr);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsStr);
}

// Helper: set a int32 property
static napi_status setInt(napi_env env, napi_value obj, const char* key, int32_t val) {
    napi_value jsNum;
    napi_status s = napi_create_int32(env, val, &jsNum);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsNum);
}

// Helper: set a int64 property (as double to avoid precision issues with JS)
static napi_status setInt64(napi_env env, napi_value obj, const char* key, int64_t val) {
    napi_value jsNum;
    napi_status s = napi_create_double(env, static_cast<double>(val), &jsNum);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsNum);
}

// Helper: set a float property
static napi_status setFloat(napi_env env, napi_value obj, const char* key, float val) {
    napi_value jsNum;
    napi_status s = napi_create_double(env, static_cast<double>(val), &jsNum);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsNum);
}

// ============ generateWorld() ============
// JS signature: generateWorld(seed, width, height, heavenLevel)
// Returns: { clans: [...], buildings: [...], trees: [...], resources: [...] }
static napi_value GenerateWorld(napi_env env, napi_callback_info info) {
    napi_value result;
    napi_create_object(env, &result);

    size_t argc = 4;
    napi_value args[4];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    // Parse arguments
    int64_t seed = 42;
    int32_t width = 600, height = 600, heavenLevel = 9;

    if (argc >= 1) napi_get_value_int64(env, args[0], &seed);
    if (argc >= 2) napi_get_value_int32(env, args[1], &width);
    if (argc >= 3) napi_get_value_int32(env, args[2], &height);
    if (argc >= 4) napi_get_value_int32(env, args[3], &heavenLevel);

    // Generate world
    WorldGen::WorldGenerator gen(static_cast<uint64_t>(seed), width, height, heavenLevel);
    WorldGen::WorldOutput world = gen.generateWorld();

    // --- Build clans array ---
    napi_value clansArr;
    napi_create_array_with_length(env, world.clans.size(), &clansArr);
    for (size_t i = 0; i < world.clans.size(); i++) {
        napi_value obj;
        napi_create_object(env, &obj);
        const auto& c = world.clans[i];
        setStr(env, obj, "id", c.id);
        setStr(env, obj, "name", c.name);
        setStr(env, obj, "country", c.country);
        setStr(env, obj, "type", c.type);
        setInt(env, obj, "reputation", c.reputation);
        setInt64(env, obj, "treasury", c.treasury);
        setInt(env, obj, "territory", c.territory);
        setInt(env, obj, "garrison", c.garrison);
        setInt(env, obj, "fortification", c.fortification);
        setInt(env, obj, "centerX", c.centerX);
        setInt(env, obj, "centerY", c.centerY);
        setInt(env, obj, "heavenLevel", c.heavenLevel);
        napi_set_element(env, clansArr, i, obj);
    }
    napi_set_named_property(env, result, "clans", clansArr);

    // --- Build buildings array ---
    napi_value bldArr;
    napi_create_array_with_length(env, world.buildings.size(), &bldArr);
    for (size_t i = 0; i < world.buildings.size(); i++) {
        napi_value obj;
        napi_create_object(env, &obj);
        const auto& b = world.buildings[i];
        setStr(env, obj, "id", b.id);
        setStr(env, obj, "kind", b.kind);
        setStr(env, obj, "clanId", b.clanId);
        setStr(env, obj, "country", b.country);
        setInt(env, obj, "worldX", b.worldX);
        setInt(env, obj, "worldY", b.worldY);
        setFloat(env, obj, "compoundWidth", b.compoundWidth);
        setFloat(env, obj, "compoundDepth", b.compoundDepth);
        setStr(env, obj, "label", b.label);
        setInt(env, obj, "level", static_cast<int32_t>(b.level));
        napi_set_element(env, bldArr, i, obj);
    }
    napi_set_named_property(env, result, "buildings", bldArr);

    // --- Build trees array ---
    napi_value treeArr;
    napi_create_array_with_length(env, world.trees.size(), &treeArr);
    for (size_t i = 0; i < world.trees.size(); i++) {
        napi_value obj;
        napi_create_object(env, &obj);
        const auto& t = world.trees[i];
        setInt(env, obj, "x", t.x);
        setInt(env, obj, "y", t.y);
        setFloat(env, obj, "scale", t.scale);
        setInt(env, obj, "variant", static_cast<int32_t>(t.variant));
        napi_set_element(env, treeArr, i, obj);
    }
    napi_set_named_property(env, result, "trees", treeArr);

    // --- Build resources array ---
    napi_value resArr;
    napi_create_array_with_length(env, world.resources.size(), &resArr);
    for (size_t i = 0; i < world.resources.size(); i++) {
        napi_value obj;
        napi_create_object(env, &obj);
        const auto& r = world.resources[i];
        setStr(env, obj, "id", r.id);
        setStr(env, obj, "type", r.type);
        setInt(env, obj, "amount", r.amount);
        setInt(env, obj, "posX", r.posX);
        setInt(env, obj, "posY", r.posY);
        napi_set_element(env, resArr, i, obj);
    }
    napi_set_named_property(env, result, "resources", resArr);

    return result;
}

// ============ getTerrainTile() ============
// JS signature: getTerrainTile(seed, x, y)
// Returns: { x, y, elevation, biome, hasTree, isRoad }
static napi_value GetTerrainTile(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value args[3];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    int64_t seed = 42;
    int32_t x = 0, y = 0;
    if (argc >= 1) napi_get_value_int64(env, args[0], &seed);
    if (argc >= 2) napi_get_value_int32(env, args[1], &x);
    if (argc >= 3) napi_get_value_int32(env, args[2], &y);

    WorldGen::WorldGenerator gen(static_cast<uint64_t>(seed), 600, 600);
    auto tile = gen.getTerrainTile(x, y);

    napi_value result;
    napi_create_object(env, &result);
    setInt(env, result, "x", tile.x);
    setInt(env, result, "y", tile.y);
    setFloat(env, result, "elevation", tile.elevation);
    setInt(env, result, "biome", static_cast<int32_t>(tile.biome));
    napi_value jsHasTree, jsIsRoad;
    napi_get_boolean(env, tile.hasTree, &jsHasTree);
    napi_set_named_property(env, result, "hasTree", jsHasTree);
    napi_get_boolean(env, tile.isRoad, &jsIsRoad);
    napi_set_named_property(env, result, "isRoad", jsIsRoad);
    return result;
}

// ============ computeOcclusion() ============
// JS signature: computeOcclusion(camX, camZ, playerX, playerY, viewRadius, buildings, trees)
// buildings: [{id, worldX, worldY, hw, hd}]   trees: [{worldX, worldY}]
// Returns: { buildingIds: string[], treeKeys: string[] }
static bool rayHitsAABB(float ox, float oz, float minX, float maxX, float minZ, float maxZ) {
    float dx = -ox;
    float dz = -oz;
    if (std::abs(dx) < 0.0001f && std::abs(dz) < 0.0001f) return false;

    float tMin = 0.0f, tMax = 1.0f;

    if (std::abs(dx) > 0.0001f) {
        float t1 = (minX - ox) / dx;
        float t2 = (maxX - ox) / dx;
        tMin = std::max(tMin, std::min(t1, t2));
        tMax = std::min(tMax, std::max(t1, t2));
    } else if (ox < minX || ox > maxX) {
        return false;
    }

    if (std::abs(dz) > 0.0001f) {
        float t1 = (minZ - oz) / dz;
        float t2 = (maxZ - oz) / dz;
        tMin = std::max(tMin, std::min(t1, t2));
        tMax = std::min(tMax, std::max(t1, t2));
    } else if (oz < minZ || oz > maxZ) {
        return false;
    }

    return tMin <= tMax && tMax >= 0;
}

static napi_value ComputeOcclusion(napi_env env, napi_callback_info info) {
    size_t argc = 7;
    napi_value args[7];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double camX = 0, camZ = 0, playerX = 0, playerY = 0, viewRadius = 30.0;
    if (argc >= 1) napi_get_value_double(env, args[0], &camX);
    if (argc >= 2) napi_get_value_double(env, args[1], &camZ);
    if (argc >= 3) napi_get_value_double(env, args[2], &playerX);
    if (argc >= 4) napi_get_value_double(env, args[3], &playerY);
    if (argc >= 5) napi_get_value_double(env, args[4], &viewRadius);

    float relPlayerX = static_cast<float>(playerX);
    float relPlayerY = static_cast<float>(playerY);
    // Camera position is already in player-relative Three.js coordinates (player at 0,0 in scene)
    float relCamX = static_cast<float>(camX);
    float relCamZ = static_cast<float>(camZ);
    float rad = static_cast<float>(viewRadius);

    // Buildings
    std::vector<std::string> occludedBuildingIds;
    if (argc >= 6) {
        uint32_t bldCount = 0;
        napi_get_array_length(env, args[5], &bldCount);
        for (uint32_t i = 0; i < bldCount; i++) {
            napi_value bld;
            napi_get_element(env, args[5], i, &bld);

            napi_value jsId, jsWX, jsWY, jsHW, jsHD;
            napi_get_named_property(env, bld, "id", &jsId);
            char idBuf[128];
            size_t idLen;
            napi_get_value_string_utf8(env, jsId, idBuf, sizeof(idBuf), &idLen);
            idBuf[idLen] = '\0';

            napi_get_named_property(env, bld, "worldX", &jsWX);
            napi_get_named_property(env, bld, "worldY", &jsWY);
            napi_get_named_property(env, bld, "hw", &jsHW);
            napi_get_named_property(env, bld, "hd", &jsHD);

            double wX, wY, hw, hd;
            napi_get_value_double(env, jsWX, &wX);
            napi_get_value_double(env, jsWY, &wY);
            napi_get_value_double(env, jsHW, &hw);
            napi_get_value_double(env, jsHD, &hd);

            float relX = static_cast<float>(wX) - relPlayerX;
            float relZ = static_cast<float>(wY) - relPlayerY;
            float dist = std::sqrt(relX * relX + relZ * relZ);
            if (dist > rad + static_cast<float>(hw)) {
                fprintf(stderr, "[CppOcclusion] BLD SKIP %s dist=%.1f > rad+hw=%.1f\n", idBuf, dist, rad + static_cast<float>(hw));
                continue;
            }
            fprintf(stderr, "[CppOcclusion] BLD TEST %s rel=(%.1f,%.1f) AABB=[%.0f..%.0f,%.0f..%.0f] cam=(%.1f,%.1f)\n",
                idBuf, relX, relZ,
                relX - static_cast<float>(hw), relX + static_cast<float>(hw),
                relZ - static_cast<float>(hd), relZ + static_cast<float>(hd),
                relCamX, relCamZ);

            if (rayHitsAABB(relCamX, relCamZ,
                            relX - static_cast<float>(hw), relX + static_cast<float>(hw),
                            relZ - static_cast<float>(hd), relZ + static_cast<float>(hd))) {
                fprintf(stderr, "[CppOcclusion] BLD HIT %s at (%.0f,%.0f)\n", idBuf, wX, wY);
                occludedBuildingIds.push_back(std::string(idBuf, idLen));
            } else {
                fprintf(stderr, "[CppOcclusion] BLD MISS %s\n", idBuf);
            }
        }
    }

    // Trees
    std::vector<std::string> occludedTreeKeys;
    if (argc >= 7) {
        uint32_t treeCount = 0;
        napi_get_array_length(env, args[6], &treeCount);
        for (uint32_t i = 0; i < treeCount; i++) {
            napi_value tree;
            napi_get_element(env, args[6], i, &tree);

            napi_value jsTWX, jsTWY;
            napi_get_named_property(env, tree, "worldX", &jsTWX);
            napi_get_named_property(env, tree, "worldY", &jsTWY);

            double wX, wY;
            napi_get_value_double(env, jsTWX, &wX);
            napi_get_value_double(env, jsTWY, &wY);

            float relX = static_cast<float>(wX) - relPlayerX;
            float relZ = static_cast<float>(wY) - relPlayerY;
            float dist = std::sqrt(relX * relX + relZ * relZ);
            if (dist > rad + 1.0f) continue;

            if (rayHitsAABB(relCamX, relCamZ, relX - 1.0f, relX + 1.0f, relZ - 1.0f, relZ + 1.0f)) {
                int tileX = static_cast<int>(std::round(static_cast<float>(wX)));
                int tileY = static_cast<int>(std::round(static_cast<float>(wY)));
                occludedTreeKeys.push_back("tree-" + std::to_string(tileX) + "," + std::to_string(tileY));
            }
        }
    }

    // Build result
    napi_value result;
    napi_create_object(env, &result);

    // buildingIds array
    napi_value bldIdArr;
    napi_create_array_with_length(env, occludedBuildingIds.size(), &bldIdArr);
    for (size_t i = 0; i < occludedBuildingIds.size(); i++) {
        napi_value jsStr;
        napi_create_string_utf8(env, occludedBuildingIds[i].c_str(), occludedBuildingIds[i].length(), &jsStr);
        napi_set_element(env, bldIdArr, i, jsStr);
    }
    napi_set_named_property(env, result, "buildingIds", bldIdArr);

    // treeKeys array
    napi_value treeKeyArr;
    napi_create_array_with_length(env, occludedTreeKeys.size(), &treeKeyArr);
    for (size_t i = 0; i < occludedTreeKeys.size(); i++) {
        napi_value jsStr;
        napi_create_string_utf8(env, occludedTreeKeys[i].c_str(), occludedTreeKeys[i].length(), &jsStr);
        napi_set_element(env, treeKeyArr, i, jsStr);
    }
    napi_set_named_property(env, result, "treeKeys", treeKeyArr);

    return result;
}

// ============ Addon Init ============
static napi_value Init(napi_env env, napi_value exports) {
    napi_value fn_gen, fn_tile, fn_occl;

    napi_create_function(env, "generateWorld", NAPI_AUTO_LENGTH, GenerateWorld, nullptr, &fn_gen);
    napi_set_named_property(env, exports, "generateWorld", fn_gen);

    napi_create_function(env, "getTerrainTile", NAPI_AUTO_LENGTH, GetTerrainTile, nullptr, &fn_tile);
    napi_set_named_property(env, exports, "getTerrainTile", fn_tile);

    napi_create_function(env, "computeOcclusion", NAPI_AUTO_LENGTH, ComputeOcclusion, nullptr, &fn_occl);
    napi_set_named_property(env, exports, "computeOcclusion", fn_occl);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
