#pragma once

#include "TaskQueue.h"
#include "Job.h"
#include <vector>
#include <memory>
#include <functional>
#include <atomic>
#include <queue>
#include <condition_variable>

struct ThreadPoolConfig {
    uint32_t threadCount;
    uint32_t queueSize;
    bool enableStealing;
};

class ThreadPool {
public:
    explicit ThreadPool(const ThreadPoolConfig& config) : config_(config), stop_(false) {
        queues_.reserve(config.threadCount);
        for (uint32_t i = 0; i < config.threadCount; ++i) {
            queues_.push_back(std::make_unique<TaskQueue>());
            queues_[i]->setMaxSize(config.queueSize);
        }

        cvs_.reserve(config.threadCount);
        for (uint32_t i = 0; i < config.threadCount; ++i) {
            cvs_.push_back(std::make_unique<std::condition_variable>());
        }

        for (uint32_t i = 0; i < config.threadCount; ++i) {
            threads_.emplace_back([this, i]() {
                this->workerLoop(i);
            });
        }
    }

    ~ThreadPool() {
        stop_.store(true);
        for (auto& cv : cvs_) {
            cv->notify_all();
        }
        for (auto& thread : threads_) {
            if (thread.joinable()) {
                thread.join();
            }
        }
    }

    uint32_t getThreadCount() const {
        return config_.threadCount;
    }

    void submit(std::function<void()> func, uint32_t hintThread = 0) {
        uint32_t threadIndex = hintThread % config_.threadCount;
        if (!queues_[threadIndex]->push(std::move(func))) {
            for (uint32_t i = 0; i < config_.threadCount; ++i) {
                if (queues_[i]->push(std::move(func))) {
                    return;
                }
            }
        }
    }

    template<typename F>
    std::shared_ptr<IJob> submitJob(F&& func, uint32_t hintThread = 0) {
        auto job = std::make_shared<LambdaJob>(std::forward<F>(func));
        submit([job]() { job->execute(); }, hintThread);
        return job;
    }

    void waitAll() {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    size_t getQueueSize(uint32_t threadIndex) const {
        if (threadIndex >= config_.threadCount) return 0;
        return queues_[threadIndex]->size();
    }

private:
    void workerLoop(uint32_t threadIndex) {
        while (!stop_.load()) {
            std::function<void()> task;
            bool found = false;

            if (queues_[threadIndex]->pop(task)) {
                found = true;
            } else if (config_.enableStealing) {
                for (uint32_t i = 1; i < config_.threadCount; ++i) {
                    uint32_t stealIndex = (threadIndex + i) % config_.threadCount;
                    if (queues_[stealIndex]->steal(task)) {
                        found = true;
                        break;
                    }
                }
            }

            if (found) {
                task();
            } else {
                std::unique_lock<std::mutex> lock(mtx_);
                cvs_[threadIndex]->wait_for(lock, std::chrono::milliseconds(1));
            }
        }
    }

    ThreadPoolConfig config_;
    std::atomic<bool> stop_;
    std::vector<std::thread> threads_;
    std::vector<std::unique_ptr<TaskQueue>> queues_;
    std::vector<std::unique_ptr<std::condition_variable>> cvs_;
    std::mutex mtx_;
};
