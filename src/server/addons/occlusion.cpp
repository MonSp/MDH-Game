#include <node_api.h>
#include <cmath>
#include <cstring>
#include <string>
#include <vector>

static constexpr float PLAYER_HEAD_Y   = 1.7f;
static constexpr float PLAYER_TORSO_Y  = 1.1f;
static constexpr float PLAYER_FEET_Y   = 0.1f;
static constexpr float TREE_HEIGHT     = 4.0f;
static constexpr float TREE_RADIUS     = 1.0f;

static bool rayHits3DCylinder(
    float ox, float oy, float oz,
    float tx, float ty, float tz,
    float cx, float cz, float radius, float cyMin, float cyMax)
{
    float dx = tx - ox;
    float dy = ty - oy;
    float dz = tz - oz;

    float ax = ox - cx;
    float az = oz - cz;

    float a = dx * dx + dz * dz;

    if (a < 0.0001f) {
        float dist2 = ax * ax + az * az;
        if (dist2 > radius * radius) return false;
        float segYMin = std::min(oy, ty);
        float segYMax = std::max(oy, ty);
        return segYMin <= cyMax && segYMax >= cyMin;
    }

    float b = ax * dx + az * dz;
    float c = ax * ax + az * az - radius * radius;

    float disc = b * b - a * c;
    if (disc < 0.0f) return false;

    float sqrtD = std::sqrt(disc);
    float t1 = (-b - sqrtD) / a;
    float t2 = (-b + sqrtD) / a;
    if (t1 > t2) std::swap(t1, t2);

    float segYMin = std::min(oy, ty);
    float segYMax = std::max(oy, ty);

    if (t1 >= 0.0f && t1 <= 1.0f) {
        float yHit = oy + t1 * dy;
        if (yHit >= cyMin && yHit <= cyMax) return true;
    }
    if (t2 >= 0.0f && t2 <= 1.0f) {
        float yHit = oy + t2 * dy;
        if (yHit >= cyMin && yHit <= cyMax) return true;
    }

    if (t1 < 0.0f && t2 > 1.0f) {
        return segYMin <= cyMax && segYMax >= cyMin;
    }

    return false;
}

napi_value ComputeOcclusion(napi_env env, napi_callback_info info) {
    size_t argc = 8;
    napi_value args[8];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double camX = 0, camZ = 0, camY = 25.0;
    double playerX = 0, playerZ = 0, viewRadius = 30.0;
    if (argc >= 1) napi_get_value_double(env, args[0], &camX);
    if (argc >= 2) napi_get_value_double(env, args[1], &camZ);
    if (argc >= 3) napi_get_value_double(env, args[2], &camY);
    if (argc >= 4) napi_get_value_double(env, args[3], &playerX);
    if (argc >= 5) napi_get_value_double(env, args[4], &playerZ);
    if (argc >= 6) napi_get_value_double(env, args[5], &viewRadius);

    float fCamX = static_cast<float>(camX);
    float fCamY = static_cast<float>(camY);
    float fCamZ = static_cast<float>(camZ);
    float fPlayerX = static_cast<float>(playerX);
    float fPlayerZ = static_cast<float>(playerZ);
    float fRad = static_cast<float>(viewRadius);

    const float playerBodyY[3] = { PLAYER_HEAD_Y, PLAYER_TORSO_Y, PLAYER_FEET_Y };

    auto anyRayHitsBuilding = [&](float bx, float bz, float bw, float bd, float bh) -> bool {
        float bRadius = std::sqrt(bw * bw + bd * bd);
        for (int pi = 0; pi < 3; pi++) {
            float ty = playerBodyY[pi];
            if (!rayHits3DCylinder(fCamX, fCamY, fCamZ,
                                   fPlayerX, ty, fPlayerZ,
                                   bx, bz, bRadius, 0.0f, bh)) {
                return false;
            }
        }
        return true;
    };

    auto anyRayHitsTree = [&](float tx, float tz) -> bool {
        for (int pi = 0; pi < 3; pi++) {
            float ty = playerBodyY[pi];
            if (!rayHits3DCylinder(fCamX, fCamY, fCamZ,
                                   fPlayerX, ty, fPlayerZ,
                                   tx, tz, TREE_RADIUS, 0.0f, TREE_HEIGHT)) {
                return false;
            }
        }
        return true;
    };

    std::vector<std::string> occludedBuildingIds;
    if (argc >= 7) {
        uint32_t bldCount = 0;
        napi_get_array_length(env, args[6], &bldCount);
        for (uint32_t i = 0; i < bldCount; i++) {
            napi_value bld;
            napi_get_element(env, args[6], i, &bld);

            napi_value jsId, jsWX, jsWY, jsHW, jsHD, jsH;
            napi_get_named_property(env, bld, "id", &jsId);
            char idBuf[128];
            size_t idLen;
            napi_get_value_string_utf8(env, jsId, idBuf, sizeof(idBuf), &idLen);
            idBuf[idLen] = '\0';

            napi_get_named_property(env, bld, "worldX", &jsWX);
            napi_get_named_property(env, bld, "worldY", &jsWY);
            napi_get_named_property(env, bld, "hw", &jsHW);
            napi_get_named_property(env, bld, "hd", &jsHD);
            napi_get_named_property(env, bld, "height", &jsH);

            double wX, wY, hw, hd, height;
            napi_get_value_double(env, jsWX, &wX);
            napi_get_value_double(env, jsWY, &wY);
            napi_get_value_double(env, jsHW, &hw);
            napi_get_value_double(env, jsHD, &hd);
            napi_get_value_double(env, jsH, &height);

            float fWX = static_cast<float>(wX);
            float fWY = static_cast<float>(wY);
            float fHW = static_cast<float>(hw);
            float fHD = static_cast<float>(hd);
            float fH = static_cast<float>(height);

            float dx = fWX - fPlayerX;
            float dz = fWY - fPlayerZ;
            float bldRadius = std::sqrt(fHW * fHW + fHD * fHD);
            float distToBld = std::sqrt(dx * dx + dz * dz);
            if (distToBld > fRad + bldRadius + 5.0f) continue;

            if (anyRayHitsBuilding(fWX, fWY, fHW, fHD, fH)) {
                occludedBuildingIds.push_back(std::string(idBuf, idLen));
            }
        }
    }

    std::vector<std::string> occludedTreeKeys;
    if (argc >= 8) {
        uint32_t treeCount = 0;
        napi_get_array_length(env, args[7], &treeCount);
        for (uint32_t i = 0; i < treeCount; i++) {
            napi_value tree;
            napi_get_element(env, args[7], i, &tree);

            napi_value jsTWX, jsTWY;
            napi_get_named_property(env, tree, "worldX", &jsTWX);
            napi_get_named_property(env, tree, "worldY", &jsTWY);

            double wX, wY;
            napi_get_value_double(env, jsTWX, &wX);
            napi_get_value_double(env, jsTWY, &wY);

            float fWX = static_cast<float>(wX);
            float fWY = static_cast<float>(wY);
            float dx = fWX - fPlayerX;
            float dz = fWY - fPlayerZ;
            float dist = std::sqrt(dx * dx + dz * dz);
            if (dist > fRad + TREE_RADIUS + 2.0f) continue;

            if (anyRayHitsTree(fWX, fWY)) {
                int tileX = static_cast<int>(std::round(fWX));
                int tileY = static_cast<int>(std::round(fWY));
                occludedTreeKeys.push_back("tree-" + std::to_string(tileX) + "," + std::to_string(tileY));
            }
        }
    }

    napi_value result;
    napi_create_object(env, &result);

    napi_value bldIdArr;
    napi_create_array_with_length(env, occludedBuildingIds.size(), &bldIdArr);
    for (size_t i = 0; i < occludedBuildingIds.size(); i++) {
        napi_value jsStr;
        napi_create_string_utf8(env, occludedBuildingIds[i].c_str(), occludedBuildingIds[i].length(), &jsStr);
        napi_set_element(env, bldIdArr, i, jsStr);
    }
    napi_set_named_property(env, result, "buildingIds", bldIdArr);

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
