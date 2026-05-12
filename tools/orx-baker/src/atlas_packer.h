#ifndef ATLAS_PACKER_H
#define ATLAS_PACKER_H

#include "baker_types.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"
#include <vector>
#include <string>
#include <cstdio>
#include <cstring>
#include <algorithm>

struct FrameBuffer {
    const uint8_t* rgba;
    int w, h;
};

struct AtlasPacker {
    int atlasSize;
    std::vector<PackedEntry> entries;
    std::vector<FrameBuffer> frameData;
    int currentX, currentY, rowMaxH;

    AtlasPacker(int size = 2048)
        : atlasSize(size), currentX(0), currentY(0), rowMaxH(0) {}

    bool addEntry(const char* name, int w, int h) {
        if (currentX + w > atlasSize) {
            currentX = 0;
            currentY += rowMaxH + 2;
            rowMaxH = 0;
            if (currentY + h > atlasSize) return false;
        }

        PackedEntry e;
        e.name = name;
        e.atlasX = currentX;
        e.atlasY = currentY;
        e.width = w;
        e.height = h;
        entries.push_back(e);

        currentX += w + 2;
        rowMaxH = std::max(rowMaxH, h);
        return true;
    }

    bool addEntryWithFrame(const char* name, int w, int h, const uint8_t* rgbaData) {
        if (!addEntry(name, w, h)) return false;
        FrameBuffer fb;
        fb.rgba = rgbaData;
        fb.w = w;
        fb.h = h;
        frameData.push_back(fb);
        return true;
    }

    int usedHeight() const {
        int h = 0;
        for (const auto& e : entries) {
            h = std::max(h, e.atlasY + e.height);
        }
        return h;
    }

    bool compositeAndSavePNG(const char* path) {
        if (entries.size() != frameData.size()) {
            printf("[ERROR] atlas entries (%zu) != frame data (%zu)\n",
                   entries.size(), frameData.size());
            return false;
        }

        int uH = usedHeight();
        std::vector<uint8_t> atlasRGBA(atlasSize * uH * 4, 0);

        for (size_t i = 0; i < entries.size(); i++) {
            const auto& e = entries[i];
            const auto& fd = frameData[i];

            for (int row = 0; row < fd.h; row++) {
                int srcOffset = row * fd.w * 4;
                int dstOffset = (e.atlasY + row) * atlasSize * 4 + e.atlasX * 4;
                memcpy(&atlasRGBA[dstOffset], &fd.rgba[srcOffset], fd.w * 4);
            }
        }

        if (stbi_write_png(path, atlasSize, uH, 4, atlasRGBA.data(), atlasSize * 4) == 0) {
            printf("[ERROR] Failed to write atlas PNG: %s\n", path);
            return false;
        }

        printf("[OK] Composited atlas PNG: %s (%dx%d, %zu entries)\n",
               path, atlasSize, uH, entries.size());
        return true;
    }

    bool writeJSON(const char* path) {
        FILE* f = fopen(path, "w");
        if (!f) return false;

        int uH = usedHeight();

        fprintf(f, "{\n");
        fprintf(f, "  \"atlasWidth\": %d,\n", atlasSize);
        fprintf(f, "  \"atlasHeight\": %d,\n", uH);
        fprintf(f, "  \"entries\": [\n");
        for (size_t i = 0; i < entries.size(); i++) {
            const auto& e = entries[i];
            fprintf(f, "    {\"name\": \"%s\", \"x\": %d, \"y\": %d, \"w\": %d, \"h\": %d}%s\n",
                    e.name.c_str(), e.atlasX, e.atlasY, e.width, e.height,
                    (i + 1 < entries.size()) ? "," : "");
        }
        fprintf(f, "  ]\n");
        fprintf(f, "}\n");
        fclose(f);
        printf("[OK] Wrote atlas metadata: %s (%zu entries, %dx%d)\n",
               path, entries.size(), atlasSize, uH);
        return true;
    }
};

#endif
