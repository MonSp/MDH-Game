#ifndef PRNG_H
#define PRNG_H

#include <cstdint>
#include <string>

class SeededRandom {
public:
    explicit SeededRandom(const std::string& seed) {
        uint32_t s = 0;
        for (char c : seed) {
            s = ((s << 5) - s) + static_cast<uint32_t>(static_cast<uint8_t>(c));
        }
        state_ = s & 0x7fffffff;
    }

    float next() {
        state_ = (static_cast<uint64_t>(state_) * 16807) & 0x7fffffff;
        return static_cast<float>(state_) / 2147483647.0f;
    }

    uint32_t nextUInt() {
        state_ = (static_cast<uint64_t>(state_) * 16807) & 0x7fffffff;
        return state_;
    }

private:
    uint32_t state_;
};

#endif
