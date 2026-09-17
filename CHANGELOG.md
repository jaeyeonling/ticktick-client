# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-09-17

### Added

- `tasks.get(taskId, projectId)` — fetch a single task via `GET /api/v2/task/{id}` (#41)

### Changed

- `TickTickTaskUpdate.title` (and other draft fields) are optional, so partial updates type-check without a dummy title (#41)
- `projects.listColumns(projectId)` calls `GET /api/v2/column/project/{id}` instead of the bulk sync endpoint plus a client-side filter. `listColumns()` with no argument still uses `GET /api/v2/column?from=0` (#40). Live-checked 2026-09-17: the per-project path returned columns for 5/5 projects; bulk `from=0` was empty for the same account.

### Fixed

- `tasks.complete()` no longer wipes `dueDate`, `startDate`, and other omitted fields. `POST /api/v2/task/{id}` is a full replace, so complete / update / updateMany / pin / unpin / createSubtask now read the current task and merge before saving. Live-checked 2026-09-17: `get()` after complete keeps dueDate/startDate/tags/content; a daily RRULE task keeps dueDate and repeatFlag on the completed occurrence. REST complete still does not spawn the next rrule occurrence (same as the previous partial POST) (#41)

## [0.4.0] - 2026-09-16

### Added

- `reauthenticateOn` client option to override the session-expiry policy; default `isSessionExpiredError` is exported (#39)
- `deviceId` on `TickTickSession` so the `x-device` id survives restarts when a persistent session store is used (#39)

### Changed

- `isAuthenticated()` now rethrows network and non-auth API errors instead of returning `false` (#39)
- A plain `403` is treated as a permission error; only `401`, or `403` with a session `errorCode`, triggers re-login (#39)

### Fixed

- Concurrent requests hitting an expired session share a single signon call instead of one per request, avoiding TickTick's login rate limit (#39)
- Cookies deleted by the server (`Max-Age=0` / past `Expires`) are removed from the stored session; `token` and `csrfToken` are rebuilt from the merged cookie jar (#39)
- Re-authentication failures expose the underlying error via `TickTickAuthError.cause` (#39)

## [0.3.0] - 2026-04-22

### Added

- MCP server support (#37)

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
