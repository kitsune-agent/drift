import chalk from 'chalk';
import { loadConfig, configExists, getConfigPath } from '../config/loader.js';
import { expandHome } from '../utils.js';

export function configCommand(): void {
  const configPath = getConfigPath();

  if (!configExists()) {
    console.log(chalk.yellow('No configuration found at ') + chalk.dim(configPath));
    console.log(chalk.dim('Run ') + chalk.cyan('drift init') + chalk.dim(' to create one.'));
    return;
  }

  const config = loadConfig();

  console.log(chalk.bold.white('\n  drift config\n'));
  console.log(chalk.dim(`  File: ${configPath}\n`));

  // General
  console.log(chalk.bold('  General'));
  console.log(`    Default window: ${chalk.cyan(config.general.default_window)}`);
  console.log(`    Theme:          ${chalk.cyan(config.general.theme)}`);

  // Repos
  console.log(chalk.bold('\n  Repos'));
  if (config.repos.length === 0) {
    console.log(chalk.dim('    No repos configured'));
  } else {
    for (const repo of config.repos) {
      console.log(`    ${chalk.white(repo.name)} ${chalk.dim(expandHome(repo.path))}`);
    }
  }

  // Agents
  console.log(chalk.bold('\n  Agent Detection'));
  console.log(`    Authors:  ${config.agents.authors.map(a => chalk.cyan(a)).join(', ')}`);
  console.log(`    Patterns: ${config.agents.message_patterns.map(p => chalk.cyan(p)).join(', ')}`);

  console.log('');
}
