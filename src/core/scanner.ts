import { simpleGit, type SimpleGit, type LogResult } from 'simple-git';
import path from 'node:path';
import type { AgentCommit, DriftConfig, ScanOptions } from '../types.js';
import { expandHome, parseTimeWindow } from '../utils.js';

function isAgentCommit(
  author: string,
  email: string,
  message: string,
  body: string,
  config: DriftConfig,
): boolean {
  // Check author patterns
  for (const pattern of config.agents.authors) {
    if (
      author.toLowerCase().includes(pattern.toLowerCase()) ||
      email.toLowerCase().includes(pattern.toLowerCase())
    ) {
      return true;
    }
  }

  // Check message patterns
  const fullMessage = `${message}\n${body}`;
  for (const pattern of config.agents.message_patterns) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(fullMessage)) {
      return true;
    }
  }

  return false;
}

async function getCurrentBranch(git: SimpleGit): Promise<string> {
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch {
    return 'unknown';
  }
}

async function getCommitBranch(git: SimpleGit, hash: string): Promise<string> {
  try {
    const result = await git.raw(['branch', '--contains', hash, '--format=%(refname:short)']);
    const branches = result.trim().split('\n').filter(Boolean);
    // Prefer non-main branches
    const nonMain = branches.filter(b => b !== 'main' && b !== 'master');
    return nonMain[0] ?? branches[0] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function getCommitStats(
  git: SimpleGit,
  hash: string,
): Promise<{ filesChanged: number; insertions: number; deletions: number }> {
  try {
    const result = await git.raw(['diff', '--shortstat', `${hash}^..${hash}`]);
    const filesMatch = result.match(/(\d+)\s+file/);
    const insertMatch = result.match(/(\d+)\s+insertion/);
    const deleteMatch = result.match(/(\d+)\s+deletion/);
    return {
      filesChanged: filesMatch ? parseInt(filesMatch[1]!, 10) : 0,
      insertions: insertMatch ? parseInt(insertMatch[1]!, 10) : 0,
      deletions: deleteMatch ? parseInt(deleteMatch[1]!, 10) : 0,
    };
  } catch {
    return { filesChanged: 0, insertions: 0, deletions: 0 };
  }
}

export async function scanRepo(
  repoPath: string,
  repoName: string,
  config: DriftConfig,
  options: ScanOptions = {},
): Promise<AgentCommit[]> {
  const fullPath = path.resolve(expandHome(repoPath));
  const git = simpleGit(fullPath);

  // Verify it's a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    return [];
  }

  const since = options.since
    ? parseTimeWindow(options.since)
    : parseTimeWindow(config.general.default_window);

  const logOptions: Record<string, string | null> = {
    '--since': since.toISOString(),
    '--all': null,
  };

  if (options.author) {
    logOptions['--author'] = options.author;
  }

  let log: LogResult;
  try {
    log = await git.log(logOptions);
  } catch {
    return [];
  }

  const currentBranch = await getCurrentBranch(git);
  const commits: AgentCommit[] = [];

  for (const entry of log.all) {
    const author = entry.author_name;
    const email = entry.author_email;
    const message = entry.message;
    const body = entry.body ?? '';

    // If author filter specified, include all matching; otherwise check agent patterns
    const include = options.author
      ? author.toLowerCase().includes(options.author.toLowerCase()) ||
        email.toLowerCase().includes(options.author.toLowerCase())
      : isAgentCommit(author, email, message, body, config);

    if (!include) continue;

    const stats = await getCommitStats(git, entry.hash);
    const branch = await getCommitBranch(git, entry.hash).catch(() => currentBranch);

    commits.push({
      hash: entry.hash,
      hashShort: entry.hash.slice(0, 7),
      author,
      email,
      date: new Date(entry.date),
      message,
      body,
      repo: repoName,
      repoPath: fullPath,
      branch,
      filesChanged: stats.filesChanged,
      insertions: stats.insertions,
      deletions: stats.deletions,
    });
  }

  return commits;
}

export async function scanAllRepos(
  config: DriftConfig,
  options: ScanOptions = {},
): Promise<AgentCommit[]> {
  const repos = options.repo
    ? config.repos.filter(r => r.name.toLowerCase() === options.repo!.toLowerCase())
    : config.repos;

  const results = await Promise.allSettled(
    repos.map(repo => scanRepo(repo.path, repo.name, config, options)),
  );

  const commits: AgentCommit[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      commits.push(...result.value);
    }
  }

  // Sort by date descending
  commits.sort((a, b) => b.date.getTime() - a.date.getTime());
  return commits;
}
