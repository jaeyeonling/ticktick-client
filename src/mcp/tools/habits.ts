import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult, stripUndefined } from '../error-handler.js';

export function registerHabitTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'list_habits',
    'List all habits. Returns habit id, name, goal, step, unit, streaks, and total check-ins.',
    {},
    async () => {
      try {
        return jsonResult(await client.habits.list());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'create_habit',
    'Create a new habit.',
    {
      name: z.string().describe('Habit name.'),
      repeatRule: z.string().describe('Recurrence rule (e.g. "RRULE:FREQ=DAILY").'),
      goal: z.number().describe('Target goal value per period.'),
      step: z.number().describe('Increment step per check-in.'),
      unit: z.string().describe('Unit of measurement (e.g. "times", "minutes", "ml").'),
      type: z.string().describe('Habit type (e.g. "boolean", "quantity").'),
      recordEnable: z.boolean().describe('Whether to enable value recording on check-in.'),
      color: z.string().optional().describe('Habit color.'),
      iconRes: z.string().optional().describe('Icon resource identifier.'),
      sectionId: z.string().optional().describe('Section/group ID.'),
    },
    async (args) => {
      try {
        await client.habits.create(stripUndefined(args));
        return jsonResult({ success: true, name: args.name });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'update_habit',
    'Update an existing habit.',
    {
      id: z.string().describe('Habit ID to update.'),
      name: z.string().optional().describe('Updated habit name.'),
      repeatRule: z.string().optional().describe('Updated recurrence rule.'),
      goal: z.number().optional().describe('Updated target goal value.'),
      step: z.number().optional().describe('Updated increment step.'),
      unit: z.string().optional().describe('Updated unit of measurement.'),
      type: z.string().optional().describe('Updated habit type.'),
      recordEnable: z.boolean().optional().describe('Whether to enable value recording.'),
      color: z.string().optional().describe('Updated habit color.'),
      iconRes: z.string().optional().describe('Updated icon resource.'),
      sectionId: z.string().optional().describe('Updated section/group ID.'),
    },
    async (args) => {
      try {
        await client.habits.update(stripUndefined(args));
        return jsonResult({ success: true, habitId: args.id });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'delete_habit',
    'Delete a habit.',
    {
      habitId: z.string().describe('Habit ID to delete.'),
    },
    async ({ habitId }) => {
      try {
        await client.habits.delete(habitId);
        return jsonResult({ success: true, habitId });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'checkin_habit',
    'Record a check-in for a habit on a specific date.',
    {
      habitId: z.string().describe('Habit ID.'),
      date: z.string().describe('Date for the check-in in "YYYY-MM-DD" format.'),
      goal: z.number().describe('Goal value for this check-in.'),
      value: z.number().optional().describe('Recorded value (defaults to goal if omitted).'),
      status: z.enum(['done', 'undone', 'unlabeled']).optional().describe('Check-in status. Defaults to "done".'),
    },
    async ({ habitId, date, goal, value, status }) => {
      try {
        await client.habits.upsertCheckin(stripUndefined({ habitId, date, goal, value, status }));
        return jsonResult({ success: true, habitId, date });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'get_habit_week_stats',
    'Get weekly habit completion statistics. Returns per-day counts of total and completed habits.',
    {},
    async () => {
      try {
        return jsonResult(await client.habits.getWeekStats());
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
