#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { briefingCommand } from './commands/briefing.js';
import { watchCommand } from './commands/watch.js';
import { diffCommand } from './commands/diff.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { historyCommand } from './commands/history.js';

const program = new Command();

program
  .name('drift')
  .description('What did my AI agents do while I was away?')
  .version('1.0.0');

// Default command (no args) — runs scan with defaults
program
  .action(async () => {
    await scanCommand({});
  });

// scan
program
  .command('scan')
  .description('Scan repos for agent activity')
  .option('-s, --since <window>', 'Time window (e.g. "12h", "24h", "3 days ago")')
  .option('-a, --author <name>', 'Filter by author name')
  .option('-r, --repo <name>', 'Filter by repo name')
  .action(async (options) => {
    await scanCommand({
      since: options.since,
      author: options.author,
      repo: options.repo,
    });
  });

// briefing
program
  .command('briefing')
  .description('Generate a morning briefing of agent activity')
  .option('-s, --since <window>', 'Time window (e.g. "12h", "24h")')
  .option('-f, --format <format>', 'Output format: text or md', 'text')
  .action(async (options) => {
    await briefingCommand({
      since: options.since,
      format: options.format,
    });
  });

// watch
program
  .command('watch')
  .description('Live tail of agent activity across all repos')
  .action(async () => {
    await watchCommand();
  });

// diff
program
  .command('diff <session-id>')
  .description('Show aggregate diff for a session')
  .action(async (sessionId: string) => {
    await diffCommand(sessionId);
  });

// config
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    configCommand();
  });

// init
program
  .command('init')
  .description('Interactive setup wizard')
  .action(async () => {
    await initCommand();
  });

// history
program
  .command('history')
  .description('Show past sessions from history')
  .option('-l, --limit <n>', 'Number of sessions to show', '20')
  .action((options) => {
    historyCommand(options);
  });

program.parse();
