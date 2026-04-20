#pragma once

#include <atomic>
#include <functional>
#include <memory>
#include <vector>
#include <thread>
#include <future>

class IJob {
public:
    virtual ~IJob() = default;
    virtual void execute() = 0;
    virtual bool isFinished() const = 0;
    virtual void wait() = 0;
};

template<typename F>
class Job : public IJob {
public:
    Job(F&& func) : func_(std::forward<F>(func)), promise_(std::make_shared<std::promise<void>>()) {
        future_ = promise_->get_future();
    }

    void execute() override {
        func_();
        promise_->set_value();
    }

    bool isFinished() const override {
        return future_.wait_for(std::chrono::seconds(0)) == std::future_status::ready;
    }

    void wait() override {
        future_.wait();
    }

private:
    F func_;
    std::shared_ptr<std::promise<void>> promise_;
    std::future<void> future_;
};

class LambdaJob : public IJob {
public:
    LambdaJob(std::function<void()>&& func) : func_(std::move(func)), finished_(false) {}

    void execute() override {
        if (func_) {
            func_();
        }
        finished_.store(true);
    }

    bool isFinished() const override {
        return finished_.load();
    }

    void wait() override {
        while (!finished_.load()) {
            std::this_thread::yield();
        }
    }

private:
    std::function<void()> func_;
    std::atomic<bool> finished_;
};

class JobWithResult : public IJob {
public:
    template<typename F, typename R = std::result_of_t<F()>>
    Job(F&& func) : promise_(std::make_shared<std::promise<R>>()) {
        future_ = promise_->get_future();
        func_ = [this, f = std::forward<F>(func)]() {
            if constexpr (std::is_same_v<R, void>) {
                f();
                promise_->set_value();
            } else {
                promise_->set_value(f());
            }
        };
    }

    void execute() override {
        func_();
    }

    bool isFinished() const override {
        return future_.wait_for(std::chrono::seconds(0)) == std::future_status::ready;
    }

    void wait() override {
        future_.wait();
    }

    R get() {
        return future_.get();
    }

private:
    std::function<void()> func_;
    std::shared_ptr<std::promise<R>> promise_;
    std::future<R> future_;
};
