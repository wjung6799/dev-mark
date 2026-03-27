import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export function registerSearchEntries(server: McpServer) {
  (server as any).tool(
    "search_entries",
    "Search diary entries by keyword or date range. Returns matching sections from the diary so you can find past decisions, issues, or context without reading every entry.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
      query: z.string().describe("Keyword or phrase to search for (case-insensitive)"),
      from_date: z
        .string()
        .optional()
        .describe("Start date filter (YYYY-MM-DD). Only entries on or after this date."),
      to_date: z
        .string()
        .optional()
        .describe("End date filter (YYYY-MM-DD). Only entries on or before this date."),
    },
    async ({
      project_path,
      query,
      from_date,
      to_date,
    }: {
      project_path: string;
      query: string;
      from_date?: string;
      to_date?: string;
    }) => {
      const dir = join(project_path, ".devguard", "entries");
      if (!existsSync(dir)) {
        return {
          content: [{ type: "text" as const, text: "No diary entries found." }],
        };
      }

      let files = readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse();

      // Date filtering
      if (from_date) {
        files = files.filter((f) => f.replace(".md", "") >= from_date);
      }
      if (to_date) {
        files = files.filter((f) => f.replace(".md", "") <= to_date);
      }

      const queryLower = query.toLowerCase();
      const matches: string[] = [];

      for (const file of files) {
        const content = readFileSync(join(dir, file), "utf-8");
        if (!content.toLowerCase().includes(queryLower)) continue;

        const date = file.replace(".md", "");
        // Split into sessions and find matching ones
        const sessions = content.split(/---\s*\n\s*<!--\s*session:/);
        const matchingSections: string[] = [];

        for (const session of sessions) {
          if (session.toLowerCase().includes(queryLower)) {
            // Extract a concise snippet around the match
            const lines = session.split("\n");
            const matchingLines = lines.filter((l) =>
              l.toLowerCase().includes(queryLower)
            );
            matchingSections.push(matchingLines.slice(0, 5).join("\n"));
          }
        }

        if (matchingSections.length > 0) {
          matches.push(
            `### ${date}\n${matchingSections.join("\n...\n")}`
          );
        }
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No entries matching "${query}"${from_date ? ` from ${from_date}` : ""}${to_date ? ` to ${to_date}` : ""}.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `**Search results for "${query}" (${matches.length} entries):**\n\n${matches.join("\n\n---\n\n")}`,
          },
        ],
      };
    }
  );
}
