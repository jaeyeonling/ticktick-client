import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../client.js';
import { registerAllTools } from './tools/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

const INSTRUCTIONS = `# TickTick MCP Server

## Overview
Manage your TickTick tasks, projects, habits, focus sessions, tags, countdowns, and statistics through natural language.

## Quick Start
- Use list_projects to see all projects and get their IDs
- Use list_tasks to see all active tasks
- Use create_task to add a new task (omit projectId for Inbox)

## Best Practices
- Always call list_projects first when you need a projectId
- complete_task and delete_task both require taskId AND projectId
- move_task copies the task to a new project and deletes the original — the task ID will change
- For kanban projects, use list_columns to get valid columnId values
- For shared projects, use list_project_members to get valid assignee user IDs
- finish_focus saves the session as completed; stop_focus discards it
- Habit check-in dates should be in "YYYY-MM-DD" format
- Task dates should be in ISO 8601 format (e.g. "2026-04-23T09:00:00+09:00")

## Limitations
- Focus analytics (heatmap, hour distribution) are unavailable due to a TickTick server bug
- Task moves are implemented as copy+delete — the task receives a new ID
- Trash listing is unreliable — the TickTick API ignores the status filter
`;

export function createServer(client: TickTickClient): McpServer {
  const server = new McpServer(
    { name: 'ticktick-mcp-server', version },
    { instructions: INSTRUCTIONS },
  );

  registerAllTools(server, client);

  return server;
}
