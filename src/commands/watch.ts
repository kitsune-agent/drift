import chalk from 'chalk';
import { loadConfig, configExists } from '../config/loader.js';
import { scanAllRepos } from '../core/scanner.js';
import { getRepoColor, formatTime, truncate } from '../utils.js';
import type { AgentCommit } from '../types.js';

export async function watchCommand(): Promise<void> {
  if (!configExists()) {
    console.log(chalk.yellow('No configuration found. Run ') + chalk.cyan('drift init') + chalk.yellow(' to get started.'));
    return;
  }

  const config = loadConfig();

  if (config.repos.length === 0) {
    console.log(chalk.yellow('No repos configured. Run ') + chalk.cyan('drift init') + chalk.yellow(' to add repos.'));
    return;
  }

  console.log(chalk.bold.white('\n  drift watch') + chalk.dim(' — live agent activity'));
  console.log(chalk.dim(`  Watching ${config.repos.length} repos. Press Ctrl+C to stop.\n`));
  console.log(chalk.dim('  ─'.repeat(35)));

  const seenHashes = new Set<string>();
  let isFirstRun = true;

  const poll = async () => {
    try {
      const commits = await scanAllRepos(config, { since: '5m' });

      for (const commit of commits.reverse()) {
        if (seenHashes.has(commit.hash)) continue;
        seenHashes.add(commit.hash);

        if (isFirstRun) continue; // Skip initial batch

        printCommit(commit);
      }

      isFirstRun = false;
    } catch {
      // Silently continue on errors
    }
  };

  // Initial scan
  await poll();
  console.log(chalk.dim('  Waiting for agent activity...\n'));

  // Poll every 10 seconds
  const interval = setInterval(poll, 10_000);

  // Handle graceful shutdown
  const cleanup = () => {
    clearInterval(interval);
    console.log(chalk.dim('\n  Stopped watching.'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive
  await new Promise(() => {});
}

function printCommit(commit: AgentCommit): void {
  const repoColor = getRepoColor(commit.repo);
  const time = chalk.dim(formatTime(commit.date));
  const repo = repoColor(`[${commit.repo}]`);
  const hash = chalk.yellow(commit.hashShort);
  const msg = chalk.white(truncate(commit.message, 60));
  const stats = chalk.dim(`+${commit.insertions}/-${commit.deletions}`);
  const author = chalk.dim(commit.author);

  console.log(`  ${time} ${repo} ${hash} ${msg} ${stats} ${author}`);
}
