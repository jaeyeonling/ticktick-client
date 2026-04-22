import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult } from '../error-handler.js';

export function registerStatisticsTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'get_ranking',
    'Get user productivity ranking and statistics including task count, project count, score, and level.',
    {},
    async () => {
      try {
        return jsonResult(await client.statistics.getRanking());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'list_completed_in_range',
    'List tasks completed within a date range.',
    {
      from: z.string().datetime({ offset: true }).describe('Start date in ISO 8601 format (e.g. "2026-04-01T00:00:00+00:00").'),
      to: z.string().datetime({ offset: true }).describe('End date in ISO 8601 format (e.g. "2026-04-22T23:59:59+00:00").'),
      limit: z.number().int().positive().optional().describe('Maximum number of tasks to return.'),
    },
    async ({ from, to, limit }) => {
      try {
        return jsonResult(await client.statistics.listCompleted(from, to, limit));
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
