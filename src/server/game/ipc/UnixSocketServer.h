#pragma once

#include "Protocol.h"
#include <thread>
#include <mutex>
#include <queue>
#include <atomic>
#include <memory>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>

class UnixSocketServer {
public:
    UnixSocketServer(const std::string& socketPath) : socketPath_(socketPath), serverSocket_(-1), running_(false) {}

    ~UnixSocketServer() {
        stop();
    }

    bool start() {
        serverSocket_ = socket(AF_UNIX, SOCK_DGRAM, 0);
        if (serverSocket_ < 0) {
            return false;
        }

        unlink(socketPath_.c_str());

        struct sockaddr_un addr;
        memset(&addr, 0, sizeof(addr));
        addr.sun_family = AF_UNIX;
        strncpy(addr.sun_path, socketPath_.c_str(), sizeof(addr.sun_path) - 1);

        if (bind(serverSocket_, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
            close(serverSocket_);
            return false;
        }

        running_ = true;
        receiverThread_ = std::make_unique<std::thread>([this]() { receiveLoop(); });
        return true;
    }

    void stop() {
        running_ = false;
        if (serverSocket_ >= 0) {
            close(serverSocket_);
            serverSocket_ = -1;
        }
        if (receiverThread_ && receiverThread_->joinable()) {
            receiverThread_->join();
        }
        unlink(socketPath_.c_str());
    }

    bool sendMessage(const std::shared_ptr<Message>& msg) {
        std::lock_guard<std::mutex> lock(sendMutex_);
        if (serverSocket_ < 0) return false;

        std::vector<uint8_t> buffer(sizeof(MessageHeader) + msg->payload.size());
        memcpy(buffer.data(), &msg->header, sizeof(MessageHeader));
        if (!msg->payload.empty()) {
            memcpy(buffer.data() + sizeof(MessageHeader), msg->payload.data(), msg->payload.size());
        }

        struct sockaddr_un addr;
        memset(&addr, 0, sizeof(addr));
        addr.sun_family = AF_UNIX;
        strncpy(addr.sun_path, socketPath_.c_str(), sizeof(addr.sun_path) - 1);

        ssize_t sent = sendto(serverSocket_, buffer.data(), buffer.size(), 0,
                              (struct sockaddr*)&addr, sizeof(addr));
        return sent > 0;
    }

    std::shared_ptr<Message> receiveMessage() {
        std::lock_guard<std::mutex> lock(receiveMutex_);
        if (messageQueue_.empty()) {
            return nullptr;
        }
        auto msg = messageQueue_.front();
        messageQueue_.pop();
        return msg;
    }

    bool hasMessages() const {
        std::lock_guard<std::mutex> lock(receiveMutex_);
        return !messageQueue_.empty();
    }

private:
    void receiveLoop() {
        std::vector<uint8_t> buffer(65536);

        while (running_) {
            struct sockaddr_un clientAddr;
            socklen_t clientLen = sizeof(clientAddr);

            ssize_t received = recvfrom(serverSocket_, buffer.data(), buffer.size(), 0,
                                        (struct sockaddr*)&clientAddr, &clientLen);

            if (received > 0) {
                auto msg = std::make_shared<Message>();
                if (received >= sizeof(MessageHeader)) {
                    memcpy(&msg->header, buffer.data(), sizeof(MessageHeader));
                    size_t payloadSize = received - sizeof(MessageHeader);
                    if (payloadSize > 0) {
                        msg->payload.resize(payloadSize);
                        memcpy(msg->payload.data(), buffer.data() + sizeof(MessageHeader), payloadSize);
                    }

                    if (msg->isValid()) {
                        std::lock_guard<std::mutex> lock(receiveMutex_);
                        messageQueue_.push(msg);
                    }
                }
            }

            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }

    std::string socketPath_;
    int serverSocket_;
    std::atomic<bool> running_;
    std::unique_ptr<std::thread> receiverThread_;
    std::queue<std::shared_ptr<Message>> messageQueue_;
    std::mutex sendMutex_;
    std::mutex receiveMutex_;
};
