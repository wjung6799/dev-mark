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
