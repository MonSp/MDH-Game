#pragma once

#include <cstdint>
#include <vector>
#include <string>
#include <memory>

enum class MessageType : uint8_t {
    NPC_STATE_SYNC = 1,
    PLAYER_INPUT = 2,
    EVENT_BROADCAST = 3,
    WORLD_UPDATE = 4,
    SHUTDOWN = 5,
    LLM_PLAN_REQUEST = 10,
    LLM_PLAN_RESPONSE = 11,
    LLM_PLAN_STATUS_QUERY = 12
};

struct IPCMessage {
    MessageType type;
    uint64_t entity_id;
    uint64_t timestamp;
    uint32_t payload_size;
    char* payload;
};

struct MessageHeader {
    uint32_t magic;
    MessageType type;
    uint32_t payloadSize;
    uint64_t timestamp;

    static constexpr uint32_t MAGIC = 0x4E504341;
};

struct Message {
    MessageHeader header;
    std::vector<uint8_t> payload;

    static std::unique_ptr<Message> create(MessageType type, const void* data, size_t size) {
        auto msg = std::make_unique<Message>();
        msg->header.magic = MessageHeader::MAGIC;
        msg->header.type = type;
        msg->header.payloadSize = static_cast<uint32_t>(size);
        msg->header.timestamp = 0;
        if (data && size > 0) {
            msg->payload.resize(size);
            memcpy(msg->payload.data(), data, size);
        }
        return msg;
    }

    bool isValid() const {
        return header.magic == MessageHeader::MAGIC;
    }
};

struct NPCStateSync {
    uint32_t entityCount;
    std::vector<uint64_t> entityIds;
    std::vector<float> positionsX;
    std::vector<float> positionsY;
    std::vector<int32_t> hpValues;
    std::vector<int32_t> maxHpValues;
    std::vector<uint8_t> activities;
};

struct PlayerInput {
    uint64_t playerId;
    uint8_t inputType;
    float param1;
    float param2;
    float param3;
};

struct EventBroadcast {
    uint8_t eventType;
    uint64_t entityId;
    uint64_t targetEntityId;
    std::string eventData;
};
