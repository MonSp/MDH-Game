#include <node_api.h>
#include <cmath>
#include <cstring>
#include <string>
#include <vector>
#include <algorithm>

static constexpr int   BUFFER_W        = 256;
static constexpr int   BUFFER_H        = 128;
static constexpr float DEFAULT_FOV_Y   = 1.047197551f;
static constexpr float DEFAULT_NEAR    = 0.5f;
static constexpr float DEFAULT_FAR     = 200.0f;
static constexpr float DEFAULT_ASPECT  = 1.777777778f;

static constexpr float PLAYER_HEAD_Y   = 1.7f;
static constexpr float PLAYER_CHEST_Y  = 1.1f;
static constexpr float PLAYER_FEET_Y   = 0.1f;
static constexpr float TREE_HEIGHT     = 4.0f;
static constexpr float TREE_RADIUS     = 1.0f;
static constexpr float MIN_OCCLUDER_HEIGHT = 2.0f;

float gDepthBuffer[BUFFER_H][BUFFER_W];

struct CameraParams {
    float camX, camY, camZ;
    float rightX, rightY, rightZ;
    float upX, upY, upZ;
    float lookX, lookY, lookZ;
    float fovY, aspect, nearPlane, farPlane;
    float tanHalfFovY, hFactor, depthScale, depthBias;
};

struct ProjectedVertex {
    float px, py;
    float depth;
    bool  behind;
};

struct Triangle {
    float v0x, v0y, v0z;
    float v1x, v1y, v1z;
    float v2x, v2y, v2z;
};

static void clearDepthBuffer() {
    for (int y = 0; y < BUFFER_H; y++) {
        for (int x = 0; x < BUFFER_W; x++) {
            gDepthBuffer[y][x] = 1.0f;
        }
    }
}

static CameraParams makeCameraParams(
    float camX, float camY, float camZ,
    float playerX, float playerZ,
    float fovY, float aspect, float nearPlane, float farPlane)
{
    CameraParams cp;
    cp.camX      = camX;
    cp.camY      = camY;
    cp.camZ      = camZ;

    float lx = playerX - camX;
    float ly = (PLAYER_HEAD_Y + PLAYER_FEET_Y) * 0.5f - camY;
    float lz = playerZ - camZ;
    float len = std::sqrt(lx * lx + ly * ly + lz * lz);
    if (len > 0.0001f) {
        cp.lookX = lx / len;
        cp.lookY = ly / len;
        cp.lookZ = lz / len;
    } else {
        cp.lookX = 0.0f; cp.lookY = 0.0f; cp.lookZ = -1.0f;
    }

    float rx = cp.lookY * 0.0f - cp.lookZ * 1.0f;
    float ry = cp.lookZ * 0.0f - cp.lookX * 0.0f;
    float rz = cp.lookX * 1.0f - cp.lookY * 0.0f;
    len = std::sqrt(rx * rx + ry * ry + rz * rz);
    if (len > 0.0001f) {
        cp.rightX = rx / len;
        cp.rightY = ry / len;
        cp.rightZ = rz / len;
    } else {
        cp.rightX = 1.0f; cp.rightY = 0.0f; cp.rightZ = 0.0f;
    }

    cp.upX = cp.rightY * cp.lookZ - cp.rightZ * cp.lookY;
    cp.upY = cp.rightZ * cp.lookX - cp.rightX * cp.lookZ;
    cp.upZ = cp.rightX * cp.lookY - cp.rightY * cp.lookX;

    cp.fovY      = fovY;
    cp.aspect    = aspect;
    cp.nearPlane = nearPlane;
    cp.farPlane  = farPlane;
    cp.tanHalfFovY = std::tan(fovY * 0.5f);
    cp.hFactor      = cp.tanHalfFovY * aspect;
    cp.depthScale   = 1.0f / (farPlane - nearPlane);
    cp.depthBias    = -nearPlane / (farPlane - nearPlane);
    return cp;
}

static ProjectedVertex projectVertex(float wx, float wy, float wz, const CameraParams& cp) {
    ProjectedVertex pv;
    float dx = wx - cp.camX;
    float dy = wy - cp.camY;
    float dz = wz - cp.camZ;

    float cx = cp.rightX * dx + cp.rightY * dy + cp.rightZ * dz;
    float cy = cp.upX * dx + cp.upY * dy + cp.upZ * dz;
    float cz = cp.lookX * dx + cp.lookY * dy + cp.lookZ * dz;

    if (cz <= 0.0f) {
        pv.behind = true;
        return pv;
    }
    pv.behind = false;

    float h = cp.tanHalfFovY * cz;
    float w = h * cp.aspect;
    float sx = (cx / w) * 0.5f + 0.5f;
    float sy = (-cy / h) * 0.5f + 0.5f;

    float depth = cz * cp.depthScale + cp.depthBias;
    if (depth < 0.0f) depth = 0.0f;
    if (depth > 1.0f) depth = 1.0f;

    pv.px    = sx * BUFFER_W;
    pv.py    = sy * BUFFER_H;
    pv.depth = depth;
    return pv;
}

static bool backfaceCull(const Triangle& tri, const CameraParams& cp) {
    float cx = (tri.v0x + tri.v1x + tri.v2x) / 3.0f;
    float cy = (tri.v0y + tri.v1y + tri.v2y) / 3.0f;
    float cz = (tri.v0z + tri.v1z + tri.v2z) / 3.0f;

    float viewX = cp.camX - cx;
    float viewY = cp.camY - cy;
    float viewZ = cp.camZ - cz;

    float ux = tri.v1x - tri.v0x;
    float uy = tri.v1y - tri.v0y;
    float uz = tri.v1z - tri.v0z;
    float vx = tri.v2x - tri.v0x;
    float vy = tri.v2y - tri.v0y;
    float vz = tri.v2z - tri.v0z;

    float nx = uy * vz - uz * vy;
    float ny = uz * vx - ux * vz;
    float nz = ux * vy - uy * vx;

    return (nx * viewX + ny * viewY + nz * viewZ) >= 0.0f;
}

static float edgeFunction(float ax, float ay, float bx, float by, float px, float py) {
    return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

static void rasterizeTriangle(const Triangle& tri, const CameraParams& cp) {
    ProjectedVertex pv0 = projectVertex(tri.v0x, tri.v0y, tri.v0z, cp);
    ProjectedVertex pv1 = projectVertex(tri.v1x, tri.v1y, tri.v1z, cp);
    ProjectedVertex pv2 = projectVertex(tri.v2x, tri.v2y, tri.v2z, cp);
    if (pv0.behind || pv1.behind || pv2.behind) return;

    int minX = static_cast<int>(std::min({ pv0.px, pv1.px, pv2.px }));
    int maxX = static_cast<int>(std::max({ pv0.px, pv1.px, pv2.px }));
    int minY = static_cast<int>(std::min({ pv0.py, pv1.py, pv2.py }));
    int maxY = static_cast<int>(std::max({ pv0.py, pv1.py, pv2.py }));

    if (minX < 0) minX = 0;
    if (maxX >= BUFFER_W) maxX = BUFFER_W - 1;
    if (minY < 0) minY = 0;
    if (maxY >= BUFFER_H) maxY = BUFFER_H - 1;
    if (minX > maxX || minY > maxY) return;

    float area = edgeFunction(pv0.px, pv0.py, pv1.px, pv1.py, pv2.px, pv2.py);
    if (std::fabs(area) < 0.0001f) return;
    float invArea = 1.0f / area;

    for (int y = minY; y <= maxY; y++) {
        float py = y + 0.5f;
        for (int x = minX; x <= maxX; x++) {
            float px = x + 0.5f;

            float w0 = edgeFunction(pv1.px, pv1.py, pv2.px, pv2.py, px, py);
            float w1 = edgeFunction(pv2.px, pv2.py, pv0.px, pv0.py, px, py);
            float w2 = edgeFunction(pv0.px, pv0.py, pv1.px, pv1.py, px, py);

            if ((w0 < 0.0f && w1 < 0.0f && w2 < 0.0f) ||
                (w0 > 0.0f && w1 > 0.0f && w2 > 0.0f)) {
                w0 *= invArea;
                w1 *= invArea;
                w2 *= invArea;
                float interpDepth = w0 * pv0.depth + w1 * pv1.depth + w2 * pv2.depth;
                if (interpDepth < gDepthBuffer[y][x]) {
                    gDepthBuffer[y][x] = interpDepth;
                }
            }
        }
    }
}

static int rasterizeTriangles(const std::vector<Triangle>& tris, const CameraParams& cp) {
    int count = 0;
    for (size_t i = 0; i < tris.size(); i++) {
        if (!backfaceCull(tris[i], cp)) {
            rasterizeTriangle(tris[i], cp);
            count++;
        }
    }
    return count;
}

static void addQuadToTriangles(std::vector<Triangle>& out,
    float x0, float y0, float z0,
    float x1, float y1, float z1,
    float x2, float y2, float z2,
    float x3, float y3, float z3)
{
    out.push_back({ x0, y0, z0, x1, y1, z1, x2, y2, z2 });
    out.push_back({ x0, y0, z0, x2, y2, z2, x3, y3, z3 });
}

static std::vector<Triangle> generateTrianglesFromVoxels(
    const std::vector<std::vector<std::vector<bool>>>& solid,
    int sizeX, int sizeY, int sizeZ,
    float voxelSize, float originX, float originY, float originZ)
{
    std::vector<Triangle> tris;

    auto isSolid = [&](int x, int y, int z) -> bool {
        if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) return false;
        return solid[x][y][z];
    };

    for (int x = 0; x < sizeX; x++) {
        for (int y = 0; y < sizeY; y++) {
            for (int z = 0; z < sizeZ; z++) {
                if (!solid[x][y][z]) continue;

                float bx0 = originX + x * voxelSize;
                float bx1 = bx0 + voxelSize;
                float by0 = originY + y * voxelSize;
                float by1 = by0 + voxelSize;
                float bz0 = originZ + z * voxelSize;
                float bz1 = bz0 + voxelSize;

                if (!isSolid(x - 1, y, z)) {
                    addQuadToTriangles(tris,
                        bx0, by0, bz0, bx0, by1, bz0,
                        bx0, by1, bz1, bx0, by0, bz1);
                }
                if (!isSolid(x + 1, y, z)) {
                    addQuadToTriangles(tris,
                        bx1, by0, bz1, bx1, by1, bz1,
                        bx1, by1, bz0, bx1, by0, bz0);
                }

                if (!isSolid(x, y - 1, z)) {
                    addQuadToTriangles(tris,
                        bx0, by0, bz1, bx1, by0, bz1,
                        bx1, by0, bz0, bx0, by0, bz0);
                }
                if (!isSolid(x, y + 1, z)) {
                    addQuadToTriangles(tris,
                        bx0, by1, bz0, bx1, by1, bz0,
                        bx1, by1, bz1, bx0, by1, bz1);
                }

                if (!isSolid(x, y, z - 1)) {
                    addQuadToTriangles(tris,
                        bx0, by0, bz0, bx1, by0, bz0,
                        bx1, by1, bz0, bx0, by1, bz0);
                }
                if (!isSolid(x, y, z + 1)) {
                    addQuadToTriangles(tris,
                        bx0, by0, bz1, bx0, by1, bz1,
                        bx1, by1, bz1, bx1, by0, bz1);
                }
            }
        }
    }

    return tris;
}

static std::vector<Triangle> generateTrianglesFromBox(float hw, float hd, float height, float originX, float originY, float originZ) {
    std::vector<Triangle> tris;
    float x0 = originX - hw, x1 = originX + hw;
    float z0 = originZ - hd, z1 = originZ + hd;
    float y0 = originY, y1 = originY + height;

    addQuadToTriangles(tris, x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);

    addQuadToTriangles(tris, x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0);

    addQuadToTriangles(tris, x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1);
    addQuadToTriangles(tris, x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0);

    addQuadToTriangles(tris, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
    addQuadToTriangles(tris, x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);

    return tris;
}

static std::vector<Triangle> generateCompoundTriangles(float hw, float hd, float height, float originX, float originY, float originZ) {
    std::vector<Triangle> tris;
    float x0 = originX - hw, x1 = originX + hw;
    float z0 = originZ - hd, z1 = originZ + hd;
    float y0 = originY, y1 = originY + height;

    addQuadToTriangles(tris, x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0);
    addQuadToTriangles(tris, x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1);
    addQuadToTriangles(tris, x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1);
    addQuadToTriangles(tris, x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0);

    return tris;
}

struct AABB {
    float minX, minY, minZ;
    float maxX, maxY, maxZ;
};

struct AABBProjection {
    int    minX, minY, maxX, maxY;
    float  nearestDepth;
    bool   valid;
};

static AABBProjection projectAABB(const AABB& box, const CameraParams& cp) {
    AABBProjection proj;
    proj.valid  = true;
    proj.minX   = BUFFER_W;
    proj.minY   = BUFFER_H;
    proj.maxX   = -1;
    proj.maxY   = -1;
    proj.nearestDepth = 1.0f;

    float corners[8][3] = {
        { box.minX, box.minY, box.minZ }, { box.maxX, box.minY, box.minZ },
        { box.minX, box.maxY, box.minZ }, { box.maxX, box.maxY, box.minZ },
        { box.minX, box.minY, box.maxZ }, { box.maxX, box.minY, box.maxZ },
        { box.minX, box.maxY, box.maxZ }, { box.maxX, box.maxY, box.maxZ },
    };

    for (int i = 0; i < 8; i++) {
        ProjectedVertex pv = projectVertex(corners[i][0], corners[i][1], corners[i][2], cp);
        if (pv.behind) {
            proj.valid = false;
            return proj;
        }
        int ix = static_cast<int>(pv.px);
        int iy = static_cast<int>(pv.py);
        if (ix < 0) ix = 0;
        if (ix >= BUFFER_W) ix = BUFFER_W - 1;
        if (iy < 0) iy = 0;
        if (iy >= BUFFER_H) iy = BUFFER_H - 1;
        if (ix < proj.minX) proj.minX = ix;
        if (ix > proj.maxX) proj.maxX = ix;
        if (iy < proj.minY) proj.minY = iy;
        if (iy > proj.maxY) proj.maxY = iy;
        if (pv.depth < proj.nearestDepth) proj.nearestDepth = pv.depth;
    }

    if (proj.minX > proj.maxX || proj.minY > proj.maxY) {
        proj.valid = false;
    }
    return proj;
}

static bool isAABBOccluded(const AABB& box, const CameraParams& cp) {
    AABBProjection proj = projectAABB(box, cp);
    if (!proj.valid) return false;

    for (int y = proj.minY; y <= proj.maxY; y++) {
        for (int x = proj.minX; x <= proj.maxX; x++) {
            if (gDepthBuffer[y][x] > proj.nearestDepth) {
                return false;
            }
        }
    }
    return true;
}

static bool pointInsideVoxels(
    float px, float py, float pz,
    const std::vector<std::vector<std::vector<bool>>>& solid,
    int sizeX, int sizeY, int sizeZ,
    float voxelSize, float originX, float originY, float originZ)
{
    int ix = static_cast<int>((px - originX) / voxelSize);
    int iy = static_cast<int>((py - originY) / voxelSize);
    int iz = static_cast<int>((pz - originZ) / voxelSize);
    if (ix < 0 || ix >= sizeX || iy < 0 || iy >= sizeY || iz < 0 || iz >= sizeZ) return false;
    return solid[ix][iy][iz];
}

napi_value ComputeOcclusion(napi_env env, napi_callback_info info) {
    size_t argc = 12;
    napi_value args[12];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double camX = 0, camZ = 0, camY = 25.0;
    double playerWorldX = 0, playerWorldZ = 0;
    double viewRadius = 30.0;
    double fovY  = DEFAULT_FOV_Y;
    double nearP = DEFAULT_NEAR;
    double farP  = DEFAULT_FAR;
    double aspect = DEFAULT_ASPECT;

    if (argc >= 1) napi_get_value_double(env, args[0], &camX);
    if (argc >= 2) napi_get_value_double(env, args[1], &camZ);
    if (argc >= 3) napi_get_value_double(env, args[2], &camY);
    if (argc >= 4) napi_get_value_double(env, args[3], &playerWorldX);
    if (argc >= 5) napi_get_value_double(env, args[4], &playerWorldZ);
    if (argc >= 6) napi_get_value_double(env, args[5], &viewRadius);

    bool newConvention = (argc >= 11);
    if (newConvention) {
        if (argc >= 7)  napi_get_value_double(env, args[6],  &fovY);
        if (argc >= 8)  napi_get_value_double(env, args[7],  &nearP);
        if (argc >= 9)  napi_get_value_double(env, args[8],  &farP);
        if (argc >= 10) napi_get_value_double(env, args[9],  &aspect);
    }

    float fCamX = static_cast<float>(camX);
    float fCamY = static_cast<float>(camY);
    float fCamZ = static_cast<float>(camZ);
    float fRelPlayerX = static_cast<float>(playerWorldX);
    float fRelPlayerZ = static_cast<float>(playerWorldZ);
    float fRad   = static_cast<float>(viewRadius);

    fCamX += fRelPlayerX;
    fCamZ += fRelPlayerZ;

    CameraParams cp = makeCameraParams(
        fCamX, fCamY, fCamZ,
        fRelPlayerX, fRelPlayerZ,
        static_cast<float>(fovY),
        static_cast<float>(aspect),
        static_cast<float>(nearP),
        static_cast<float>(farP));

    clearDepthBuffer();

    struct BuildingGeom {
        std::vector<Triangle> tris;
        float height;
        float bldRadius;
        float halfWidth;
        float halfDepth;
        bool  hasSolid;
        std::vector<std::vector<std::vector<bool>>> solid;
        int   solidSizeX, solidSizeY, solidSizeZ;
        float voxelSize;
        float originX, originY, originZ;
    };

    std::vector<std::string> buildingIds;
    std::vector<BuildingGeom> buildingGeoms;

    int buildingsIdx = newConvention ? 10 : 6;
    int treesIdx     = newConvention ? 11 : 7;

    if (argc > static_cast<size_t>(buildingsIdx)) {
        napi_value bldArr = args[buildingsIdx];
        bool isArr = false;
        napi_is_array(env, bldArr, &isArr);
        if (isArr) {
            uint32_t bldCount = 0;
            napi_get_array_length(env, bldArr, &bldCount);

            for (uint32_t i = 0; i < bldCount; i++) {
                napi_value bld;
                napi_get_element(env, bldArr, i, &bld);

                napi_value jsId;
                napi_get_named_property(env, bld, "id", &jsId);
                char idBuf[128];
                size_t idLen;
                napi_get_value_string_utf8(env, jsId, idBuf, sizeof(idBuf), &idLen);
                idBuf[idLen] = '\0';
                buildingIds.push_back(std::string(idBuf, idLen));

                BuildingGeom geom;
                geom.hasSolid = false;

                napi_value jsSolid;
                napi_get_named_property(env, bld, "solid", &jsSolid);
                bool hasSolidArr = false;
                napi_is_array(env, jsSolid, &hasSolidArr);

                if (hasSolidArr) {
                    napi_value jsVoxelSize;
                    napi_get_named_property(env, bld, "voxelSize", &jsVoxelSize);
                    double vxSize = 1.0;
                    napi_get_value_double(env, jsVoxelSize, &vxSize);
                    geom.voxelSize = static_cast<float>(vxSize);

                    napi_value jsWX, jsWY;
                    napi_get_named_property(env, bld, "worldX", &jsWX);
                    napi_get_named_property(env, bld, "worldY", &jsWY);
                    double wX = 0, wY = 0, wZ = 0;
                    napi_get_value_double(env, jsWX, &wX);
                    napi_get_value_double(env, jsWY, &wY);
                    napi_value jsOriginZ;
                    napi_status zStat = napi_get_named_property(env, bld, "worldZ", &jsOriginZ);
                    if (zStat == napi_ok) napi_get_value_double(env, jsOriginZ, &wZ);
                    geom.originX = static_cast<float>(wX);
                    geom.originY = static_cast<float>(wZ);
                    geom.originZ = static_cast<float>(wY);

                    uint32_t sx = 0;
                    napi_get_array_length(env, jsSolid, &sx);
                    geom.solidSizeX = static_cast<int>(sx);
                    geom.solidSizeY = 0;
                    geom.solidSizeZ = 0;

                    geom.solid.resize(sx);
                    for (uint32_t ix = 0; ix < sx; ix++) {
                        napi_value layerY;
                        napi_get_element(env, jsSolid, ix, &layerY);
                        uint32_t sy = 0;
                        napi_get_array_length(env, layerY, &sy);
                        if (geom.solidSizeY == 0) geom.solidSizeY = static_cast<int>(sy);

                        geom.solid[ix].resize(sy);
                        for (uint32_t iy = 0; iy < sy; iy++) {
                            napi_value layerZ;
                            napi_get_element(env, layerY, iy, &layerZ);
                            uint32_t sz = 0;
                            napi_get_array_length(env, layerZ, &sz);
                            if (geom.solidSizeZ == 0) geom.solidSizeZ = static_cast<int>(sz);

                            geom.solid[ix][iy].resize(sz);
                            for (uint32_t iz = 0; iz < sz; iz++) {
                                napi_value elem;
                                napi_get_element(env, layerZ, iz, &elem);
                                bool val = false;
                                napi_get_value_bool(env, elem, &val);
                                geom.solid[ix][iy][iz] = val;
                            }
                        }
                    }

                    geom.tris = generateTrianglesFromVoxels(
                        geom.solid,
                        geom.solidSizeX, geom.solidSizeY, geom.solidSizeZ,
                        geom.voxelSize,
                        geom.originX, geom.originY, geom.originZ);

                    geom.height = static_cast<float>(geom.solidSizeY) * geom.voxelSize;
                    float hx = static_cast<float>(geom.solidSizeX) * geom.voxelSize * 0.5f;
                    float hz = static_cast<float>(geom.solidSizeZ) * geom.voxelSize * 0.5f;
                    geom.bldRadius = std::sqrt(hx * hx + hz * hz);
                    geom.halfWidth = hx;
                    geom.halfDepth = hz;
                    geom.hasSolid = true;
                } else {
                    napi_value jsHW, jsHD, jsH, jsWX, jsWY;
                    napi_get_named_property(env, bld, "hw", &jsHW);
                    napi_get_named_property(env, bld, "hd", &jsHD);
                    napi_get_named_property(env, bld, "height", &jsH);
                    napi_get_named_property(env, bld, "worldX", &jsWX);
                    napi_get_named_property(env, bld, "worldY", &jsWY);

                    double hw = 0, hd = 0, height = 0, wX = 0, wY = 0;
                    napi_get_value_double(env, jsHW, &hw);
                    napi_get_value_double(env, jsHD, &hd);
                    napi_get_value_double(env, jsH, &height);
                    napi_get_value_double(env, jsWX, &wX);
                    napi_get_value_double(env, jsWY, &wY);

                    geom.height  = static_cast<float>(height);
                    geom.originX = static_cast<float>(wX);
                    geom.originY = 0.0f;
                    geom.originZ = static_cast<float>(wY);
                    float fHW = static_cast<float>(hw);
                    float fHD = static_cast<float>(hd);
                    geom.bldRadius = std::sqrt(fHW * fHW + fHD * fHD);
                    geom.halfWidth = fHW;
                    geom.halfDepth = fHD;

                    bool isCompound = (geom.height < std::min(fHW, fHD) * 0.5f);
                    if (isCompound) {
                        geom.tris = generateCompoundTriangles(
                            fHW, fHD, geom.height,
                            geom.originX, geom.originY, geom.originZ);
                    } else {
                        geom.tris = generateTrianglesFromBox(
                            fHW, fHD, geom.height,
                            geom.originX, geom.originY, geom.originZ);
                    }
                }

                buildingGeoms.push_back(std::move(geom));
            }
        }
    }

    char debugBuf[4096];
    int debugLen = 0;

    int totalBld = static_cast<int>(buildingGeoms.size());
    int passHeight = 0;
    int passDist = 0;
    int passRange = 0;
    int totalTrisRasterized = 0;
    for (size_t i = 0; i < buildingGeoms.size(); i++) {
        const auto& geom = buildingGeoms[i];
        if (geom.height <= MIN_OCCLUDER_HEIGHT) continue;
        passHeight++;

        float dx = geom.originX - fRelPlayerX;
        float dz = geom.originZ - fRelPlayerZ;
        float dist = std::sqrt(dx * dx + dz * dz);
        if (dist > static_cast<float>(farP) + 10.0f) continue;
        passDist++;

        if (dist > fRad + geom.bldRadius + 5.0f) continue;
        passRange++;

        totalTrisRasterized += rasterizeTriangles(geom.tris, cp);
    }
    debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
            "totalBld=%d passH=%d passD=%d passR=%d tris=%d camW=(%.1f,%.1f) plW=(%.1f,%.1f) r=%.1f | ",
            totalBld, passHeight, passDist, passRange, totalTrisRasterized,
            fCamX, fCamZ, fRelPlayerX, fRelPlayerZ, fRad);

    if (passRange > 0 && !buildingGeoms.empty()) {
        int shown = 0;
        for (size_t i = 0; i < buildingGeoms.size() && shown < 8; i++) {
            const auto& geom = buildingGeoms[i];
            if (geom.height <= MIN_OCCLUDER_HEIGHT) continue;
            float dx = geom.originX - fRelPlayerX;
            float dz = geom.originZ - fRelPlayerZ;
            float dist = std::sqrt(dx * dx + dz * dz);
            if (dist > fRad + geom.bldRadius + 5.0f) continue;
            if (shown > 0) debugBuf[debugLen++] = ';';
            debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
                    "%s d=%.1f h=%.1f tri=%zu",
                    buildingIds[i].c_str(), dist, geom.height, geom.tris.size());
            shown++;
        }
        if (shown > 0) debugBuf[debugLen++] = ' ';
    } else if (passRange == 0 && !buildingGeoms.empty()) {
        debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen, "NO_RANGE: ");
        int samples = 0;
        for (size_t i = 0; i < buildingGeoms.size() && samples < 5; i++) {
            const auto& geom = buildingGeoms[i];
            float dx = geom.originX - fRelPlayerX;
            float dz = geom.originZ - fRelPlayerZ;
            float dist = std::sqrt(dx * dx + dz * dz);
            if (geom.height > MIN_OCCLUDER_HEIGHT) {
                debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
                        "%s d=%.1f r=%.1f h=%.1f; ", buildingIds[i].c_str(), dist, geom.bldRadius, geom.height);
                samples++;
            }
        }
        if (samples == 0) {
            for (size_t i = 0; i < buildingGeoms.size() && i < 5; i++) {
                const auto& geom = buildingGeoms[i];
                debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
                        "%s h=%.1f(<=%.1f); ", buildingIds[i].c_str(), geom.height, MIN_OCCLUDER_HEIGHT);
            }
        }
    }

    float playerSampleYs[2] = {PLAYER_HEAD_Y, PLAYER_FEET_Y};
    float playerSamplePx[2], playerSamplePy[2], playerSampleDp[2];
    bool playerSampleInside[2] = {true, true};

    for (int si = 0; si < 2; si++) {
        ProjectedVertex pv = projectVertex(fRelPlayerX, playerSampleYs[si], fRelPlayerZ, cp);
        playerSamplePx[si] = pv.px;
        playerSamplePy[si] = pv.py;
        playerSampleDp[si] = pv.depth;
        if (pv.behind) {
            playerSampleInside[si] = false;
            continue;
        }
        int sx = static_cast<int>(pv.px);
        int sy = static_cast<int>(pv.py);
        if (sx < 0 || sx >= BUFFER_W || sy < 0 || sy >= BUFFER_H) {
            playerSampleInside[si] = false;
        }
    }

    bool playerVisibleByDB = false;
    for (int si = 0; si < 2 && !playerVisibleByDB; si++) {
        if (!playerSampleInside[si]) continue;
        int sx = static_cast<int>(playerSamplePx[si]);
        int sy = static_cast<int>(playerSamplePy[si]);
        if (gDepthBuffer[sy][sx] > playerSampleDp[si] + 0.0001f) {
            playerVisibleByDB = true;
        }
    }

    float playerCamSpaceZ = cp.lookX * (fRelPlayerX - cp.camX)
                          + cp.lookY * (PLAYER_CHEST_Y - cp.camY)
                          + cp.lookZ * (fRelPlayerZ - cp.camZ);

    bool playerVisible = playerVisibleByDB;

    debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
            "playerVis=%d(DB=%d) plCamZ=%.1f",
            playerVisible ? 1 : 0, playerVisibleByDB ? 1 : 0, playerCamSpaceZ);

    std::vector<std::string> occludedBuildingIds;
    int testCount = 0;
    int nearCount = 0;
    int occludedCount = 0;
    for (size_t i = 0; i < buildingGeoms.size(); i++) {
        const auto& geom = buildingGeoms[i];

        float bx = geom.originX;
        float bz = geom.originZ;

        float dx = bx - fRelPlayerX;
        float dz = bz - fRelPlayerZ;
        float dist = std::sqrt(dx * dx + dz * dz);
        if (dist > fRad + geom.bldRadius + 5.0f) continue;
        nearCount++;

        bool camInside = false;
        if (geom.hasSolid) {
            camInside = pointInsideVoxels(
                fCamX, fCamY, fCamZ,
                geom.solid,
                geom.solidSizeX, geom.solidSizeY, geom.solidSizeZ,
                geom.voxelSize,
                geom.originX, geom.originY, geom.originZ);
        }

        if (camInside) continue;

        AABB bldBox;
        bldBox.minX = bx - geom.halfWidth;
        bldBox.maxX = bx + geom.halfWidth;
        bldBox.minY = 0.0f;
        bldBox.maxY = geom.height;
        bldBox.minZ = bz - geom.halfDepth;
        bldBox.maxZ = bz + geom.halfDepth;

        testCount++;
        if (isAABBOccluded(bldBox, cp)) {
            occludedBuildingIds.push_back(buildingIds[i]);
            occludedCount++;
        }
    }
    debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
            "| bld: near=%d test=%d occ=%d", nearCount, testCount, occludedCount);

    std::vector<std::string> occludedTreeKeys;
    int treeTotal = 0;
    int treeNear = 0;
    int treeOccluded = 0;
    if (argc > static_cast<size_t>(treesIdx)) {
        napi_value treeArr = args[treesIdx];
        bool isArr = false;
        napi_is_array(env, treeArr, &isArr);
        if (isArr) {
            uint32_t treeCount = 0;
            napi_get_array_length(env, treeArr, &treeCount);
            treeTotal = static_cast<int>(treeCount);
            for (uint32_t i = 0; i < treeCount; i++) {
                napi_value tree;
                napi_get_element(env, treeArr, i, &tree);

                napi_value jsTWX, jsTWY;
                napi_get_named_property(env, tree, "worldX", &jsTWX);
                napi_get_named_property(env, tree, "worldY", &jsTWY);

                double wX, wY;
                napi_get_value_double(env, jsTWX, &wX);
                napi_get_value_double(env, jsTWY, &wY);

                float fRelTX = static_cast<float>(wX) - fRelPlayerX;
                float fRelTZ = static_cast<float>(wY) - fRelPlayerZ;
                float dist = std::sqrt(fRelTX * fRelTX + fRelTZ * fRelTZ);
                if (dist > fRad + TREE_RADIUS + 2.0f) continue;
                treeNear++;

                AABB treeBox;
                treeBox.minX = static_cast<float>(wX) - TREE_RADIUS;
                treeBox.maxX = static_cast<float>(wX) + TREE_RADIUS;
                treeBox.minY = 0.0f;
                treeBox.maxY = TREE_HEIGHT;
                treeBox.minZ = static_cast<float>(wY) - TREE_RADIUS;
                treeBox.maxZ = static_cast<float>(wY) + TREE_RADIUS;

                if (isAABBOccluded(treeBox, cp)) {
                    int tileX = static_cast<int>(std::round(static_cast<float>(wX)));
                    int tileY = static_cast<int>(std::round(static_cast<float>(wY)));
                    occludedTreeKeys.push_back("tree-" + std::to_string(tileX) + "," + std::to_string(tileY));
                    treeOccluded++;
                }
            }
        }
    }
    debugLen += snprintf(debugBuf + debugLen, sizeof(debugBuf) - debugLen,
            " | tree: total=%d near=%d occ=%d", treeTotal, treeNear, treeOccluded);

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

    napi_value debugStr;
    napi_create_string_utf8(env, debugBuf, debugLen, &debugStr);
    napi_set_named_property(env, result, "debug", debugStr);

    return result;
}