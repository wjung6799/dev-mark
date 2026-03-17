import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const DIARY_DIR = ".devdiary";
const ENTRIES_DIR = "entries";

function entriesPath(projectPath: string): string {
  return join(projectPath, DIARY_DIR, ENTRIES_DIR);
}

export function ensureDiaryDir(projectPath: string): string {
  const dir = entriesPath(projectPath);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeEntry(projectPath: string, content: string): string {
  const dir = ensureDiaryDir(projectPath);
  const now = new Date();
  const filename = formatTimestamp(now) + ".md";
  const filePath = join(dir, filename);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

export function readEntries(projectPath: string, count: number): string[] {
  const dir = entriesPath(projectPath);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, count);

  return files.map((f) => readFileSync(join(dir, f), "utf-8"));
}

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}_${h}-${mi}`;
}
