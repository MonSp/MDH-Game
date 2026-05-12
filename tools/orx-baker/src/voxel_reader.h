#ifndef VOXEL_READER_H
#define VOXEL_READER_H

#include "baker_types.h"
#include <string>
#include <fstream>
#include <sstream>
#include <cstdio>
#include <cstring>

struct VoxelReader {
    static VoxelGrid loadFromJSON(const char* filepath) {
        VoxelGrid grid;
        std::ifstream file(filepath);
        if (!file.is_open()) {
            printf("[ERROR] Cannot open voxel file: %s\n", filepath);
            return grid;
        }

        std::string content((std::istreambuf_iterator<char>(file)),
                            std::istreambuf_iterator<char>());
        file.close();

        const char* c = content.c_str();

        auto skipWhitespace = [&]() {
            while (*c == ' ' || *c == '\n' || *c == '\r' || *c == '\t') c++;
        };

        auto readInt = [&]() -> int {
            skipWhitespace();
            bool neg = false;
            if (*c == '-') { neg = true; c++; }
            int v = 0;
            while (*c >= '0' && *c <= '9') { v = v * 10 + (*c - '0'); c++; }
            return neg ? -v : v;
        };

        auto readString = [&]() -> std::string {
            skipWhitespace();
            if (*c != '"') return "";
            c++;
            std::string s;
            while (*c && *c != '"') { s += *c; c++; }
            if (*c == '"') c++;
            return s;
        };

        auto readHexColor = [&](uint8_t& r, uint8_t& g, uint8_t& b) -> bool {
            skipWhitespace();
            if (*c != '"') return false;
            c++;
            if (*c == '#') c++;
            auto hexDigit = [](char ch) -> int {
                if (ch >= '0' && ch <= '9') return ch - '0';
                if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
                if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
                return -1;
            };
            int hi, lo;
            hi = hexDigit(c[0]); lo = hexDigit(c[1]);
            if (hi < 0 || lo < 0) return false;
            r = (uint8_t)(hi * 16 + lo);
            hi = hexDigit(c[2]); lo = hexDigit(c[3]);
            if (hi < 0 || lo < 0) return false;
            g = (uint8_t)(hi * 16 + lo);
            hi = hexDigit(c[4]); lo = hexDigit(c[5]);
            if (hi < 0 || lo < 0) return false;
            b = (uint8_t)(hi * 16 + lo);
            c += 6;
            if (*c == '"') c++;
            return true;
        };

        auto findKey = [&](const char* key) -> bool {
            const char* start = c;
            skipWhitespace();
            if (*c == '\"' && strncmp(c + 1, key, strlen(key)) == 0) {
                c += 1 + strlen(key);
                if (*c == '\"') { c++; return true; }
            }
            c = start;
            return false;
        };

        start:
        skipWhitespace();
        if (*c == '\0') goto done;

        if (*c == '{') {
            c++;
            while (*c && *c != '}') {
                skipWhitespace();
                std::string key = readString();
                skipWhitespace();
                if (*c == ':') c++;

                if (key == "dimX") grid.dimX = readInt();
                else if (key == "dimY") grid.dimY = readInt();
                else if (key == "dimZ") {
                    grid.dimZ = readInt();
                    grid.data.resize(grid.dimX * grid.dimY * grid.dimZ, 0);
                }
                else if (key == "palette") {
                    skipWhitespace();
                    if (*c == '[') c++;
                    grid.palette.clear();
                    while (*c && *c != ']') {
                        skipWhitespace();
                        uint8_t r = 128, g = 128, b = 128;
                        bool gotColor = false;
                        if (*c == '{') {
                            c++;
                            while (*c && *c != '}') {
                                skipWhitespace();
                                std::string ck = readString();
                                skipWhitespace();
                                if (*c == ':') c++;
                                if (ck == "r") r = (uint8_t)readInt();
                                else if (ck == "g") g = (uint8_t)readInt();
                                else if (ck == "b") b = (uint8_t)readInt();
                                skipWhitespace();
                                if (*c == ',') c++;
                            }
                            if (*c == '}') c++;
                            gotColor = true;
                        } else if (*c == '"') {
                            gotColor = readHexColor(r, g, b);
                        }
                        if (gotColor) {
                            grid.palette.push_back(VoxelColor(r, g, b));
                        } else {
                            while (*c && *c != ',' && *c != ']') c++;
                        }
                        skipWhitespace();
                        if (*c == ',') c++;
                    }
                    if (*c == ']') c++;
                }
                else if (key == "data") {
                    skipWhitespace();
                    if (*c == '[') c++;
                    int idx = 0;
                    while (*c && *c != ']' && idx < (int)grid.data.size()) {
                        int v = readInt();
                        grid.data[idx++] = (v < 0) ? (uint8_t)0 : (uint8_t)v;
                        skipWhitespace();
                        if (*c == ',') c++;
                    }
                    if (*c == ']') c++;
                }
                else {
                    while (*c && *c != ',' && *c != '}' && *c != '\n') c++;
                }

                skipWhitespace();
                if (*c == ',') c++;
            }
            if (*c == '}') c++;
        } else {
            c++;
            goto start;
        }

        done:
        printf("[OK] Loaded voxels: %dx%dx%d, %d bytes, %d palette entries\n",
               grid.dimX, grid.dimY, grid.dimZ,
               (int)grid.data.size(), (int)grid.palette.size());
        return grid;
    }

    static bool generateSamplePalette(VoxelGrid& grid) {
        grid.palette.resize(256, VoxelColor(128, 128, 128));
        grid.palette[0] = VoxelColor(0, 0, 0, 0);

        grid.palette[1] = VoxelColor(140, 130, 115);
        grid.palette[2] = VoxelColor(90, 85, 75);
        grid.palette[3] = VoxelColor(160, 140, 110);
        grid.palette[4] = VoxelColor(180, 50, 30);
        grid.palette[5] = VoxelColor(140, 120, 100);
        grid.palette[6] = VoxelColor(200, 180, 150);
        grid.palette[7] = VoxelColor(50, 45, 40);
        grid.palette[8] = VoxelColor(170, 155, 90);
        grid.palette[9] = VoxelColor(75, 135, 80);
        for (int i = 10; i < 256; i++) {
            grid.palette[i] = VoxelColor(128, 128, 128);
        }
        return true;
    }

    static VoxelGrid createSampleCapital() {
        int dx = 20, dy = 20, dz = 15;
        VoxelGrid grid(dx, dy, dz);
        generateSamplePalette(grid);

        auto setBlock = [&](int x, int y, int z, uint8_t mat) {
            if (x >= 0 && x < dx && y >= 0 && y < dy && z >= 0 && z < dz)
                grid.data[x + y * dx + z * dx * dy] = mat;
        };

        auto fillRect = [&](int x1, int y1, int z1, int x2, int y2, int z2, uint8_t mat) {
            for (int x = x1; x <= x2; x++)
                for (int y = y1; y <= y2; y++)
                    for (int z = z1; z <= z2; z++)
                        setBlock(x, y, z, mat);
        };

        int cx = dx / 2, cy = dy / 2;

        fillRect(cx - 4, cy - 4, 0, cx + 4, cy + 4, 0, 3);

        fillRect(cx - 5, cy - 5, 1, cx + 5, cy + 5, 1, 3);

        fillRect(cx - 5, cy - 5, 2, cx + 5, cy - 4, 6, 1);
        fillRect(cx - 5, cy + 4, 2, cx + 5, cy + 5, 6, 1);
        fillRect(cx - 5, cy - 4, 2, cx - 4, cy + 4, 6, 1);
        fillRect(cx + 4, cy - 4, 2, cx + 5, cy + 4, 6, 1);

        for (int z = 2; z <= 6; z++) {
            fillRect(cx - 5, cy - 5, z, cx + 5, cy - 5, z, 1);
            fillRect(cx - 5, cy + 5, z, cx + 5, cy + 5, z, 1);
            fillRect(cx - 5, cy - 4, z, cx - 5, cy + 4, z, 1);
            fillRect(cx + 5, cy - 4, z, cx + 5, cy + 4, z, 1);
        }

        fillRect(cx - 5, cy - 5, 6, cx + 5, cy + 5, 7, 2);

        setBlock(cx - 3, cy, 0, 5);
        setBlock(cx + 3, cy, 0, 5);
        setBlock(cx, cy - 3, 0, 5);
        setBlock(cx, cy + 3, 0, 5);

        fillRect(cx - 2, cy - 2, 1, cx + 2, cy + 2, 8, 4);

        fillRect(cx - 1, cy - 1, 9, cx + 1, cy + 1, 12, 4);

        fillRect(cx - 2, cy - 2, 9, cx + 2, cy + 2, 9, 6);
        fillRect(cx - 1, cy - 1, 13, cx + 1, cy + 1, 13, 6);

        setBlock(cx - 1, cy - 2, 10, 5);
        setBlock(cx - 1, cy - 3, 10, 7);
        setBlock(cx + 1, cy + 2, 10, 5);
        setBlock(cx + 1, cy + 3, 10, 7);

        for (int x = cx - 2; x <= cx + 2; x++) {
            for (int y = cy - 2; y <= cy + 2; y++) {
                setBlock(x, y, 14, 8);
            }
        }

        for (int i = -5; i <= 5; i++) {
            for (int z = 2; z <= 5; z++) {
                setBlock(cx - 6, cy + i, z, 1);
                setBlock(cx + 6, cy + i, z, 1);
            }
        }

        return grid;
    }
};

#endif
