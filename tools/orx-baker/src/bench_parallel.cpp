#include <cstdio>
#include <thread>
#include <vector>
#include <chrono>
#include <atomic>
#include <cmath>

using Clock = std::chrono::steady_clock;

int main(int argc, char** argv) {
    int nThreads = argc > 1 ? atoi(argv[1]) : 4;
    int workPerThread = argc > 2 ? atoi(argv[2]) : 100000000;

    printf("=== Parallel Benchmark: %d threads, %d iterations each ===\n",
           nThreads, workPerThread);

    std::vector<double> wallTimes(nThreads, 0.0);
    std::atomic<int> doneCount(0);

    auto totalStart = Clock::now();

    std::vector<std::thread> workers;
    for (int t = 0; t < nThreads; t++) {
        workers.emplace_back([&, t]() {
            auto start = Clock::now();

            // Pure CPU work — no I/O, no locks, no shared mutable state
            volatile double sum = 0.0;
            for (int i = 0; i < workPerThread; i++) {
                sum += std::sin((double)i * 0.001) * std::cos((double)i * 0.0007);
            }

            auto end = Clock::now();
            wallTimes[t] = std::chrono::duration<double, std::milli>(end - start).count();
            doneCount.fetch_add(1, std::memory_order_relaxed);
        });
    }

    for (auto& w : workers) w.join();

    auto totalEnd = Clock::now();
    double totalMs = std::chrono::duration<double, std::milli>(
        totalEnd - totalStart).count();

    printf("\nResults:\n");
    for (int t = 0; t < nThreads; t++) {
        printf("  Thread %d: %.0fms wall\n", t, wallTimes[t]);
    }
    printf("  Total wall: %.0fms\n", totalMs);

    double sumWall = 0.0;
    for (int t = 0; t < nThreads; t++) sumWall += wallTimes[t];
    double speedup = sumWall / totalMs;
    printf("  Sum of thread walls: %.0fms\n", sumWall);
    printf("  Effective speedup: %.2fx (ideal: %.2fx)\n", speedup, (double)nThreads);

    if (speedup > 1.5) {
        printf("\n[OK] True parallelism confirmed!\n");
    } else {
        printf("\n[WARN] No parallelism — threads are serialized!\n");
    }

    return 0;
}
