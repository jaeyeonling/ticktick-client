# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-04-13

### Added

- `projects.listMembers(projectId)` — list shared-project members via `/api/v2/project/{id}/users` (#35)
- `assignee` and `creator` fields on `TickTickTask` for shared-project attribution (#35)
- `assignee` and `columnId` fields on `TickTickTaskDraft` for task creation (#35)
- `TickTickProjectMember` type exported from package (#35)

### Fixed

- `projects.listColumns()` now correctly unwraps the `{update: [...]}` envelope the API returns (#35)
- `projects.listColumns(projectId)` applies client-side filtering since the server ignores the projectId parameter (#35)

## [0.2.0] - 2026-04-07

### Added

- `CountdownsModule` — list, create, update, delete countdowns (#25)
- `StatisticsModule` — getRanking, listCompleted with date range (#23, #24)
- `UserModule` — getProfile, getStatus (#18)
- `FocusModule` — start, pause, resume, finish, stop, getTimeline, getOverview, getTiming, getState, syncState (#20, #21, #22)
- `HabitsModule` — create, update, delete, upsertCheckin, getCheckins, getWeekStats (#15, #16, #17)
- `TagsModule` — create, createMany, update, delete, deleteMany, rename, merge (#12, #13, #14)
- `ProjectsModule` — create, update, delete, deleteMany, listColumns (#10, #11)
- `TasksModule` — batch create/update/delete, move with `TickTickMoveResult`, subtask, pin/unpin, RRULE repeat, trash, iterateCompleted (#3–#9)
- Semantic helpers: parseTaskPriority, formatTaskPriority, parseTaskStatus, formatTaskStatus, parseHabitStatus, formatHabitStatus, parseCheckinStatus, formatCheckinStatus
- `MemorySessionStore` and `FileSessionStore` for session persistence
- Auto re-authentication on 401/403 responses
- Playwright-based API traffic capture script for endpoint verification
- Comprehensive README with feature coverage table and known limitations

### Fixed

- Focus analytics endpoints (heatmap, hourDistribution, distribution) documented as confirmed server-side 500 (#31)
- Task move returns `TickTickMoveResult` with `previousId` for ID tracking (#32)
- listTrash documented as non-functional — server ignores status filter (#33)
- Focus pause/resume/finish verified against real API with full lifecycle test (#34)

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
