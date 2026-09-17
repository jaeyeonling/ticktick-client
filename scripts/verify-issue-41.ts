/**
 * Live verification for #41: POST /api/v2/task/{id} is a full replace,
 * so complete/update must merge onto the current task.
 *
 * Run: npx tsx --env-file=.env scripts/verify-issue-41.ts
 *
 * Creates throwaway tasks with prefix [issue-41-verify] and deletes them
 * in `finally`. Does not print credentials.
 */

import { TickTickClient } from '../src/client.js';
import { FileSessionStore } from '../src/session-store.js';
import type { TickTickTask } from '../src/types.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = resolve(__dirname, '../.ticktick-session.json');
const PREFIX = '[issue-41-verify]';
const DUE = '2026-09-20T00:00:00.000+0000';
const START = '2026-09-20T00:00:00.000+0000';
const REPEAT_DUE = '2026-09-17T00:00:00.000+0000';

const username = process.env['TICKTICK_USERNAME'];
const password = process.env['TICKTICK_PASSWORD'];
if (!username || !password) {
  console.error('Missing TICKTICK_USERNAME or TICKTICK_PASSWORD');
  process.exit(1);
}

const client = new TickTickClient({
  credentials: { username, password },
  sessionStore: new FileSessionStore(SESSION_PATH),
});

let passed = 0;
let failed = 0;
const created: { taskId: string; projectId: string }[] = [];

function ok(label: string): void {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label: string, detail: string): void {
  console.log(`  FAIL  ${label}: ${detail}`);
  failed++;
}

function field(task: TickTickTask | undefined, key: keyof TickTickTask): string {
  const value = task?.[key];
  return value === undefined ? '<undefined>' : JSON.stringify(value);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function getAfterWrite(taskId: string, projectId: string): Promise<TickTickTask> {
  await sleep(300);
  return client.tasks.get(taskId, projectId);
}

async function main(): Promise<void> {
  const projects = await client.projects.list();
  const inbox = projects.find((p) => p.kind === 'INBOX') ?? projects[0];
  if (!inbox) throw new Error('No projects available');
  const projectId = inbox.id;
  console.log(`Inbox project: ${inbox.name} [${projectId}]\n`);

  // ── 1. complete() preserves dueDate / startDate / tags / content ──
  console.log('1. complete() preserves fields');
  {
    const createdTask = await client.tasks.create({
      title: `${PREFIX} complete-preserve`,
      projectId,
      dueDate: DUE,
      startDate: START,
      isAllDay: true,
      tags: ['issue-41'],
      content: 'keep me',
      priority: 3,
    });
    created.push({ taskId: createdTask.id, projectId });

    const before = await client.tasks.get(createdTask.id, projectId);
    console.log(`   before  due=${field(before, 'dueDate')} start=${field(before, 'startDate')} tags=${field(before, 'tags')}`);

    await client.tasks.complete(projectId, createdTask.id);
    const after = await getAfterWrite(createdTask.id, projectId);
    console.log(`   after   due=${field(after, 'dueDate')} start=${field(after, 'startDate')} tags=${field(after, 'tags')} completedTime=${field(after, 'completedTime')} status=${field(after, 'status')}`);

    if (after.dueDate === before.dueDate) ok('complete() kept dueDate');
    else fail('complete() kept dueDate', `before=${before.dueDate} after=${after.dueDate}`);

    if (after.startDate === before.startDate) ok('complete() kept startDate');
    else fail('complete() kept startDate', `before=${before.startDate} after=${after.startDate}`);

    if (after.title === before.title) ok('complete() kept title');
    else fail('complete() kept title', `before=${before.title} after=${after.title}`);

    if (JSON.stringify(after.tags ?? []) === JSON.stringify(before.tags ?? [])) ok('complete() kept tags');
    else fail('complete() kept tags', `before=${JSON.stringify(before.tags)} after=${JSON.stringify(after.tags)}`);

    if (after.content === before.content) ok('complete() kept content');
    else fail('complete() kept content', `before=${before.content} after=${after.content}`);

    if (after.status === 2 && after.completedTime) ok('complete() set status=2 and completedTime');
    else fail('complete() set status/completedTime', `status=${after.status} completedTime=${after.completedTime}`);
  }

  // ── 2. update() partial patch preserves omitted dueDate ──
  console.log('\n2. update() partial merge');
  {
    const createdTask = await client.tasks.create({
      title: `${PREFIX} update-preserve`,
      projectId,
      dueDate: DUE,
      startDate: START,
      isAllDay: true,
      content: 'notes',
      priority: 1,
    });
    created.push({ taskId: createdTask.id, projectId });

    await client.tasks.update({ id: createdTask.id, projectId, priority: 5 });
    const after = await client.tasks.get(createdTask.id, projectId);
    console.log(`   after   due=${field(after, 'dueDate')} start=${field(after, 'startDate')} title=${field(after, 'title')} priority=${field(after, 'priority')} content=${field(after, 'content')}`);

    if (after.dueDate === DUE || after.dueDate === createdTask.dueDate) ok('update() kept dueDate');
    else fail('update() kept dueDate', `got ${after.dueDate}`);

    if (after.title === `${PREFIX} update-preserve`) ok('update() kept title');
    else fail('update() kept title', `got ${after.title}`);

    if (after.priority === 5) ok('update() applied priority');
    else fail('update() applied priority', `got ${after.priority}`);

    if (after.content === 'notes' || after.content === createdTask.content) ok('update() kept content');
    else fail('update() kept content', `got ${after.content}`);
  }

  // ── 3. pin() preserves dueDate ──
  console.log('\n3. pin() preserves dueDate');
  {
    const createdTask = await client.tasks.create({
      title: `${PREFIX} pin-preserve`,
      projectId,
      dueDate: DUE,
      isAllDay: true,
    });
    created.push({ taskId: createdTask.id, projectId });

    await client.tasks.pin(createdTask.id, projectId);
    const after = await client.tasks.get(createdTask.id, projectId);
    console.log(`   after   due=${field(after, 'dueDate')} pinnedTime=${field(after, 'pinnedTime')} title=${field(after, 'title')}`);

    if (after.dueDate) ok('pin() kept dueDate');
    else fail('pin() kept dueDate', `got ${after.dueDate}`);

    if (after.pinnedTime) ok('pin() set pinnedTime');
    else fail('pin() set pinnedTime', 'pinnedTime missing');

    await client.tasks.unpin(createdTask.id, projectId);
    const unpinned = await client.tasks.get(createdTask.id, projectId);
    if (unpinned.dueDate) ok('unpin() kept dueDate');
    else fail('unpin() kept dueDate', `got ${unpinned.dueDate}`);
  }

  // ── 4. recurring complete: this occurrence keeps dueDate, next occurrence advances ──
  console.log('\n4. recurring complete() (RRULE:FREQ=DAILY)');
  {
    const createdTask = await client.tasks.create({
      title: `${PREFIX} recurring-daily`,
      projectId,
      dueDate: REPEAT_DUE,
      startDate: REPEAT_DUE,
      isAllDay: true,
      repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
    });
    created.push({ taskId: createdTask.id, projectId });
    const before = await client.tasks.get(createdTask.id, projectId);
    console.log(`   before  id=${before.id} due=${field(before, 'dueDate')} repeatFlag=${field(before, 'repeatFlag')} status=${field(before, 'status')}`);

    await client.tasks.complete(projectId, createdTask.id);
    const completed = await getAfterWrite(createdTask.id, projectId);
    const active = (await client.tasks.list()).filter((t) => t.title === `${PREFIX} recurring-daily` && t.status === 0);
    console.log(`   completed id=${completed.id} due=${field(completed, 'dueDate')} status=${field(completed, 'status')} completedTime=${field(completed, 'completedTime')} repeatFlag=${field(completed, 'repeatFlag')}`);
    console.log(`   open matches: ${active.length}`);
    for (const t of active) {
      console.log(`     id=${t.id} due=${field(t, 'dueDate')} status=${field(t, 'status')} repeatFlag=${field(t, 'repeatFlag')}`);
      created.push({ taskId: t.id, projectId: t.projectId });
    }

    if (completed.dueDate === before.dueDate) ok('recurring completed occurrence kept dueDate');
    else fail('recurring completed occurrence kept dueDate', `before=${before.dueDate} after=${completed.dueDate}`);

    if (completed.repeatFlag === before.repeatFlag) ok('recurring completed occurrence kept repeatFlag');
    else fail('recurring completed occurrence kept repeatFlag', `before=${before.repeatFlag} after=${completed.repeatFlag}`);

    if (completed.status === 2) ok('recurring completed occurrence status=2');
    else fail('recurring completed occurrence status=2', `status=${completed.status}`);

    // REST complete() historically does not spawn the next rrule occurrence
    // (verified against the pre-fix partial POST). Log, don't fail, if that
    // server behavior changes.
    if (active.length === 0) {
      console.log('  NOTE  REST complete() did not spawn the next occurrence (same as pre-fix)');
    } else {
      ok(`recurring next occurrence spawned id=${active[0]!.id} due=${active[0]!.dueDate}`);
    }
  }

  // ── cleanup ──
  console.log('\nCleanup');
  const leftover = (await client.tasks.list()).filter((t) => t.title?.startsWith(PREFIX));
  for (const t of leftover) created.push({ taskId: t.id, projectId: t.projectId });
  const unique = [...new Map(created.map((c) => [c.taskId, c])).values()];
  if (unique.length > 0) {
    await client.tasks.deleteMany(unique);
    console.log(`  deleted ${unique.length} test task(s)`);
  }
}

try {
  await main();
} catch (err) {
  failed++;
  console.error('\nUnhandled error:', err instanceof Error ? err.message : err);
  try {
    const leftover = (await client.tasks.list()).filter((t) => t.title?.startsWith(PREFIX));
    if (leftover.length > 0) {
      await client.tasks.deleteMany(leftover.map((t) => ({ taskId: t.id, projectId: t.projectId })));
      console.log(`  emergency cleanup: ${leftover.length} task(s)`);
    }
  } catch {
    console.error('  emergency cleanup failed');
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
