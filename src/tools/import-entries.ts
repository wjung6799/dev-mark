import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as storage from "../utils/storage.js";
import { isConfigured, syncImport } from "../utils/sync.js";

export function registerImportEntries(server: McpServer) {
  (server as any).tool(
    "import_entries",
    "Import all existing .devguard/ diary entries to the cloud platform. Requires running `devguard init` first.",
    {
      project_path: z.string().describe("Absolute path to the project directory"),
      project_name: z
        .string()
        .optional()
        .describe("Project name on the platform (defaults to directory name)"),
    },
    async ({ project_path, project_name }: { project_path: string; project_name?: string }) => {
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

      const name = project_name || project_path.split("/").pop() || "unknown";

      // Collect all entries from main stem
      const mainEntries = storage.readEntries(project_path, 1000);
      const parsed: Array<{
        date: string;
        branch: string;
        commit: string;
        summary: string;
        content: string;
      }> = [];

      for (const fileContent of mainEntries) {
        const entries = storage.parseDiaryEntries(fileContent);
        for (const entry of entries) {
          parsed.push({
            date: entry.date || new Date().toISOString(),
            branch: "main",
            commit: entry.commit || "",
            summary: entry.summary || entry.title,
            content: fileContent,
          });
        }
      }

      // Collect branch entries
      const branchFiles = storage.listBranchFiles(project_path);
      for (const { branch, content } of branchFiles) {
        const entries = storage.parseDiaryEntries(content);
        for (const entry of entries) {
          parsed.push({
            date: entry.date || new Date().toISOString(),
            branch,
            commit: entry.commit || "",
            summary: entry.summary || entry.title,
            content,
          });
        }
      }

      if (parsed.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No diary entries found to import.",
            },
          ],
        };
      }

      const result = await syncImport(name, parsed);

      if (!result.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Import failed: ${result.error}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Imported ${result.imported} entries to project "${name}" (${result.skipped} skipped/duplicates).`,
          },
        ],
      };
    }
  );
}
