# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `CountdownsModule` — list, create, update, delete countdowns (#25)
- `StatisticsModule` — getRanking, getTaskStats with date range (#23, #24)
- `UserModule` — getProfile (#18)
- `FocusModule` — start, pause, resume, finish, stop, getHeatmap, getHourDistribution, getDistribution, getState (#20, #21, #22)
- `HabitsModule` — create, update, delete, upsertCheckin, getWeekStats (#15, #16, #17)
- `TagsModule` — create, update, delete, rename, merge (#12, #13, #14)
- `ProjectsModule` — create, update, delete, listColumns (#10, #11)
- `TasksModule` — batch ops, move, subtask, pin/unpin, RRULE repeat, trash, iterateCompleted (#3–#9)
- Semantic helpers: parseTaskPriority, formatTaskPriority, parseTaskStatus, formatTaskStatus, etc.
- `MemorySessionStore` and `FileSessionStore` for session persistence
- Auto re-authentication on 401/403 responses

## [0.1.0] - 2026-04-07

### Added

- Initial project setup with core `TickTickClient`
- `TasksModule` — list, get, create, update, delete
- `ProjectsModule` — list, get
- `TagsModule` — list
- `HabitsModule` — list, getCheckins
- `FocusModule` — getTimeline
- `StatisticsModule` — getSummary
- Cookie-based session management
- ESM + CJS dual build via tsup
- Vitest test suite
