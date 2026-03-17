"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGitRepo = isGitRepo;
exports.getBranch = getBranch;
exports.getStatus = getStatus;
exports.getRecentCommits = getRecentCommits;
exports.getDiffSummary = getDiffSummary;
exports.getDiffFull = getDiffFull;
const child_process_1 = require("child_process");
function run(cmd, cwd) {
    try {
        return (0, child_process_1.execSync)(cmd, { cwd, encoding: "utf-8", timeout: 10_000 }).trim();
    }
    catch {
        return "";
    }
}
function isGitRepo(cwd) {
    return run("git rev-parse --is-inside-work-tree", cwd) === "true";
}
function getBranch(cwd) {
    return run("git branch --show-current", cwd) || "detached HEAD";
}
function getStatus(cwd) {
    return run("git status --short", cwd);
}
function getRecentCommits(cwd, count = 10) {
    return run(`git log --oneline --no-decorate -n ${count}`, cwd);
}
function getDiffSummary(cwd) {
    const staged = run("git diff --cached --stat", cwd);
    const unstaged = run("git diff --stat", cwd);
    const parts = [];
    if (staged)
        parts.push(`Staged:\n${staged}`);
    if (unstaged)
        parts.push(`Unstaged:\n${unstaged}`);
    return parts.join("\n\n") || "No changes";
}
function getDiffFull(cwd) {
    const staged = run("git diff --cached", cwd);
    const unstaged = run("git diff", cwd);
    const parts = [];
    if (staged)
        parts.push(`--- Staged changes ---\n${staged}`);
    if (unstaged)
        parts.push(`--- Unstaged changes ---\n${unstaged}`);
    // Truncate to avoid overwhelming context
    const combined = parts.join("\n\n") || "No changes";
    if (combined.length > 8000) {
        return combined.slice(0, 8000) + "\n\n... (truncated, use diff summary for full picture)";
    }
    return combined;
}
