import chalk from 'chalk';
import { loadConfig, configExists } from '../config/loader.js';
import { scanAllRepos } from '../core/scanner.js';
import { groupIntoSessions } from '../core/grouper.js';
import { storeSessions } from '../core/store.js';
import { renderDashboard } from '../ui/Dashboard.js';
import type { ScanOptions } from '../types.js';

export async function scanCommand(options: ScanOptions): Promise<void> {
  if (!configExists()) {
    console.log(chalk.yellow('No configuration found. Run ') + chalk.cyan('drift init') + chalk.yellow(' to get started.'));
    return;
  }

  const config = loadConfig();

  if (config.repos.length === 0) {
    console.log(chalk.yellow('No repos configured. Run ') + chalk.cyan('drift init') + chalk.yellow(' to add repos.'));
    return;
  }

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frame = 0;
  const spinner = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan(spinnerFrames[frame++ % spinnerFrames.length])} Scanning ${config.repos.length} ${config.repos.length === 1 ? 'repo' : 'repos'}...`);
  }, 80);

  try {
    const commits = await scanAllRepos(config, options);
    const sessions = groupIntoSessions(commits);

    clearInterval(spinner);
    process.stdout.write('\r' + ' '.repeat(60) + '\r');

    // Store sessions for history
    if (sessions.length > 0) {
      storeSessions(sessions);
    }

    console.log(renderDashboard(sessions));
  } catch (error) {
    clearInterval(spinner);
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    console.error(chalk.red('Error scanning repos:'), error instanceof Error ? error.message : error);
  }
}
