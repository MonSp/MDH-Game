#pragma once

#include <vector>
#include <array>
#include <cstdint>
#include <cmath>

class SpatialIndexCache {
public:
    static constexpr float kGridSize = 100.0f;
    static constexpr int   kGridDim = 100;
    static constexpr int   kCellCount = kGridDim * kGridDim;

    static SpatialIndexCache& getInstance() {
        static SpatialIndexCache instance;
        return instance;
    }

    void clear() {
        for (auto& cell : cells_) {
            cell.clear();
        }
        slotToCell_.clear();
    }

    template<typename PosArray>
    void rebuild(const std::vector<bool>& activeSlots, const PosArray& positions,
                 size_t slotCount) {
        clear();
        slotToCell_.resize(slotCount, -1);

        for (size_t i = 0; i < slotCount; ++i) {
            if (!activeSlots[i]) continue;
            float x = positions[i].x;
            float y = positions[i].y;
            int cx = cellX(x);
            int cy = cellY(y);
            if (cx < 0 || cx >= kGridDim || cy < 0 || cy >= kGridDim) continue;

            int cellIdx = cy * kGridDim + cx;
            cells_[cellIdx].push_back(static_cast<uint32_t>(i));
            slotToCell_[i] = cellIdx;
        }
    }

    std::vector<uint32_t> queryNeighbors(float x, float y, float radius) const {
        std::vector<uint32_t> result;
        int cx = cellX(x);
        int cy = cellY(y);

        int range = static_cast<int>(std::ceil(radius / kGridSize));
        for (int dy = -range; dy <= range; ++dy) {
            for (int dx = -range; dx <= range; ++dx) {
                int nx = cx + dx;
                int ny = cy + dy;
                if (nx < 0 || nx >= kGridDim || ny < 0 || ny >= kGridDim) continue;

                int cellIdx = ny * kGridDim + nx;
                for (uint32_t slot : cells_[cellIdx]) {
                    result.push_back(slot);
                }
            }
        }
        return result;
    }

    int getSlotCell(uint32_t slot) const {
        if (slot >= slotToCell_.size()) return -1;
        return slotToCell_[slot];
    }

    static int cellX(float x) { return static_cast<int>((x + 5000.0f) / kGridSize); }
    static int cellY(float y) { return static_cast<int>((y + 5000.0f) / kGridSize); }

private:
    SpatialIndexCache() { cells_.fill({}); }

    std::array<std::vector<uint32_t>, kCellCount> cells_;
    std::vector<int> slotToCell_;
};
