#ifndef SIMPLEX_NOISE_H
#define SIMPLEX_NOISE_H

#include <cstdint>
#include <cmath>
#include <vector>
#include <algorithm>

namespace WorldGen {

class SimplexNoise {
public:
    SimplexNoise(uint64_t seed = 42) {
        std::vector<uint8_t> perm(256);
        for (int i = 0; i < 256; i++) perm[i] = static_cast<uint8_t>(i);

        uint64_t s = seed;
        for (int i = 255; i > 0; i--) {
            s = s * 6364136223846793005ULL + 1442695040888963407ULL;
            int j = static_cast<int>(s % (i + 1));
            std::swap(perm[i], perm[j]);
        }
        for (int i = 0; i < 512; i++) {
            perm_[i] = perm[i & 255];
        }
    }

    float noise2D(float x, float y) const {
        const float F2 = 0.5f * (std::sqrt(3.0f) - 1.0f);
        const float G2 = (3.0f - std::sqrt(3.0f)) / 6.0f;

        float s = (x + y) * F2;
        int i = fastFloor(x + s);
        int j = fastFloor(y + s);

        float t = (i + j) * G2;
        float X0 = i - t;
        float Y0 = j - t;
        float x0 = x - X0;
        float y0 = y - Y0;

        int i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        float x1 = x0 - i1 + G2;
        float y1 = y0 - j1 + G2;
        float x2 = x0 - 1.0f + 2.0f * G2;
        float y2 = y0 - 1.0f + 2.0f * G2;

        int ii = i & 255;
        int jj = j & 255;
        int gi0 = perm_[ii + perm_[jj]] % 12;
        int gi1 = perm_[ii + i1 + perm_[jj + j1]] % 12;
        int gi2 = perm_[ii + 1 + perm_[jj + 1]] % 12;

        float n0 = 0.0f, n1 = 0.0f, n2 = 0.0f;

        float t0 = 0.5f - x0 * x0 - y0 * y0;
        if (t0 > 0.0f) {
            t0 *= t0;
            n0 = t0 * t0 * dot2(grad3[gi0], x0, y0);
        }

        float t1 = 0.5f - x1 * x1 - y1 * y1;
        if (t1 > 0.0f) {
            t1 *= t1;
            n1 = t1 * t1 * dot2(grad3[gi1], x1, y1);
        }

        float t2 = 0.5f - x2 * x2 - y2 * y2;
        if (t2 > 0.0f) {
            t2 *= t2;
            n2 = t2 * t2 * dot2(grad3[gi2], x2, y2);
        }

        return 70.0f * (n0 + n1 + n2);
    }

private:
    uint8_t perm_[512];

    static int fastFloor(float x) {
        int xi = static_cast<int>(x);
        return x < xi ? xi - 1 : xi;
    }

    static float dot2(const int* g, float x, float y) {
        return g[0] * x + g[1] * y;
    }

    static const int grad3[12][3];
};

const int SimplexNoise::grad3[12][3] = {
    {1,1,0}, {-1,1,0}, {1,-1,0}, {-1,-1,0},
    {1,0,1}, {-1,0,1}, {1,0,-1}, {-1,0,-1},
    {0,1,1}, {0,-1,1}, {0,1,-1}, {0,-1,-1}
};

} // namespace WorldGen

#endif // SIMPLEX_NOISE_H
