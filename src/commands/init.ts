import chalk from 'chalk';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig, configExists } from '../config/loader.js';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import { expandHome } from '../utils.js';

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer.trim()));
  });
}

export async function initCommand(): Promise<void> {
  const rl = createInterface();

  console.log(chalk.bold.white('\n  drift init') + chalk.dim(' — setup wizard\n'));

  let config = configExists() ? loadConfig() : { ...DEFAULT_CONFIG, repos: [] };

  // Add repos
  console.log(chalk.dim('  Add git repositories to monitor for agent activity.'));
  console.log(chalk.dim('  Enter paths (relative or absolute). Empty line to finish.\n'));

  let addingRepos = true;
  while (addingRepos) {
    const repoPath = await question(rl, chalk.cyan('  Repo path: '));

    if (!repoPath) {
      addingRepos = false;
      continue;
    }

    const fullPath = path.resolve(expandHome(repoPath));

    // Check if it exists and is a git repo
    if (!fs.existsSync(fullPath)) {
      console.log(chalk.red(`    Path not found: ${fullPath}`));
      continue;
    }

    if (!fs.existsSync(path.join(fullPath, '.git'))) {
      console.log(chalk.red(`    Not a git repository: ${fullPath}`));
      continue;
    }

    const defaultName = path.basename(fullPath);
    const name = await question(rl, chalk.dim(`  Name [${defaultName}]: `)) || defaultName;

    // Check if already configured
    if (config.repos.some(r => path.resolve(expandHome(r.path)) === fullPath)) {
      console.log(chalk.yellow(`    Already configured: ${name}`));
      continue;
    }

    config.repos.push({ path: repoPath.startsWith('~') ? repoPath : fullPath, name });
    console.log(chalk.green(`    Added: ${name}`) + chalk.dim(` (${fullPath})\n`));
  }

  // Agent authors
  console.log('');
  const authorsInput = await question(rl, chalk.cyan('  Agent authors ') + chalk.dim(`[${config.agents.authors.join(', ')}]: `));
  if (authorsInput) {
    config.agents.authors = authorsInput.split(',').map(a => a.trim()).filter(Boolean);
  }

  // Default time window
  const windowInput = await question(rl, chalk.cyan('  Default time window ') + chalk.dim(`[${config.general.default_window}]: `));
  if (windowInput) {
    config.general.default_window = windowInput;
  }

  // Save
  saveConfig(config);
  rl.close();

  console.log(chalk.green('\n  Configuration saved!'));
  console.log(chalk.dim('  Run ') + chalk.cyan('drift scan') + chalk.dim(' to scan for agent activity.'));
  console.log(chalk.dim('  Run ') + chalk.cyan('drift config') + chalk.dim(' to view your settings.\n'));
}
