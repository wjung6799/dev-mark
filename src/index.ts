import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetContext } from "./tools/get-context.js";
import { registerWriteEntry } from "./tools/write-entry.js";
import { registerReadEntries } from "./tools/read-entries.js";

const server = new McpServer({
  name: "devdiary",
  version: "0.1.0",
});

registerGetContext(server);
registerWriteEntry(server);
registerReadEntries(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("devdiary MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
