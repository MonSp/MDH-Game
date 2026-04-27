# Changelog

All notable changes to 《太古纪元：霸业》 (Xianxia Pixel MMORPG).

## [1.0.1.0] - 2026-04-27

### Added
- NPC chronicle event streaming via WebSocket at `/chronicle` path with 5-second batching
- LLM-powered NPC planning pipeline using Gemini Flash 2.0 for autonomous NPC decision-making
- NPC memory system: relationship matrix (50×50), interaction ring buffer (20/NPC), witnessed events (30/NPC)
- Plan parsing and validation layer for LLM-generated NPC action plans
- C++ IPC bridge (Unix sockets) connecting Node.js LLM client to the C++ ECS engine
- Family/clan dynasty system with pre-built families, guest elder mechanics, and imperial usurpation battles
- Game design documentation covering world-building, factions, cultivation, economy, and NPC AI

### Changed
- ECS component registration and entity management refactored for multi-component queries
- Documentation directory restructured with detailed system design docs

### Fixed
- Missing `<chrono>` includes in C++ ECS headers causing build failures on some compilers
