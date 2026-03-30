#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetContext } from "./tools/get-context.js";
import { registerWriteEntry } from "./tools/write-entry.js";
import { registerReadEntries } from "./tools/read-entries.js";
import { registerCatchMeUp } from "./tools/catch-me-up.js";
import { registerSetup } from "./tools/setup.js";
import { registerBranchMap } from "./tools/branch-map.js";
import { registerDailyView } from "./tools/daily-view.js";
import { autoSetup } from "./utils/auto-setup.js";

// Auto-setup on first run: adds .devdiary/ to .gitignore
// and auto-logging instruction to CLAUDE.md or .cursorrules
autoSetup(process.cwd());

const server = new McpServer({
  name: "devdiary",
  version: "0.1.0",
});

registerGetContext(server);
registerWriteEntry(server);
registerReadEntries(server);
registerCatchMeUp(server);
registerSetup(server);
registerBranchMap(server);
registerDailyView(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("devdiary MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
