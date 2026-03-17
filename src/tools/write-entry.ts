import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as git from "../utils/git.js";
import * as storage from "../utils/storage.js";

interface WriteEntryParams {
  project_path: string;
  summary: string;
  changes: string;
  decisions?: string;
  issues?: string;
  next_steps?: string;
}

export function registerWriteEntry(server: McpServer) {
  (server as any).tool(
    "write_entry",
    "Save a dev diary entry. Captures what changed, decisions made, issues hit, and what's next. Call get_context first to gather the raw material.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
      summary: z.string().describe("One-line summary of what happened this session"),
      changes: z.string().describe("What changed — files modified, features added, bugs fixed"),
      decisions: z
        .string()
        .optional()
        .describe("Key decisions made and why"),
      issues: z
        .string()
        .optional()
        .describe("What broke, what's stuck, errors encountered"),
      next_steps: z
        .string()
        .optional()
        .describe("What to do next session"),
    },
    async ({ project_path, summary, changes, decisions, issues, next_steps }: WriteEntryParams) => {
      const branch = git.isGitRepo(project_path)
        ? git.getBranch(project_path)
        : "unknown";

      const now = new Date().toISOString();

      const sections = [
        `---`,
        `date: ${now}`,
        `branch: ${branch}`,
        `summary: "${summary}"`,
        `---`,
        "",
        `# ${summary}`,
        "",
        `## What Changed`,
        changes,
      ];

      if (decisions) {
        sections.push("", "## Decisions", decisions);
      }

      if (issues) {
        sections.push("", "## Issues", issues);
      }

      if (next_steps) {
        sections.push("", "## Next Steps", next_steps);
      }

      const content = sections.join("\n") + "\n";
      const filePath = storage.writeEntry(project_path, content);

      return {
        content: [
          {
            type: "text" as const,
            text: `Diary entry saved: ${filePath}`,
          },
        ],
      };
    }
  );
}
