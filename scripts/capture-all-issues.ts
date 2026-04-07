/**
 * Playwright-based TickTick API traffic capture — Issues #31, #32, #33, #34
 *
 * Simulates real user actions in the web app and intercepts network requests
 * to record exact API specifications.
 *
 * Run: npx tsx scripts/capture-all-issues.ts
 */

import { chromium, type Page, type BrowserContext, type Request, type Response } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = resolve(__dirname, '../.ticktick-session.json');
const OUTPUT_PATH = resolve(__dirname, '../captured-api-spec.json');

// ───────── Types ─────────

type CapturedRequest = {
  readonly timestamp: string;
  readonly issue: string;
  readonly action: string;
  readonly method: string;
  readonly url: string;
  readonly requestBody: unknown;
  readonly status: number;
  readonly responseBody: unknown;
};

// ───────── State ─────────

const captured: CapturedRequest[] = [];
let currentIssue = '';
let currentAction = '';

// ───────── Helpers ─────────

function genId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  let rand = '';
  for (let i = 0; i < 16; i++) rand += Math.floor(Math.random() * 16).toString(16);
  return ts + rand;
}

function section(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

// ───────── Network interceptor ─────────

function setupNetworkCapture(page: Page) {
  page.on('response', async (response: Response) => {
    const request: Request = response.request();
    const url = request.url();

    // Only capture TickTick API calls
    if (!url.includes('api.ticktick.com') && !url.includes('ticktick.com/api')) return;
    // Skip static assets, batch/check polling
    if (url.includes('/batch/check/') && currentAction !== 'list') return;

    try {
      let requestBody: unknown = null;
      try { requestBody = JSON.parse(request.postData() ?? 'null'); } catch { requestBody = request.postData(); }

      let responseBody: unknown = null;
      try { responseBody = await response.json(); } catch {
        try { responseBody = await response.text(); } catch { responseBody = null; }
      }

      const entry: CapturedRequest = {
        timestamp: new Date().toISOString(),
        issue: currentIssue,
        action: currentAction,
        method: request.method(),
        url: url.replace('https://api.ticktick.com', ''),
        requestBody,
        status: response.status(),
        responseBody,
      };

      captured.push(entry);

      const icon = response.status() === 200 ? '✅' : `⚠️  ${response.status()}`;
      const bodyPreview = JSON.stringify(responseBody).slice(0, 120);
      console.log(`    ${icon} ${request.method()} ${entry.url}`);
      if (requestBody) console.log(`       req: ${JSON.stringify(requestBody).slice(0, 120)}`);
      console.log(`       res: ${bodyPreview}`);
    } catch {
      // ignore capture errors
    }
  });
}

// ───────── Browser page API helper ─────────

async function apiFetch(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
  csrfToken?: string,
): Promise<{ status: number; data: unknown }> {
  return page.evaluate(
    async ({ method, path, body, csrfToken }) => {
      const res = await fetch(`https://api.ticktick.com${path}`, {
        method,
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-csrftoken': csrfToken ?? '',
          origin: 'https://ticktick.com',
          referer: 'https://ticktick.com/webapp/',
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      return { status: res.status, data };
    },
    { method, path, body, csrfToken },
  );
}

// ───────── Issue #31: Focus Analytics ─────────

async function captureIssue31(page: Page, csrfToken: string) {
  section('#31: Focus Analytics (getHeatmap / getHourDistribution / getDistribution)');
  currentIssue = '#31';

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Verify pomodoro data exists
  currentAction = 'getTimeline (verify data exists)';
  log('🔍', 'Checking pomodoro data...');
  const timelineRes = await apiFetch(page, 'GET', `/api/v2/pomodoros?from=${thirtyDaysAgo}&to=${now}`, undefined, csrfToken);
  log(timelineRes.status === 200 ? '✅' : '❌', `getTimeline → ${timelineRes.status}, entries: ${Array.isArray(timelineRes.data) ? timelineRes.data.length : 0}`);

  // 2. Navigate to Focus stats page to observe actual call patterns
  currentAction = 'navigate to focus stats';
  log('🔍', 'Navigating to Focus stats page...');

  // Try opening Focus page in web app
  try {
    await page.goto('https://ticktick.com/webapp/#p/focus', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch {
    log('⚠️ ', 'Direct navigation to Focus page failed, trying URL hash change');
    await page.evaluate(() => { window.location.hash = '#p/focus'; });
    await page.waitForTimeout(3000);
  }

  // 3. Direct API call tests — try various parameter formats
  const endpoints = [
    { name: 'heatmap', path: '/api/v2/pomodoros/statistics/heatmap' },
    { name: 'hourDistribution', path: '/api/v2/pomodoros/statistics/hourDistribution' },
    { name: 'distribution', path: '/api/v2/pomodoros/statistics/distribution' },
  ];

  for (const ep of endpoints) {
    // Format 1: ms timestamps (current implementation)
    currentAction = `${ep.name} — ms timestamps`;
    log('🔍', `${ep.name}: trying ms timestamp format...`);
    const r1 = await apiFetch(page, 'GET', `${ep.path}?from=${sevenDaysAgo}&to=${now}`, undefined, csrfToken);
    log(r1.status === 200 ? '✅' : '❌', `${ep.name} (ms) → ${r1.status}`);

    // Format 2: seconds timestamps
    currentAction = `${ep.name} — seconds timestamps`;
    log('🔍', `${ep.name}: trying seconds timestamp format...`);
    const r2 = await apiFetch(page, 'GET', `${ep.path}?from=${Math.floor(sevenDaysAgo / 1000)}&to=${Math.floor(now / 1000)}`, undefined, csrfToken);
    log(r2.status === 200 ? '✅' : '❌', `${ep.name} (sec) → ${r2.status}`);

    // Format 3: ISO date string
    currentAction = `${ep.name} — ISO date`;
    const fromDate = new Date(sevenDaysAgo).toISOString().slice(0, 10);
    const toDate = new Date().toISOString().slice(0, 10);
    log('🔍', `${ep.name}: trying ISO date format (${fromDate} ~ ${toDate})...`);
    const r3 = await apiFetch(page, 'GET', `${ep.path}?from=${fromDate}&to=${toDate}`, undefined, csrfToken);
    log(r3.status === 200 ? '✅' : '❌', `${ep.name} (ISO) → ${r3.status}`);

    // Format 4: YYYYMMDD integer
    currentAction = `${ep.name} — YYYYMMDD`;
    const fromYMD = fromDate.replace(/-/g, '');
    const toYMD = toDate.replace(/-/g, '');
    log('🔍', `${ep.name}: trying YYYYMMDD format (${fromYMD} ~ ${toYMD})...`);
    const r4 = await apiFetch(page, 'GET', `${ep.path}?from=${fromYMD}&to=${toYMD}`, undefined, csrfToken);
    log(r4.status === 200 ? '✅' : '❌', `${ep.name} (YYYYMMDD) → ${r4.status}`);

    // Format 5: no params
    currentAction = `${ep.name} — no params`;
    log('🔍', `${ep.name}: trying without params...`);
    const r5 = await apiFetch(page, 'GET', ep.path, undefined, csrfToken);
    log(r5.status === 200 ? '✅' : '❌', `${ep.name} (no params) → ${r5.status}`);

    // Format 6: POST method
    currentAction = `${ep.name} — POST`;
    log('🔍', `${ep.name}: trying POST method...`);
    const r6 = await apiFetch(page, 'POST', ep.path, { from: sevenDaysAgo, to: now }, csrfToken);
    log(r6.status === 200 ? '✅' : '❌', `${ep.name} (POST) → ${r6.status}`);
  }

  // 4. Explore alternative v1 / v3 endpoints
  currentAction = 'alternative endpoints';
  log('🔍', 'Exploring alternative endpoints...');

  const alternatives = [
    '/api/v2/pomodoros/statistics',
    '/api/v2/pomodoros/statistics/general',
    '/api/v2/pomodoros/statistics/generalForDesktop',
    '/api/v2/pomodoros/statistic/heatmap',
    '/api/v2/pomodoros/statistic/hourDistribution',
    '/api/v2/pomodoros/statistic/distribution',
    '/api/v3/pomodoros/statistics/heatmap',
    '/api/v3/pomodoros/statistics/hourDistribution',
    '/api/v3/pomodoros/statistics/distribution',
  ];

  for (const path of alternatives) {
    const r = await apiFetch(page, 'GET', `${path}?from=${sevenDaysAgo}&to=${now}`, undefined, csrfToken);
    log(r.status === 200 ? '✅' : `⚠️ ${r.status}`, `${path}`);
  }

  // 5. Observe network from Focus stats UI — click stats tab
  currentAction = 'focus stats tab click';
  log('🔍', 'Trying to click stats-related UI in web app...');
  try {
    // Find stats/report tab
    const statsTab = await page.$('[class*="stat"], [class*="report"], [class*="chart"], [data-tab="statistics"]');
    if (statsTab) {
      await statsTab.click();
      await page.waitForTimeout(2000);
      log('✅', 'Stats tab clicked');
    } else {
      log('⚠️ ', 'Stats tab not found — manual verification needed');
    }
  } catch {
    log('⚠️ ', 'Stats tab click failed');
  }
}

// ───────── Issue #32: Task Move ─────────

async function captureIssue32(page: Page, csrfToken: string) {
  section('#32: Task Move (v3/batch/taskProject)');
  currentIssue = '#32';

  // 1. Create 2 test projects
  currentAction = 'create test projects';
  log('🔧', 'Creating test projects...');
  const srcProject = await apiFetch(page, 'POST', '/api/v2/project', { name: '[capture] move-src' }, csrfToken);
  const dstProject = await apiFetch(page, 'POST', '/api/v2/project', { name: '[capture] move-dst' }, csrfToken);
  const srcId = (srcProject.data as Record<string, unknown>)?.id as string;
  const dstId = (dstProject.data as Record<string, unknown>)?.id as string;
  log('✅', `src: ${srcId}, dst: ${dstId}`);

  // 2. Create task
  const taskId = genId();
  currentAction = 'create test task';
  await apiFetch(page, 'POST', '/api/v2/task', { id: taskId, title: '[capture] move test', projectId: srcId }, csrfToken);
  log('✅', `task: ${taskId}`);
  await page.waitForTimeout(500);

  // 3. Try move via v3/batch/taskProject
  currentAction = 'move via v3/batch/taskProject';
  log('🔍', 'Trying POST /api/v3/batch/taskProject...');
  const moveR = await apiFetch(page, 'POST', '/api/v3/batch/taskProject', {
    moveProject: [{ taskId, fromProjectId: srcId, toProjectId: dstId }],
  }, csrfToken);
  log(moveR.status === 200 ? '✅' : '❌', `v3/batch/taskProject → ${moveR.status}`);
  if (moveR.data) log('📋', `response: ${JSON.stringify(moveR.data).slice(0, 200)}`);

  await page.waitForTimeout(1000);

  // 4. Verify task after move — check ID preservation
  currentAction = 'verify task after move';
  log('🔍', 'Verifying task after move...');

  // Check all tasks via v3/batch/check
  const checkR = await apiFetch(page, 'GET', '/api/v3/batch/check/0', undefined, csrfToken);
  if (checkR.status === 200) {
    const data = checkR.data as Record<string, unknown>;
    const syncBean = data.syncTaskBean as Record<string, unknown> | undefined;
    const tasks = (syncBean?.update ?? []) as Array<Record<string, unknown>>;
    const movedTask = tasks.find(t => t.id === taskId);
    if (movedTask) {
      log('✅', `Task ID preserved! projectId: ${movedTask.projectId} (expected: ${dstId})`);
      log('📋', `task: ${JSON.stringify(movedTask).slice(0, 200)}`);
    } else {
      log('❌', `Task ID ${taskId} not found — ID may have changed`);
      // Check all tasks in dst project
      const dstTasks = tasks.filter(t => t.projectId === dstId);
      log('📋', `dst project tasks: ${dstTasks.length}`);
      for (const t of dstTasks) {
        log('  ', `  id: ${t.id}, title: ${t.title}`);
      }
    }
  }

  // 5. Alternative: try direct projectId change via v2
  const taskId2 = genId();
  currentAction = 'create second test task';
  await apiFetch(page, 'POST', '/api/v2/task', { id: taskId2, title: '[capture] move test 2', projectId: srcId }, csrfToken);
  await page.waitForTimeout(500);

  currentAction = 'move via POST /api/v2/task/{id} with new projectId';
  log('🔍', 'Trying direct projectId change via POST /api/v2/task/{id}...');
  const moveR2 = await apiFetch(page, 'POST', `/api/v2/task/${taskId2}`, {
    id: taskId2,
    projectId: dstId,
  }, csrfToken);
  log(moveR2.status === 200 ? '✅' : '❌', `v2 direct update → ${moveR2.status}`);
  if (moveR2.data) log('📋', `response: ${JSON.stringify(moveR2.data).slice(0, 200)}`);

  await page.waitForTimeout(1000);

  // Verify after v2 direct update
  currentAction = 'verify after v2 direct update';
  const checkR2 = await apiFetch(page, 'GET', '/api/v3/batch/check/0', undefined, csrfToken);
  if (checkR2.status === 200) {
    const data = checkR2.data as Record<string, unknown>;
    const syncBean = data.syncTaskBean as Record<string, unknown> | undefined;
    const tasks = (syncBean?.update ?? []) as Array<Record<string, unknown>>;
    const task2 = tasks.find(t => t.id === taskId2);
    if (task2) {
      log('📋', `after v2 direct update projectId: ${task2.projectId} (expected: ${dstId})`);
    }
  }

  // 6. Try moveMany — multiple tasks at once
  const taskId3 = genId();
  const taskId4 = genId();
  currentAction = 'moveMany via v3/batch/taskProject';
  await apiFetch(page, 'POST', '/api/v2/task', { id: taskId3, title: '[capture] moveMany-A', projectId: srcId }, csrfToken);
  await apiFetch(page, 'POST', '/api/v2/task', { id: taskId4, title: '[capture] moveMany-B', projectId: srcId }, csrfToken);
  await page.waitForTimeout(500);

  log('🔍', 'moveMany: moving 2 tasks at once...');
  const moveManyR = await apiFetch(page, 'POST', '/api/v3/batch/taskProject', {
    moveProject: [
      { taskId: taskId3, fromProjectId: srcId, toProjectId: dstId },
      { taskId: taskId4, fromProjectId: srcId, toProjectId: dstId },
    ],
  }, csrfToken);
  log(moveManyR.status === 200 ? '✅' : '❌', `moveMany → ${moveManyR.status}`);

  // Cleanup
  currentAction = 'cleanup';
  log('🧹', 'Cleaning up...');
  await apiFetch(page, 'DELETE', `/api/v2/project/${srcId}`, undefined, csrfToken);
  await apiFetch(page, 'DELETE', `/api/v2/project/${dstId}`, undefined, csrfToken);
}

// ───────── Issue #33: Trash ─────────

async function captureIssue33(page: Page, csrfToken: string) {
  section('#33: listTrash() — empty result immediately after delete');
  currentIssue = '#33';

  // 1. Create test project + task
  currentAction = 'create test data';
  log('🔧', 'Creating test data...');
  const projectRes = await apiFetch(page, 'POST', '/api/v2/project', { name: '[capture] trash-test' }, csrfToken);
  const projectId = (projectRes.data as Record<string, unknown>)?.id as string;

  const taskId = genId();
  await apiFetch(page, 'POST', '/api/v2/task', { id: taskId, title: '[capture] trash test', projectId }, csrfToken);
  await page.waitForTimeout(500);
  log('✅', `project: ${projectId}, task: ${taskId}`);

  // 2. Delete task
  currentAction = 'delete task';
  log('🔍', 'Deleting task...');
  const deleteR = await apiFetch(page, 'POST', `/api/v2/task/${taskId}`, { id: taskId, projectId, status: -1 }, csrfToken);
  log(deleteR.status === 200 ? '✅' : '❌', `delete → ${deleteR.status}`);

  // 3. Also try v3/batch/task delete
  const taskId2 = genId();
  await apiFetch(page, 'POST', '/api/v2/task', { id: taskId2, title: '[capture] trash test 2', projectId }, csrfToken);
  await page.waitForTimeout(300);

  currentAction = 'delete via v3/batch/task';
  const deleteR2 = await apiFetch(page, 'POST', '/api/v3/batch/task', {
    add: [], update: [],
    delete: [{ taskId: taskId2, projectId }],
  }, csrfToken);
  log(deleteR2.status === 200 ? '✅' : '❌', `v3 delete → ${deleteR2.status}`);

  // 4. Immediate + periodic trash query
  currentAction = 'listTrash polling';
  log('🔍', 'Starting trash polling after delete...');

  const trashEndpoints = [
    `/api/v2/project/${projectId}/tasks?status=-1`,
    `/api/v2/project/${projectId}/tasks?status=-1&limit=50`,
    `/api/v2/trash/tasks`,
    `/api/v2/trash/tasks?projectId=${projectId}`,
    `/api/v3/batch/check/0`,
  ];

  // Immediate query
  for (const ep of trashEndpoints) {
    currentAction = `listTrash immediate — ${ep.split('?')[0]}`;
    const r = await apiFetch(page, 'GET', ep, undefined, csrfToken);
    log(r.status === 200 ? '✅' : `⚠️ ${r.status}`, `immediate: ${ep}`);
    if (r.status === 200) {
      const data = r.data;
      if (Array.isArray(data)) {
        log('📋', `  results: ${data.length}`);
        for (const t of data.slice(0, 3)) {
          log('  ', `  id: ${(t as Record<string, unknown>).id}, status: ${(t as Record<string, unknown>).status}`);
        }
      }
    }
  }

  // Re-query after 2s
  await page.waitForTimeout(2000);
  log('🔍', 'Re-querying after 2s...');
  for (const ep of trashEndpoints.slice(0, 2)) {
    currentAction = `listTrash after 2s — ${ep.split('?')[0]}`;
    const r = await apiFetch(page, 'GET', ep, undefined, csrfToken);
    if (r.status === 200 && Array.isArray(r.data)) {
      log('📋', `  ${ep}: ${(r.data as unknown[]).length}`);
    }
  }

  // Re-query after 5s
  await page.waitForTimeout(3000);
  log('🔍', 'Re-querying after 5s...');
  for (const ep of trashEndpoints.slice(0, 2)) {
    currentAction = `listTrash after 5s — ${ep.split('?')[0]}`;
    const r = await apiFetch(page, 'GET', ep, undefined, csrfToken);
    if (r.status === 200 && Array.isArray(r.data)) {
      log('📋', `  ${ep}: ${(r.data as unknown[]).length}`);
    }
  }

  // Cleanup
  currentAction = 'cleanup';
  await apiFetch(page, 'DELETE', `/api/v2/project/${projectId}`, undefined, csrfToken);
}

// ───────── Issue #34: Focus Session Control ─────────

async function captureIssue34(page: Page, csrfToken: string) {
  section('#34: Focus Session Control (start → pause → resume → finish)');
  currentIssue = '#34';

  // 1. Check current timer state
  currentAction = 'get timer state';
  log('🔍', 'Checking current timer state...');
  const timerR = await apiFetch(page, 'GET', '/api/v2/timer', undefined, csrfToken);
  log(timerR.status === 200 ? '✅' : '❌', `timer state → ${timerR.status}`);
  if (timerR.data) log('📋', `state: ${JSON.stringify(timerR.data).slice(0, 200)}`);

  // 2. Start
  const pomoId = genId();
  currentAction = 'start';
  log('🔍', `start(duration=25) — id: ${pomoId}`);
  const startR = await apiFetch(page, 'POST', '/api/v2/pomodoro', [{
    id: pomoId,
    op: 'start',
    duration: 25,
    lastPoint: 0,
  }], csrfToken);
  log(startR.status === 200 ? '✅' : '❌', `start → ${startR.status}`);
  if (startR.data) log('📋', `response: ${JSON.stringify(startR.data).slice(0, 200)}`);

  await page.waitForTimeout(1000);

  // 3. Re-check timer state
  currentAction = 'get timer after start';
  const timerAfterStart = await apiFetch(page, 'GET', '/api/v2/timer', undefined, csrfToken);
  if (timerAfterStart.data) log('📋', `timer after start: ${JSON.stringify(timerAfterStart.data).slice(0, 200)}`);

  // 4. Pause — try various payload formats
  currentAction = 'pause';
  log('🔍', 'pause...');

  // Format A: new ID + op: pause
  const pauseId = genId();
  const pauseR = await apiFetch(page, 'POST', '/api/v2/pomodoro', [{
    id: pauseId,
    op: 'pause',
    lastPoint: 0,
  }], csrfToken);
  log(pauseR.status === 200 ? '✅' : '❌', `pause (new id) → ${pauseR.status}`);
  if (pauseR.data) log('📋', `response: ${JSON.stringify(pauseR.data).slice(0, 200)}`);

  await page.waitForTimeout(1000);

  // Check timer state
  currentAction = 'get timer after pause';
  const timerAfterPause = await apiFetch(page, 'GET', '/api/v2/timer', undefined, csrfToken);
  if (timerAfterPause.data) log('📋', `timer after pause: ${JSON.stringify(timerAfterPause.data).slice(0, 200)}`);

  // 5. Resume
  currentAction = 'resume';
  log('🔍', 'resume (continue)...');
  const resumeId = genId();
  const resumeR = await apiFetch(page, 'POST', '/api/v2/pomodoro', [{
    id: resumeId,
    op: 'continue',
    lastPoint: 0,
  }], csrfToken);
  log(resumeR.status === 200 ? '✅' : '❌', `resume → ${resumeR.status}`);
  if (resumeR.data) log('📋', `response: ${JSON.stringify(resumeR.data).slice(0, 200)}`);

  await page.waitForTimeout(1000);

  // Check timer state
  currentAction = 'get timer after resume';
  const timerAfterResume = await apiFetch(page, 'GET', '/api/v2/timer', undefined, csrfToken);
  if (timerAfterResume.data) log('📋', `timer after resume: ${JSON.stringify(timerAfterResume.data).slice(0, 200)}`);

  // 6. Finish
  currentAction = 'finish';
  log('🔍', 'finish...');
  const finishId = genId();
  const finishR = await apiFetch(page, 'POST', '/api/v2/pomodoro', [{
    id: finishId,
    op: 'finish',
    lastPoint: 0,
  }], csrfToken);
  log(finishR.status === 200 ? '✅' : '❌', `finish → ${finishR.status}`);
  if (finishR.data) log('📋', `response: ${JSON.stringify(finishR.data).slice(0, 200)}`);

  await page.waitForTimeout(500);

  // Final timer state
  currentAction = 'get timer after finish';
  const timerFinal = await apiFetch(page, 'GET', '/api/v2/timer', undefined, csrfToken);
  if (timerFinal.data) log('📋', `timer after finish: ${JSON.stringify(timerFinal.data).slice(0, 200)}`);

  // 7. Drop (stop) test — start new session then drop
  currentAction = 'start for drop test';
  const dropPomoId = genId();
  log('🔍', 'stop(drop) test: starting new session...');
  await apiFetch(page, 'POST', '/api/v2/pomodoro', [{
    id: dropPomoId,
    op: 'start',
    duration: 25,
    lastPoint: 0,
  }], csrfToken);
  await page.waitForTimeout(1000);

  currentAction = 'drop';
  const dropId = genId();
  const dropR = await apiFetch(page, 'POST', '/api/v2/pomodoro', [{
    id: dropId,
    op: 'drop',
    lastPoint: 0,
  }], csrfToken);
  log(dropR.status === 200 ? '✅' : '❌', `drop → ${dropR.status}`);
  if (dropR.data) log('📋', `response: ${JSON.stringify(dropR.data).slice(0, 200)}`);
}

// ───────── Main ─────────

async function main() {
  console.log('🔬 TickTick API Traffic Capture — Issues #31, #32, #33, #34\n');

  const session = JSON.parse(await readFile(SESSION_PATH, 'utf-8'));
  const csrfToken = session.cookies['_csrf_token'] ?? '';

  const browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  });

  await context.addCookies([
    { name: 't', value: session.cookies.t, domain: '.ticktick.com', path: '/' },
    { name: '_csrf_token', value: session.cookies._csrf_token, domain: '.ticktick.com', path: '/' },
    ...(session.cookies.AWSALB ? [{ name: 'AWSALB', value: session.cookies.AWSALB, domain: 'ticktick.com', path: '/' }] : []),
    ...(session.cookies.AWSALBCORS ? [{ name: 'AWSALBCORS', value: session.cookies.AWSALBCORS, domain: 'ticktick.com', path: '/' }] : []),
  ]);

  const page = await context.newPage();
  setupNetworkCapture(page);

  // Load web app
  console.log('Loading web app...');
  await page.goto('https://ticktick.com/webapp/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('✅ Web app loaded\n');

  try {
    await captureIssue31(page, csrfToken);
    await captureIssue32(page, csrfToken);
    await captureIssue33(page, csrfToken);
    await captureIssue34(page, csrfToken);
  } finally {
    await browser.close();
  }

  // Save results
  await writeFile(OUTPUT_PATH, JSON.stringify(captured, null, 2));

  section('Capture Complete');
  console.log(`\n  Total: ${captured.length} API calls captured`);
  console.log(`  Saved to: ${OUTPUT_PATH}`);

  // Per-issue summary
  const byIssue = new Map<string, CapturedRequest[]>();
  for (const c of captured) {
    const arr = byIssue.get(c.issue) ?? [];
    arr.push(c);
    byIssue.set(c.issue, arr);
  }
  for (const [issue, entries] of byIssue) {
    const ok = entries.filter(e => e.status === 200).length;
    const fail = entries.length - ok;
    console.log(`  ${issue}: ${entries.length} calls (✅ ${ok} / ❌ ${fail})`);
  }
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
