import chalk from 'chalk';
import boxen from 'boxen';
import type { Session } from '../types.js';
import { formatDuration, formatRelative, getRepoColor, pluralize, dayjs } from '../utils.js';

export function renderBriefing(sessions: Session[], format: 'text' | 'md' = 'text'): string {
  if (format === 'md') {
    return renderMarkdownBriefing(sessions);
  }
  return renderTerminalBriefing(sessions);
}

function renderTerminalBriefing(sessions: Session[]): string {
  if (sessions.length === 0) {
    return boxen(
      chalk.dim('All quiet. No agent activity detected.') + '\n\n' +
      chalk.dim('Your agents are either resting or you need to check your config.'),
      {
        padding: 1,
        borderColor: 'gray',
        borderStyle: 'round',
        title: 'Morning Briefing',
        titleAlignment: 'center',
      },
    );
  }

  const repos = new Set(sessions.map(s => s.repo));
  const authors = new Set(sessions.map(s => s.author));
  const totalCommits = sessions.reduce((sum, s) => sum + s.commits.length, 0);
  const totalInsertions = sessions.reduce((sum, s) => sum + s.insertions, 0);
  const totalDeletions = sessions.reduce((sum, s) => sum + s.deletions, 0);

  // Generate time context
  const oldest = sessions[sessions.length - 1]!;
  const timeContext = getTimeContext(oldest.startTime);

  // Opening summary
  const opening = `${timeContext}, ${chalk.bold.white(String(authors.size))} ${pluralize(authors.size, 'agent')} worked across ${chalk.bold.white(String(repos.size))} ${pluralize(repos.size, 'repo')}. ` +
    `${chalk.bold.white(String(totalCommits))} ${pluralize(totalCommits, 'commit')} total ` +
    `(${chalk.green(`+${totalInsertions}`)}/${chalk.red(`-${totalDeletions}`)} lines).`;

  // Per-repo summaries
  const repoSummaries: string[] = [];
  const byRepo = groupByRepo(sessions);

  for (const [repo, repoSessions] of byRepo) {
    const repoColor = getRepoColor(repo);
    const repoCommits = repoSessions.reduce((sum, s) => sum + s.commits.length, 0);
    const repoInsertions = repoSessions.reduce((sum, s) => sum + s.insertions, 0);
    const repoDeletions = repoSessions.reduce((sum, s) => sum + s.deletions, 0);

    let summary = `  ${repoColor(`▸ ${repo}`)} — ${repoSessions.length} ${pluralize(repoSessions.length, 'session')}, ${repoCommits} ${pluralize(repoCommits, 'commit')}`;

    for (const session of repoSessions) {
      const desc = describeSession(session);
      summary += `\n    ${chalk.dim('·')} ${desc}`;
    }

    repoSummaries.push(summary);
  }

  const body = repoSummaries.join('\n\n');

  const briefing = boxen(
    `${chalk.bold.white('☀ Morning Briefing')}\n\n${opening}\n\n${body}`,
    {
      padding: 1,
      borderColor: 'yellow',
      borderStyle: 'round',
      dimBorder: true,
    },
  );

  return briefing;
}

function renderMarkdownBriefing(sessions: Session[]): string {
  if (sessions.length === 0) {
    return '# Agent Activity Briefing\n\nNo agent activity detected.\n';
  }

  const repos = new Set(sessions.map(s => s.repo));
  const authors = new Set(sessions.map(s => s.author));
  const totalCommits = sessions.reduce((sum, s) => sum + s.commits.length, 0);
  const totalInsertions = sessions.reduce((sum, s) => sum + s.insertions, 0);
  const totalDeletions = sessions.reduce((sum, s) => sum + s.deletions, 0);

  const oldest = sessions[sessions.length - 1]!;
  const timeContext = getTimeContext(oldest.startTime);

  let md = `# Agent Activity Briefing\n\n`;
  md += `${timeContext}, **${authors.size}** ${pluralize(authors.size, 'agent')} worked across **${repos.size}** ${pluralize(repos.size, 'repo')}. `;
  md += `**${totalCommits}** ${pluralize(totalCommits, 'commit')} total (+${totalInsertions}/-${totalDeletions} lines).\n\n`;

  const byRepo = groupByRepo(sessions);

  for (const [repo, repoSessions] of byRepo) {
    md += `## ${repo}\n\n`;

    for (const session of repoSessions) {
      const prRef = session.prNumber ? ` (PR #${session.prNumber})` : '';
      const duration = formatDuration(session.startTime, session.endTime);
      md += `- **${session.branch}**${prRef} — ${session.commits.length} commits, +${session.insertions}/-${session.deletions} lines, ${duration}\n`;

      for (const commit of session.commits) {
        md += `  - \`${commit.hashShort}\` ${commit.message}\n`;
      }
      md += '\n';
    }
  }

  return md;
}

function getTimeContext(oldestTime: Date): string {
  const now = dayjs();
  const then = dayjs(oldestTime);
  const hoursAgo = now.diff(then, 'hour');

  if (hoursAgo < 1) return 'In the past hour';
  if (hoursAgo < 6) return `Over the past ${hoursAgo} hours`;
  if (hoursAgo < 12) return 'While you were away';
  if (hoursAgo < 18) return 'Overnight';
  if (hoursAgo < 36) return 'Since yesterday';
  return `Over the past ${Math.round(hoursAgo / 24)} days`;
}

function describeSession(session: Session): string {
  const prRef = session.prNumber
    ? chalk.blue(`PR #${session.prNumber}`)
    : '';

  const firstMessage = session.commits[0]?.message ?? 'unknown work';
  const changes = `${chalk.green(`+${session.insertions}`)}/${chalk.red(`-${session.deletions}`)}`;
  const files = `${session.filesChanged} ${pluralize(session.filesChanged, 'file')}`;
  const duration = chalk.dim(`(${formatDuration(session.startTime, session.endTime)})`);

  const parts = [
    chalk.white(session.author),
    session.prTitle ?? firstMessage,
    prRef,
    `${changes} across ${files}`,
    duration,
  ].filter(Boolean);

  return parts.join(chalk.dim(' · '));
}

function groupByRepo(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const session of sessions) {
    const list = map.get(session.repo) ?? [];
    list.push(session);
    map.set(session.repo, list);
  }
  return map;
}
