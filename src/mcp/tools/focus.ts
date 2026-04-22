import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult, stripUndefined } from '../error-handler.js';

export function registerFocusTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'start_focus',
    'Start a Pomodoro focus session.',
    {
      duration: z.number().optional().describe('Focus duration in minutes (default: 25).'),
      focusOnId: z.string().optional().describe('Task ID to focus on.'),
      focusOnTitle: z.string().optional().describe('Title to display during the focus session.'),
      note: z.string().optional().describe('Note for the focus session.'),
    },
    async (args) => {
      try {
        await client.focus.start(stripUndefined(args));
        return jsonResult({ success: true, status: 'running' });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'pause_focus',
    'Pause the currently running focus session.',
    {},
    async () => {
      try {
        await client.focus.pause();
        return jsonResult({ success: true, status: 'paused' });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'resume_focus',
    'Resume a paused focus session.',
    {},
    async () => {
      try {
        await client.focus.resume();
        return jsonResult({ success: true, status: 'running' });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'finish_focus',
    'Finish the current focus session and save it as a completed Pomodoro.',
    {},
    async () => {
      try {
        await client.focus.finish();
        return jsonResult({ success: true, status: 'finished' });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'stop_focus',
    'Stop (discard) the current focus session without saving it.',
    {},
    async () => {
      try {
        await client.focus.stop();
        return jsonResult({ success: true, status: 'stopped' });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'get_focus_overview',
    'Get Pomodoro focus statistics overview including total focus time, session counts, and streaks.',
    {},
    async () => {
      try {
        return jsonResult(await client.focus.getOverview());
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
