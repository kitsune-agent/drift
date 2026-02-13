import Database from 'better-sqlite3';
import fs from 'node:fs';
import type { Session, AgentCommit } from '../types.js';
import { expandHome } from '../utils.js';
import { DB_FILE } from '../config/defaults.js';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = expandHome(DB_FILE);
  const dir = dbPath.replace(/\/[^/]+$/, '');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      repo TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      branch TEXT NOT NULL,
      author TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      files_changed INTEGER DEFAULT 0,
      insertions INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      pr_number INTEGER,
      pr_title TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commits (
      hash TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      author TEXT NOT NULL,
      email TEXT NOT NULL,
      date TEXT NOT NULL,
      message TEXT NOT NULL,
      body TEXT DEFAULT '',
      repo TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      branch TEXT NOT NULL,
      files_changed INTEGER DEFAULT 0,
      insertions INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_sessions_repo ON sessions(repo);
    CREATE INDEX IF NOT EXISTS idx_commits_session ON commits(session_id);
  `);

  return db;
}

export function storeSessions(sessions: Session[]): void {
  const database = getDb();

  const insertSession = database.prepare(`
    INSERT OR REPLACE INTO sessions (id, repo, repo_path, branch, author, start_time, end_time, files_changed, insertions, deletions, pr_number, pr_title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCommit = database.prepare(`
    INSERT OR REPLACE INTO commits (hash, session_id, author, email, date, message, body, repo, repo_path, branch, files_changed, insertions, deletions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = database.transaction((sessions: Session[]) => {
    for (const session of sessions) {
      insertSession.run(
        session.id,
        session.repo,
        session.repoPath,
        session.branch,
        session.author,
        session.startTime.toISOString(),
        session.endTime.toISOString(),
        session.filesChanged,
        session.insertions,
        session.deletions,
        session.prNumber ?? null,
        session.prTitle ?? null,
      );

      for (const commit of session.commits) {
        insertCommit.run(
          commit.hash,
          session.id,
          commit.author,
          commit.email,
          commit.date.toISOString(),
          commit.message,
          commit.body,
          commit.repo,
          commit.repoPath,
          commit.branch,
          commit.filesChanged,
          commit.insertions,
          commit.deletions,
        );
      }
    }
  });

  transaction(sessions);
}

export function getStoredSessions(limit = 50): Session[] {
  const database = getDb();

  const rows = database.prepare(`
    SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?
  `).all(limit) as Array<{
    id: string;
    repo: string;
    repo_path: string;
    branch: string;
    author: string;
    start_time: string;
    end_time: string;
    files_changed: number;
    insertions: number;
    deletions: number;
    pr_number: number | null;
    pr_title: string | null;
  }>;

  return rows.map(row => {
    const commits = database.prepare(`
      SELECT * FROM commits WHERE session_id = ? ORDER BY date ASC
    `).all(row.id) as Array<{
      hash: string;
      author: string;
      email: string;
      date: string;
      message: string;
      body: string;
      repo: string;
      repo_path: string;
      branch: string;
      files_changed: number;
      insertions: number;
      deletions: number;
    }>;

    return {
      id: row.id,
      repo: row.repo,
      repoPath: row.repo_path,
      branch: row.branch,
      author: row.author,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      commits: commits.map(c => ({
        hash: c.hash,
        hashShort: c.hash.slice(0, 7),
        author: c.author,
        email: c.email,
        date: new Date(c.date),
        message: c.message,
        body: c.body,
        repo: c.repo,
        repoPath: c.repo_path,
        branch: c.branch,
        filesChanged: c.files_changed,
        insertions: c.insertions,
        deletions: c.deletions,
      })),
      filesChanged: row.files_changed,
      insertions: row.insertions,
      deletions: row.deletions,
      prNumber: row.pr_number ?? undefined,
      prTitle: row.pr_title ?? undefined,
    };
  });
}

export function getSessionById(id: string): Session | undefined {
  const sessions = getStoredSessions(1000);
  return sessions.find(s => s.id === id || s.id.startsWith(id));
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
