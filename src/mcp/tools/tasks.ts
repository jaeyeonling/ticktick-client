import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult, stripUndefined } from '../error-handler.js';

export function registerTaskTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'list_tasks',
    'List all active tasks across all projects. Returns tasks with id, projectId, title, status, priority, dates, tags, and subtasks.',
    {},
    async () => {
      try {
        return jsonResult(await client.tasks.list());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'list_completed_tasks',
    'List completed tasks. Optionally filter by project.',
    {
      projectId: z.string().optional().describe('Project ID to filter by. Omit for all projects.'),
      limit: z.number().optional().describe('Maximum number of tasks to return.'),
    },
    async (args) => {
      try {
        return jsonResult(await client.tasks.listCompleted(stripUndefined(args)));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'create_task',
    'Create a new task. Use list_projects first to get a valid projectId. Omit projectId to create in Inbox.',
    {
      title: z.string().describe('Task title.'),
      projectId: z.string().optional().describe('Project ID. Omit to create in Inbox.'),
      priority: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]).optional().describe('Priority: 0=none, 1=low, 3=medium, 5=high.'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format.'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format.'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day task.'),
      content: z.string().optional().describe('Task description (supports Markdown).'),
      tags: z.array(z.string()).optional().describe('Tag names to attach.'),
      repeatFlag: z.string().optional().describe('Recurrence rule string.'),
      columnId: z.string().optional().describe('Kanban column ID. Get valid values via list_projects.'),
      assignee: z.number().optional().describe('Assignee user ID for shared projects. Get valid values via list_project_members.'),
    },
    async (args) => {
      try {
        return jsonResult(await client.tasks.create(stripUndefined(args)));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'update_task',
    'Update an existing task. Both id and projectId are required. Only include fields you want to change.',
    {
      id: z.string().describe('Task ID to update.'),
      projectId: z.string().describe('Project ID the task belongs to.'),
      title: z.string().optional().describe('Updated task title. Omit to keep the current title.'),
      priority: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]).optional().describe('Priority: 0=none, 1=low, 3=medium, 5=high.'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format.'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format.'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day task.'),
      content: z.string().optional().describe('Task description (supports Markdown).'),
      tags: z.array(z.string()).optional().describe('Tag names to attach.'),
      repeatFlag: z.string().optional().describe('Recurrence rule string.'),
      columnId: z.string().optional().describe('Kanban column ID.'),
      assignee: z.number().optional().describe('Assignee user ID for shared projects.'),
    },
    async (args) => {
      try {
        const cleaned = stripUndefined(args);
        return jsonResult(await client.tasks.update(cleaned as typeof cleaned & { title: string }));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'complete_task',
    'Mark a task as complete.',
    {
      taskId: z.string().describe('Task ID to complete.'),
      projectId: z.string().describe('Project ID the task belongs to.'),
    },
    async ({ taskId, projectId }) => {
      try {
        await client.tasks.complete(projectId, taskId);
        return jsonResult({ success: true, taskId, projectId });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'delete_task',
    'Delete a task.',
    {
      taskId: z.string().describe('Task ID to delete.'),
      projectId: z.string().describe('Project ID the task belongs to.'),
    },
    async ({ taskId, projectId }) => {
      try {
        await client.tasks.delete(projectId, taskId);
        return jsonResult({ success: true, taskId, projectId });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'move_task',
    'Move a task to a different project. WARNING: The task will get a new ID (copy+delete). The response includes both the new task and the previousId.',
    {
      taskId: z.string().describe('Task ID to move.'),
      fromProjectId: z.string().describe('Source project ID.'),
      toProjectId: z.string().describe('Destination project ID.'),
    },
    async (args) => {
      try {
        return jsonResult(await client.tasks.move(args));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'create_subtask',
    'Add a subtask (checklist item) to an existing task.',
    {
      parentTaskId: z.string().describe('Parent task ID.'),
      parentProjectId: z.string().describe('Parent task\'s project ID.'),
      title: z.string().describe('Subtask title.'),
      sortOrder: z.number().optional().describe('Sort order within the subtask list.'),
    },
    async ({ parentTaskId, parentProjectId, title, sortOrder }) => {
      try {
        return jsonResult(await client.tasks.createSubtask(parentTaskId, parentProjectId, stripUndefined({ title, sortOrder })));
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'pin_task',
    'Pin a task to the top of its project.',
    {
      taskId: z.string().describe('Task ID to pin.'),
      projectId: z.string().describe('Project ID the task belongs to.'),
    },
    async ({ taskId, projectId }) => {
      try {
        await client.tasks.pin(taskId, projectId);
        return jsonResult({ success: true, taskId, projectId });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'unpin_task',
    'Unpin a task.',
    {
      taskId: z.string().describe('Task ID to unpin.'),
      projectId: z.string().describe('Project ID the task belongs to.'),
    },
    async ({ taskId, projectId }) => {
      try {
        await client.tasks.unpin(taskId, projectId);
        return jsonResult({ success: true, taskId, projectId });
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
