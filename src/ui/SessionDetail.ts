import chalk from 'chalk';
import boxen from 'boxen';
import type { Session, DiffStats } from '../types.js';
import { formatDateTime, formatDuration, getRepoColor, pluralize } from '../utils.js';

export function renderSessionDetail(session: Session, diffStats?: DiffStats): string {
  const repoColor = getRepoColor(session.repo);

  const header = [
    chalk.bold.white(`Session: ${session.id}`),
    '',
    `${chalk.dim('Repo:')}      ${repoColor(session.repo)}`,
    `${chalk.dim('Branch:')}    ${chalk.yellow(session.branch)}`,
    `${chalk.dim('Author:')}    ${session.author}`,
    `${chalk.dim('Started:')}   ${formatDateTime(session.startTime)}`,
    `${chalk.dim('Ended:')}     ${formatDateTime(session.endTime)}`,
    `${chalk.dim('Duration:')}  ${formatDuration(session.startTime, session.endTime)}`,
    `${chalk.dim('Commits:')}   ${session.commits.length}`,
    `${chalk.dim('Changes:')}   ${chalk.green(`+${session.insertions}`)}/${chalk.red(`-${session.deletions}`)} across ${session.filesChanged} ${pluralize(session.filesChanged, 'file')}`,
  ];

  if (session.prNumber) {
    header.push(`${chalk.dim('PR:')}        ${chalk.blue(`#${session.prNumber}`)} ${session.prTitle ?? ''}`);
  }

  const headerBox = boxen(header.join('\n'), {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderColor: 'cyan',
    borderStyle: 'round',
  });

  // Commit list
  const commitLines = session.commits.map(c => {
    const hash = chalk.yellow(c.hashShort);
    const msg = chalk.white(c.message);
    const stats = chalk.dim(`+${c.insertions}/-${c.deletions}`);
    return `  ${hash} ${msg} ${stats}`;
  });

  const commitSection = chalk.bold.dim('\n  Commits:\n') + commitLines.join('\n');

  // Files changed
  let filesSection = '';
  if (diffStats?.filesChanged.length) {
    const fileLines = diffStats.filesChanged.map(f => `    ${chalk.dim('·')} ${f}`);
    filesSection = chalk.bold.dim('\n\n  Files changed:\n') + fileLines.join('\n');
  }

  return `${headerBox}${commitSection}${filesSection}\n`;
}
