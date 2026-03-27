import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { CommitNode } from "./git.js";
import { DiaryEntry } from "./storage.js";

export interface BranchData {
  name: string;
  isCurrent: boolean;
  isMain: boolean;
  summary: string;
  ahead: number;
  behind: number;
  commits: CommitNode[];
  filesChanged: number;
  diaryEntries: DiaryEntry[];
}

export interface GitEvent {
  type: "fork" | "merge" | "new";
  label: string;
  branch: string;
}

export function generateAndOpenBranchMap(
  projectPath: string,
  branches: BranchData[],
  events: GitEvent[]
): string {
  const projectName = projectPath.split("/").pop() || "project";
  const html = buildHtml(branches, projectName);
  const dir = join(projectPath, ".devguard");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "branch-map.html");
  writeFileSync(filePath, html, "utf-8");

  try {
    const platform = process.platform;
    if (platform === "darwin") {
      execSync(`open "${filePath}"`, { timeout: 5000 });
    } else if (platform === "linux") {
      execSync(`xdg-open "${filePath}"`, { timeout: 5000 });
    } else if (platform === "win32") {
      execSync(`start "" "${filePath}"`, { timeout: 5000 });
    }
  } catch {
    // Silently fail — file is still written
  }

  return filePath;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSummaryCell(b: BranchData): string {
  if (b.diaryEntries.length === 0) {
    return esc(b.summary);
  }

  const allChanges: string[] = [];
  const allDecisions: string[] = [];
  const allIssues: string[] = [];
  const titles: string[] = [];

  for (const entry of b.diaryEntries) {
    if (entry.title) titles.push(entry.title);
    allChanges.push(...entry.whatChanged);
    allDecisions.push(...entry.decisions);
    allIssues.push(...entry.issues);
  }

  const nextSteps = b.diaryEntries[b.diaryEntries.length - 1]?.nextSteps || [];

  let html = `<div class="summary-title">${esc(b.summary)}</div>`;

  if (titles.length > 1) {
    html += `<div class="summary-timeline"><span class="section-label">Timeline</span> ${titles.map(t => esc(t)).join(" &rarr; ")}</div>`;
  }

  if (allChanges.length > 0) {
    html += `<div class="summary-section changes"><span class="section-label">Changes</span><ul>${allChanges.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
  }

  if (allDecisions.length > 0) {
    html += `<div class="summary-section decisions"><span class="section-label">Decisions</span><ul>${allDecisions.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>`;
  }

  if (allIssues.length > 0) {
    html += `<div class="summary-section issues"><span class="section-label">Issues</span><ul>${allIssues.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
  }

  if (nextSteps.length > 0) {
    html += `<div class="summary-section next-steps"><span class="section-label">Next</span><ul>${nextSteps.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>`;
  }

  return html;
}

function categorizeCommit(message: string): string {
  const msg = message.toLowerCase();
  if (msg.startsWith("fix") || msg.includes("bug") || msg.includes("patch") || msg.includes("hotfix")) return "Bug Fix";
  if (msg.startsWith("feat") || msg.startsWith("add") || msg.startsWith("implement") || msg.startsWith("create")) return "Feature";
  if (msg.startsWith("refactor") || msg.startsWith("restructure") || msg.startsWith("reorganize") || msg.startsWith("clean")) return "Refactor";
  if (msg.startsWith("doc") || msg.startsWith("readme") || msg.includes("comment")) return "Documentation";
  if (msg.startsWith("test") || msg.includes("spec")) return "Testing";
  if (msg.startsWith("style") || msg.startsWith("format") || msg.startsWith("lint")) return "Styling";
  if (msg.startsWith("build") || msg.startsWith("ci") || msg.includes("deploy") || msg.includes("pipeline")) return "Build/CI";
  if (msg.startsWith("update") || msg.startsWith("upgrade") || msg.startsWith("bump")) return "Update";
  if (msg.startsWith("revert")) return "Revert";
  if (msg.startsWith("merge")) return "Merge";
  if (msg.startsWith("set up") || msg.startsWith("setup") || msg.startsWith("init") || msg.startsWith("initial")) return "Setup";
  return "Change";
}

function describeAreas(files: string[]): string {
  const areas = new Map<string, string[]>();
  for (const f of files) {
    const parts = f.split("/");
    let area: string;
    if (parts.length === 1) {
      area = "root config";
    } else if (parts[0] === "src" && parts.length >= 3) {
      area = parts[1]; // e.g. "tools", "utils", "components"
    } else {
      area = parts[0];
    }
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area)!.push(parts[parts.length - 1]);
  }
  return [...areas.entries()]
    .map(([area, fileNames]) => {
      const label = area.replace(/[-_]/g, " ");
      if (fileNames.length <= 2) return `${label} (${fileNames.join(", ")})`;
      return `${label} (${fileNames.length} files)`;
    })
    .join(", ");
}

function generateCommitSummary(c: CommitNode): string {
  const files = c.files || [];
  const ins = c.insertions || 0;
  const del = c.deletions || 0;
  const body = c.body || "";

  const category = categorizeCommit(c.message);
  const parts: string[] = [];

  // Category + commit message
  parts.push(`[${category}] ${c.message}`);

  // Commit body if present (first meaningful line)
  if (body) {
    const bodyLines = body.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("Co-Authored") && !l.startsWith("Signed-off"));
    if (bodyLines.length > 0) {
      parts.push(bodyLines.slice(0, 2).join(". "));
    }
  }

  // Areas affected
  if (files.length > 0) {
    parts.push(`Areas: ${describeAreas(files)}`);
  }

  // Scale of change
  if (ins > 0 || del > 0) {
    const net = ins - del;
    const scale = ins + del > 500 ? "large" : ins + del > 100 ? "moderate" : "small";
    parts.push(`${scale} change (+${ins}/-${del}, net ${net >= 0 ? "+" : ""}${net} lines)`);
  }

  return parts.join(" — ");
}

/** Serialize all branch data as JSON for the branch viewer JS */
function buildBranchDataJson(branches: BranchData[]): string {
  const data = branches.map(b => {
    const diaryByCommit = new Map<string, DiaryEntry>();
    for (const entry of b.diaryEntries) {
      if (entry.commit) diaryByCommit.set(entry.commit, entry);
    }

    return {
      name: b.name,
      isCurrent: b.isCurrent,
      isMain: b.isMain,
      summary: b.summary,
      ahead: b.ahead,
      behind: b.behind,
      filesChanged: b.filesChanged,
      commits: b.commits.map(c => ({
        shortHash: c.shortHash,
        message: c.message,
        author: c.author,
        date: c.date,
        timestamp: c.timestamp,
        files: c.files || [],
        insertions: c.insertions || 0,
        deletions: c.deletions || 0,
        commitSummary: diaryByCommit.has(c.shortHash)
          ? diaryByCommit.get(c.shortHash)!.summary
          : generateCommitSummary(c),
        diary: diaryByCommit.has(c.shortHash) ? {
          title: diaryByCommit.get(c.shortHash)!.title,
          summary: diaryByCommit.get(c.shortHash)!.summary,
          whatChanged: diaryByCommit.get(c.shortHash)!.whatChanged,
          decisions: diaryByCommit.get(c.shortHash)!.decisions,
          issues: diaryByCommit.get(c.shortHash)!.issues,
          nextSteps: diaryByCommit.get(c.shortHash)!.nextSteps,
        } : null,
      })),
    };
  });
  return JSON.stringify(data);
}

function buildHtml(branches: BranchData[], projectName: string): string {
  const now = new Date().toLocaleString();
  const branchDataJson = buildBranchDataJson(branches);

  const rows = branches.map((b, idx) => {
    const badge = b.isCurrent
      ? `<span class="badge current">current</span>`
      : b.isMain
      ? `<span class="badge main">main</span>`
      : "";

    const status = b.isMain
      ? "\u2014"
      : b.ahead > 0 || b.behind > 0
      ? `${b.ahead} ahead / ${b.behind} behind`
      : "even";

    const files = b.isMain ? "\u2014" : `${b.filesChanged}`;

    const lastCommit = b.commits.length > 0
      ? `<span class="hash">${esc(b.commits[0].shortHash)}</span> ${esc(b.commits[0].message)}`
      : "\u2014";

    const lastDate = b.commits.length > 0
      ? new Date(b.commits[0].timestamp * 1000).toLocaleDateString()
      : "\u2014";

    const summaryHtml = buildSummaryCell(b);
    const commitCount = b.commits.length;
    const diaryCount = b.diaryEntries.filter(e => e.commit).length;
    const expandHint = commitCount > 0
      ? `<span class="expand-hint">${commitCount} commits${diaryCount > 0 ? `, ${diaryCount} logged` : ""} &mdash; click to explore</span>`
      : "";

    return `<tr class="branch-row ${b.isCurrent ? "current-row" : ""}" onclick="openBranchViewer(${idx})" data-branch="${idx}">
      <td class="branch-name">
        <span class="expand-arrow">&#9654;</span>
        ${esc(b.name)} ${badge}
      </td>
      <td class="summary-cell">${summaryHtml}${expandHint}</td>
      <td class="center">${status}</td>
      <td class="center">${files}</td>
      <td class="commit">${lastCommit}</td>
      <td class="center">${lastDate}</td>
    </tr>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Branch Map \u2014 ${esc(projectName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    overflow-x: hidden;
  }

  /* ========== TABLE VIEW ========== */

  #table-view {
    padding: 32px;
    transition: opacity 0.3s, transform 0.3s;
  }

  #table-view.hidden {
    opacity: 0;
    transform: translateX(-40px);
    pointer-events: none;
    position: absolute;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #ffffff;
  }

  .subtitle {
    font-size: 13px;
    color: #888;
    margin-bottom: 24px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    text-align: left;
    padding: 10px 14px;
    background: #16213e;
    color: #aaa;
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #0f3460;
  }

  th.center, td.center { text-align: center; }

  td {
    padding: 10px 14px;
    border-bottom: 1px solid #222244;
    vertical-align: top;
  }

  .branch-row { cursor: pointer; transition: background 0.15s; }
  .branch-row:hover { background: #16213e; }
  .branch-row.current-row { background: #1a2744; }
  .branch-row.current-row:hover { background: #1e2f52; }

  .expand-arrow {
    display: inline-block;
    font-size: 10px;
    margin-right: 6px;
    color: #666;
  }
  .branch-row:hover .expand-arrow { color: #4fc3f7; }

  .expand-hint {
    display: block;
    font-size: 10px;
    color: #555;
    margin-top: 4px;
    font-style: italic;
  }
  .branch-row:hover .expand-hint { color: #4fc3f7; }

  .branch-name {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    white-space: nowrap;
    color: #ffffff;
  }

  .badge {
    display: inline-block;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 4px;
    margin-left: 6px;
    vertical-align: middle;
  }

  .badge.current {
    background: #0f3460;
    color: #4fc3f7;
    border: 1px solid #4fc3f7;
  }

  .badge.main {
    background: #1b4332;
    color: #52b788;
    border: 1px solid #52b788;
  }

  .commit {
    font-size: 12px;
    color: #bbb;
  }

  .hash {
    font-family: 'JetBrains Mono', monospace;
    color: #888;
    font-size: 11px;
  }

  .summary-cell { max-width: 500px; }

  .summary-title {
    font-weight: 500;
    color: #e0e0e0;
    margin-bottom: 6px;
  }

  .summary-timeline {
    font-size: 11px;
    color: #888;
    margin-bottom: 6px;
    line-height: 1.4;
  }

  .summary-section {
    font-size: 11px;
    margin-bottom: 4px;
    line-height: 1.4;
  }

  .summary-section ul {
    margin: 2px 0 0 14px;
    padding: 0;
    color: #bbb;
  }

  .summary-section li { margin-bottom: 1px; }

  .section-label {
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-right: 4px;
  }

  .changes .section-label { color: #4fc3f7; }
  .decisions .section-label { color: #ce93d8; }
  .issues .section-label { color: #ef9a9a; }
  .next-steps .section-label { color: #a5d6a7; }
  .summary-timeline .section-label { color: #ffcc80; }

  /* ========== BRANCH VIEWER ========== */

  #branch-viewer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1a1a2e;
    z-index: 100;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateX(40px);
    pointer-events: none;
    transition: opacity 0.3s, transform 0.3s;
  }

  #branch-viewer.active {
    opacity: 1;
    transform: translateX(0);
    pointer-events: all;
  }

  /* --- Viewer Header --- */

  .viewer-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background: #16213e;
    border-bottom: 2px solid #0f3460;
    flex-shrink: 0;
  }

  .back-btn {
    background: none;
    border: 1px solid #333;
    color: #4fc3f7;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .back-btn:hover { background: #1a2744; border-color: #4fc3f7; }

  .viewer-branch-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .viewer-meta {
    display: flex;
    gap: 16px;
    margin-left: auto;
    font-size: 12px;
    color: #888;
  }

  .viewer-meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .viewer-meta-value {
    color: #ccc;
    font-family: 'JetBrains Mono', monospace;
  }

  .viewer-summary {
    font-size: 13px;
    color: #a0b4c8;
    padding: 10px 14px;
    margin-top: 10px;
    background: #16213e;
    border-left: 3px solid #4fc3f7;
    border-radius: 4px;
    line-height: 1.5;
    font-style: italic;
  }

  /* --- Viewer Body (two columns) --- */

  .viewer-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  /* --- Left: Commit Timeline --- */

  .viewer-timeline {
    width: 340px;
    min-width: 340px;
    border-right: 1px solid #222244;
    display: flex;
    flex-direction: column;
    background: #151530;
  }

  .timeline-header {
    padding: 14px 18px;
    border-bottom: 1px solid #222244;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .timeline-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    font-weight: 500;
  }

  .timeline-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .timeline-nav-btn {
    background: #16213e;
    color: #4fc3f7;
    border: 1px solid #0f3460;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 10px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
  }
  .timeline-nav-btn:hover { background: #1e2f52; }

  .timeline-position {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #666;
    min-width: 50px;
    text-align: center;
  }

  .timeline-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .timeline-list::-webkit-scrollbar { width: 5px; }
  .timeline-list::-webkit-scrollbar-track { background: #151530; }
  .timeline-list::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  .tl-commit {
    display: flex;
    gap: 12px;
    padding: 8px 18px;
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
  }
  .tl-commit:hover { background: #1a2744; }
  .tl-commit.active { background: #16213e; }

  .tl-dot-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 16px;
    flex-shrink: 0;
    padding-top: 4px;
  }

  .tl-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #333;
    border: 2px solid #555;
    flex-shrink: 0;
    transition: all 0.2s;
    z-index: 1;
  }

  .tl-commit:first-child .tl-dot {
    border-color: #a5d6a7;
    background: #2e7d32;
    box-shadow: 0 0 6px rgba(76,175,80,0.4);
  }

  .tl-commit.has-diary .tl-dot {
    background: #4fc3f7;
    border-color: #4fc3f7;
    box-shadow: 0 0 6px rgba(79,195,247,0.4);
  }

  .tl-commit.active .tl-dot {
    transform: scale(1.3);
    box-shadow: 0 0 10px rgba(79,195,247,0.6);
  }

  .tl-line {
    width: 2px;
    flex-grow: 1;
    background: #333;
    min-height: 16px;
  }

  .tl-info {
    flex: 1;
    min-width: 0;
    padding-bottom: 4px;
  }

  .tl-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .tl-hash {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #888;
    flex-shrink: 0;
  }

  .tl-msg {
    font-size: 13px;
    color: #ddd;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tl-meta {
    font-size: 11px;
    color: #555;
    margin-top: 2px;
  }

  .tl-diary-badge {
    font-size: 9px;
    background: #0f3460;
    color: #4fc3f7;
    border: 1px solid #4fc3f7;
    border-radius: 3px;
    padding: 1px 5px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-left: 6px;
  }

  /* --- Right: Detail Panel --- */

  .viewer-detail {
    flex: 1;
    overflow-y: auto;
    padding: 28px 36px;
  }

  .viewer-detail::-webkit-scrollbar { width: 6px; }
  .viewer-detail::-webkit-scrollbar-track { background: #1a1a2e; }
  .viewer-detail::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  .detail-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #444;
    font-size: 14px;
  }

  /* Commit detail header */
  .detail-commit-header {
    margin-bottom: 24px;
  }

  .detail-commit-msg {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .detail-commit-meta {
    display: flex;
    gap: 20px;
    font-size: 12px;
    color: #888;
    flex-wrap: wrap;
  }

  .detail-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .detail-meta-label {
    color: #555;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.3px;
  }

  .detail-meta-value {
    font-family: 'JetBrains Mono', monospace;
    color: #bbb;
  }

  .detail-summary-brief {
    font-size: 13px;
    color: #a0b4c8;
    padding: 10px 14px;
    margin-bottom: 12px;
    background: #16213e;
    border-left: 3px solid #4fc3f7;
    border-radius: 4px;
    line-height: 1.5;
    font-style: italic;
  }

  /* Stat bar */
  .detail-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding: 14px 18px;
    background: #151530;
    border-radius: 8px;
    border: 1px solid #222244;
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 600;
  }

  .stat-value.green { color: #a5d6a7; }
  .stat-value.red { color: #ef9a9a; }
  .stat-value.blue { color: #4fc3f7; }

  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #666;
  }

  /* Diary section in detail */
  .detail-diary {
    margin-bottom: 24px;
    padding: 18px 22px;
    background: #1a1a3e;
    border: 1px solid #2a2a5e;
    border-radius: 8px;
    border-left: 3px solid #4fc3f7;
  }

  .detail-diary-title {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 14px;
  }

  .detail-diary-section {
    margin-bottom: 10px;
  }

  .detail-diary-section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 4px;
  }

  .detail-diary-section.changes .detail-diary-section-label { color: #4fc3f7; }
  .detail-diary-section.decisions .detail-diary-section-label { color: #ce93d8; }
  .detail-diary-section.issues .detail-diary-section-label { color: #ef9a9a; }
  .detail-diary-section.next-steps .detail-diary-section-label { color: #a5d6a7; }

  .detail-diary-section ul {
    margin: 0 0 0 16px;
    padding: 0;
    font-size: 13px;
    color: #ccc;
    line-height: 1.6;
  }

  .detail-diary-section li { margin-bottom: 2px; }

  /* Files changed list */
  .detail-files {
    margin-bottom: 24px;
  }

  .detail-files-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #888;
    font-weight: 500;
    margin-bottom: 10px;
  }

  .file-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .file-item {
    padding: 6px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #bbb;
    border-radius: 4px;
    transition: background 0.1s;
  }

  .file-item:nth-child(odd) { background: #151530; }
  .file-item:hover { background: #1a2744; }

  .file-icon {
    color: #4fc3f7;
    margin-right: 8px;
    font-style: normal;
  }

  /* Legend */
  .timeline-legend {
    padding: 10px 18px;
    border-top: 1px solid #222244;
    display: flex;
    gap: 14px;
    font-size: 10px;
    color: #555;
    flex-shrink: 0;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .legend-dot.commit-dot {
    background: #333;
    border: 2px solid #555;
  }

  .legend-dot.diary-dot {
    background: #4fc3f7;
    border: 2px solid #4fc3f7;
  }

  .legend-dot.latest-dot {
    background: #2e7d32;
    border: 2px solid #a5d6a7;
  }
</style>
</head>
<body>

<!-- ===== TABLE VIEW ===== -->
<div id="table-view">
  <h1>Branch Map &mdash; ${esc(projectName)}</h1>
  <p class="subtitle">Generated ${esc(now)} &mdash; Click a branch to explore</p>
  <table>
    <thead>
      <tr>
        <th>Branch</th>
        <th>Summary</th>
        <th class="center">Status</th>
        <th class="center">Files Changed</th>
        <th>Last Commit</th>
        <th class="center">Date</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("\n      ")}
    </tbody>
  </table>
</div>

<!-- ===== BRANCH VIEWER ===== -->
<div id="branch-viewer">
  <div class="viewer-header">
    <button class="back-btn" onclick="closeBranchViewer()">&#9664; All Branches</button>
    <span class="viewer-branch-name" id="viewer-branch-name"></span>
    <div class="viewer-meta" id="viewer-meta"></div>
    <div class="viewer-summary" id="viewer-summary"></div>
  </div>
  <div class="viewer-body">
    <div class="viewer-timeline">
      <div class="timeline-header">
        <span class="timeline-title">Commits</span>
        <div class="timeline-nav">
          <button class="timeline-nav-btn" onclick="viewerNav(-1)">&#9650; Newer</button>
          <span class="timeline-position" id="viewer-pos"></span>
          <button class="timeline-nav-btn" onclick="viewerNav(1)">&#9660; Older</button>
        </div>
      </div>
      <div class="timeline-list" id="timeline-list"></div>
      <div class="timeline-legend">
        <span class="legend-item"><span class="legend-dot latest-dot"></span> Latest</span>
        <span class="legend-item"><span class="legend-dot diary-dot"></span> Diary entry</span>
        <span class="legend-item"><span class="legend-dot commit-dot"></span> Commit</span>
      </div>
    </div>
    <div class="viewer-detail" id="viewer-detail">
      <div class="detail-empty">Select a commit to view details</div>
    </div>
  </div>
</div>

<script>
  const BRANCHES = ${branchDataJson};

  let currentBranchIdx = null;
  let currentCommitIdx = null;

  function openBranchViewer(idx) {
    const branch = BRANCHES[idx];
    if (!branch || branch.commits.length === 0) return;

    currentBranchIdx = idx;
    currentCommitIdx = null;

    // Header
    const nameEl = document.getElementById('viewer-branch-name');
    let badges = '';
    if (branch.isCurrent) badges += '<span class="badge current">current</span>';
    if (branch.isMain) badges += '<span class="badge main">main</span>';
    nameEl.innerHTML = esc(branch.name) + ' ' + badges;

    // Meta
    const metaEl = document.getElementById('viewer-meta');
    let metaHtml = '';
    if (!branch.isMain) {
      metaHtml += '<span class="viewer-meta-item"><span class="detail-meta-label">Ahead</span> <span class="viewer-meta-value">' + branch.ahead + '</span></span>';
      metaHtml += '<span class="viewer-meta-item"><span class="detail-meta-label">Behind</span> <span class="viewer-meta-value">' + branch.behind + '</span></span>';
      metaHtml += '<span class="viewer-meta-item"><span class="detail-meta-label">Files</span> <span class="viewer-meta-value">' + branch.filesChanged + '</span></span>';
    }
    metaHtml += '<span class="viewer-meta-item"><span class="detail-meta-label">Commits</span> <span class="viewer-meta-value">' + branch.commits.length + '</span></span>';
    metaEl.innerHTML = metaHtml;

    // Branch summary from diary
    const summaryEl = document.getElementById('viewer-summary');
    summaryEl.innerHTML = branch.summary ? esc(branch.summary) : '';
    summaryEl.style.display = branch.summary ? 'block' : 'none';

    // Build timeline
    const listEl = document.getElementById('timeline-list');
    listEl.innerHTML = branch.commits.map(function(c, ci) {
      const hasDiary = !!c.diary;
      const date = new Date(c.timestamp * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const isLast = ci === branch.commits.length - 1;
      return '<div class="tl-commit' + (hasDiary ? ' has-diary' : '') + '" data-ci="' + ci + '" onclick="selectViewerCommit(' + ci + ')">' +
        '<div class="tl-dot-col">' +
          '<div class="tl-dot"></div>' +
          (isLast ? '' : '<div class="tl-line"></div>') +
        '</div>' +
        '<div class="tl-info">' +
          '<div class="tl-header">' +
            '<span class="tl-hash">' + esc(c.shortHash) + '</span>' +
            '<span class="tl-msg">' + esc(c.message) + '</span>' +
            (hasDiary ? '<span class="tl-diary-badge">diary</span>' : '') +
          '</div>' +
          '<div class="tl-meta">' + esc(dateStr) + ' by ' + esc(c.author) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Show viewer
    document.getElementById('table-view').classList.add('hidden');
    document.getElementById('branch-viewer').classList.add('active');

    // Reset detail
    document.getElementById('viewer-detail').innerHTML = '<div class="detail-empty">Select a commit to view details</div>';

    // Auto-select first commit
    setTimeout(function() { selectViewerCommit(0); }, 50);
  }

  function closeBranchViewer() {
    document.getElementById('branch-viewer').classList.remove('active');
    document.getElementById('table-view').classList.remove('hidden');
    currentBranchIdx = null;
    currentCommitIdx = null;
  }

  function selectViewerCommit(ci) {
    if (currentBranchIdx === null) return;
    const branch = BRANCHES[currentBranchIdx];
    if (ci < 0 || ci >= branch.commits.length) return;

    // Update timeline active state
    const nodes = document.querySelectorAll('.tl-commit');
    nodes.forEach(function(n) { n.classList.remove('active'); });
    const activeNode = document.querySelector('.tl-commit[data-ci="' + ci + '"]');
    if (activeNode) {
      activeNode.classList.add('active');
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    currentCommitIdx = ci;

    // Update position
    document.getElementById('viewer-pos').textContent = (ci + 1) + ' / ' + branch.commits.length;

    // Hydrate detail panel
    hydrateDetail(branch.commits[ci]);
  }

  function hydrateDetail(commit) {
    const detail = document.getElementById('viewer-detail');
    let html = '';

    // Commit header
    const date = new Date(commit.timestamp * 1000);
    const fullDate = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    html += '<div class="detail-commit-header">';
    html += '<div class="detail-commit-msg">' + esc(commit.message) + '</div>';
    html += '<div class="detail-commit-meta">';
    html += '<span class="detail-meta-item"><span class="detail-meta-label">Hash</span> <span class="detail-meta-value">' + esc(commit.shortHash) + '</span></span>';
    html += '<span class="detail-meta-item"><span class="detail-meta-label">Author</span> <span class="detail-meta-value">' + esc(commit.author) + '</span></span>';
    html += '<span class="detail-meta-item"><span class="detail-meta-label">Date</span> <span class="detail-meta-value">' + esc(fullDate) + '</span></span>';
    html += '</div></div>';

    // Commit summary (from diary or auto-generated)
    if (commit.commitSummary) {
      html += '<div class="detail-summary-brief">' + esc(commit.commitSummary) + '</div>';
    }

    // Stats bar
    html += '<div class="detail-stats">';
    html += '<div class="stat-block"><span class="stat-value blue">' + commit.files.length + '</span><span class="stat-label">Files changed</span></div>';
    html += '<div class="stat-block"><span class="stat-value green">+' + commit.insertions + '</span><span class="stat-label">Insertions</span></div>';
    html += '<div class="stat-block"><span class="stat-value red">-' + commit.deletions + '</span><span class="stat-label">Deletions</span></div>';
    html += '</div>';

    // Diary section (if present)
    if (commit.diary) {
      const d = commit.diary;
      html += '<div class="detail-diary">';
      html += '<div class="detail-diary-title">' + esc(d.title) + '</div>';

      if (d.whatChanged.length > 0) {
        html += '<div class="detail-diary-section changes"><div class="detail-diary-section-label">What Changed</div><ul>' +
          d.whatChanged.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      }
      if (d.decisions.length > 0) {
        html += '<div class="detail-diary-section decisions"><div class="detail-diary-section-label">Decisions</div><ul>' +
          d.decisions.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      }
      if (d.issues.length > 0) {
        html += '<div class="detail-diary-section issues"><div class="detail-diary-section-label">Issues</div><ul>' +
          d.issues.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      }
      if (d.nextSteps.length > 0) {
        html += '<div class="detail-diary-section next-steps"><div class="detail-diary-section-label">Next Steps</div><ul>' +
          d.nextSteps.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      }
      html += '</div>';
    }

    // Files changed list
    if (commit.files.length > 0) {
      html += '<div class="detail-files">';
      html += '<div class="detail-files-title">Files Changed</div>';
      html += '<ul class="file-list">';
      commit.files.forEach(function(f) {
        var ext = f.split('.').pop() || '';
        var icon = ext === 'ts' || ext === 'tsx' ? '&#9672;' :
                   ext === 'js' || ext === 'jsx' ? '&#9672;' :
                   ext === 'json' ? '&#9881;' :
                   ext === 'md' ? '&#9997;' :
                   ext === 'css' || ext === 'scss' ? '&#9734;' :
                   '&#9656;';
        html += '<li class="file-item"><i class="file-icon">' + icon + '</i>' + esc(f) + '</li>';
      });
      html += '</ul></div>';
    }

    detail.innerHTML = html;
  }

  function viewerNav(direction) {
    if (currentCommitIdx === null) return;
    selectViewerCommit(currentCommitIdx + direction);
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (currentBranchIdx === null) return;
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      viewerNav(-1);
    } else if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      viewerNav(1);
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      closeBranchViewer();
    }
  });
</script>
</body>
</html>`;
}
