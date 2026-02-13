import type { AgentCommit, Session } from '../types.js';
import { generateSessionId } from '../utils.js';
import { SESSION_GAP_MINUTES } from '../config/defaults.js';

export function groupIntoSessions(commits: AgentCommit[]): Session[] {
  if (commits.length === 0) return [];

  // Sort commits by date ascending for grouping
  const sorted = [...commits].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by repo + branch + author, then split by time gaps
  const buckets = new Map<string, AgentCommit[]>();
  for (const commit of sorted) {
    const key = `${commit.repo}::${commit.branch}::${commit.author}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(commit);
    buckets.set(key, bucket);
  }

  const sessions: Session[] = [];

  for (const [, bucketCommits] of buckets) {
    let currentSession: AgentCommit[] = [bucketCommits[0]!];

    for (let i = 1; i < bucketCommits.length; i++) {
      const prev = bucketCommits[i - 1]!;
      const curr = bucketCommits[i]!;
      const gap = (curr.date.getTime() - prev.date.getTime()) / (1000 * 60);

      if (gap > SESSION_GAP_MINUTES) {
        // End current session, start new one
        sessions.push(buildSession(currentSession));
        currentSession = [curr];
      } else {
        currentSession.push(curr);
      }
    }

    // Don't forget the last session
    if (currentSession.length > 0) {
      sessions.push(buildSession(currentSession));
    }
  }

  // Sort sessions by start time descending (most recent first)
  sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  return sessions;
}

function buildSession(commits: AgentCommit[]): Session {
  const first = commits[0]!;
  const last = commits[commits.length - 1]!;

  const totalFiles = new Set<string>();
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const c of commits) {
    totalInsertions += c.insertions;
    totalDeletions += c.deletions;
    // We track file count as a sum since we don't have individual file names
  }

  const totalFilesChanged = commits.reduce((sum, c) => sum + c.filesChanged, 0);

  // Detect PR number from commit messages
  let prNumber: number | undefined;
  let prTitle: string | undefined;
  for (const c of commits) {
    const prMatch = c.message.match(/\(#(\d+)\)/);
    if (prMatch) {
      prNumber = parseInt(prMatch[1]!, 10);
      prTitle = c.message.replace(/\s*\(#\d+\)/, '');
      break;
    }
  }

  return {
    id: generateSessionId(first.repo, first.branch, first.date),
    repo: first.repo,
    repoPath: first.repoPath,
    branch: first.branch,
    author: first.author,
    startTime: first.date,
    endTime: last.date,
    commits,
    filesChanged: totalFilesChanged,
    insertions: totalInsertions,
    deletions: totalDeletions,
    prNumber,
    prTitle,
  };
}
