/**
 * Live integration test — requires .env with TICKTICK_USERNAME and TICKTICK_PASSWORD
 * Run: node --env-file=.env --import tsx/esm test-live.ts
 */

import { TickTickClient, FileSessionStore } from './src/index.js';

const username = process.env['TICKTICK_USERNAME'];
const password = process.env['TICKTICK_PASSWORD'];

if (!username || !password) {
  console.error('Missing TICKTICK_USERNAME or TICKTICK_PASSWORD in environment');
  process.exit(1);
}

const client = new TickTickClient({
  credentials: { username, password },
  sessionStore: new FileSessionStore('.ticktick-session.json'),
});

async function check<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    console.log(`  ⚠ ${label}: ${msg}`);
    return null;
  }
}

console.log('--- TickTick Live Test ---\n');

// User
const profile = await check('getProfile', () => client.user.getProfile());
if (profile) {
  console.log(`✓ Profile: ${profile.name ?? profile.username} (${profile.email})`);
  console.log(`  Pro: ${profile.pro ?? false}`);
}

// Projects
const projects = await check('projects.list', () => client.projects.list());
if (projects) {
  console.log(`\n✓ Projects (${projects.length}):`);
  for (const p of projects.slice(0, 5)) {
    console.log(`  - ${p.name} [${p.id}]`);
  }
}

// Tasks
const tasks = await check('tasks.list', () => client.tasks.list());
if (tasks) console.log(`\n✓ Tasks: ${tasks.length} total`);

// Tags
const tags = await check('tags.list', () => client.tags.list());
if (tags) {
  console.log(`\n✓ Tags: ${tags.length}`);
  for (const t of tags.slice(0, 5)) console.log(`  - ${t.name}`);
}

// Habits
const habits = await check('habits.list', () => client.habits.list());
if (habits) {
  console.log(`\n✓ Habits: ${habits.length}`);
  for (const h of habits.slice(0, 3)) {
    console.log(`  - ${h.name} (streak: ${h.currentStreak ?? 0})`);
  }
}

// User status (Pro info)
const status = await check('user.getStatus', () => client.user.getStatus());
if (status) {
  console.log(`\n✓ Status: pro=${status.pro}, proEndDate=${status.proEndDate?.slice(0, 10)}`);
}

// Statistics
console.log('\n--- Statistics ---');
const ranking = await check('statistics.getRanking', () => client.statistics.getRanking());
if (ranking) {
  console.log(`✓ Ranking: score=${ranking.score}, level=${ranking.level}, completed=${ranking.completedCount}`);
}

const completed = await check('statistics.listCompleted', () =>
  client.statistics.listCompleted('2026-04-01 00:00:00', '2026-04-08 00:00:00', 5),
);
if (completed) {
  console.log(`✓ Completed this week: ${completed.length} tasks`);
}

// Countdowns
const countdowns = await check('countdowns.list', () => client.countdowns.list());
if (countdowns) {
  console.log(`\n✓ Countdowns: ${countdowns.length}`);
  for (const c of countdowns.slice(0, 3)) console.log(`  - ${c.name} (${c.date})`);
}

// Focus
console.log('\n--- Focus ---');
const focusState = client.focus.getState();
console.log(`✓ Focus state: ${focusState.status ?? 'idle'}`);

console.log('\n--- Done ---');
