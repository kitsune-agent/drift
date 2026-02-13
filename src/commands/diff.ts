import chalk from 'chalk';
import { getSessionById } from '../core/store.js';
import { getSessionDiff, getSessionDiffStats } from '../core/differ.js';
import { renderSessionDetail } from '../ui/SessionDetail.js';

export async function diffCommand(sessionId: string): Promise<void> {
  const session = getSessionById(sessionId);

  if (!session) {
    console.log(chalk.yellow(`Session not found: ${sessionId}`));
    console.log(chalk.dim('Run ') + chalk.cyan('drift history') + chalk.dim(' to see available sessions.'));
    return;
  }

  const diffStats = await getSessionDiffStats(session);
  console.log(renderSessionDetail(session, diffStats));

  console.log(chalk.dim('\n  Full diff:\n'));
  const diff = await getSessionDiff(session);

  if (diff) {
    // Colorize the diff output
    const lines = diff.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        console.log(chalk.green(line));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        console.log(chalk.red(line));
      } else if (line.startsWith('@@')) {
        console.log(chalk.cyan(line));
      } else if (line.startsWith('diff ')) {
        console.log(chalk.bold.white(line));
      } else {
        console.log(chalk.dim(line));
      }
    }
  }
}
