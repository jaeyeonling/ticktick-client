# Contributing

Thanks for your interest in contributing to ticktick-client!

## Prerequisites

- Node.js >= 22
- npm

## Setup

```bash
git clone https://github.com/jaeyeonling/ticktick-client.git
cd ticktick-client
npm install
```

## Development

```bash
npm run build      # compile
npm test           # run tests
npm run lint       # type-check
```

## Live Integration Tests

Unit tests run without credentials. For live API tests against a real TickTick account:

```bash
cp .env.example .env
# fill in TICKTICK_USERNAME and TICKTICK_PASSWORD
npx tsx test-live.ts
```

> **Warning**: Live tests hit the real TickTick API. Use a test account.

## Project Structure

```
src/
├── client.ts          # TickTickClient entry point
├── types.ts           # shared TypeScript types
├── session-store.ts   # MemorySessionStore / FileSessionStore
├── semantic.ts        # priority/status helpers
├── errors.ts          # error classes
├── internal/          # internal utilities (ids, cookies)
└── modules/           # tasks, projects, tags, habits, focus, statistics, user, countdowns
tests/                 # mirrors src/ structure
```

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Add tests for any new functionality
3. Make sure `npm test` and `npm run lint` pass
4. Open a pull request

## Important Notes

- This library wraps TickTick's **private** web API. Endpoints may change without notice.
- Do not commit `.env` or any session files (`*.session.json`).
- Keep runtime dependencies at zero — all deps go in `devDependencies`.
