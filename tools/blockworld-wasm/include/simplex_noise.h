#ifndef SIMPLEX_NOISE_H
#define SIMPLEX_NOISE_H

#include "prng.h"
#include <cstdint>
#include <algorithm>

class SimplexNoise2D {
public:
    explicit SimplexNoise2D(SeededRandom& rng) {
        for (int i = 0; i < 256; i++) perm_[i] = static_cast<uint8_t>(i);
        for (int i = 255; i > 0; i--) {
            int j = static_cast<int>(rng.next() * (i + 1));
            std::swap(perm_[i], perm_[j]);
        }
        for (int i = 0; i < 512; i++) {
            permMod12_[i] = static_cast<uint8_t>(perm_[i & 255] % 12);
        }
    }

    float noise(float x, float y) const {
        float s = (x + y) * F2;
        float xs = x + s;
        float ys = y + s;
        int xsb = fastFloor(xs);
        int ysb = fastFloor(ys);

        float t = static_cast<float>(xsb + ysb) * G2;
        float x0 = x - (static_cast<float>(xsb) - t);
        float y0 = y - (static_cast<float>(ysb) - t);

        int i = xsb & 255;
        int j = ysb & 255;

        float x1, y1, x2, y2;
        int ii, jj;
        if (x0 > y0) { x1 = x0 - 1.0f + G2; y1 = y0 + G2; x2 = x0 - 1.0f + 2.0f * G2; y2 = y0 - 1.0f + 2.0f * G2; ii = 1; jj = 1; }
        else         { x1 = x0 + G2; y1 = y0 - 1.0f + G2; x2 = x0 - 1.0f + 2.0f * G2; y2 = y0 - 1.0f + 2.0f * G2; ii = 0; jj = 1; }

        float n0 = 0, n1 = 0, n2 = 0;

        float t0 = 0.5f - x0*x0 - y0*y0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * grad(permMod12_[(i + j * 2) & 511], x0, y0); }

        float t1 = 0.5f - x1*x1 - y1*y1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * grad(permMod12_[(i + ii + (j + jj) * 2) & 511], x1, y1); }

        float t2 = 0.5f - x2*x2 - y2*y2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * grad(permMod12_[(i + 1 + (j + 1) * 2) & 511], x2, y2); }

        return 44.0f * (n0 + n1 + n2);
    }

private:
    static int fastFloor(float f) { int i = static_cast<int>(f); return f < i ? i - 1 : i; }
    static constexpr float F2 = 0.3660254037844386f;
    static constexpr float G2 = 0.21132486540518713f;

    static float grad(int hash, float x, float y) {
        switch (hash) {
            case 0: return  x + y; case 1: return  x;    case 2:  return  x - y;
            case 3: return -y;     case 4: return -x + y; case 5:  return -x;
            case 6: return -x - y; case 7: return  y;    case 8:  return  y;
            case 9: return -x;     case 10: return -y;    case 11: return -y;
            default: return 0;
        }
    }

    uint8_t perm_[256];
    uint8_t permMod12_[512];
};

class SimplexNoise3D {
public:
    explicit SimplexNoise3D(SeededRandom& rng) {
        for (int i = 0; i < 256; i++) perm_[i] = static_cast<uint8_t>(i);
        for (int i = 255; i > 0; i--) {
            int j = static_cast<int>(rng.next() * (i + 1));
            std::swap(perm_[i], perm_[j]);
        }
        for (int i = 0; i < 256; i++) {
            perm_[i + 256] = perm_[i];
        }
        for (int i = 0; i < 512; i++) {
            permMod12_[i] = static_cast<uint8_t>(perm_[i] % 12);
        }
    }

    float noise(float x, float y, float z) const {
        float s = (x + y + z) * F3;
        float xs = x + s, ys = y + s, zs = z + s;
        int xsb = fastFloor(xs), ysb = fastFloor(ys), zsb = fastFloor(zs);

        float t = static_cast<float>(xsb + ysb + zsb) * G3;
        float x0 = x - (static_cast<float>(xsb) - t);
        float y0 = y - (static_cast<float>(ysb) - t);
        float z0 = z - (static_cast<float>(zsb) - t);

        int i = xsb & 255, j = ysb & 255, k = zsb & 255;

        float x1, y1, z1, x2, y2, z2, x3, y3, z3;
        int i1, j1, k1, i2, j2, k2;

        if (x0 >= y0) {
            if (y0 >= z0)      { x1=x0-1.f+G3; y1=y0+G3;   z1=z0+G3;   i1=1; j1=0; k1=0; x2=x0-1.f+2.f*G3; y2=y0-1.f+2.f*G3; z2=z0+2.f*G3;   i2=1; j2=1; k2=0; }
            else if (x0 >= z0) { x1=x0-1.f+G3; y1=y0+G3;   z1=z0+G3;   i1=1; j1=0; k1=0; x2=x0-1.f+2.f*G3; y2=y0+G3;        z2=z0-1.f+2.f*G3; i2=1; j2=0; k2=1; }
            else               { x1=x0+G3;    y1=y0+G3;   z1=z0-1.f+G3; i1=0; j1=0; k1=1; x2=x0-1.f+2.f*G3; y2=y0+G3;        z2=z0-1.f+2.f*G3; i2=1; j2=0; k2=1; }
        } else {
            if (y0 < z0)       { x1=x0+G3;    y1=y0+G3;   z1=z0-1.f+G3; i1=0; j1=0; k1=1; x2=x0+G3;          y2=y0-1.f+2.f*G3; z2=z0-1.f+2.f*G3; i2=0; j2=1; k2=1; }
            else if (x0 < z0)  { x1=x0+G3;    y1=y0-1.f+G3; z1=z0+G3;   i1=0; j1=1; k1=0; x2=x0+G3;          y2=y0-1.f+2.f*G3; z2=z0-1.f+2.f*G3; i2=0; j2=1; k2=1; }
            else               { x1=x0+G3;    y1=y0-1.f+G3; z1=z0+G3;   i1=0; j1=1; k1=0; x2=x0-1.f+2.f*G3; y2=y0-1.f+2.f*G3; z2=z0+2.f*G3;   i2=1; j2=1; k2=0; }
        }

        x3 = x0 - 1.0f + 3.0f * G3;
        y3 = y0 - 1.0f + 3.0f * G3;
        z3 = z0 - 1.0f + 3.0f * G3;
        i2 = i + i2; j2 = j + j2; k2 = k + k2;

        float n0 = 0, n1 = 0, n2 = 0, n3 = 0;

        float t0 = 0.6f - x0*x0 - y0*y0 - z0*z0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * grad(permMod12_[perm_[(perm_[i] + j) & 255] + k], x0, y0, z0); }

        float t1 = 0.6f - x1*x1 - y1*y1 - z1*z1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * grad(permMod12_[perm_[(perm_[i+i1] + j+j1) & 255] + k+k1], x1, y1, z1); }

        float t2 = 0.6f - x2*x2 - y2*y2 - z2*z2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * grad(permMod12_[perm_[(perm_[i+i2] + j+j2) & 255] + k+k2], x2, y2, z2); }

        float t3 = 0.6f - x3*x3 - y3*y3 - z3*z3;
        if (t3 > 0) { t3 *= t3; n3 = t3 * t3 * grad(permMod12_[perm_[(perm_[i+1] + (j+1)) & 255] + k+1], x3, y3, z3); }

        return 32.0f * (n0 + n1 + n2 + n3);
    }

private:
    static int fastFloor(float f) { int i = static_cast<int>(f); return f < i ? i - 1 : i; }
    static constexpr float F3 = 1.0f / 3.0f;
    static constexpr float G3 = 1.0f / 6.0f;

    static float grad(int hash, float x, float y, float z) {
        switch (hash & 0xF) {
            case 0x0: return  x + y; case 0x1: return -x + y; case 0x2: return  x - y; case 0x3: return -x - y;
            case 0x4: return  x + z; case 0x5: return -x + z; case 0x6: return  x - z; case 0x7: return -x - z;
            case 0x8: return  y + z; case 0x9: return -y + z; case 0xA: return  y - z; case 0xB: return -y - z;
            case 0xC: return  y + x; case 0xD: return -y + z; case 0xE: return  y - x; case 0xF: return -y - z;
            default: return 0;
        }
    }

    uint8_t perm_[512];
    uint8_t permMod12_[512];
};

#endif
