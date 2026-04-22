import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult, stripUndefined } from '../error-handler.js';

export function registerProjectTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'list_projects',
    'List all projects. Returns project id, name, color, kind, viewMode, and closed status.',
    {},
    async () => {
      try {
        return jsonResult(await client.projects.list());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'create_project',
    'Create a new project (list).',
    {
      name: z.string().describe('Project name.'),
      color: z.string().optional().describe('Project color (hex, e.g. "#F18181").'),
      kind: z.enum(['TASK', 'NOTE']).optional().describe('Project kind: TASK or NOTE.'),
      viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('View mode for the project.'),
    },
    async (args) => {
      try {
        return jsonResult(await client.projects.create(stripUndefined(args)));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'update_project',
    'Update an existing project.',
    {
      id: z.string().describe('Project ID to update.'),
      name: z.string().describe('Updated project name.'),
      color: z.string().optional().describe('Project color (hex).'),
      kind: z.enum(['TASK', 'NOTE']).optional().describe('Project kind.'),
      viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('View mode.'),
    },
    async (args) => {
      try {
        await client.projects.update(stripUndefined(args));
        return jsonResult({ success: true, projectId: args.id });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'delete_project',
    'Delete a project and all its tasks.',
    {
      projectId: z.string().describe('Project ID to delete.'),
    },
    async ({ projectId }) => {
      try {
        await client.projects.delete(projectId);
        return jsonResult({ success: true, projectId });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'list_columns',
    'List kanban columns for a project. Use the returned column IDs when creating or updating tasks with a columnId.',
    {
      projectId: z.string().optional().describe('Project ID. Omit to list columns across all projects.'),
    },
    async ({ projectId }) => {
      try {
        return jsonResult(await client.projects.listColumns(projectId));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'list_project_members',
    'List members of a shared project. Returns userId, displayName, permission, and isOwner. Only works for shared projects — personal projects return an empty array.',
    {
      projectId: z.string().describe('Project ID to list members for.'),
    },
    async ({ projectId }) => {
      try {
        return jsonResult(await client.projects.listMembers(projectId));
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
