import { simpleGit } from 'simple-git';
import type { Session, DiffStats } from '../types.js';

export async function getSessionDiff(session: Session): Promise<string> {
  const git = simpleGit(session.repoPath);

  if (session.commits.length === 0) return '';

  const hashes = session.commits.map(c => c.hash);
  const oldest = hashes[hashes.length - 1]!;
  const newest = hashes[0]!;

  try {
    // Show diff from before oldest commit to newest commit
    const diff = await git.diff([`${oldest}^..${newest}`]);
    return diff;
  } catch {
    // Fallback: show diff of the newest commit
    try {
      const diff = await git.diff([`${newest}^..${newest}`]);
      return diff;
    } catch {
      return '(Unable to generate diff)';
    }
  }
}

export async function getSessionDiffStats(session: Session): Promise<DiffStats> {
  const git = simpleGit(session.repoPath);

  if (session.commits.length === 0) {
    return { filesChanged: [], insertions: 0, deletions: 0, summary: 'No changes' };
  }

  const hashes = session.commits.map(c => c.hash);
  const oldest = hashes[hashes.length - 1]!;
  const newest = hashes[0]!;

  try {
    const nameOnly = await git.raw(['diff', '--name-only', `${oldest}^..${newest}`]);
    const shortstat = await git.raw(['diff', '--shortstat', `${oldest}^..${newest}`]);

    const files = nameOnly.trim().split('\n').filter(Boolean);
    const insertMatch = shortstat.match(/(\d+)\s+insertion/);
    const deleteMatch = shortstat.match(/(\d+)\s+deletion/);

    const insertions = insertMatch ? parseInt(insertMatch[1]!, 10) : 0;
    const deletions = deleteMatch ? parseInt(deleteMatch[1]!, 10) : 0;

    return {
      filesChanged: files,
      insertions,
      deletions,
      summary: `${files.length} files changed, +${insertions}/-${deletions} lines`,
    };
  } catch {
    return {
      filesChanged: [],
      insertions: session.insertions,
      deletions: session.deletions,
      summary: `~${session.filesChanged} files changed, +${session.insertions}/-${session.deletions} lines`,
    };
  }
}
