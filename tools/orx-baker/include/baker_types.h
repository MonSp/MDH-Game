#ifndef BAKER_TYPES_H
#define BAKER_TYPES_H

#include <vector>
#include <string>
#include <cstdint>
#include <cmath>

struct VoxelColor {
    uint8_t r, g, b, a;
    VoxelColor() : r(128), g(128), b(128), a(255) {}
    VoxelColor(uint8_t r_, uint8_t g_, uint8_t b_, uint8_t a_ = 255)
        : r(r_), g(g_), b(b_), a(a_) {}
};

static inline VoxelColor colorMul(const VoxelColor& c, float f) {
    return VoxelColor(
        (uint8_t)(c.r * f),
        (uint8_t)(c.g * f),
        (uint8_t)(c.b * f),
        c.a
    );
}

static inline VoxelColor colorAdd(const VoxelColor& a, const VoxelColor& b) {
    return VoxelColor(
        (uint8_t)(std::min(255, a.r + (int)b.r)),
        (uint8_t)(std::min(255, a.g + (int)b.g)),
        (uint8_t)(std::min(255, a.b + (int)b.b)),
        255
    );
}

struct Voxel {
    uint8_t material;
    VoxelColor tint;
    Voxel() : material(0), tint(128, 128, 128) {}
    Voxel(uint8_t mat, const VoxelColor& c) : material(mat), tint(c) {}
    bool isSolid() const { return material > 0; }
};

struct VoxelGrid {
    int dimX, dimY, dimZ;
    std::vector<uint8_t> data;
    std::vector<VoxelColor> palette;

    VoxelGrid() : dimX(0), dimY(0), dimZ(0) {}
    VoxelGrid(int dx, int dy, int dz)
        : dimX(dx), dimY(dy), dimZ(dz)
        , data(dx * dy * dz, 0)
        , palette(256, VoxelColor(128, 128, 128))
    {}

    uint8_t get(int x, int y, int z) const {
        if (x < 0 || x >= dimX || y < 0 || y >= dimY || z < 0 || z >= dimZ) return 0;
        return data[x + y * dimX + z * dimX * dimY];
    }

    bool isSolid(int x, int y, int z) const {
        return get(x, y, z) > 0;
    }

    bool isTopFace(int x, int y, int z) const {
        return isSolid(x, y, z) && !isSolid(x, y, z + 1);
    }

    bool isFrontFace(int x, int y, int z, float angle) const {
        if (!isSolid(x, y, z)) return false;
        if (angle > -0.5f && angle < 0.5f)
            return !isSolid(x, y + 1, z);
        if (angle > 0.5f)
            return !isSolid(x + 1, y, z);
        return !isSolid(x - 1, y, z);
    }

    bool isSideFace(int x, int y, int z, float angle) const {
        if (!isSolid(x, y, z)) return false;
        if (angle > -0.5f && angle < 0.5f)
            return !isSolid(x, y - 1, z);
        return !isSolid(x - 1, y, z) || !isSolid(x + 1, y, z);
    }

    int countSolid() const {
        int n = 0;
        for (size_t i = 0; i < data.size(); i++)
            if (data[i] > 0) n++;
        return n;
    }
};

struct Vec3 {
    float x, y, z;
    Vec3() : x(0), y(0), z(0) {}
    Vec3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}

    Vec3 operator+(const Vec3& o) const { return Vec3(x + o.x, y + o.y, z + o.z); }
    Vec3 operator-(const Vec3& o) const { return Vec3(x - o.x, y - o.y, z - o.z); }
    Vec3 operator*(float s) const { return Vec3(x * s, y * s, z * s); }
    float length() const { return std::sqrt(x*x + y*y + z*z); }
    Vec3 normalized() const {
        float l = length();
        return l > 0.0001f ? Vec3(x/l, y/l, z/l) : Vec3(0, 0, 0);
    }
    float dot(const Vec3& o) const { return x*o.x + y*o.y + z*o.z; }
};

struct FrameInfo {
    std::string id;
    int angleIndex;
    int frameIndex;
    std::string animName;
};

struct PackedEntry {
    std::string name;
    int atlasX, atlasY;
    int width, height;
};

struct AtlasMetadata {
    int atlasWidth;
    int atlasHeight;
    std::vector<PackedEntry> entries;
};

#endif
