import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult, stripUndefined } from '../error-handler.js';

export function registerCountdownTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'list_countdowns',
    'List all countdowns. Returns countdown id, name, date, type, and color.',
    {},
    async () => {
      try {
        return jsonResult(await client.countdowns.list());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'create_countdown',
    'Create a new countdown timer.',
    {
      name: z.string().describe('Countdown name.'),
      date: z.string().describe('Target date in "YYYY-MM-DD" format.'),
      type: z.enum(['countdown', 'anniversary', 'birthday', 'holiday']).optional()
        .describe('Countdown type. Defaults to "countdown".'),
      color: z.string().optional().describe('Display color.'),
      ignoreYear: z.boolean().optional().describe('Whether to ignore the year (for recurring annual events).'),
      remark: z.string().optional().describe('Additional notes.'),
    },
    async (args) => {
      try {
        await client.countdowns.create(stripUndefined(args));
        return jsonResult({ success: true, name: args.name });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'update_countdown',
    'Update an existing countdown.',
    {
      id: z.string().describe('Countdown ID to update.'),
      name: z.string().optional().describe('Updated countdown name.'),
      date: z.string().optional().describe('Updated target date in "YYYY-MM-DD" format.'),
      type: z.enum(['countdown', 'anniversary', 'birthday', 'holiday']).optional()
        .describe('Updated countdown type.'),
      color: z.string().optional().describe('Updated display color.'),
      ignoreYear: z.boolean().optional().describe('Whether to ignore the year.'),
      remark: z.string().optional().describe('Updated notes.'),
    },
    async (args) => {
      try {
        await client.countdowns.update(stripUndefined(args));
        return jsonResult({ success: true, id: args.id });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'delete_countdown',
    'Delete a countdown.',
    {
      id: z.string().describe('Countdown ID to delete.'),
    },
    async ({ id }) => {
      try {
        await client.countdowns.delete(id);
        return jsonResult({ success: true, id });
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
