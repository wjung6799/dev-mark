import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as git from "../utils/git.js";

export function registerGetContext(server: McpServer) {
  (server as any).tool(
    "get_context",
    "Get the current git state of a project — branch, status, recent commits, and diffs. Call this to understand what happened before writing a diary entry.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
    },
    async ({ project_path }: { project_path: string }) => {
      if (!git.isGitRepo(project_path)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `${project_path} is not a git repository. Dev diary works best with git projects.`,
            },
          ],
        };
      }

      const branch = git.getBranch(project_path);
      const status = git.getStatus(project_path);
      const commits = git.getRecentCommits(project_path);
      const diffSummary = git.getDiffSummary(project_path);
      const diffFull = git.getDiffFull(project_path);

      const output = [
        `## Branch\n${branch}`,
        `## Status\n${status || "Clean working tree"}`,
        `## Recent Commits\n${commits || "No commits yet"}`,
        `## Diff Summary\n${diffSummary}`,
        `## Full Diff\n${diffFull}`,
      ].join("\n\n");

      return {
        content: [{ type: "text" as const, text: output }],
      };
    }
  );
}
