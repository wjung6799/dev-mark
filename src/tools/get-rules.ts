import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isConfigured, fetchRules } from "../utils/sync.js";

export function registerGetRules(server: McpServer) {
  (server as any).tool(
    "get_rules",
    "Fetch your rules from the Dev Diary platform. Rules are instructions that should guide AI behavior for your projects.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
    },
    async ({ project_path }: { project_path: string }) => {
      if (!isConfigured()) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Not configured. Run `npx devguard init <email>` first to connect to the platform.",
            },
          ],
        };
      }

      const result = await fetchRules();

      if (!result.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to fetch rules: ${result.error}`,
            },
          ],
        };
      }

      const rules = result.rules || [];
      if (rules.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No rules configured. Add rules at your Dev Diary platform dashboard.",
            },
          ],
        };
      }

      const formatted = rules
        .map((r, i) => `### Rule ${i + 1}: ${r.title}\n${r.content}`)
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Your Rules (${rules.length})\n\n${formatted}`,
          },
        ],
      };
    }
  );
}
