import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONFIG_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".devguard"
);
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiKey: string;
  apiUrl: string;
  email: string;
  userId: string;
}

export function getConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function isConfigured(): boolean {
  return getConfig() !== null;
}

interface SyncEntry {
  date: string;
  branch: string;
  commit: string;
  summary: string;
  content: string;
  source?: string;
}

export async function syncEntry(
  projectName: string,
  entry: SyncEntry
): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config) return { ok: false, error: "Not configured" };

  try {
    const res = await fetch(`${config.apiUrl}/api/sync/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ projectName, entry }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function syncImport(
  projectName: string,
  entries: SyncEntry[]
): Promise<{ ok: boolean; imported?: number; skipped?: number; error?: string }> {
  const config = getConfig();
  if (!config) return { ok: false, error: "Not configured" };

  try {
    const res = await fetch(`${config.apiUrl}/api/sync/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ projectName, entries }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, imported: data.imported, skipped: data.skipped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function fetchRules(): Promise<{ ok: boolean; rules?: Array<{ id: string; title: string; content: string }>; error?: string }> {
  const config = getConfig();
  if (!config) return { ok: false, error: "Not configured" };

  try {
    const res = await fetch(`${config.apiUrl}/api/rules`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!res.ok) {
      const data = await res.json();
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, rules: data.rules };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
