import type { Session, TimelineEntry } from '../types.js';

export function buildTimeline(sessions: Session[]): TimelineEntry[] {
  const entries: TimelineEntry[] = sessions.map(session => ({
    session,
    type: 'session' as const,
  }));

  // Already sorted by session start time (descending) from grouper
  return entries;
}

export function filterTimeline(
  entries: TimelineEntry[],
  options: { repo?: string; author?: string },
): TimelineEntry[] {
  return entries.filter(entry => {
    if (options.repo && entry.session.repo.toLowerCase() !== options.repo.toLowerCase()) {
      return false;
    }
    if (options.author && !entry.session.author.toLowerCase().includes(options.author.toLowerCase())) {
      return false;
    }
    return true;
  });
}
