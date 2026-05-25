#pragma once

#include <cstdint>

struct BlackboardCache {
    uint8_t flags;

    enum Bit : uint8_t {
        HasThreatNearby = 1 << 0,
        IsHungry        = 1 << 1,
        IsExhausted     = 1 << 2,
        HasSocialTarget = 1 << 3,
        HasCommand      = 1 << 4,
        ShouldCultivate = 1 << 5,
        Dirty           = 1 << 7,
    };

    BlackboardCache() : flags(Dirty) {}

    bool check(uint8_t bit) const { return (flags & bit) != 0; }
    void set(uint8_t bit) { flags |= bit; }
    void clear(uint8_t bit) { flags &= ~bit; }
    void invalidate() { flags |= Dirty; }
    void markClean() { flags &= ~Dirty; }
    bool isDirty() const { return (flags & Dirty) != 0; }

    void fillFromNPC(
        bool threatNearby,
        bool hungry,
        bool exhausted,
        bool hasSocial,
        bool hasCmd,
        bool shouldCultivate)
    {
        flags = 0;
        if (threatNearby)   flags |= HasThreatNearby;
        if (hungry)         flags |= IsHungry;
        if (exhausted)      flags |= IsExhausted;
        if (hasSocial)      flags |= HasSocialTarget;
        if (hasCmd)         flags |= HasCommand;
        if (shouldCultivate) flags |= ShouldCultivate;
    }
};
