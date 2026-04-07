# ticktick-client

Unofficial TickTick API client for Node.js/TypeScript.

> **Note**: This is an unofficial library using TickTick's private web API. It may break if TickTick changes their API. Use at your own risk.

## Features

- Full TypeScript support with strict types
- Cookie-based session management with auto re-authentication
- Pluggable session stores (memory, file, or custom)
- ESM + CJS dual build
- Zero runtime dependencies

## Installation

```bash
npm install ticktick-client
```

## Quick Start

```typescript
import { TickTickClient } from 'ticktick-client';

const client = new TickTickClient({
  credentials: {
    username: 'your@email.com',
    password: 'your-password',
  },
});

// Auto-login on first request
const tasks = await client.tasks.list('inbox');
console.log(tasks);
```

## Session Persistence

### File-based (recommended)

```typescript
import { TickTickClient, FileSessionStore } from 'ticktick-client';

const client = new TickTickClient({
  credentials: { username: '...', password: '...' },
  sessionStore: new FileSessionStore('./.ticktick-session.json'),
});
```

### Memory-based

```typescript
import { TickTickClient, MemorySessionStore } from 'ticktick-client';

const store = new MemorySessionStore();
const client = new TickTickClient({
  credentials: { username: '...', password: '...' },
  sessionStore: store,
});
```

### Provide a session directly

```typescript
const client = new TickTickClient({
  session: savedSession, // TickTickSession object
});
```

## API

### Tasks

```typescript
// List tasks in a project
const tasks = await client.tasks.list('projectId');

// Get a specific task
const task = await client.tasks.get('projectId', 'taskId');

// Create a task
await client.tasks.create({
  title: 'Buy groceries',
  projectId: 'inbox',
  priority: 3, // 0=none, 1=low, 3=medium, 5=high
  dueDate: '2026-12-31T00:00:00.000Z',
});

// Update a task
await client.tasks.update({ id: 'taskId', projectId: 'projectId', title: 'Updated' });

// Delete a task
await client.tasks.delete('projectId', 'taskId');

// Batch create
await client.tasks.createMany([{ title: 'Task 1', projectId: 'id' }, ...]);

// Move task to another project
await client.tasks.move({ taskId: 'id', fromProjectId: 'a', toProjectId: 'b' });

// Pin / unpin
await client.tasks.pin('projectId', 'taskId');
await client.tasks.unpin('projectId', 'taskId');

// Iterate completed tasks (paginated)
for await (const task of client.tasks.iterateCompleted()) {
  console.log(task.title);
}

// Trash
const trashed = await client.tasks.listTrash();
await client.tasks.restore('projectId', 'taskId');
```

### Projects

```typescript
const projects = await client.projects.list();
const project = await client.projects.get('projectId');
await client.projects.create({ name: 'My Project', color: '#ff0000' });
await client.projects.update({ id: 'projectId', name: 'Renamed' });
await client.projects.delete('projectId');
const columns = await client.projects.listColumns('projectId');
```

### Tags

```typescript
const tags = await client.tags.list();
await client.tags.create({ name: 'work', color: '#0000ff' });
await client.tags.update({ name: 'work', color: '#ff0000' });
await client.tags.delete('work');
await client.tags.rename('old-name', 'new-name');
await client.tags.merge('source-tag', 'target-tag');
```

### Habits

```typescript
const habits = await client.habits.list();
await client.habits.create({
  name: 'Exercise',
  repeatRule: 'FREQ=DAILY',
  goal: 1,
  step: 1,
  unit: 'times',
  type: 'boolean',
  recordEnable: false,
});

// Check in a habit
await client.habits.upsertCheckin({
  habitId: 'id',
  date: new Date(),
  goal: 1,
  value: 1,
  status: 'done',
});

// Week stats
const stats = await client.habits.getWeekStats('2026-04-07');
```

### Focus (Pomodoro)

```typescript
// Start a focus session
await client.focus.start({ duration: 25, focusOnTitle: 'Deep work' });

// Control
await client.focus.pause();
await client.focus.resume();
await client.focus.finish();
await client.focus.stop();

// Local state (no network call)
const state = client.focus.getState();

// Analytics
const heatmap = await client.focus.getHeatmap();
const distribution = await client.focus.getDistribution('2026-01-01', '2026-04-07');
```

### Statistics

```typescript
const summary = await client.statistics.getSummary();
const ranking = await client.statistics.getRanking();
const daily = await client.statistics.getTaskStats('2026-01-01', '2026-04-07');
```

### Countdowns

```typescript
const countdowns = await client.countdowns.list();
await client.countdowns.create({ name: 'Project Launch', date: new Date('2026-12-31') });
await client.countdowns.update({ id: 'id', name: 'Updated Name' });
await client.countdowns.delete('id');
```

### User

```typescript
const profile = await client.user.getProfile();
```

## Semantic Helpers

```typescript
import { parseTaskPriority, formatTaskStatus } from 'ticktick-client';

parseTaskPriority(3);      // 'medium'
formatTaskStatus('completed'); // 2
```

## License

MIT
