export declare function isGitRepo(cwd: string): boolean;
export declare function getBranch(cwd: string): string;
export declare function getStatus(cwd: string): string;
export declare function getRecentCommits(cwd: string, count?: number): string;
export declare function getDiffSummary(cwd: string): string;
export declare function getDiffFull(cwd: string): string;
