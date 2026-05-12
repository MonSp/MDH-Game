#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"
#include "baker_types.h"
#include <string.h>
#include <algorithm>
#include <cmath>
#include <atomic>

static const float PI = 3.14159265358979323846f;

struct SoftwareRenderer {
    int outputW, outputH;

    SoftwareRenderer(int w, int h) : outputW(w), outputH(h) {}

    struct PixelBuffer {
        int w, h;
        std::vector<uint8_t> rgba;

        PixelBuffer(int w_, int h_) : w(w_), h(h_), rgba(w_ * h_ * 4, 0) {}

        void setPixel(int x, int y, uint8_t r, uint8_t g, uint8_t b, uint8_t a = 255) {
            if (x < 0 || x >= w || y < 0 || y >= h) return;
            int idx = (y * w + x) * 4;
            rgba[idx] = r;
            rgba[idx + 1] = g;
            rgba[idx + 2] = b;
            rgba[idx + 3] = a;
        }

        VoxelColor getPixel(int x, int y) const {
            if (x < 0 || x >= w || y < 0 || y >= h) return VoxelColor(0, 0, 0, 0);
            int idx = (y * w + x) * 4;
            return VoxelColor(rgba[idx], rgba[idx + 1], rgba[idx + 2], rgba[idx + 3]);
        }

        void clear(uint8_t r = 0, uint8_t g = 0, uint8_t b = 0, uint8_t a = 0) {
            for (int i = 0; i < w * h * 4; i += 4) {
                rgba[i] = r;
                rgba[i + 1] = g;
                rgba[i + 2] = b;
                rgba[i + 3] = a;
            }
        }

        bool savePNG(const char* path) {
            return stbi_write_png(path, w, h, 4, rgba.data(), w * 4) != 0;
        }
    };

    void renderVoxelIsometric(PixelBuffer& buf, const VoxelGrid& grid,
                              float cameraAngle, float cameraPitch, float scale,
                              std::atomic<int>* layerProgress = nullptr,
                              int threadId = -1) {
        buf.clear(0, 0, 0, 0);

        float cosA = std::cos(cameraAngle);
        float sinA = std::sin(cameraAngle);

        float cx = buf.w * 0.5f;
        float cy = buf.h * 0.5f;

        Vec3 lightDir(-0.577f, -0.577f, 0.577f);
        lightDir = lightDir.normalized();

        float ambient = 0.35f;

        struct DepthEntry { float depth; };
        std::vector<DepthEntry> depthBuf(buf.w * buf.h, {99999.0f});

        int totalLayers = grid.dimZ;
        for (int z = grid.dimZ - 1; z >= 0; z--) {
            if (layerProgress && totalLayers > 10 && z % std::max(1, totalLayers / 10) == 0) {
                layerProgress->store(totalLayers - 1 - z, std::memory_order_relaxed);
            }
            for (int y = 0; y < grid.dimY; y++) {
                for (int x = 0; x < grid.dimX; x++) {
                    uint8_t mat = grid.get(x, y, z);
                    if (mat == 0) continue;

                    VoxelColor baseColor = grid.palette[mat];

                    float rx = (float)x - grid.dimX * 0.5f;
                    float ry = (float)y - grid.dimY * 0.5f;
                    float rz = (float)z;

                    float xRot = rx * cosA - ry * sinA;
                    float yRot = rx * sinA + ry * cosA;

                    float sx = cx + (xRot - yRot) * scale;
                    float sy = cy - (xRot + yRot) * scale * 0.5f - rz * scale;

                    float bx = xRot;
                    float by = yRot;

                    int vxCount = 0;
                    Vec3 normal(0, 0, 1);
                    if (!grid.isSolid(x, y, z + 1)) {
                        normal = Vec3(0, 0, 1);
                        vxCount++;
                    }
                    if (!grid.isSolid(x, y, z - 1)) {
                        vxCount++;
                    }
                    if (!grid.isSolid(x + 1, y, z)) {
                        vxCount++;
                    }
                    if (!grid.isSolid(x - 1, y, z)) {
                        vxCount++;
                    }
                    if (!grid.isSolid(x, y + 1, z)) {
                        vxCount++;
                    }
                    if (!grid.isSolid(x, y - 1, z)) {
                        vxCount++;
                    }

                    float nDotL = std::max(0.0f, normal.dot(lightDir));
                    if (vxCount == 0 && grid.isSolid(x, y, z - 1)) {
                        nDotL = ambient;
                    }
                    float light = ambient + (1.0f - ambient) * nDotL;

                    if (grid.isSolid(x, y, z + 1)) {
                        light *= 0.7f;
                        if (grid.isSolid(x + 1, y, z)) light *= 0.8f;
                        if (grid.isSolid(x - 1, y, z)) light *= 0.8f;
                        if (grid.isSolid(x, y + 1, z)) light *= 0.8f;
                        if (grid.isSolid(x, y - 1, z)) light *= 0.8f;
                    }

                    float aoX1 = grid.isSolid(x + 1, y, z) ? 0.6f : 1.0f;
                    float aoX2 = grid.isSolid(x - 1, y, z) ? 0.6f : 1.0f;
                    float aoY1 = grid.isSolid(x, y + 1, z) ? 0.6f : 1.0f;
                    float aoY2 = grid.isSolid(x, y - 1, z) ? 0.6f : 1.0f;
                    light *= aoX1 * aoX2 * aoY1 * aoY2 * 0.6f + 0.4f;

                    VoxelColor shaded = colorMul(baseColor, std::min(1.0f, light));

                    if (grid.isSolid(x, y, z + 1) && !grid.isSolid(x, y - 1, z) && !grid.isSolid(x + 1, y, z)) {
                        shaded = baseColor;
                    }

                    float depth = rz * 1000.0f + by * 10.0f + bx;

                    int pixelSize = (int)(scale * 0.9f);
                    if (pixelSize < 1) pixelSize = 1;

                    for (int dy = -pixelSize; dy <= pixelSize; dy++) {
                        for (int dx = -pixelSize; dx <= pixelSize; dx++) {
                            int px = (int)(sx) + dx;
                            int py = (int)(sy) + dy;
                            if (px < 0 || px >= buf.w || py < 0 || py >= buf.h) continue;

                            int dIdx = py * buf.w + px;
                            if (depth < depthBuf[dIdx].depth) {
                                depthBuf[dIdx].depth = depth;
                                buf.setPixel(px, py, shaded.r, shaded.g, shaded.b, shaded.a);
                            }
                        }
                    }
                }
            }
        }
    }
};
