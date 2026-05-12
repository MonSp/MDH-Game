#include "baker_types.h"
#include "voxel_reader.h"
#include "renderer_software.h"
#include "renderer_orx.h"
#include "atlas_packer.h"

#include <cstdio>
#include <cstring>
#include <string>
#include <sys/stat.h>
#include <sys/types.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <chrono>
#include <algorithm>

struct TimelineEvent {
    int threadId;
    const char* label;
    int angleIdx;
    double msFromStart;
};

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static bool dirExists(const char* path) {
    struct stat st;
    return stat(path, &st) == 0 && S_ISDIR(st.st_mode);
}

static bool makeDir(const char* path) {
    return mkdir(path, 0755) == 0 || dirExists(path);
}

static void printUsage(const char* prog) {
    printf("orx-baker - Offline Voxel Pre-render Pipeline\n\n");
    printf("Usage: %s [options]\n\n", prog);
    printf("Options:\n");
    printf("  --mode <sw|orx>     Rendering mode (default: sw)\n");
    printf("  --output <dir>      Output directory (default: ./output)\n");
    printf("  --frame-size <px>   Frame size in pixels (default: 128)\n");
    printf("  --angles <n>        Number of direction angles (default: 8)\n");
    printf("  --sample            Generate and bake sample capital voxel data\n");
    printf("  --voxel <path>      Load voxel data from JSON file\n");
    printf("  --label <name>      Asset label for atlas entries (default: capital)\n");
    printf("  --threads <n>       Render threads (default: auto)\n");
    printf("  --help              Show this help\n");
    printf("\nModes:\n");
    printf("  sw   - Software renderer (no OpenGL required, PoC)\n");
    printf("  orx  - ORX headless renderer (requires ORX + OpenGL headers)\n");
}

using Clock = std::chrono::steady_clock;
using Ms = std::chrono::milliseconds;

int main(int argc, char** argv) {
    setbuf(stdout, NULL);
    setbuf(stderr, NULL);
    const char* mode = "sw";
    const char* outputDir = "./output";
    int frameSize = 128;
    int numAngles = 8;
    bool useSample = false;
    const char* voxelPath = nullptr;
    const char* label = "capital";
    int numThreads = 0;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--help") == 0) {
            printUsage(argv[0]);
            return 0;
        } else if (strcmp(argv[i], "--mode") == 0 && i + 1 < argc) {
            mode = argv[++i];
        } else if (strcmp(argv[i], "--output") == 0 && i + 1 < argc) {
            outputDir = argv[++i];
        } else if (strcmp(argv[i], "--frame-size") == 0 && i + 1 < argc) {
            frameSize = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--angles") == 0 && i + 1 < argc) {
            numAngles = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--sample") == 0) {
            useSample = true;
        } else if (strcmp(argv[i], "--voxel") == 0 && i + 1 < argc) {
            voxelPath = argv[++i];
        } else if (strcmp(argv[i], "--label") == 0 && i + 1 < argc) {
            label = argv[++i];
        } else if (strcmp(argv[i], "--threads") == 0 && i + 1 < argc) {
            numThreads = atoi(argv[++i]);
        }
    }

    printf("╔══════════════════════════════════════════╗\n");
    printf("║   orx-baker  v0.1.0  (Phase 0 PoC)      ║\n");
    printf("║   Offline Voxel Pre-render Pipeline      ║\n");
    printf("╠══════════════════════════════════════════╣\n");
    printf("║  Mode:       %-27s ║\n", mode);
    printf("║  Output:     %-27s ║\n", outputDir);
    printf("║  Frame Size: %-27d ║\n", frameSize);
    printf("║  Angles:     %-27d ║\n", numAngles);
    printf("║  Threads:    %-27d ║\n", numThreads > 0 ? numThreads : (int)std::thread::hardware_concurrency());
    printf("╚══════════════════════════════════════════╝\n\n");

    if (!makeDir(outputDir)) {
        printf("[ERROR] Cannot create output directory: %s\n", outputDir);
        return 1;
    }

    VoxelGrid grid;
    if (voxelPath) {
        printf("[INFO] Loading voxel data from: %s\n", voxelPath);
        grid = VoxelReader::loadFromJSON(voxelPath);
        if (grid.dimX == 0) {
            printf("[ERROR] Failed to load voxel data from: %s\n", voxelPath);
            return 1;
        }
        printf("[INFO] Loaded %dx%dx%d grid, %d solid voxels\n",
               grid.dimX, grid.dimY, grid.dimZ,
               grid.countSolid());
    } else if (useSample) {
        printf("[INFO] Generating sample capital voxel data...\n");
        grid = VoxelReader::createSampleCapital();
    } else {
        const char* dataFile = "voxel_data/capital_sample.json";
        printf("[INFO] Loading voxel data from: %s\n", dataFile);
        grid = VoxelReader::loadFromJSON(dataFile);
    }

    if (grid.dimX == 0 || grid.dimY == 0 || grid.dimZ == 0) {
        printf("[ERROR] Invalid voxel grid dimensions (%d,%d,%d)\n", grid.dimX, grid.dimY, grid.dimZ);
        return 1;
    }

    AtlasPacker atlas;
    float pitch = 35.0f * (float)M_PI / 180.0f;

    if (strcmp(mode, "orx") == 0) {
#ifdef __orxHEADLESS__
        OrxRenderer renderer(frameSize, frameSize, outputDir);
        if (!renderer.init()) {
            printf("[ERROR] Failed to initialize ORX renderer\n");
            return 1;
        }

        printf("[INFO] Baking %d angles using ORX headless RTT...\n", numAngles);
        if (!renderer.bakeDirections("CapitalBuilding", grid, numAngles,
                                     30.0f, 30.0f, "capital")) {
            printf("[ERROR] ORX bake failed\n");
            return 1;
        }

        for (int a = 0; a < numAngles; a++) {
            char name[64];
            snprintf(name, sizeof(name), "capital_%02d", a);
            atlas.addEntry(name, frameSize, frameSize);
        }

        renderer.cleanup();
#else
        printf("[ERROR] ORX mode requires __orxHEADLESS__ to be defined.\n");
        printf("[INFO]  Build with: -D__orxHEADLESS__ and link against ORX engine\n");
        printf("[INFO]  Falling back to software renderer...\n");
        mode = "sw";
#endif
    }

    float voxelScale = (grid.dimX + grid.dimZ > 100) ? 1.2f : 6.5f;
    printf("[INFO] Using voxel scale: %.1f (grid %dx%dx%d)\n",
           voxelScale, grid.dimX, grid.dimY, grid.dimZ);

    if (strcmp(mode, "sw") == 0) {
        std::string typeDir = std::string(outputDir) + "/buildings";
        makeDir(typeDir.c_str());

        int nThreads = numThreads > 0 ? numThreads : (int)std::thread::hardware_concurrency();
        if (nThreads < 1) nThreads = 1;
        if (nThreads > numAngles) nThreads = numAngles;

        printf("[INFO] Baking %d angles using software renderer (%d threads)...\n",
               numAngles, nThreads);

        std::vector<SoftwareRenderer::PixelBuffer> pixelBuffers(numAngles,
            SoftwareRenderer::PixelBuffer(frameSize, frameSize));

        // Per-frame wall-times, no locks
        std::vector<double> frameWalls(numAngles, 0.0);
        // Per-frame layer progress counters (atomic, lock-free)
        std::vector<std::atomic<int>> layerCounters(numAngles);
        for (auto& c : layerCounters) c.store(0, std::memory_order_relaxed);

        auto totalStart = Clock::now();

        // --- Per-thread timeline buffers (local, no lock) ---
        std::vector<std::vector<TimelineEvent>> timelines(nThreads);

        // --- Launch worker threads (ZERO I/O in hot path) ---
        std::vector<std::thread> workers;
        for (int t = 0; t < nThreads; t++) {
            workers.emplace_back([&, t]() {
                auto& tl = timelines[t];
                auto record = [&](const char* label, int a) {
                    double ms = std::chrono::duration<double, std::milli>(
                        Clock::now() - totalStart).count();
                    tl.push_back({t, label, a, ms});
                };

                record("thread-start", -1);

                for (int a = t; a < numAngles; a += nThreads) {
                    record("frame-begin", a);
                    auto frameStart = Clock::now();

                    SoftwareRenderer renderer(frameSize, frameSize);
                    renderer.renderVoxelIsometric(
                        pixelBuffers[a], grid,
                        2.0f * (float)M_PI * (float)a / (float)numAngles,
                        pitch, voxelScale,
                        &layerCounters[a], t);

                    auto frameEnd = Clock::now();
                    frameWalls[a] = std::chrono::duration<double, std::milli>(
                        frameEnd - frameStart).count();
                    record("frame-end", a);
                }

                record("thread-done", -1);
            });
        }

        // --- Progress monitor (prints once per second, no locks) ---
        std::atomic<bool> monitorDone(false);
        std::thread monitor([&]() {
            auto lastPrint = Clock::now();
            while (!monitorDone.load(std::memory_order_relaxed)) {
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
                auto now = Clock::now();
                if (std::chrono::duration<double>(now - lastPrint).count() < 1.0)
                    continue;
                lastPrint = now;

                int running = 0, done = 0;
                for (int a = 0; a < numAngles; a++) {
                    int layer = layerCounters[a].load(std::memory_order_relaxed);
                    if (frameWalls[a] > 0.0) done++;
                    else if (layer > 0) running++;
                }
                printf("\r  [monitor] running=%d done=%d/%d",
                       running, done, numAngles);
                fflush(stdout);
            }
            printf("\r                                              \r");
            fflush(stdout);
        });

        for (auto& w : workers) w.join();
        monitorDone.store(true, std::memory_order_relaxed);
        monitor.join();

        auto totalEnd = Clock::now();
        double totalMs = std::chrono::duration<double, std::milli>(
            totalEnd - totalStart).count();

        // --- Merge & dump timeline ---
        {
            std::vector<TimelineEvent> merged;
            for (auto& tl : timelines)
                for (auto& ev : tl)
                    merged.push_back(ev);
            std::sort(merged.begin(), merged.end(),
                [](const TimelineEvent& a, const TimelineEvent& b) {
                    return a.msFromStart < b.msFromStart;
                });

            printf("\n========== THREAD TIMELINE ==========\n");
            printf("  %8s  %-14s  %6s  %s\n", "t(ms)", "event", "angle", "");
            for (auto& ev : merged) {
                printf("  %8.1f  %-14s",
                       ev.msFromStart, ev.label);
                if (ev.angleIdx >= 0)
                    printf("  #%4d ", ev.angleIdx);
                else
                    printf("  %6s", " ");
                printf(" <-- T%d\n", ev.threadId);
            }

            // Parallelism analysis
            int n = (int)merged.size();
            double maxOverlap = 0.0;
            for (int i = 0; i < n; i++) {
                if (strcmp(merged[i].label, "frame-begin") != 0) continue;
                double begin = merged[i].msFromStart;
                // find matching frame-end for same angle
                for (int j = i + 1; j < n; j++) {
                    if (strcmp(merged[j].label, "frame-end") == 0 &&
                        merged[j].angleIdx == merged[i].angleIdx &&
                        merged[j].threadId == merged[i].threadId) {
                        double end = merged[j].msFromStart;
                        // count how many OTHER threads have frames active during [begin, end]
                        int concurrent = 1;
                        for (int k = 0; k < n; k++) {
                            if (strcmp(merged[k].label, "frame-begin") == 0) continue;
                            if (strcmp(merged[k].label, "frame-end") == 0) {
                                double fEnd = merged[k].msFromStart;
                                // find its begin
                                for (int l = k - 1; l >= 0; l--) {
                                    if (merged[l].angleIdx == merged[k].angleIdx &&
                                        merged[l].threadId == merged[k].threadId &&
                                        strcmp(merged[l].label, "frame-begin") == 0) {
                                        double fBegin = merged[l].msFromStart;
                                        if (merged[k].threadId != merged[i].threadId &&
                                            fBegin <= end && fEnd >= begin) {
                                            concurrent++;
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        if (concurrent > maxOverlap) maxOverlap = (double)concurrent;
                        break;
                    }
                }
            }
            printf("---------- ------------------- ----------\n");
            printf("  Max concurrent frames: %.0f (ideal: %d)\n", maxOverlap, nThreads);
            printf("  Total wall: %.0fms\n", totalMs);
            printf("========================================\n\n");
        }

        for (int a = 0; a < numAngles; a++) {
            printf("  frame %02d  angle=%3d°  %.0fms wall\n",
                   a, (int)(360.0f * a / numAngles), frameWalls[a]);
        }
        printf("\n[INFO] %d frames baked in %.1fs wall (%.0fms / frame, %d threads)\n",
               numAngles, totalMs / 1000.0, totalMs / numAngles, nThreads);

        for (int a = 0; a < numAngles; a++) {
            char name[64];
            snprintf(name, sizeof(name), "%s_%02d", label, a);
            atlas.addEntryWithFrame(name, frameSize, frameSize,
                                    pixelBuffers[a].rgba.data());
        }

        std::string atlasPath = std::string(outputDir) + "/buildings.atlas.png";
        if (atlas.compositeAndSavePNG(atlasPath.c_str())) {
            printf("[INFO] Atlas texture: %s\n", atlasPath.c_str());
        }
    }

    std::string jsonPath = std::string(outputDir) + "/buildings.atlas.json";
    atlas.writeJSON(jsonPath.c_str());

    printf("\n[DONE] Baked %d frames to: %s\n", numAngles, outputDir);
    printf("[INFO] Atlas metadata: %s\n", jsonPath.c_str());
    printf("[INFO] Next step: Load atlas in Three.js with BakedSpriteViewer\n");

    return 0;
}
