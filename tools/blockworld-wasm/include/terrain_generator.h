#ifndef TERRAIN_GENERATOR_H
#define TERRAIN_GENERATOR_H

#include "prng.h"
#include "simplex_noise.h"
#include <cstdint>
#include <cmath>

static constexpr int CHUNK_SIZE = 16;
static constexpr int CHUNK_TOTAL = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE; // 4096
static constexpr int TERRAIN_BASE_HEIGHT = 40;
static constexpr int TERRAIN_AMPLITUDE = 20;
static constexpr int DIRT_DEPTH = 4;
static constexpr int WATER_LEVEL = TERRAIN_BASE_HEIGHT - 4; // 36

enum class BlockType : uint8_t {
    AIR = 0,
    GRASS = 1,
    DIRT = 2,
    STONE = 3,
    SAND = 4,
    WATER = 5,
};

class TerrainGenerator {
public:
    TerrainGenerator()
        : rng_("taigu_world_seed_2025")
        , noise2D_(rng_)
        , noise3D_(rng_)
    {}

    int getTerrainHeight(int wx, int wz) const {
        float continent = noise2D_.noise(static_cast<float>(wx) * 0.003f, static_cast<float>(wz) * 0.003f) * 0.5f + 0.5f;
        float hill = noise2D_.noise(static_cast<float>(wx) * 0.015f, static_cast<float>(wz) * 0.015f) * 0.5f + 0.5f;
        float detail = noise2D_.noise(static_cast<float>(wx) * 0.04f, static_cast<float>(wz) * 0.04f) * 0.5f + 0.5f;

        float raw = continent * 0.6f + hill * 0.3f + detail * 0.1f;
        int height = static_cast<int>(raw * static_cast<float>(TERRAIN_AMPLITUDE) + static_cast<float>(TERRAIN_BASE_HEIGHT) - static_cast<float>(TERRAIN_AMPLITUDE) / 2.0f);
        if (height < 1) height = 1;
        if (height > 100) height = 100;
        return height;
    }

    void generateChunkTerrain(int cx, int cy, int cz, uint8_t* blocks) const {
        if (cy > 4) {
            return;
        }

        for (int lx = 0; lx < CHUNK_SIZE; lx++) {
            for (int lz = 0; lz < CHUNK_SIZE; lz++) {
                int wx = cx * CHUNK_SIZE + lx;
                int wz = cz * CHUNK_SIZE + lz;
                int surfaceHeight = getTerrainHeight(wx, wz);
                int waterSurface = WATER_LEVEL;

                for (int ly = 0; ly < CHUNK_SIZE; ly++) {
                    int wy = cy * CHUNK_SIZE + ly;
                    int idx = ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;

                    if (wy > surfaceHeight) {
                        if (wy <= waterSurface) {
                            blocks[idx] = static_cast<uint8_t>(BlockType::WATER);
                        }
                        continue;
                    }

                    if (wy == surfaceHeight) {
                        blocks[idx] = static_cast<uint8_t>(BlockType::GRASS);
                    } else if (wy > surfaceHeight - DIRT_DEPTH) {
                        blocks[idx] = static_cast<uint8_t>(BlockType::DIRT);
                    } else {
                        if (wy > 30) {
                            float caveNoise = noise3D_.noise(
                                static_cast<float>(wx) * 0.07f,
                                static_cast<float>(wy) * 0.07f,
                                static_cast<float>(wz) * 0.07f
                            );
                            float depthFactor = static_cast<float>(surfaceHeight - wy) / 20.0f;
                            if (caveNoise > 0.55f - depthFactor * 0.15f) {
                                blocks[idx] = static_cast<uint8_t>(BlockType::STONE);
                            }
                        } else {
                            blocks[idx] = static_cast<uint8_t>(BlockType::STONE);
                        }
                    }
                }
            }
        }
    }

private:
    SeededRandom rng_;
    SimplexNoise2D noise2D_;
    SimplexNoise3D noise3D_;
};

#endif
