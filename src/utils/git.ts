import { execSync } from "child_process";

function run(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 10_000 }).trim();
  } catch {
    return "";
  }
}

export function isGitRepo(cwd: string): boolean {
  return run("git rev-parse --is-inside-work-tree", cwd) === "true";
}

export function getBranch(cwd: string): string {
  return run("git branch --show-current", cwd) || "detached HEAD";
}

export function getStatus(cwd: string): string {
  return run("git status --short", cwd);
}

export function getRecentCommits(cwd: string, count: number = 10): string {
  return run(
    `git log --oneline --no-decorate -n ${count}`,
    cwd
  );
}

export function getDiffSummary(cwd: string): string {
  const staged = run("git diff --cached --stat", cwd);
  const unstaged = run("git diff --stat", cwd);
  const parts: string[] = [];
  if (staged) parts.push(`Staged:\n${staged}`);
  if (unstaged) parts.push(`Unstaged:\n${unstaged}`);
  return parts.join("\n\n") || "No changes";
}

export function getLocalBranches(cwd: string): string[] {
  const output = run("git branch --format='%(refname:short)'", cwd);
  if (!output) return [];
  return output.split("\n").map((b) => b.trim().replace(/^'|'$/g, "")).filter(Boolean);
}

export function getBranchLastCommit(cwd: string, branch: string): string {
  return run(`git log -1 --format="%s" "${branch}"`, cwd);
}

export function getBranchCommitCount(cwd: string, branch: string, base: string): number {
  const output = run(`git rev-list --count "${base}..${branch}"`, cwd);
  return parseInt(output, 10) || 0;
}

export interface CommitNode {
  shortHash: string;
  message: string;
  author: string;
  date: string;
  timestamp: number;
  files?: string[];
  insertions?: number;
  deletions?: number;
  body?: string;
}

export function getBranchCommits(cwd: string, branch: string, limit: number = 15): CommitNode[] {
  const sep = "|||";
  const output = run(`git log "${branch}" --format="%h${sep}%s${sep}%an${sep}%ai${sep}%at" -n ${limit}`, cwd);
  if (!output) return [];
  return output.split("\n").filter(Boolean).map(line => {
    const parts = line.split(sep);
    return {
      shortHash: parts[0] || "",
      message: parts[1] || "",
      author: parts[2] || "",
      date: parts[3] || "",
      timestamp: parseInt(parts[4]) || 0,
    };
  });
}

export function getBehindCount(cwd: string, branch: string, base: string): number {
  const output = run(`git rev-list --count "${branch}..${base}"`, cwd);
  return parseInt(output, 10) || 0;
}

export function getFilesChangedCount(cwd: string, branch: string, base: string): number {
  const output = run(`git diff --name-only "${base}...${branch}"`, cwd);
  if (!output) return 0;
  return output.split("\n").filter(Boolean).length;
}

export function getCommitFiles(cwd: string, hash: string): string[] {
  const output = run(`git diff-tree --no-commit-id --name-only -r "${hash}"`, cwd);
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

export function getCommitStats(cwd: string, hash: string): { insertions: number; deletions: number } {
  const output = run(`git diff-tree --no-commit-id --shortstat -r "${hash}"`, cwd);
  const ins = output.match(/(\d+) insertion/);
  const del = output.match(/(\d+) deletion/);
  return {
    insertions: ins ? parseInt(ins[1]) : 0,
    deletions: del ? parseInt(del[1]) : 0,
  };
}

export function getCommitBody(cwd: string, hash: string): string {
  return run(`git log -1 --format="%b" "${hash}"`, cwd);
}

export function getCommitDiffSummary(cwd: string, hash: string): string {
  return run(`git diff-tree --no-commit-id --stat -r "${hash}"`, cwd);
}

export function getHeadCommitHash(cwd: string): string {
  return run("git rev-parse --short HEAD", cwd);
}

export function getDiffFull(cwd: string): string {
  const staged = run("git diff --cached", cwd);
  const unstaged = run("git diff", cwd);
  const parts: string[] = [];
  if (staged) parts.push(`--- Staged changes ---\n${staged}`);
  if (unstaged) parts.push(`--- Unstaged changes ---\n${unstaged}`);
  // Truncate to avoid overwhelming context
  const combined = parts.join("\n\n") || "No changes";
  if (combined.length > 8000) {
    return combined.slice(0, 8000) + "\n\n... (truncated, use diff summary for full picture)";
  }
  return combined;
}
