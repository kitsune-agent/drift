import chalk from 'chalk';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import duration from 'dayjs/plugin/duration.js';

dayjs.extend(relativeTime);
dayjs.extend(duration);

export { dayjs };

export function parseTimeWindow(window: string): Date {
  const now = dayjs();

  // Handle "Xh", "Xd", "Xm" shorthand
  const shortMatch = window.match(/^(\d+)(h|d|m|w)$/);
  if (shortMatch) {
    const [, amount, unit] = shortMatch;
    const unitMap: Record<string, dayjs.ManipulateType> = {
      h: 'hour',
      d: 'day',
      m: 'minute',
      w: 'week',
    };
    return now.subtract(parseInt(amount!, 10), unitMap[unit!]!).toDate();
  }

  // Handle "X hours ago", "X days ago", or just "X days", "X hours"
  const agoMatch = window.match(/^(\d+)\s+(hour|day|minute|week|month)s?(\s+ago)?$/);
  if (agoMatch) {
    const [, amount, unit] = agoMatch;
    return now.subtract(parseInt(amount!, 10), unit as dayjs.ManipulateType).toDate();
  }

  // Try parsing as a date
  const parsed = dayjs(window);
  if (parsed.isValid()) {
    return parsed.toDate();
  }

  // Default: 12 hours ago
  return now.subtract(12, 'hour').toDate();
}

export function formatDuration(start: Date, end: Date): string {
  const diff = dayjs(end).diff(dayjs(start));
  const d = dayjs.duration(diff);

  if (d.asMinutes() < 1) return 'less than a minute';
  if (d.asMinutes() < 60) return `${Math.round(d.asMinutes())}m`;
  if (d.asHours() < 24) {
    const hours = Math.floor(d.asHours());
    const mins = Math.round(d.asMinutes() % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${Math.floor(d.asDays())}d ${Math.floor(d.asHours() % 24)}h`;
}

export function formatRelative(date: Date): string {
  return dayjs(date).fromNow();
}

export function formatTime(date: Date): string {
  return dayjs(date).format('HH:mm');
}

export function formatDateTime(date: Date): string {
  return dayjs(date).format('MMM D, HH:mm');
}

export function generateSessionId(repo: string, branch: string, startTime: Date): string {
  const timeStr = dayjs(startTime).format('YYYYMMDD-HHmm');
  const repoSlug = repo.toLowerCase().replace(/[^a-z0-9]/g, '');
  const branchSlug = branch.replace(/[^a-z0-9-]/gi, '').slice(0, 20);
  return `${repoSlug}-${branchSlug}-${timeStr}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// Repo-specific colors for consistent color coding
const REPO_COLORS = [
  chalk.cyan,
  chalk.magenta,
  chalk.yellow,
  chalk.green,
  chalk.blue,
  chalk.red,
  chalk.white,
];

const repoColorMap = new Map<string, (str: string) => string>();

export function getRepoColor(repoName: string): (str: string) => string {
  if (!repoColorMap.has(repoName)) {
    const idx = repoColorMap.size % REPO_COLORS.length;
    repoColorMap.set(repoName, REPO_COLORS[idx]!);
  }
  return repoColorMap.get(repoName)!;
}

export function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return filepath.replace('~', home);
  }
  return filepath;
}
