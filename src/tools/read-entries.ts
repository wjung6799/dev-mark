import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as storage from "../utils/storage.js";

export function registerReadEntries(server: McpServer) {
  (server as any).tool(
    "read_entries",
    "Read recent dev diary entries. Call this at the start of a session to catch up on what happened last time.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
      count: z
        .number()
        .int()
        .positive()
        .default(5)
        .describe("Number of recent entries to return (default 5)"),
    },
    async ({ project_path, count }: { project_path: string; count: number }) => {
      const entries = storage.readEntries(project_path, count);

      if (entries.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No diary entries found. Start a session and write your first entry!",
            },
          ],
        };
      }

      const output = entries
        .map((entry, i) => `${i === 0 ? "## Latest Entry" : `## Entry ${i + 1}`}\n\n${entry}`)
        .join("\n\n---\n\n");

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );
}
