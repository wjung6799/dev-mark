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

export function extractLatestSummary(content: string): string {
  // Find the last "summary:" line in frontmatter
  const summaryMatches = [...content.matchAll(/^summary:\s*"?(.+?)"?\s*$/gm)];
  if (summaryMatches.length > 0) {
    return summaryMatches[summaryMatches.length - 1][1];
  }
  // Fallback: grab the first heading after the last separator
  const lastSep = content.lastIndexOf("---\n");
  const tail = lastSep >= 0 ? content.slice(lastSep) : content;
  const headingMatch = tail.match(/^#+ (.+)$/m);
  if (headingMatch) return headingMatch[1];
  return "No summary available";
}

// --- Diary entry parsing ---

export interface DiaryEntry {
  title: string;
  summary: string;
  date: string;
  commit: string;
  whatChanged: string[];
  decisions: string[];
  issues: string[];
  nextSteps: string[];
}

export function parseDiaryEntries(content: string): DiaryEntry[] {
  // Split on frontmatter separators (--- blocks)
  const blocks = content.split(/\n---\n/).filter(b => b.trim());
  const entries: DiaryEntry[] = [];

  for (const block of blocks) {
    const summaryMatch = block.match(/^summary:\s*"?(.+?)"?\s*$/m);
    const dateMatch = block.match(/^date:\s*(.+)$/m);
    const commitMatch = block.match(/^commit:\s*(.+)$/m);
    const titleMatch = block.match(/^#+ (.+)$/m);

    if (!titleMatch && !summaryMatch) continue;

    const entry: DiaryEntry = {
      title: titleMatch?.[1] || summaryMatch?.[1] || "",
      summary: summaryMatch?.[1] || titleMatch?.[1] || "",
      date: dateMatch?.[1] || "",
      commit: commitMatch?.[1] || "",
      whatChanged: extractSection(block, "What Changed"),
      decisions: extractSection(block, "Decisions"),
      issues: extractSection(block, "Issues"),
      nextSteps: extractSection(block, "Next Steps"),
    };

    if (entry.title) entries.push(entry);
  }

  return entries;
}

function extractSection(block: string, heading: string): string[] {
  const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "m");
  const match = block.match(regex);
  if (!match) return [];

  const text = match[1].trim();
  // Split by bullet points or newlines
  const lines = text.split(/\n/).map(l => l.replace(/^[-*]\s+/, "").trim()).filter(Boolean);
  return lines;
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
