export interface DriftConfig {
  general: {
    default_window: string;
    theme: 'dark' | 'light';
  };
  repos: RepoConfig[];
  agents: AgentConfig;
}

export interface RepoConfig {
  path: string;
  name: string;
}

export interface AgentConfig {
  authors: string[];
  message_patterns: string[];
}

export interface AgentCommit {
  hash: string;
  hashShort: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  body: string;
  repo: string;
  repoPath: string;
  branch: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface Session {
  id: string;
  repo: string;
  repoPath: string;
  branch: string;
  author: string;
  startTime: Date;
  endTime: Date;
  commits: AgentCommit[];
  filesChanged: number;
  insertions: number;
  deletions: number;
  prNumber?: number;
  prTitle?: string;
}

export interface TimelineEntry {
  session: Session;
  type: 'session';
}

export interface DiffStats {
  filesChanged: string[];
  insertions: number;
  deletions: number;
  summary: string;
}

export interface ScanOptions {
  since?: string;
  author?: string;
  repo?: string;
}

export interface BriefingOptions {
  since?: string;
  format?: 'text' | 'md';
}
