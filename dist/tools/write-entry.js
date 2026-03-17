"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWriteEntry = registerWriteEntry;
const zod_1 = require("zod");
const git = __importStar(require("../utils/git.js"));
const storage = __importStar(require("../utils/storage.js"));
function registerWriteEntry(server) {
    server.tool("write_entry", "Save a dev diary entry. Captures what changed, decisions made, issues hit, and what's next. Call get_context first to gather the raw material.", {
        project_path: zod_1.z.string().describe("Absolute path to the project directory"),
        summary: zod_1.z.string().describe("One-line summary of what happened this session"),
        changes: zod_1.z.string().describe("What changed — files modified, features added, bugs fixed"),
        decisions: zod_1.z
            .string()
            .optional()
            .describe("Key decisions made and why"),
        issues: zod_1.z
            .string()
            .optional()
            .describe("What broke, what's stuck, errors encountered"),
        next_steps: zod_1.z
            .string()
            .optional()
            .describe("What to do next session"),
    }, async ({ project_path, summary, changes, decisions, issues, next_steps }) => {
        const branch = git.isGitRepo(project_path)
            ? git.getBranch(project_path)
            : "unknown";
        const now = new Date().toISOString();
        const sections = [
            `---`,
            `date: ${now}`,
            `branch: ${branch}`,
            `summary: "${summary}"`,
            `---`,
            "",
            `# ${summary}`,
            "",
            `## What Changed`,
            changes,
        ];
        if (decisions) {
            sections.push("", "## Decisions", decisions);
        }
        if (issues) {
            sections.push("", "## Issues", issues);
        }
        if (next_steps) {
            sections.push("", "## Next Steps", next_steps);
        }
        const content = sections.join("\n") + "\n";
        const filePath = storage.writeEntry(project_path, content);
        return {
            content: [
                {
                    type: "text",
                    text: `Diary entry saved: ${filePath}`,
                },
            ],
        };
    });
}
