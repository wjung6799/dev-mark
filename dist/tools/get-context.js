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
exports.registerGetContext = registerGetContext;
const zod_1 = require("zod");
const git = __importStar(require("../utils/git.js"));
function registerGetContext(server) {
    server.tool("get_context", "Get the current git state of a project — branch, status, recent commits, and diffs. Call this to understand what happened before writing a diary entry.", {
        project_path: zod_1.z.string().describe("Absolute path to the project directory"),
    }, async ({ project_path }) => {
        if (!git.isGitRepo(project_path)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `${project_path} is not a git repository. Dev diary works best with git projects.`,
                    },
                ],
            };
        }
        const branch = git.getBranch(project_path);
        const status = git.getStatus(project_path);
        const commits = git.getRecentCommits(project_path);
        const diffSummary = git.getDiffSummary(project_path);
        const diffFull = git.getDiffFull(project_path);
        const output = [
            `## Branch\n${branch}`,
            `## Status\n${status || "Clean working tree"}`,
            `## Recent Commits\n${commits || "No commits yet"}`,
            `## Diff Summary\n${diffSummary}`,
            `## Full Diff\n${diffFull}`,
        ].join("\n\n");
        return {
            content: [{ type: "text", text: output }],
        };
    });
}
