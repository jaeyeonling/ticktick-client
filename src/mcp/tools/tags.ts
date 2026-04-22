import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TickTickClient } from '../../client.js';
import { mapError, jsonResult, stripUndefined } from '../error-handler.js';

export function registerTagTools(server: McpServer, client: TickTickClient): void {
  server.tool(
    'list_tags',
    'List all tags. Returns tag name, label, color, and parent.',
    {},
    async () => {
      try {
        return jsonResult(await client.tags.list());
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'create_tag',
    'Create a new tag.',
    {
      name: z.string().describe('Tag name (used as identifier).'),
      label: z.string().optional().describe('Display label for the tag.'),
      color: z.string().optional().describe('Tag color.'),
      parent: z.string().optional().describe('Parent tag name for nested tags.'),
    },
    async (args) => {
      try {
        await client.tags.create(stripUndefined(args));
        return jsonResult({ success: true, name: args.name });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'update_tag',
    'Update an existing tag.',
    {
      name: z.string().describe('Tag name to update (used as identifier).'),
      label: z.string().optional().describe('New display label.'),
      color: z.string().optional().describe('New tag color.'),
      parent: z.string().optional().describe('New parent tag name.'),
    },
    async (args) => {
      try {
        await client.tags.update(stripUndefined(args));
        return jsonResult({ success: true, name: args.name });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'delete_tag',
    'Delete a tag.',
    {
      name: z.string().describe('Tag name to delete.'),
    },
    async ({ name }) => {
      try {
        await client.tags.delete(name);
        return jsonResult({ success: true, name });
      } catch (error) {
        return mapError(error);
      }
    },
  );

  server.tool(
    'merge_tags',
    'Merge one tag into another. All tasks with the source tag will be reassigned to the target tag.',
    {
      sourceTagName: z.string().describe('Tag name to merge from (will be removed).'),
      targetTagName: z.string().describe('Tag name to merge into (will remain).'),
    },
    async ({ sourceTagName, targetTagName }) => {
      try {
        await client.tags.merge(sourceTagName, targetTagName);
        return jsonResult({ success: true, merged: sourceTagName, into: targetTagName });
      } catch (error) {
        return mapError(error);
      }
    },
  );
}
