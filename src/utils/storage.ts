import { mkdirSync, writeFileSync, appendFileSync, readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const DIARY_DIR = ".devguard";
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
  const filename = formatDate(now) + ".md";
  const filePath = join(dir, filename);

  const time = formatTime(now);
  const separator = `\n\n---\n\n<!-- session: ${time} -->\n\n`;

  if (existsSync(filePath)) {
    appendFileSync(filePath, separator + content, "utf-8");
  } else {
    writeFileSync(filePath, content, "utf-8");
  }

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

// --- Branch entries ---

const BRANCHES_DIR = "branches";

function branchesPath(projectPath: string): string {
  return join(projectPath, DIARY_DIR, BRANCHES_DIR);
}

function sanitizeBranchName(branch: string): string {
  return branch.replace(/\//g, "-");
}

export function ensureBranchesDir(projectPath: string): string {
  const dir = branchesPath(projectPath);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeBranchEntry(projectPath: string, branch: string, content: string): string {
  const dir = ensureBranchesDir(projectPath);
  const filename = sanitizeBranchName(branch) + ".md";
  const filePath = join(dir, filename);

  const now = new Date();
  const separator = `\n\n---\n\n<!-- ${formatDate(now)} ${formatTime(now)} -->\n\n`;

  if (existsSync(filePath)) {
    appendFileSync(filePath, separator + content, "utf-8");
  } else {
    const header = `# Branch: ${branch}\n\n`;
    writeFileSync(filePath, header + content, "utf-8");
  }

  return filePath;
}

export function readBranchEntry(projectPath: string, branch: string): string | null {
  const dir = branchesPath(projectPath);
  const filename = sanitizeBranchName(branch) + ".md";
  const filePath = join(dir, filename);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function listBranchFiles(projectPath: string): { branch: string; content: string }[] {
  const dir = branchesPath(projectPath);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      branch: f.replace(".md", ""),
      content: readFileSync(join(dir, f), "utf-8"),
    }));
}

// --- Helpers ---

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${mi}`;
}
