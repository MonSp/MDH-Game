CXX := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -D__EMSCRIPTEN__ -I../src/server -I/tmp/googletest/googletest/include
GTEST_LIBS := /tmp/googletest/build/lib/libgtest.a /tmp/googletest/build/lib/libgtest_main.a -lpthread

GTEST_SRCS := $(wildcard */*.test.cpp)
GTEST_BINS := $(GTEST_SRCS:.cpp=)

.PHONY: all clean run sim

all: $(GTEST_BINS)

%: %.cpp
	$(CXX) $(CXXFLAGS) $< -o $@ $(GTEST_LIBS)

sim: simulation/wasm_simulation.cpp
	$(CXX) -std=c++17 -Wall -O2 -ULLAMA_CPP_BACKEND -I../src/server -I../third_party/llama.cpp/include -I../third_party/llama.cpp/ggml/include $< -o simulation/wasm_simulation -lpthread
	@echo "=== 编译完成: simulation/wasm_simulation ==="
	@echo "运行: ./simulation/wasm_simulation [npcCount] [frames] [snapshotInterval] [threads]"
	@echo "示例: ./simulation/wasm_simulation 200 500 100 4"

run: all
	@fail=0; for t in $(GTEST_BINS); do echo "=== Running $$t ==="; ./$$t || fail=1; done; exit $$fail

clean:
	rm -f $(GTEST_BINS) simulation/wasm_simulation
