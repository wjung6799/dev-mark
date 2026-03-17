"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const get_context_js_1 = require("./tools/get-context.js");
const write_entry_js_1 = require("./tools/write-entry.js");
const read_entries_js_1 = require("./tools/read-entries.js");
const server = new mcp_js_1.McpServer({
    name: "devdiary",
    version: "0.1.0",
});
(0, get_context_js_1.registerGetContext)(server);
(0, write_entry_js_1.registerWriteEntry)(server);
(0, read_entries_js_1.registerReadEntries)(server);
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("devdiary MCP server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
