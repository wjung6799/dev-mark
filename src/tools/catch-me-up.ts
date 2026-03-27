import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as git from "../utils/git.js";
import * as storage from "../utils/storage.js";

export function registerCatchMeUp(server: McpServer) {
  (server as any).tool(
    "catch_me_up",
    "The morning briefing. Reads your recent diary entries and current git state, then returns everything the AI needs to give you a conversational catch-up — like a teammate who was watching over your shoulder.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
    },
    async ({ project_path }: { project_path: string }) => {
      const parts: string[] = [];
      const branch = git.isGitRepo(project_path)
        ? git.getBranch(project_path)
        : "main";
      const isMainBranch = branch === "main" || branch === "master";

      // If on a feature branch, show its log first
      if (!isMainBranch) {
        const branchLog = storage.readBranchEntry(project_path, branch);
        if (branchLog) {
          parts.push(`## Current Branch: ${branch}\n`);
          parts.push(branchLog);
        } else {
          parts.push(`## Current Branch: ${branch}\n\nNo diary entries for this branch yet.`);
        }
      }

      // Recent main stem entries
      const entries = storage.readEntries(project_path, 3);
      if (entries.length > 0) {
        parts.push("## Main Stem (Recent Daily Entries)\n");
        entries.forEach((entry, i) => {
          parts.push(`### ${i === 0 ? "Latest" : `Entry ${i + 1}`}\n${entry}`);
        });
      } else {
        parts.push("## No previous diary entries found.\n");
      }

      // Other branch logs
      const allBranches = storage.listBranchFiles(project_path);
      const otherBranches = allBranches.filter(
        (b) => b.branch !== branch.replace(/\//g, "-")
      );
      if (otherBranches.length > 0) {
        parts.push("## Other Branches\n");
        for (const b of otherBranches) {
          // Show just the last entry snippet for each
          const lines = b.content.split("\n");
          const lastSeparator = b.content.lastIndexOf("---\n\n<!--");
          const snippet = lastSeparator >= 0
            ? b.content.slice(lastSeparator).split("\n").slice(0, 15).join("\n")
            : lines.slice(-10).join("\n");
          parts.push(`### ${b.branch}\n${snippet}`);
        }
      }

      // Current git state
      if (git.isGitRepo(project_path)) {
        const status = git.getStatus(project_path);
        const commits = git.getRecentCommits(project_path, 5);
        const diff = git.getDiffFull(project_path);

        parts.push(
          `## Current Git State`,
          `**Branch:** ${branch}`,
          `**Working tree:**\n${status || "Clean"}`,
          `**Recent commits:**\n${commits || "None"}`,
          `**Uncommitted changes:**\n${diff}`,
        );
      }

      parts.push(
        "",
        "---",
        "Use all of the above to give the user a conversational catch-up briefing. Be specific — mention file names, branch names, what was last worked on, and where they should probably start today. Talk like a teammate, not a changelog.",
      );

      return {
        content: [{ type: "text" as const, text: parts.join("\n\n") }],
      };
    }
  );
}
