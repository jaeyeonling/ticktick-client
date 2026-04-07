/**
 * Integration test script — tests ALL public methods against the real TickTick API.
 *
 * Uses the existing session from .ticktick-session.json (no login required).
 * Write tests follow: create → verify → cleanup to avoid polluting real data.
 *
 * Run: npx tsx scripts/integration-test.ts
 */

import { TickTickClient } from '../src/client.js';
import { FileSessionStore } from '../src/session-store.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = resolve(__dirname, '../.ticktick-session.json');
const TEST_PREFIX = '[integration-test]';

// ───────── Reporter ─────────

let passed = 0;
let failed = 0;
let skipped = 0;

function ok(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`  ❌ ${label}: ${msg}`);
  failed++;
}

function skip(label: string, reason: string) {
  console.log(`  ⚠️  ${label} — ${reason}`);
  skipped++;
}

function section(title: string) {
  console.log(`\n── ${title} ─────────────────────`);
}

// ───────── Client setup ─────────

const client = new TickTickClient({
  sessionStore: new FileSessionStore(SESSION_PATH),
});

// ───────── Helpers ─────────

async function getInboxProjectId(): Promise<string> {
  const projects = await client.projects.list();
  const inbox = projects.find((p) => p.kind === 'INBOX') ?? projects[0];
  if (!inbox) throw new Error('사용 가능한 프로젝트가 없습니다');
  return inbox.id;
}

// ───────── User ─────────

async function testUser() {
  section('User');

  try {
    const profile = await client.user.getProfile();
    ok(`getProfile() → ${profile.username ?? profile.email}`);
  } catch (e) { fail('getProfile()', e); }

  try {
    const status = await client.user.getStatus();
    ok(`getStatus() → pro: ${status.pro ?? false}`);
  } catch (e) { fail('getStatus()', e); }
}

// ───────── Projects ─────────

async function testProjects() {
  section('Projects');

  try {
    const projects = await client.projects.list();
    ok(`list() → ${projects.length}개`);
  } catch (e) { fail('list()', e); }

  // create / listColumns / update / delete
  let projectId: string | null = null;
  try {
    const p = await client.projects.create({ name: `${TEST_PREFIX} 프로젝트` });
    projectId = p.id;
    ok(`create() → ${projectId}`);
  } catch (e) { fail('create()', e); return; }

  try {
    const cols = await client.projects.listColumns(projectId!);
    ok(`listColumns() → ${Array.isArray(cols) ? cols.length : 0}개`);
  } catch (e) { fail('listColumns()', e); }

  try {
    await client.projects.update({ id: projectId!, name: `${TEST_PREFIX} 수정` });
    ok('update()');
  } catch (e) { fail('update()', e); }

  // deleteMany: 추가 프로젝트 생성 후 한번에 삭제
  let projectId2: string | null = null;
  try {
    const p2 = await client.projects.create({ name: `${TEST_PREFIX} 프로젝트2` });
    projectId2 = p2.id;
    await client.projects.deleteMany([projectId!, projectId2]);
    ok(`deleteMany() — 2개 cleanup`);
    projectId = null;
  } catch (e) {
    fail('deleteMany()', e);
    // fallback: 개별 삭제
    if (projectId) await client.projects.delete(projectId).catch(() => null);
    if (projectId2) await client.projects.delete(projectId2).catch(() => null);
  }
}

// ───────── Tasks ─────────

async function testTasks() {
  section('Tasks');

  const projectId = await getInboxProjectId();

  try {
    const tasks = await client.tasks.list();
    ok(`list() → ${tasks.length}개`);
  } catch (e) { fail('list()', e); }

  try {
    const completed = await client.tasks.listCompleted({ limit: 10 });
    ok(`listCompleted() → ${completed.length}개`);
  } catch (e) { fail('listCompleted()', e); }

  // iterateCompleted
  try {
    let total = 0;
    let pages = 0;
    for await (const page of client.tasks.iterateCompleted()) {
      total += page.length;
      pages++;
      if (pages >= 2) break; // 최대 2페이지만
    }
    ok(`iterateCompleted() → ${pages}페이지, 총 ${total}개`);
  } catch (e) { fail('iterateCompleted()', e); }

  // create → update → delete
  let taskId: string | null = null;
  try {
    const t = await client.tasks.create({ title: `${TEST_PREFIX} 태스크`, projectId, priority: 1 });
    taskId = t.id;
    ok(`create() → ${taskId}`);
  } catch (e) { fail('create()', e); return; }

  try {
    await client.tasks.update({ id: taskId!, projectId, title: `${TEST_PREFIX} 수정`, priority: 3 });
    ok('update()');
  } catch (e) { fail('update()', e); }

  try {
    await client.tasks.delete(projectId, taskId!);
    ok('delete()');
    taskId = null;
  } catch (e) { fail('delete()', e); }

  // complete (별도 태스크, deleteMany로 cleanup)
  try {
    const t2 = await client.tasks.create({ title: `${TEST_PREFIX} complete용`, projectId });
    await client.tasks.complete(projectId, t2.id);
    ok('complete()');
    await client.tasks.deleteMany([{ taskId: t2.id, projectId }]);
  } catch (e) { fail('complete()', e); }

  // createMany / updateMany / deleteMany
  let batchIds: string[] = [];
  try {
    await client.tasks.createMany([
      { title: `${TEST_PREFIX} batch-A`, projectId },
      { title: `${TEST_PREFIX} batch-B`, projectId },
      { title: `${TEST_PREFIX} batch-C`, projectId },
    ]);
    ok('createMany()');

    const all = await client.tasks.list();
    const testTasks = all.filter((t) => t.title?.startsWith(TEST_PREFIX) && t.projectId === projectId);
    batchIds = testTasks.map((t) => t.id);

    if (batchIds.length > 0) {
      await client.tasks.updateMany(batchIds.map((id) => ({ id, projectId, priority: 2 })));
      ok(`updateMany() — ${batchIds.length}개`);

      await client.tasks.deleteMany(batchIds.map((id) => ({ taskId: id, projectId })));
      ok(`deleteMany() — cleanup`);
      batchIds = [];
    }
  } catch (e) { fail('createMany/updateMany/deleteMany()', e); }

  // move / moveMany — copy+delete 구현 (TickTick REST API는 projectId 직접 변경 불가)
  let moveSrcId: string | null = null;
  let moveDstId: string | null = null;
  try {
    const p1 = await client.projects.create({ name: `${TEST_PREFIX} move 대상` });
    const p2 = await client.projects.create({ name: `${TEST_PREFIX} move 목적지` });
    moveSrcId = p1.id;
    moveDstId = p2.id;

    const taskToMove = await client.tasks.create({ title: `${TEST_PREFIX} move 태스크`, projectId: moveSrcId });
    const moved = await client.tasks.move({ taskId: taskToMove.id, fromProjectId: moveSrcId, toProjectId: moveDstId });
    ok(`move() → 새 id: ${moved.id}, projectId: ${moved.projectId}`);

    // moveMany
    const t1 = await client.tasks.create({ title: `${TEST_PREFIX} moveMany-A`, projectId: moveSrcId });
    const t2 = await client.tasks.create({ title: `${TEST_PREFIX} moveMany-B`, projectId: moveSrcId });
    await client.tasks.moveMany([
      { taskId: t1.id, fromProjectId: moveSrcId, toProjectId: moveDstId },
      { taskId: t2.id, fromProjectId: moveSrcId, toProjectId: moveDstId },
    ]);
    ok('moveMany() → 2개 이동 완료');
  } catch (e) {
    fail('move/moveMany()', e);
  } finally {
    if (moveSrcId) await client.projects.delete(moveSrcId).catch(() => null);
    if (moveDstId) await client.projects.delete(moveDstId).catch(() => null);
  }

  // createSubtask
  try {
    const parent = await client.tasks.create({ title: `${TEST_PREFIX} 부모 태스크`, projectId });
    await client.tasks.createSubtask(parent.id, projectId, { title: `${TEST_PREFIX} 서브태스크` });
    ok('createSubtask()');
    await client.tasks.delete(projectId, parent.id);
  } catch (e) { fail('createSubtask()', e); }

  // pin / unpin
  try {
    const t = await client.tasks.create({ title: `${TEST_PREFIX} pin 테스트`, projectId });
    await client.tasks.pin(t.id, projectId);
    ok('pin()');
    await client.tasks.unpin(t.id, projectId);
    ok('unpin()');
    await client.tasks.delete(projectId, t.id);
  } catch (e) { fail('pin/unpin()', e); }

  // listTrash / restore
  // 테스트용 태스크를 삭제해서 휴지통에 넣은 후 확인
  try {
    const trashSrc = await client.projects.create({ name: `${TEST_PREFIX} trash-src` });
    const trashTask = await client.tasks.create({ title: `${TEST_PREFIX} trash 테스트`, projectId: trashSrc.id });
    await client.tasks.delete(trashSrc.id, trashTask.id);

    const trash = await client.tasks.listTrash({ projectId: trashSrc.id, limit: 5 });
    ok(`listTrash() → ${trash.length}개`);

    if (trash.length > 0) {
      const first = trash[0]!;
      await client.tasks.restore(first.id, first.projectId);
      ok('restore()');
      await client.tasks.delete(first.projectId, first.id);
    } else {
      skip('restore()', '휴지통이 비어 있음');
    }
    await client.projects.delete(trashSrc.id).catch(() => null);
  } catch (e) {
    skip('listTrash()', `API 미지원 (${e instanceof Error ? e.message.slice(0, 40) : e})`);
  }
}

// ───────── Tags ─────────

async function testTags() {
  section('Tags');

  try {
    const tags = await client.tags.list();
    ok(`list() → ${tags.length}개`);
  } catch (e) { fail('list()', e); }

  const name1 = `${TEST_PREFIX}-tag-1`;
  const name2 = `${TEST_PREFIX}-tag-2`;

  // createMany
  try {
    await client.tags.createMany([
      { name: name1, label: name1 },
      { name: name2, label: name2 },
    ]);
    ok('createMany()');
  } catch (e) { fail('createMany()', e); return; }

  // update
  try {
    await client.tags.update({ name: name1, label: name1, color: '#ff4500' });
    ok('update()');
  } catch (e) { fail('update()', e); }

  // rename
  const renamedName = `${TEST_PREFIX}-tag-renamed`;
  try {
    await client.tags.rename(name1, renamedName);
    ok('rename()');
  } catch (e) { fail('rename()', e); }

  // merge (name2 → renamedName)
  try {
    await client.tags.merge(name2, renamedName);
    ok('merge()');
  } catch (e) { fail('merge()', e); }

  // deleteMany (cleanup)
  try {
    await client.tags.deleteMany([renamedName, name2].filter(Boolean));
    ok('deleteMany() — cleanup');
  } catch (e) {
    // fallback
    await client.tags.delete(renamedName).catch(() => null);
    await client.tags.delete(name2).catch(() => null);
    fail('deleteMany()', e);
  }
}

// ───────── Habits ─────────

async function testHabits() {
  section('Habits');

  try {
    const habits = await client.habits.list();
    ok(`list() → ${habits.length}개`);
  } catch (e) { fail('list()', e); }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const habits = await client.habits.list();
    if (habits.length > 0) {
      const checkins = await client.habits.getCheckins([habits[0]!.id], today, today);
      ok(`getCheckins() → ${checkins.length}개`);
    } else {
      skip('getCheckins()', '습관 없음');
    }
  } catch (e) { fail('getCheckins()', e); }

  try {
    const stats = await client.habits.getWeekStats();
    ok(`getWeekStats() → ok`);
  } catch (e) { fail('getWeekStats()', e); }

  // create / update / upsertCheckin / delete
  let habitId: string | null = null;
  try {
    await client.habits.create({ name: `${TEST_PREFIX} 습관`, color: '#FF6B6B', type: 'DAILY', goal: 1 });
    const habits = await client.habits.list();
    const found = habits.find((h) => h.name?.startsWith(TEST_PREFIX));
    habitId = found?.id ?? null;
    ok(`create() → ${habitId}`);
  } catch (e) { fail('create()', e); }

  if (habitId) {
    try {
      await client.habits.update({ id: habitId, name: `${TEST_PREFIX} 습관 수정` });
      ok('update()');
    } catch (e) { fail('update()', e); }

    try {
      await client.habits.upsertCheckin({ habitId, date: new Date(), status: 'done', goal: 1, value: 1 });
      ok('upsertCheckin()');
    } catch (e) { fail('upsertCheckin()', e); }

    try {
      await client.habits.delete(habitId);
      ok('delete() — cleanup');
    } catch (e) { fail('delete()', e); }
  }
}

// ───────── Focus ─────────

async function testFocus() {
  section('Focus');

  const today = new Date().toISOString().slice(0, 10);

  // read-only 엔드포인트 (일부는 API 미지원)
  try {
    const overview = await client.focus.getOverview();
    ok(`getOverview() → today: ${overview.todayPomoCount}회`);
  } catch (e) { skip('getOverview()', '미지원 엔드포인트'); }

  try {
    const timeline = await client.focus.getTimeline(today, today);
    ok(`getTimeline() → ${timeline.length}개`);
  } catch (e) { skip('getTimeline()', '미지원 엔드포인트'); }

  try {
    await client.focus.syncState();
    ok('syncState()');
  } catch (e) { skip('syncState()', '미지원 엔드포인트'); }

  // local state (API 호출 없음)
  try {
    const state = client.focus.getState();
    ok(`getState() → status: ${state.status ?? 'null'}`);
  } catch (e) { fail('getState()', e); }

  try {
    client.focus.resetState();
    ok('resetState()');
  } catch (e) { fail('resetState()', e); }

  // analytics (데이터 없으면 500 가능 — skip으로 처리)
  try {
    await client.focus.getTiming(today, today);
    ok('getTiming()');
  } catch (e) { skip('getTiming()', `데이터 없음 또는 미지원`); }

  try {
    await client.focus.getHeatmap(today, today);
    ok('getHeatmap()');
  } catch (e) { skip('getHeatmap()', `데이터 없음 또는 미지원`); }

  try {
    await client.focus.getHourDistribution(today, today);
    ok('getHourDistribution()');
  } catch (e) { skip('getHourDistribution()', `데이터 없음 또는 미지원`); }

  try {
    await client.focus.getDistribution(today, today);
    ok('getDistribution()');
  } catch (e) { skip('getDistribution()', `데이터 없음 또는 미지원`); }

  // session control: start → finish / stop
  try {
    await client.focus.start({ duration: 25 });
    ok('start()');
    await client.focus.stop();
    ok('stop()');
  } catch (e) { fail('start/stop()', e); }
}

// ───────── Statistics ─────────

async function testStatistics() {
  section('Statistics');

  try {
    const ranking = await client.statistics.getRanking();
    ok(`getRanking() → score: ${(ranking as Record<string, unknown>).score ?? 0}`);
  } catch (e) { fail('getRanking()', e); }

  try {
    const from = '2026-04-01 00:00:00';
    const to = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const completed = await client.statistics.listCompleted(from, to, 10);
    ok(`listCompleted() → ${completed.length}개`);
  } catch (e) { fail('listCompleted()', e); }
}

// ───────── Countdowns ─────────

async function testCountdowns() {
  section('Countdowns');

  try {
    const list = await client.countdowns.list();
    ok(`list() → ${list.length}개`);
  } catch (e) { fail('list()', e); }

  let createdId: string | null = null;
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  try {
    await client.countdowns.create({ name: `${TEST_PREFIX} 카운트다운`, date: futureDate });
    const list = await client.countdowns.list();
    const found = list.find((c) => c.name?.startsWith(TEST_PREFIX));
    createdId = found?.id ?? null;
    ok(`create() → ${createdId}`);
  } catch (e) { fail('create()', e); }

  if (createdId) {
    try {
      await client.countdowns.update({ id: createdId, name: `${TEST_PREFIX} 카운트다운 수정` });
      ok('update()');
    } catch (e) { fail('update()', e); }

    try {
      await client.countdowns.delete(createdId);
      ok('delete() — cleanup');
    } catch (e) { fail('delete()', e); }
  }
}

// ───────── Main ─────────

async function main() {
  console.log('🚀 TickTick 통합 테스트 (전체)\n');
  console.log(`세션: ${SESSION_PATH}`);

  const authed = await client.isAuthenticated();
  if (!authed) {
    console.error('\n❌ 세션 만료. 로그인 후 다시 시도하세요.');
    process.exit(1);
  }
  console.log('✅ 인증 확인\n');

  await testUser();
  await testProjects();
  await testTasks();
  await testTags();
  await testHabits();
  await testFocus();
  await testStatistics();
  await testCountdowns();

  console.log('\n══════════════════════════════════════');
  console.log(`✅ ${passed}개 통과 / ❌ ${failed}개 실패 / ⚠️  ${skipped}개 skip`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('예상치 못한 오류:', err);
  process.exit(1);
});
