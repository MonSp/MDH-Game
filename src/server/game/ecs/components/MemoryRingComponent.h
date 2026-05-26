#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <cstring>

#pragma pack(push, 1)
struct InteractionSlot {
    uint64_t timestamp;
    uint32_t otherSlot;
    uint8_t  type;
    int8_t   impactScore;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct WitnessedSlot {
    uint64_t timestamp;
    uint32_t slot;
    uint8_t  significance;
    uint8_t  _pad;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct CommandMemorySlot {
    uint64_t timestamp;
    uint32_t issuerSlot;
    uint32_t commandId;
    uint8_t  result;
    uint8_t  emotionTag;
    int8_t   influence;
    uint8_t  _pad;
};
#pragma pack(pop)

template<typename T, size_t CAPACITY>
class RingBuffer {
    T data[CAPACITY];
    size_t head;
    size_t count;
public:
    RingBuffer() : head(0), count(0) { memset(data, 0, sizeof(data)); }

    void push(const T& item) {
        data[head] = item;
        head = (head + 1) % CAPACITY;
        if (count < CAPACITY) count++;
    }

    size_t size() const { return count; }
    bool empty() const { return count == 0; }

    size_t getRecent(T* out, size_t n) const {
        if (n > count) n = count;
        for (size_t i = 0; i < n; i++) {
            size_t idx = (head + CAPACITY - 1 - i) % CAPACITY;
            out[i] = data[idx];
        }
        return n;
    }

    const T* rawData() const { return data; }
};

struct MemoryRingComponent : public ECS::ComponentBase<MemoryRingComponent> {
    static constexpr size_t MAX_INTERACTIONS = 20;
    static constexpr size_t MAX_WITNESSED = 30;
    static constexpr size_t MAX_COMMAND_MEMORY = 30;

    RingBuffer<InteractionSlot, MAX_INTERACTIONS> interactions;
    RingBuffer<WitnessedSlot, MAX_WITNESSED> witnessed;
    RingBuffer<CommandMemorySlot, MAX_COMMAND_MEMORY> commandMemory;

    MemoryRingComponent() = default;

    int getConsecutiveFailures(uint32_t issuerSlot) const {
        CommandMemorySlot buf[MAX_COMMAND_MEMORY];
        size_t n = commandMemory.getRecent(buf, MAX_COMMAND_MEMORY);
        int consecutive = 0;
        for (size_t i = 0; i < n; i++) {
            if (buf[i].issuerSlot != issuerSlot) continue;
            if (buf[i].result == 2 || buf[i].result == 3) {
                consecutive++;
            } else {
                break;
            }
        }
        return consecutive;
    }

    int getOverachieveCount(uint32_t issuerSlot) const {
        CommandMemorySlot buf[MAX_COMMAND_MEMORY];
        size_t n = commandMemory.getRecent(buf, MAX_COMMAND_MEMORY);
        int count = 0;
        for (size_t i = 0; i < n; i++) {
            if (buf[i].issuerSlot != issuerSlot) continue;
            if (buf[i].result == 0 && buf[i].emotionTag == 1) {
                count++;
            }
        }
        return count;
    }
};
