# TDD Quality-First: Full Implementation Plan

> **Strategy:** Option 3 - TDD Quality First
> **Approach:** Write tests for existing code first (#1), then implement each feature with tests accompanying every step.
> **Created:** 2026-04-07

---

## Context

The `ticktick-client` project has a scaffolded core client (`TickTickClient`) with 6 module stubs (tasks, projects, tags, habits, focus, statistics). The client has authentication, session management, cookie handling, and basic CRUD for tasks. There are **zero tests** currently. 30 open issues cover features, tests, CI, and docs.

### Current Codebase Summary

| File | Status |
|------|--------|
| `src/client.ts` | Full implementation (auth, request, session, cookie merge, re-auth) |
| `src/session-store.ts` | Full implementation (MemorySessionStore, FileSessionStore) |
| `src/errors.ts` | Full implementation (TickTickError, TickTickAuthError, TickTickApiError) |
| `src/internal/ids.ts` | Full implementation (generateObjectId) |
| `src/internal/cookies.ts` | Full implementation (parseCookies, serializeCookies, mergeCookies) |
| `src/modules/tasks.ts` | Partial (list, listCompleted, create, update, complete, delete) |
| `src/modules/projects.ts` | Minimal (list only) |
| `src/modules/tags.ts` | Minimal (list only) |
| `src/modules/habits.ts` | Partial (list, getCheckins) |
| `src/modules/focus.ts` | Partial (getTimeline, getOverview) |
| `src/modules/statistics.ts` | Minimal (getSummary only) |
| `src/types.ts` | Type definitions for all modules |

### Testing Stack

- **vitest** 3.1.1 (already installed)
- **vitest.config.ts** configured with `environment: 'node'`
- Mock `fetch` via constructor DI (`options.fetch`)

---

## Work Objectives

1. Establish a solid test foundation for all existing code
2. Implement every remaining feature with tests written first (Red-Green-Refactor)
3. Set up CI/CD and documentation as final polish

---

## Guardrails

### Must Have
- Every new feature has tests written BEFORE implementation
- All existing code has unit tests before any new features are added
- Mock `fetch` via DI for all unit tests (no real network calls)
- Coverage for error paths, not just happy paths
- Each step maps to one or more GitHub issues

### Must NOT Have
- Real API calls in unit tests (reserved for #30)
- Breaking changes to existing public API signatures
- `console.log` in production code
- `any` types in new code

---

## Task Flow

```
Phase 0: Test Foundation (#1)
    |
    v
Phase 1: Core Enhancements (#19, #18)
    |
    v
Phase 2: Tasks Module (#3, #4, #5, #6, #7, #8, #9)
    |
    v
Phase 3: Projects Module (#10, #11)
    |
    v
Phase 4: Tags Module (#12, #13, #14)
    |
    v
Phase 5: Habits Module (#15, #16, #17)
    |
    v
Phase 6: Focus Module (#20, #21, #22)
    |
    v
Phase 7: Statistics & Countdowns (#23, #24, #25)
    |
    v
Phase 8: CI/CD & Docs (#26, #27, #2, #28, #29)
    |
    v
Phase 9: Integration Tests (#30)
```

---

## Detailed TODOs

### Phase 0: Test Foundation for Existing Code
**Issues:** #1
**Priority:** CRITICAL - Must complete before any feature work

#### Step 0-1: Internal Utilities Tests
- **File:** `src/internal/__tests__/ids.test.ts`
- **Tests:**
  - `generateObjectId()` returns 24-char hex string
  - `generateObjectId()` starts with valid timestamp hex
  - Two calls produce different IDs
- **Acceptance:** All tests pass, no implementation changes needed

#### Step 0-2: Cookie Utilities Tests
- **File:** `src/internal/__tests__/cookies.test.ts`
- **Tests:**
  - `parseCookies()` extracts name=value pairs from Set-Cookie headers
  - `parseCookies()` handles multiple Set-Cookie headers
  - `parseCookies()` returns empty object when no cookies
  - `serializeCookies()` joins cookies with "; "
  - `serializeCookies()` returns empty string for empty object
  - `mergeCookies()` overwrites base with next
  - `mergeCookies()` preserves base keys not in next
- **Acceptance:** All tests pass, no implementation changes needed

#### Step 0-3: Error Classes Tests
- **File:** `src/__tests__/errors.test.ts`
- **Tests:**
  - `TickTickError` is instance of Error with correct name
  - `TickTickAuthError` is instance of TickTickError
  - `TickTickApiError` carries url, method, status, responseBody
  - All errors preserve message
- **Acceptance:** All tests pass, error hierarchy verified

#### Step 0-4: Session Store Tests
- **File:** `src/__tests__/session-store.test.ts`
- **Tests:**
  - MemorySessionStore: load returns null when empty
  - MemorySessionStore: save then load returns session
  - MemorySessionStore: delete clears session
  - FileSessionStore: save writes JSON file, load reads it back
  - FileSessionStore: load returns null when file missing
  - FileSessionStore: delete removes the file
- **Acceptance:** All tests pass, use temp directory for FileSessionStore tests

#### Step 0-5: TickTickClient Core Tests
- **File:** `src/__tests__/client.test.ts`
- **Tests:**
  - Login succeeds: calls signon endpoint, persists session via store
  - Login fails: throws TickTickAuthError on non-ok response
  - `request()` calls `ensureSession()` before sending
  - `request()` re-authenticates on 401/403 when credentials available
  - `request()` throws TickTickAuthError on re-auth failure
  - Cookie merge: updates session cookies on every response
  - `isAuthenticated()` returns true when profile request succeeds
  - `isAuthenticated()` returns false when profile request fails
  - `logout()` clears session from memory and store
  - Constructor with session option: skips login on first request
- **Acceptance:** All tests pass using mock fetch, no real HTTP calls

#### Step 0-6: Existing Module Tests
- **Files:** `src/modules/__tests__/tasks.test.ts`, `projects.test.ts`, `tags.test.ts`, `habits.test.ts`, `focus.test.ts`, `statistics.test.ts`
- **Tests for each module:** Verify correct HTTP method, URL path, request body, and response parsing for every existing method
- **Acceptance:** All existing module methods have at least one happy-path and one error-path test

---

### Phase 1: Core Enhancements (TDD)
**Issues:** #19, #18

#### Step 1-1: Semantic Type Parsers and Formatters (#19)
- **Test file first:** `src/__tests__/semantic.test.ts`
- **Tests to write BEFORE implementation:**
  - `parseTaskPriority('high')` returns 5; `parseTaskPriority('low')` returns 1
  - `parseTaskPriority(3)` passes through numeric input
  - `parseTaskPriority('unknown')` returns undefined
  - `formatTaskPriority(5)` returns 'high'
  - `parseTaskStatus('completed')` returns 2; `formatTaskStatus(0)` returns 'open'
  - `parseHabitStatus('archived')` returns 1; `formatHabitStatus(0)` returns 'normal'
  - `parseCheckinStatus('done')` returns 2; `formatCheckinStatus(1)` returns 'undone'
- **Implementation file:** `src/semantic.ts`
- **Export from:** `src/index.ts`
- **Acceptance:** All parser/formatter tests green; exported from package entry point

#### Step 1-2: User getProfile (#18)
- **Test file first:** `src/modules/__tests__/user.test.ts`
- **Tests to write BEFORE implementation:**
  - `getProfile()` calls GET `/api/v2/user/profile`
  - Returns parsed user profile object
  - Throws on API error
- **Implementation:** `src/modules/user.ts`, wire into `client.ts`
- **Acceptance:** Tests green, `client.user.getProfile()` works

---

### Phase 2: Tasks Module (TDD)
**Issues:** #3, #4, #5, #6, #7, #8, #9

#### Step 2-1: Batch Operations (#3)
- **Tests first:** batchAdd, batchUpdate, batchDelete with array inputs
- **Verify:** Correct POST body format, handles empty arrays, returns results
- **Acceptance:** Tests green, batch methods available on `client.tasks`

#### Step 2-2: Move Between Projects (#4)
- **Tests first:** move(taskId, fromProjectId, toProjectId)
- **Verify:** Correct API endpoint and body, error on invalid IDs
- **Acceptance:** Tests green

#### Step 2-3: Subtask Support (#5)
- **Tests first:** addSubtask, updateSubtask, deleteSubtask
- **Verify:** Subtask items in request body, parent task relationship
- **Acceptance:** Tests green

#### Step 2-4: Recurrence (RRULE) Support (#6)
- **Tests first:** Create/update task with repeatFlag, parse RRULE string
- **Verify:** RRULE format validation, roundtrip consistency
- **Acceptance:** Tests green

#### Step 2-5: Pin and Unpin (#7)
- **Tests first:** pin(taskId), unpin(taskId)
- **Verify:** Correct API calls
- **Acceptance:** Tests green

#### Step 2-6: Trash Operations (#8)
- **Tests first:** listTrash(), restoreFromTrash(taskId)
- **Verify:** Correct endpoints, response parsing
- **Acceptance:** Tests green

#### Step 2-7: Async Iterator for Completed Tasks (#9)
- **Tests first:** `listCompletedIterator()` yields pages, stops when empty
- **Verify:** Pagination parameters, AsyncIterableIterator protocol
- **Acceptance:** Tests green, `for await...of` works

---

### Phase 3: Projects Module (TDD)
**Issues:** #10, #11

#### Step 3-1: Projects CRUD (#10)
- **Tests first:** create(draft), update(params), delete(projectId)
- **Verify:** Correct HTTP methods and paths, request bodies
- **Acceptance:** Tests green

#### Step 3-2: List Columns / Kanban Sections (#11)
- **Tests first:** listColumns(projectId)
- **Verify:** Correct endpoint, response parsing for column data
- **Acceptance:** Tests green

---

### Phase 4: Tags Module (TDD)
**Issues:** #12, #13, #14

#### Step 4-1: Tags CRUD (#12)
- **Tests first:** create(tag), update(tag), delete(tagName)
- **Acceptance:** Tests green

#### Step 4-2: Tags Rename (#13)
- **Tests first:** rename(oldName, newName)
- **Acceptance:** Tests green

#### Step 4-3: Tags Merge (#14)
- **Tests first:** merge(sourceTag, targetTag)
- **Acceptance:** Tests green

---

### Phase 5: Habits Module (TDD)
**Issues:** #15, #16, #17

#### Step 5-1: Habits CRUD (#15)
- **Tests first:** create(habit), update(habit), delete(habitId)
- **Acceptance:** Tests green

#### Step 5-2: Upsert Checkin (#16)
- **Tests first:** upsertCheckin creates when none exists, updates when exists
- **Verify:** Smart create-or-update logic
- **Acceptance:** Tests green

#### Step 5-3: Weekly Completion Statistics (#17)
- **Tests first:** getWeeklyStats(habitId) returns completion data
- **Acceptance:** Tests green

---

### Phase 6: Focus Module (TDD)
**Issues:** #20, #21, #22

#### Step 6-1: Session Control (#20)
- **Tests first:** start(), pause(), resume(), finish(), stop()
- **Verify:** Correct POST endpoints and state transitions
- **Acceptance:** Tests green

#### Step 6-2: Heatmap and Distribution Statistics (#21)
- **Tests first:** getHeatmap(range), getDistribution(range)
- **Acceptance:** Tests green

#### Step 6-3: Local Session State Management (#22)
- **Tests first:** Track local focus session state, timer logic
- **Verify:** State transitions (idle -> running -> paused -> running -> finished)
- **Acceptance:** Tests green

---

### Phase 7: Statistics & Countdowns (TDD)
**Issues:** #23, #24, #25

#### Step 7-1: User Ranking (#23)
- **Tests first:** getRanking() returns ranking data
- **Acceptance:** Tests green

#### Step 7-2: Task Statistics by Date Range (#24)
- **Tests first:** getTaskStats(startDate, endDate)
- **Acceptance:** Tests green

#### Step 7-3: Countdowns CRUD (#25)
- **Tests first:** list(), create(), update(), delete()
- **Implementation:** New `src/modules/countdowns.ts`, wire into client
- **Acceptance:** Tests green, `client.countdowns` available

---

### Phase 8: CI/CD & Documentation
**Issues:** #26, #27, #2, #28, #29

#### Step 8-1: GitHub Actions CI (#26)
- **File:** `.github/workflows/ci.yml`
- **Content:** Lint (tsc --noEmit), test (vitest run), build (tsup) on push/PR
- **Acceptance:** Pipeline runs and passes on push

#### Step 8-2: Automated npm Publish (#27)
- **File:** `.github/workflows/release.yml`
- **Content:** Publish to npm on version tag push
- **Acceptance:** Workflow exists and is syntactically valid

#### Step 8-3: README (#2)
- **File:** `README.md`
- **Content:** Installation, quick start, module-by-module usage examples, API reference link
- **Acceptance:** README covers all implemented modules

#### Step 8-4: TypeDoc API Documentation (#28)
- **Setup:** Add typedoc dependency, configure, generate
- **Acceptance:** `npm run docs` generates API site

#### Step 8-5: CHANGELOG (#29)
- **File:** `CHANGELOG.md`
- **Content:** Document all features implemented
- **Acceptance:** Covers all shipped features

---

### Phase 9: Integration Tests
**Issues:** #30

#### Step 9-1: Integration Test Suite
- **File:** `src/__tests__/integration/` directory
- **Content:** Tests against real TickTick API (gated by env var)
- **Scope:** Auth flow, CRUD roundtrips for tasks/projects/tags
- **Acceptance:** Tests pass with valid credentials, skip gracefully without them

---

## Success Criteria

1. **Test coverage:** Every public method has at least unit tests (happy + error paths)
2. **TDD discipline:** No feature implementation PR without accompanying tests
3. **CI green:** All tests pass in GitHub Actions
4. **Zero regressions:** Existing functionality preserved throughout
5. **All 30 issues closed** upon completion

---

## Execution Order Summary

| Phase | Issues | Description | Est. Complexity |
|-------|--------|-------------|-----------------|
| 0 | #1 | Test foundation for existing code | MEDIUM |
| 1 | #19, #18 | Core enhancements (semantic parsers, user profile) | LOW |
| 2 | #3-#9 | Tasks module (7 features) | HIGH |
| 3 | #10, #11 | Projects module (2 features) | LOW |
| 4 | #12-#14 | Tags module (3 features) | LOW |
| 5 | #15-#17 | Habits module (3 features) | MEDIUM |
| 6 | #20-#22 | Focus module (3 features) | MEDIUM |
| 7 | #23-#25 | Statistics & Countdowns (3 features) | LOW |
| 8 | #26-#29, #2 | CI/CD & Documentation (5 items) | LOW |
| 9 | #30 | Integration tests | MEDIUM |
