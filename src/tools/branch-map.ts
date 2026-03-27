import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as git from "../utils/git.js";
import * as storage from "../utils/storage.js";
import { generateAndOpenBranchMap, BranchData, GitEvent } from "../utils/branch-map-html.js";

export function registerBranchMap(server: McpServer) {
  (server as any).tool(
    "branch_map",
    "Opens a visual branch map in the browser. Shows all branches, what they're for, and where you are — designed for people who don't want to think about git.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
    },
    async ({ project_path }: { project_path: string }) => {
      if (!git.isGitRepo(project_path)) {
        return {
          content: [{ type: "text" as const, text: "This project isn't using git yet — no branches to show." }],
        };
      }

      const branch = git.getBranch(project_path);
      const gitBranches = git.getLocalBranches(project_path);
      const branchFiles = storage.listBranchFiles(project_path);
      const branchFileMap = new Map(branchFiles.map((b) => [b.branch, b.content]));
      const mainBranch = gitBranches.includes("main") ? "main" : "master";

      // Also read main stem entries for diary content on main
      const mainEntries = storage.readEntries(project_path, 5);
      const mainDiaryEntries = mainEntries.flatMap((content) => storage.parseDiaryEntries(content));

      const branches: BranchData[] = gitBranches.map((b) => {
        const isCurrent = b === branch;
        const isMain = b === "main" || b === "master";
        const sanitized = b.replace(/\//g, "-");
        const content = branchFileMap.get(sanitized);

        let summary: string;
        let diaryEntries: storage.DiaryEntry[] = [];

        if (content) {
          summary = storage.extractLatestSummary(content);
          diaryEntries = storage.parseDiaryEntries(content);
        } else if (isMain && mainDiaryEntries.length > 0) {
          summary = mainDiaryEntries[0]?.summary || git.getBranchLastCommit(project_path, b) || "Empty branch";
          diaryEntries = mainDiaryEntries;
        } else {
          summary = git.getBranchLastCommit(project_path, b) || "Empty branch";
        }

        const ahead = isMain ? 0 : git.getBranchCommitCount(project_path, b, mainBranch);
        const behind = isMain ? 0 : git.getBehindCount(project_path, b, mainBranch);
        const commits = git.getBranchCommits(project_path, b, 10);
        // Enrich commits with per-commit file data for branch viewer
        for (const c of commits) {
          c.files = git.getCommitFiles(project_path, c.shortHash);
          const stats = git.getCommitStats(project_path, c.shortHash);
          c.insertions = stats.insertions;
          c.deletions = stats.deletions;
          c.body = git.getCommitBody(project_path, c.shortHash);
        }
        const filesChanged = isMain ? 0 : git.getFilesChangedCount(project_path, b, mainBranch);

        return { name: b, isCurrent, isMain, summary, ahead, behind, commits, filesChanged, diaryEntries };
      });

      // Build events from branch data
      const events: GitEvent[] = [];
      branches.forEach((b) => {
        if (!b.isMain && b.ahead > 0) {
          events.push({ type: "fork", label: `Forked: ${b.name}`, branch: b.name });
        }
      });
      if (branches.some((b) => !b.isMain && b.ahead === 0 && !b.isCurrent)) {
        const merged = branches.filter((b) => !b.isMain && b.ahead === 0 && !b.isCurrent);
        merged.forEach((b) => {
          events.push({ type: "merge", label: `Merged: ${b.name} into main`, branch: b.name });
        });
      }

      const filePath = generateAndOpenBranchMap(project_path, branches, events);

      return {
        content: [{ type: "text" as const, text: `Branch map opened in your browser.\n\nSaved to: ${filePath}` }],
      };
    }
  );
}
