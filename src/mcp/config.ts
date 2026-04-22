import { homedir } from 'node:os';
import { join } from 'node:path';

export const config = {
  username: process.env['TICKTICK_USERNAME'],
  password: process.env['TICKTICK_PASSWORD'],
  sessionPath: process.env['TICKTICK_SESSION_PATH'] ?? join(homedir(), '.ticktick-mcp-session.json'),
  baseUrl: process.env['TICKTICK_BASE_URL'],
  timeZone: process.env['TICKTICK_TIME_ZONE'],
} as const;
