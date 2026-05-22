{
  "targets": [
    {
      "target_name": "world_gen",
      "sources": ["world_gen.cpp", "occlusion.cpp"],
      "include_dirs": [".."],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        ["OS=='linux'", {
          "cflags_cc": ["-std=c++17", "-O2", "-Wall"]
        }]
      ]
    },
    {
      "target_name": "ecs_engine",
      "sources": ["ecs_bridge.cpp"],
      "include_dirs": [".."],
      "cflags!": [ "-fno-exceptions", "-fno-rtti" ],
      "cflags_cc!": [ "-fno-exceptions", "-fno-rtti" ],
      "cflags_cc": ["-std=c++17", "-O3", "-Wall"],
      "libraries": ["-lpthread"]
    }
  ]
}
