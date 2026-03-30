import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { DiaryEntry } from "./storage.js";

export interface DayData {
  date: string; // YYYY-MM-DD
  entries: DiaryEntry[];
}

export function generateAndOpenDailyView(
  projectPath: string,
  days: DayData[],
  currentBranch: string
): string {
  const projectName = projectPath.split("/").pop() || "project";
  const html = buildHtml(days, projectName, currentBranch);
  const dir = join(projectPath, ".devguard");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "daily-view.html");
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

function buildHtml(days: DayData[], projectName: string, currentBranch: string): string {
  // Build a JSON-safe data structure for the JS side
  const daysJson = JSON.stringify(
    days.map((d) => ({
      date: d.date,
      entries: d.entries.map((e) => ({
        title: e.title,
        summary: e.summary,
        date: e.date,
        commit: e.commit,
        whatChanged: e.whatChanged,
        decisions: e.decisions,
        issues: e.issues,
        nextSteps: e.nextSteps,
      })),
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(projectName)} — Daily View</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  border-bottom: 1px solid #2a2a4a;
  background: #16162a;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.header h1 span {
  color: #4fc3f7;
  font-weight: 400;
}

.header .branch-badge {
  font-size: 13px;
  background: #2a2a4a;
  color: #a0a0c0;
  padding: 4px 12px;
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
}

/* Nav */
.nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 32px;
  border-bottom: 1px solid #2a2a4a;
}

.nav button {
  background: #2a2a4a;
  color: #e0e0e0;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  transition: background 0.15s;
}

.nav button:hover { background: #3a3a5a; }

.nav .month-label {
  font-size: 18px;
  font-weight: 600;
  min-width: 200px;
  text-align: center;
}

/* Calendar grid */
.calendar-container {
  max-width: 1200px;
  margin: 24px auto;
  padding: 0 24px;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.weekday-header div {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #808098;
  padding: 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  min-height: 120px;
  background: #20203a;
  border-radius: 8px;
  padding: 8px;
  cursor: default;
  transition: background 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;
}

.day-cell.empty {
  background: transparent;
}

.day-cell.today {
  box-shadow: inset 0 0 0 2px #4fc3f7;
}

.day-cell.has-entries {
  cursor: pointer;
}

.day-cell.has-entries:hover {
  background: #2a2a4a;
  box-shadow: 0 2px 12px rgba(79, 195, 247, 0.1);
}

.day-cell.selected {
  background: #2a2a4a;
  box-shadow: inset 0 0 0 2px #4fc3f7, 0 2px 12px rgba(79, 195, 247, 0.15);
}

.day-number {
  font-size: 13px;
  font-weight: 600;
  color: #808098;
  margin-bottom: 6px;
}

.day-cell.has-entries .day-number {
  color: #4fc3f7;
}

.day-cell.today .day-number {
  color: #fff;
}

.day-bullets {
  list-style: none;
  padding: 0;
}

.day-bullets li {
  font-size: 11px;
  color: #b0b0c8;
  padding: 2px 0;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-bullets li::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  background: #4fc3f7;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.day-entry-count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #4fc3f7;
  color: #1a1a2e;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Detail panel */
.detail-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 10, 20, 0.7);
  z-index: 100;
}

.detail-overlay.open { display: flex; align-items: center; justify-content: center; }

.detail-panel {
  background: #1e1e38;
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 28px 32px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}

.detail-panel::-webkit-scrollbar { width: 6px; }
.detail-panel::-webkit-scrollbar-track { background: transparent; }
.detail-panel::-webkit-scrollbar-thumb { background: #3a3a5a; border-radius: 3px; }

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.detail-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.detail-close {
  background: none;
  border: none;
  color: #808098;
  font-size: 22px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.detail-close:hover { background: #2a2a4a; color: #e0e0e0; }

.detail-entry {
  margin-bottom: 20px;
  padding: 16px;
  background: #252545;
  border-radius: 10px;
  border-left: 3px solid #4fc3f7;
}

.detail-entry:last-child { margin-bottom: 0; }

.detail-entry h3 {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 4px;
}

.detail-entry .entry-meta {
  font-size: 12px;
  color: #808098;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 12px;
}

.detail-section {
  margin-top: 10px;
}

.detail-section .section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  display: block;
}

.detail-section.changes .section-label { color: #4fc3f7; }
.detail-section.decisions .section-label { color: #ce93d8; }
.detail-section.issues .section-label { color: #ef9a9a; }
.detail-section.next-steps .section-label { color: #a5d6a7; }

.detail-section ul {
  list-style: none;
  padding: 0;
}

.detail-section ul li {
  font-size: 13px;
  color: #c0c0d8;
  padding: 3px 0;
  padding-left: 14px;
  position: relative;
  line-height: 1.5;
}

.detail-section ul li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.detail-section.changes ul li::before { background: #4fc3f7; }
.detail-section.decisions ul li::before { background: #ce93d8; }
.detail-section.issues ul li::before { background: #ef9a9a; }
.detail-section.next-steps ul li::before { background: #a5d6a7; }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 80px 32px;
  color: #808098;
}

.empty-state h2 { font-size: 18px; margin-bottom: 8px; color: #a0a0c0; }
.empty-state p { font-size: 14px; }
</style>
</head>
<body>

<div class="header">
  <h1>${esc(projectName)} <span>/ daily view</span></h1>
  <div class="branch-badge">${esc(currentBranch)}</div>
</div>

<div class="nav">
  <button onclick="prevMonth()">&larr; Prev</button>
  <div class="month-label" id="month-label"></div>
  <button onclick="nextMonth()">Next &rarr;</button>
  <button onclick="goToday()" style="margin-left: 12px; background: #4fc3f7; color: #1a1a2e; font-weight: 600;">Today</button>
</div>

<div class="calendar-container">
  <div class="weekday-header">
    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
  </div>
  <div class="calendar-grid" id="calendar-grid"></div>
</div>

<div class="detail-overlay" id="detail-overlay" onclick="closeDetail(event)">
  <div class="detail-panel" id="detail-panel" onclick="event.stopPropagation()">
    <div class="detail-header">
      <h2 id="detail-title"></h2>
      <button class="detail-close" onclick="closeDetail()">&times;</button>
    </div>
    <div id="detail-body"></div>
  </div>
</div>

<script>
const DAYS_DATA = ${daysJson};

// Index entries by date
const dateMap = {};
DAYS_DATA.forEach(d => { dateMap[d.date] = d.entries; });

// State
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function todayStr() {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function dateStr(y, m, d) {
  return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

function esc(s) {
  const el = document.createElement("span");
  el.textContent = s;
  return el.innerHTML;
}

function render() {
  document.getElementById("month-label").textContent = MONTH_NAMES[viewMonth] + " " + viewYear;

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayString = todayStr();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement("div");
    cell.className = "day-cell empty";
    grid.appendChild(cell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = dateStr(viewYear, viewMonth, d);
    const entries = dateMap[ds] || [];
    const isToday = ds === todayString;
    const hasEntries = entries.length > 0;

    const cell = document.createElement("div");
    cell.className = "day-cell" + (isToday ? " today" : "") + (hasEntries ? " has-entries" : "");

    if (hasEntries) {
      cell.onclick = function() { openDetail(ds, entries); };
    }

    let inner = '<div class="day-number">' + d + '</div>';

    if (hasEntries) {
      inner += '<div class="day-entry-count">' + entries.length + '</div>';
      inner += '<ul class="day-bullets">';
      // Show up to 4 bullet items from whatChanged across all entries
      const bullets = [];
      for (const e of entries) {
        for (const item of e.whatChanged) {
          bullets.push(item);
          if (bullets.length >= 4) break;
        }
        if (bullets.length >= 4) break;
      }
      if (bullets.length === 0) {
        // Fallback to entry titles
        for (const e of entries) {
          if (e.title) bullets.push(e.title);
          if (bullets.length >= 4) break;
        }
      }
      for (const b of bullets) {
        inner += '<li>' + esc(b) + '</li>';
      }
      inner += '</ul>';
    }

    cell.innerHTML = inner;
    grid.appendChild(cell);
  }
}

function openDetail(ds, entries) {
  const overlay = document.getElementById("detail-overlay");
  const d = new Date(ds + "T12:00:00");
  document.getElementById("detail-title").textContent =
    MONTH_NAMES[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();

  let html = "";
  for (const e of entries) {
    html += '<div class="detail-entry">';
    html += '<h3>' + esc(e.title) + '</h3>';

    const meta = [];
    if (e.commit) meta.push(e.commit);
    if (e.date) {
      try { meta.push(new Date(e.date).toLocaleTimeString()); } catch(x) {}
    }
    if (meta.length) html += '<div class="entry-meta">' + esc(meta.join(" / ")) + '</div>';

    if (e.whatChanged.length) {
      html += '<div class="detail-section changes"><span class="section-label">What Changed</span><ul>';
      e.whatChanged.forEach(function(item) { html += '<li>' + esc(item) + '</li>'; });
      html += '</ul></div>';
    }
    if (e.decisions.length) {
      html += '<div class="detail-section decisions"><span class="section-label">Decisions</span><ul>';
      e.decisions.forEach(function(item) { html += '<li>' + esc(item) + '</li>'; });
      html += '</ul></div>';
    }
    if (e.issues.length) {
      html += '<div class="detail-section issues"><span class="section-label">Issues</span><ul>';
      e.issues.forEach(function(item) { html += '<li>' + esc(item) + '</li>'; });
      html += '</ul></div>';
    }
    if (e.nextSteps.length) {
      html += '<div class="detail-section next-steps"><span class="section-label">Next Steps</span><ul>';
      e.nextSteps.forEach(function(item) { html += '<li>' + esc(item) + '</li>'; });
      html += '</ul></div>';
    }

    html += '</div>';
  }

  if (!html) html = '<div style="color:#808098;text-align:center;padding:20px;">No details available</div>';

  document.getElementById("detail-body").innerHTML = html;
  overlay.classList.add("open");
}

function closeDetail(event) {
  if (event && event.target !== document.getElementById("detail-overlay")) return;
  document.getElementById("detail-overlay").classList.remove("open");
}

function prevMonth() {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  render();
}

function nextMonth() {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
}

function goToday() {
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  render();
}

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    document.getElementById("detail-overlay").classList.remove("open");
  } else if (e.key === "ArrowLeft") {
    prevMonth();
  } else if (e.key === "ArrowRight") {
    nextMonth();
  }
});

render();
</script>
</body>
</html>`;
}
