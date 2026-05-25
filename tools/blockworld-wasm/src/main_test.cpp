#include "terrain_generator.h"
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <chrono>

int main() {
    TerrainGenerator gen;

    printf("=== Height Sample (0,0) to (100,100) ===\n");
    for (int wz = 0; wz <= 80; wz += 20) {
        for (int wx = 0; wx <= 80; wx += 20) {
            printf("H(%3d,%3d)=%3d  ", wx, wz, gen.getTerrainHeight(wx, wz));
        }
        printf("\n");
    }

    printf("\n=== Height at chunk center ===\n");
    for (int cz = -3; cz <= 3; cz++) {
        for (int cx = -3; cx <= 3; cx++) {
            int wx = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
            int wz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
            printf("H(cx=%d,cz=%d)=%3d  ", cx, cz, gen.getTerrainHeight(wx, wz));
        }
        printf("\n");
    }

    printf("\n=== Chunk Terrain (cx=0,cy=2,cz=0) ===\n");
    uint8_t blocks[CHUNK_TOTAL];
    memset(blocks, 0, CHUNK_TOTAL);
    gen.generateChunkTerrain(0, 2, 0, blocks);

    int airCount = 0, grassCount = 0, dirtCount = 0, stoneCount = 0, waterCount = 0;
    for (int i = 0; i < CHUNK_TOTAL; i++) {
        switch (blocks[i]) {
            case 0: airCount++; break;
            case 1: grassCount++; break;
            case 2: dirtCount++; break;
            case 3: stoneCount++; break;
            case 5: waterCount++; break;
        }
    }
    printf("Block counts: AIR=%d GRASS=%d DIRT=%d STONE=%d WATER=%d\n",
           airCount, grassCount, dirtCount, stoneCount, waterCount);

    printf("\n=== Performance Test: 1000 chunks ===\n");
    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 1000; i++) {
        gen.generateChunkTerrain(i % 100 - 50, 2, i / 100 - 5, blocks);
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
    printf("1000 chunks in %lld us  (%.2f us/chunk, %.1f K chunks/s)\n",
           (long long)us, us / 1000.0, 1000000.0 / us * 1000.0);

    printf("\n=== Determinism Test ===\n");
    uint8_t blocksA[CHUNK_TOTAL];
    uint8_t blocksB[CHUNK_TOTAL];
    memset(blocksA, 0, CHUNK_TOTAL);
    memset(blocksB, 0, CHUNK_TOTAL);
    TerrainGenerator gen2;
    gen.generateChunkTerrain(0, 2, 0, blocksA);
    gen2.generateChunkTerrain(0, 2, 0, blocksB);
    bool match = memcmp(blocksA, blocksB, CHUNK_TOTAL) == 0;
    printf("Same chunk, different instances: %s\n", match ? "YES" : "NO");

    printf("\n=== DONE ===\n");
    return 0;
}
