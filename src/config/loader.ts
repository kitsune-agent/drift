import fs from 'node:fs';
import path from 'node:path';
import TOML from '@iarna/toml';
import type { DriftConfig } from '../types.js';
import { DEFAULT_CONFIG, CONFIG_DIR, CONFIG_FILE } from './defaults.js';
import { expandHome } from '../utils.js';

export function getConfigDir(): string {
  return expandHome(CONFIG_DIR);
}

export function getConfigPath(): string {
  return expandHome(CONFIG_FILE);
}

export function configExists(): boolean {
  return fs.existsSync(getConfigPath());
}

export function loadConfig(): DriftConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = TOML.parse(raw);

  const config: DriftConfig = {
    general: {
      default_window: (parsed.general as Record<string, unknown>)?.default_window as string ?? DEFAULT_CONFIG.general.default_window,
      theme: ((parsed.general as Record<string, unknown>)?.theme as 'dark' | 'light') ?? DEFAULT_CONFIG.general.theme,
    },
    repos: (parsed.repos as Array<{ path: string; name: string }>) ?? [],
    agents: {
      authors: (parsed.agents as Record<string, unknown>)?.authors as string[] ?? DEFAULT_CONFIG.agents.authors,
      message_patterns: (parsed.agents as Record<string, unknown>)?.message_patterns as string[] ?? DEFAULT_CONFIG.agents.message_patterns,
    },
  };

  return config;
}

export function saveConfig(config: DriftConfig): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Build TOML-compatible object
  const tomlObj: Record<string, unknown> = {
    general: config.general,
    repos: config.repos,
    agents: config.agents,
  };

  const tomlStr = TOML.stringify(tomlObj as TOML.JsonMap);
  fs.writeFileSync(configPath, tomlStr, 'utf-8');
}

export function addRepo(repoPath: string, name?: string): DriftConfig {
  const config = loadConfig();
  const absPath = path.resolve(expandHome(repoPath));

  // Check if already configured
  if (config.repos.some(r => path.resolve(expandHome(r.path)) === absPath)) {
    return config;
  }

  const repoName = name ?? path.basename(absPath);
  config.repos.push({ path: repoPath, name: repoName });
  saveConfig(config);
  return config;
}
