"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDiaryDir = ensureDiaryDir;
exports.writeEntry = writeEntry;
exports.readEntries = readEntries;
const fs_1 = require("fs");
const path_1 = require("path");
const DIARY_DIR = ".devdiary";
const ENTRIES_DIR = "entries";
function entriesPath(projectPath) {
    return (0, path_1.join)(projectPath, DIARY_DIR, ENTRIES_DIR);
}
function ensureDiaryDir(projectPath) {
    const dir = entriesPath(projectPath);
    (0, fs_1.mkdirSync)(dir, { recursive: true });
    return dir;
}
function writeEntry(projectPath, content) {
    const dir = ensureDiaryDir(projectPath);
    const now = new Date();
    const filename = formatTimestamp(now) + ".md";
    const filePath = (0, path_1.join)(dir, filename);
    (0, fs_1.writeFileSync)(filePath, content, "utf-8");
    return filePath;
}
function readEntries(projectPath, count) {
    const dir = entriesPath(projectPath);
    if (!(0, fs_1.existsSync)(dir))
        return [];
    const files = (0, fs_1.readdirSync)(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, count);
    return files.map((f) => (0, fs_1.readFileSync)((0, path_1.join)(dir, f), "utf-8"));
}
function formatTimestamp(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${d}_${h}-${mi}`;
}
