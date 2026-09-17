/**
 * Live verification for #40: listColumns(projectId) must hit
 * GET /api/v2/column/project/{id}, not the bulk sync + client filter.
 *
 * Run: npx tsx --env-file=.env scripts/verify-issue-40.ts
 */

import { TickTickClient } from '../src/client.js';
import { FileSessionStore } from '../src/session-store.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const username = process.env['TICKTICK_USERNAME'];
const password = process.env['TICKTICK_PASSWORD'];
if (!username || !password) {
  console.error('Missing TICKTICK_USERNAME or TICKTICK_PASSWORD');
  process.exit(1);
}

const client = new TickTickClient({
  credentials: { username, password },
  sessionStore: new FileSessionStore(resolve(__dirname, '../.ticktick-session.json')),
});

let passed = 0;
let failed = 0;

function ok(label: string): void {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label: string, detail: string): void {
  console.log(`  FAIL  ${label}: ${detail}`);
  failed++;
}

const all = await client.projects.listColumns();
console.log(`listColumns() bulk → ${all.length} columns`);
if (Array.isArray(all)) ok('listColumns() returned an array');
else fail('listColumns() returned an array', typeof all);

const projects = await client.projects.list();
const sample = projects.filter((p) => p.kind === 'TASK').slice(0, 5);
if (sample.length === 0) {
  fail('sample projects', 'no TASK projects');
} else {
  let withColumns = 0;
  for (const project of sample) {
    const cols = await client.projects.listColumns(project.id);
    console.log(`  ${project.name} [${project.id}] → ${cols.length} columns`);
    if (!Array.isArray(cols)) {
      fail(`listColumns(${project.name}) array`, typeof cols);
      continue;
    }
    ok(`listColumns(${project.name}) returned an array`);
    if (cols.some((c) => c.projectId && c.projectId !== project.id)) {
      fail(`listColumns(${project.name}) all belong to project`, cols.map((c) => c.projectId).join(','));
    } else {
      ok(`listColumns(${project.name}) columns belong to the project`);
    }
    if (cols.length > 0) withColumns++;
  }
  if (withColumns > 0) ok(`per-project path returned columns for ${withColumns}/${sample.length} projects`);
  else fail('per-project path returned columns', 'every sample project was empty');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
