import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as git from "../utils/git.js";
import * as storage from "../utils/storage.js";
import { generateAndOpenDailyView, DayData } from "../utils/daily-view-html.js";

export function registerDailyView(server: McpServer) {
  (server as any).tool(
    "daily_view",
    "Opens a calendar dashboard in the browser. Each day shows bullet points of what you worked on — pulled from diary entries across all branches.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
    },
    async ({ project_path }: { project_path: string }) => {
      if (!git.isGitRepo(project_path)) {
        return {
          content: [{ type: "text" as const, text: "This project isn't using git yet — nothing to show." }],
        };
      }

      const currentBranch = git.getBranch(project_path);

      // Collect all diary entries from main stem
      const mainEntries = storage.readEntries(project_path, 90);
      const allParsed: { date: string; entry: storage.DiaryEntry }[] = [];

      for (const content of mainEntries) {
        const entries = storage.parseDiaryEntries(content);
        for (const entry of entries) {
          const date = entry.date ? entry.date.slice(0, 10) : "";
          if (date) allParsed.push({ date, entry });
        }
      }

      // Collect diary entries from all branches
      const branchFiles = storage.listBranchFiles(project_path);
      for (const bf of branchFiles) {
        const entries = storage.parseDiaryEntries(bf.content);
        for (const entry of entries) {
          const date = entry.date ? entry.date.slice(0, 10) : "";
          if (date) allParsed.push({ date, entry });
        }
      }

      // Group by date
      const dateMap = new Map<string, storage.DiaryEntry[]>();
      for (const { date, entry } of allParsed) {
        if (!dateMap.has(date)) dateMap.set(date, []);
        dateMap.get(date)!.push(entry);
      }

      const days: DayData[] = Array.from(dateMap.entries())
        .map(([date, entries]) => ({ date, entries }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const filePath = generateAndOpenDailyView(project_path, days, currentBranch);

      return {
        content: [{ type: "text" as const, text: `Daily view opened in your browser.\n\nSaved to: ${filePath}` }],
      };
    }
  );
}
