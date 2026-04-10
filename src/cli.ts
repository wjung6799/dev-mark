#!/usr/bin/env node

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { exec } from "child_process";
import { platform } from "os";

const CONFIG_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".devguard"
);
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_API_URL = "http://localhost:3000";

interface Config {
  apiKey: string;
  apiUrl: string;
  email: string;
  userId: string;
}

function readConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeConfig(config: Config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function openBrowser(url: string) {
  const cmd =
    platform() === "darwin"
      ? "open"
      : platform() === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head><title>Dev Diary - Connected</title></head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="text-align:center;max-width:400px">
<h1 style="font-size:2rem;margin-bottom:0.5rem">Connected!</h1>
<p style="color:#888">Your CLI is now linked to Dev Diary. You can close this tab.</p>
</div>
</body>
</html>`;

async function initCommand() {
  const apiUrl = process.env.DEVGUARD_API_URL || DEFAULT_API_URL;

  console.log("Opening browser to log in...\n");

  return new Promise<void>((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", `http://localhost`);

      if (url.pathname === "/callback") {
        const apiKey = url.searchParams.get("apiKey");
        const email = url.searchParams.get("email");
        const userId = url.searchParams.get("userId");

        if (apiKey && email && userId) {
          writeConfig({ apiKey, apiUrl, email, userId });

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(SUCCESS_HTML);

          console.log(`Authenticated as ${email}`);
          console.log(`API key saved to ${CONFIG_FILE}`);
          console.log(`\nYou're all set! Diary entries will now sync to the platform.`);
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing credentials in callback.");
          console.error("Error: callback was missing credentials.");
        }

        // Shut down after a brief delay to let the response flush
        setTimeout(() => {
          server.close();
          resolve();
        }, 500);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Listen on a random available port
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        console.error("Failed to start local server.");
        process.exit(1);
      }

      const callbackUrl = `http://localhost:${addr.port}/callback`;
      const loginUrl = `${apiUrl}/login?callback=${encodeURIComponent(callbackUrl)}`;

      openBrowser(loginUrl);
      console.log(`Waiting for login at: ${loginUrl}`);
      console.log("(press Ctrl+C to cancel)\n");
    });
  });
}

async function statusCommand() {
  const config = readConfig();
  if (!config) {
    console.log("Not configured. Run: npx devguard init");
    return;
  }
  console.log(`Email:   ${config.email}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`API Key: ${config.apiKey.slice(0, 8)}...`);
  console.log(`Config:  ${CONFIG_FILE}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      await initCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case undefined:
      // No subcommand — run MCP server
      await import("./index.js");
      break;
    default:
      console.log("Usage:");
      console.log("  devguard init     — Open browser to log in and save API key");
      console.log("  devguard status   — Show current configuration");
      console.log("  devguard          — Start MCP server (stdio)");
      break;
  }
}

main();
