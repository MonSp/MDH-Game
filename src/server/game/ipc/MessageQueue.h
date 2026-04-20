#pragma once

#include "Protocol.h"
#include <queue>
#include <mutex>
#include <memory>
#include <vector>

class MessageQueue {
public:
    static MessageQueue& getInstance() {
        static MessageQueue instance;
        return instance;
    }

    void enqueue(std::shared_ptr<Message> msg) {
        std::lock_guard<std::mutex> lock(mutex_);
        queue_.push(std::move(msg));
    }

    void enqueue(IPCMessage* msg) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto wrapper = std::make_shared<Message>();
        wrapper->header.magic = MessageHeader::MAGIC;
        wrapper->header.type = msg->type;
        wrapper->header.payloadSize = msg->payload_size;
        wrapper->header.timestamp = msg->timestamp;
        if (msg->payload && msg->payload_size > 0) {
            wrapper->payload.resize(msg->payload_size);
            memcpy(wrapper->payload.data(), msg->payload, msg->payload_size);
        }
        queue_.push(std::move(wrapper));
    }

    std::shared_ptr<Message> dequeue() {
        std::lock_guard<std::mutex> lock(mutex_);
        if (queue_.empty()) {
            return nullptr;
        }
        auto msg = std::move(queue_.front());
        queue_.pop();
        return msg;
    }

    size_t size() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return queue_.size();
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return queue_.empty();
    }

    void clear() {
        std::lock_guard<std::mutex> lock(mutex_);
        while (!queue_.empty()) {
            queue_.pop();
        }
    }

    std::vector<std::shared_ptr<Message>> drain() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::shared_ptr<Message>> messages;
        while (!queue_.empty()) {
            messages.push_back(std::move(queue_.front()));
            queue_.pop();
        }
        return messages;
    }

private:
    MessageQueue() = default;

    std::queue<std::shared_ptr<Message>> queue_;
    mutable std::mutex mutex_;
};
