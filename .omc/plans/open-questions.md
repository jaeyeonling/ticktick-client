# Open Questions

## tdd-full-implementation - 2026-04-07

- [ ] Issue #6 (RRULE): Should the client validate RRULE strings or pass them through as-is to the API? -- Affects whether we need an RRULE parsing dependency
- [ ] Issue #9 (Async Iterator): What is the page size for completed tasks pagination? Need to confirm from API behavior -- Affects iterator implementation
- [ ] Issue #22 (Focus local state): Should local session state persist across process restarts (via session store) or be ephemeral? -- Affects architecture of FocusSessionManager
- [ ] Issue #25 (Countdowns): API endpoints for countdowns are not yet documented in the codebase. Need to reverse-engineer from TickTick web app -- Blocks implementation
- [ ] Issue #30 (Integration tests): What credentials strategy for CI? Encrypted secrets or skip in CI? -- Affects CI pipeline configuration
- [ ] Issue #16 (Upsert checkin): Does the API provide a native upsert endpoint, or do we need to implement check-then-create/update client-side? -- Affects implementation complexity
