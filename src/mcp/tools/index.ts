import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { registerTaskTools } from './tasks.js';
import { registerProjectTools } from './projects.js';
import { registerTagTools } from './tags.js';
import { registerHabitTools } from './habits.js';
import { registerFocusTools } from './focus.js';
import { registerStatisticsTools } from './statistics.js';
import { registerUserTools } from './user.js';
import { registerCountdownTools } from './countdowns.js';

export function registerAllTools(server: McpServer, client: TickTickClient): void {
  registerTaskTools(server, client);
  registerProjectTools(server, client);
  registerTagTools(server, client);
  registerHabitTools(server, client);
  registerFocusTools(server, client);
  registerStatisticsTools(server, client);
  registerUserTools(server, client);
  registerCountdownTools(server, client);
}
