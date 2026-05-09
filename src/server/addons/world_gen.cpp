#include <node_api.h>
#include <string>
#include <vector>
#include "game/world/WorldGenerator.h"
#include "occlusion.h"

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
        setFloat(env, obj, "height", b.height);
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
