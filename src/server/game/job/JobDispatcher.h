#pragma once

#include "ThreadPool.h"
#include "Job.h"
#include <vector>
#include <memory>
#include <functional>
#include <algorithm>

class JobDispatcher {
public:
    explicit JobDispatcher(ThreadPool* pool) : threadPool_(pool) {}

    template<typename F>
    std::shared_ptr<IJob> dispatch(F&& func, uint32_t threadHint = 0) {
        return threadPool_->submitJob(std::forward<F>(func), threadHint);
    }

    std::vector<std::shared_ptr<IJob>> dispatchBatch(size_t batchSize, std::function<void(size_t)>&& func) {
        std::vector<std::shared_ptr<IJob>> jobs;
        jobs.reserve(batchSize);

        for (size_t i = 0; i < batchSize; ++i) {
            size_t index = i;
            auto job = dispatch([func, index]() { func(index); }, static_cast<uint32_t>(index % threadPool_->getThreadCount()));
            jobs.push_back(job);
        }

        return jobs;
    }

    template<typename T, typename Func>
    std::vector<std::shared_ptr<IJob>> dispatchParallel(const std::vector<T>& items, Func&& func) {
        std::vector<std::shared_ptr<IJob>> jobs;
        jobs.reserve(items.size());

        size_t threadCount = threadPool_->getThreadCount();
        size_t chunkSize = (items.size() + threadCount - 1) / threadCount;

        for (size_t t = 0; t < threadCount; ++t) {
            size_t start = t * chunkSize;
            size_t end = std::min(start + chunkSize, items.size());

            if (start >= items.size()) break;

            auto job = dispatch([&items, func, start, end]() {
                for (size_t i = start; i < end; ++i) {
                    func(items[i], i);
                }
            }, static_cast<uint32_t>(t));

            jobs.push_back(job);
        }

        return jobs;
    }

    void waitForAll(const std::vector<std::shared_ptr<IJob>>& jobs) {
        for (auto& job : jobs) {
            if (job) {
                job->wait();
            }
        }
    }

    void parallelFor(size_t start, size_t end, std::function<void(size_t)>&& func) {
        size_t threadCount = threadPool_->getThreadCount();
        size_t chunkSize = (end - start + threadCount - 1) / threadCount;

        std::vector<std::shared_ptr<IJob>> jobs;
        jobs.reserve(threadCount);

        for (size_t t = 0; t < threadCount; ++t) {
            size_t chunkStart = start + t * chunkSize;
            size_t chunkEnd = std::min(chunkStart + chunkSize, end);

            if (chunkStart >= end) break;

            auto job = dispatch([func, chunkStart, chunkEnd]() {
                for (size_t i = chunkStart; i < chunkEnd; ++i) {
                    func(i);
                }
            }, static_cast<uint32_t>(t));

            jobs.push_back(job);
        }

        waitForAll(jobs);
    }

private:
    ThreadPool* threadPool_;
};
