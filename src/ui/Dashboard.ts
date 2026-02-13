import chalk from 'chalk';
import boxen from 'boxen';
import type { Session } from '../types.js';
import { formatRelative, formatTime, formatDuration, getRepoColor, pluralize, truncate } from '../utils.js';

export function renderDashboard(sessions: Session[]): string {
  if (sessions.length === 0) {
    return boxen(
      chalk.dim('No agent activity found.\n\n') +
      chalk.dim('Try adjusting your time window: ') +
      chalk.cyan('drift scan --since "24h"') + '\n' +
      chalk.dim('Or add repos with: ') +
      chalk.cyan('drift init'),
      {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderColor: 'gray',
        borderStyle: 'round',
        title: 'drift',
        titleAlignment: 'center',
      },
    );
  }

  const header = renderHeader(sessions);
  const sessionList = sessions.map((s, i) => renderSessionRow(s, i)).join('\n');

  return `${header}\n\n${sessionList}\n`;
}

function renderHeader(sessions: Session[]): string {
  const repos = new Set(sessions.map(s => s.repo));
  const authors = new Set(sessions.map(s => s.author));
  const totalCommits = sessions.reduce((sum, s) => sum + s.commits.length, 0);
  const totalInsertions = sessions.reduce((sum, s) => sum + s.insertions, 0);
  const totalDeletions = sessions.reduce((sum, s) => sum + s.deletions, 0);

  const title = chalk.bold.white('drift') + chalk.dim(' — agent activity timeline');

  const stats = [
    chalk.bold.white(String(sessions.length)) + chalk.dim(` ${pluralize(sessions.length, 'session')}`),
    chalk.bold.white(String(totalCommits)) + chalk.dim(` ${pluralize(totalCommits, 'commit')}`),
    chalk.bold.white(String(repos.size)) + chalk.dim(` ${pluralize(repos.size, 'repo')}`),
    chalk.bold.white(String(authors.size)) + chalk.dim(` ${pluralize(authors.size, 'agent')}`),
    chalk.green(`+${totalInsertions}`) + chalk.dim('/') + chalk.red(`-${totalDeletions}`),
  ].join(chalk.dim('  ·  '));

  return boxen(`${title}\n${stats}`, {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderColor: 'cyan',
    borderStyle: 'round',
    dimBorder: true,
  });
}

function renderSessionRow(session: Session, index: number): string {
  const repoColor = getRepoColor(session.repo);
  const repoTag = repoColor(`[${session.repo}]`);
  const timeStr = chalk.dim(formatTime(session.startTime));
  const relStr = chalk.dim(formatRelative(session.startTime));
  const durationStr = chalk.dim(`(${formatDuration(session.startTime, session.endTime)})`);
  const branchStr = chalk.yellow(session.branch);
  const authorStr = chalk.dim(session.author);

  const commitCount = chalk.white(`${session.commits.length} ${pluralize(session.commits.length, 'commit')}`);
  const changes = chalk.green(`+${session.insertions}`) + chalk.dim('/') + chalk.red(`-${session.deletions}`);
  const filesStr = chalk.dim(`${session.filesChanged} ${pluralize(session.filesChanged, 'file')}`);

  const prStr = session.prNumber
    ? chalk.blue(` PR #${session.prNumber}`)
    : '';

  // First line: time, repo, branch, PR
  const line1 = `  ${timeStr} ${repoTag} ${branchStr}${prStr} ${durationStr}`;

  // Second line: author, commits, stats
  const firstMsg = truncate(session.commits[0]?.message ?? '', 60);
  const line2 = `       ${authorStr} · ${commitCount} · ${filesStr} · ${changes}`;
  const line3 = `       ${chalk.white(firstMsg)}`;

  // Session ID for reference
  const idStr = chalk.dim(`  [${session.id}]`);

  return `${line1}\n${line2}\n${line3}${index < 10 ? '' : ''}`;
}
