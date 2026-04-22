import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult } from '../error-handler.js';

export function registerUserTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'get_user_profile',
    'Get the current user\'s profile information including username, email, display name, and avatar.',
    {},
    async () => {
      try {
        return jsonResult(await client.user.getProfile());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'get_user_status',
    'Get the current user\'s account status including Pro subscription, inbox ID, and subscription type.',
    {},
    async () => {
      try {
        return jsonResult(await client.user.getStatus());
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
