import chalk from 'chalk';
import fs from 'node:fs';
import { loadConfig, configExists } from '../config/loader.js';
import { scanAllRepos } from '../core/scanner.js';
import { groupIntoSessions } from '../core/grouper.js';
import { storeSessions } from '../core/store.js';
import { renderBriefing } from '../ui/Briefing.js';
import type { BriefingOptions } from '../types.js';

export async function briefingCommand(options: BriefingOptions): Promise<void> {
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
    process.stdout.write(`\r${chalk.cyan(spinnerFrames[frame++ % spinnerFrames.length])} Preparing briefing...`);
  }, 80);

  try {
    const commits = await scanAllRepos(config, { since: options.since });
    const sessions = groupIntoSessions(commits);

    clearInterval(spinner);
    process.stdout.write('\r' + ' '.repeat(60) + '\r');

    if (sessions.length > 0) {
      storeSessions(sessions);
    }

    const format = options.format ?? 'text';
    const output = renderBriefing(sessions, format);

    if (format === 'md') {
      // Write to file
      const filename = `drift-briefing-${new Date().toISOString().slice(0, 10)}.md`;
      fs.writeFileSync(filename, output, 'utf-8');
      console.log(chalk.green(`Briefing written to ${filename}`));
    } else {
      console.log(output);
    }
  } catch (error) {
    clearInterval(spinner);
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    console.error(chalk.red('Error generating briefing:'), error instanceof Error ? error.message : error);
  }
}
