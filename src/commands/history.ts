import chalk from 'chalk';
import { getStoredSessions } from '../core/store.js';
import { renderDashboard } from '../ui/Dashboard.js';

export function historyCommand(options: { limit?: string }): void {
  const limit = options.limit ? parseInt(options.limit, 10) : 20;

  const sessions = getStoredSessions(limit);

  if (sessions.length === 0) {
    console.log(chalk.dim('\n  No session history found.'));
    console.log(chalk.dim('  Run ') + chalk.cyan('drift scan') + chalk.dim(' to scan for agent activity.\n'));
    return;
  }

  console.log(chalk.bold.dim(`\n  Session history (last ${sessions.length}):\n`));
  console.log(renderDashboard(sessions));
}
