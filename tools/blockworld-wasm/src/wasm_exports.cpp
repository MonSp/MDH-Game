#include "terrain_generator.h"
#include <cstring>

extern "C" {

static TerrainGenerator* s_generator = nullptr;

void bw_init() {
    if (!s_generator) {
        s_generator = new TerrainGenerator();
    }
}

int bw_getTerrainHeight(int wx, int wz) {
    return s_generator ? s_generator->getTerrainHeight(wx, wz) : 0;
}

void bw_generateChunkTerrain(int cx, int cy, int cz, uint8_t* blocks) {
    if (s_generator) {
        s_generator->generateChunkTerrain(cx, cy, cz, blocks);
    }
}

void bw_destroy() {
    delete s_generator;
    s_generator = nullptr;
}

int bw_chunkSize() {
    return CHUNK_SIZE;
}

int bw_chunkTotal() {
    return CHUNK_TOTAL;
}

}
