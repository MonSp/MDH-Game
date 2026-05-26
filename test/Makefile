CXX := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -D__EMSCRIPTEN__ -I../src/server -I/tmp/googletest/googletest/include
GTEST_LIBS := /tmp/googletest/build/lib/libgtest.a /tmp/googletest/build/lib/libgtest_main.a -lpthread

GTEST_SRCS := $(wildcard */*.test.cpp)
GTEST_BINS := $(GTEST_SRCS:.cpp=)

.PHONY: all clean run

all: $(GTEST_BINS)

%: %.cpp
	$(CXX) $(CXXFLAGS) $< -o $@ $(GTEST_LIBS)

run: all
	@fail=0; for t in $(GTEST_BINS); do echo "=== Running $$t ==="; ./$$t || fail=1; done; exit $$fail

clean:
	rm -f $(GTEST_BINS)
