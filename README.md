# drift

**What did my AI agents do while I was away?**

drift is a CLI that scans your git repos for AI agent activity — commits by Claude, Copilot, Cursor, Dependabot, or any automated author — and presents it as a beautiful, readable timeline in your terminal.

Think of it as `git log` meets flight recorder for AI agents.

## The Problem

You wake up. Your AI agents worked overnight. You have 47 notifications, 12 commits across 3 repos, and no idea what actually happened.

drift gives you the morning briefing.

## Quick Demo

```
$ drift briefing --since "12h"

╭──────────────────────────────────────────────────────────────╮
│                                                              │
│  ☀ Morning Briefing                                         │
│                                                              │
│  Overnight, 2 agents worked across 3 repos. 14 commits      │
│  total (+1,847/-203 lines).                                  │
│                                                              │
│  ▸ 8count — 4 sessions, 8 commits                           │
│    · kitsune-agent · feat: add downgrade notification email  │
│      PR #209 · +81/-1 across 2 files · (2m)                 │
│    · kitsune-agent · refactor: implement PR review changes   │
│      +123/-63 across 7 files · (20m)                         │
│                                                              │
│  ▸ compound-ralph — 3 sessions, 6 commits                   │
│    · kitsune-agent · feat: add parallel execution            │
│      PR #23 · +724/-10 across 2 files · (4m)                │
│    · kitsune-agent · fix: cap learnings context injection    │
│      +159/-79 across 2 files · (5m)                          │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
```

```
$ drift scan --since "24h"

╭──────────────────────────────────────────────────────────────╮
│ drift — agent activity timeline                              │
│ 12 sessions · 23 commits · 3 repos · 2 agents · +4521/-890  │
╰──────────────────────────────────────────────────────────────╯

  23:06 [8count] feature/downgrade-email (2m)
       kitsune-agent · 3 commits · 8 files · +290/-40
       feat: add downgrade notification email (fixes #209)
  21:30 [8count] pr-204-work (20m)
       kitsune-agent · 3 commits · 7 files · +123/-63
       refactor: implement PR review recommendations
  19:05 [compound-ralph] feat/parallel-execution (4m)
       kitsune-agent · 2 commits · 2 files · +724/-10
       feat: add parallel execution for cr implement
  ...
```

## Installation

```sh
npm install -g drift-cli
```

Requires Node.js 18+.

## Quick Start

```sh
# 1. Set up drift with your repos
drift init

# 2. Scan for agent activity
drift scan

# 3. Get your morning briefing
drift briefing
```

## Commands

### `drift` (default)

Scans configured repos and shows the activity dashboard.

### `drift scan`

Scan repos for agent commits within a time window.

```sh
drift scan                        # Use default window (12h)
drift scan --since "24h"          # Last 24 hours
drift scan --since "3 days ago"   # Last 3 days
drift scan --author kitsune-agent # Filter by author
drift scan --repo 8count          # Filter by repo
```

### `drift briefing`

Generate a narrative summary of agent activity.

```sh
drift briefing                     # Terminal output
drift briefing --since "8h"        # Custom time window
drift briefing --format md         # Save as markdown file
```

### `drift watch`

Live tail of agent activity across all repos. Shows new commits as they happen.

```sh
drift watch
# Press Ctrl+C to stop
```

### `drift diff <session-id>`

Show detailed information and aggregate diff for a session.

```sh
drift diff 8count-pr204work-20250212-2130
```

### `drift history`

Show past sessions from the local database.

```sh
drift history               # Last 20 sessions
drift history --limit 50    # Last 50 sessions
```

### `drift init`

Interactive setup wizard. Walks you through adding repos and configuring agent detection.

### `drift config`

Display current configuration.

## Configuration

drift stores its config at `~/.drift/config.toml`:

```toml
[general]
default_window = "12h"
theme = "dark"

[[repos]]
path = "~/projects/my-app"
name = "my-app"

[[repos]]
path = "~/projects/my-api"
name = "my-api"

[agents]
# Authors that indicate agent commits
authors = ["kitsune-agent", "dependabot[bot]", "renovate[bot]"]

# Patterns in commit messages that indicate agent activity
message_patterns = [
  "Co-Authored-By:.*[Cc]laude",
  "Co-Authored-By:.*[Cc]opilot",
  "forge:",
  "\\[AGENT\\]",
  "auto:"
]
```

### Agent Detection

drift identifies agent commits in two ways:

1. **Author matching** — If the commit author or email matches any entry in `agents.authors`
2. **Message patterns** — If the commit message or body matches any regex in `agents.message_patterns`

The default patterns catch commits from Claude Code, GitHub Copilot, Cursor, Dependabot, and Renovate.

### Session Grouping

Commits from the same author on the same branch within 10 minutes of each other are grouped into a **session**. Each session represents a burst of agent activity.

## How It Works

1. **Scan** — drift uses `simple-git` to read commit history from your configured repos
2. **Filter** — Commits are matched against your agent author/pattern rules
3. **Group** — Related commits are grouped into sessions (same branch, same author, <10min gap)
4. **Display** — Sessions are rendered as a color-coded timeline with stats
5. **Store** — Sessions are persisted to a local SQLite database for history

No AI API keys needed. No network requests. Everything runs locally against your git repos.

## Use Cases

- **Morning briefing** — See what your overnight agents accomplished before your first coffee
- **PR review prep** — Understand what an agent did before reviewing its PR
- **Team monitoring** — Track agent activity across multiple repos in your org
- **Audit trail** — Keep a local history of all automated changes to your codebase
- **Watch mode** — Monitor long-running agent sessions in real-time

## Tech Stack

- **TypeScript** on Node.js
- **simple-git** for git operations
- **Commander.js** for CLI framework
- **chalk** + **boxen** for terminal styling
- **better-sqlite3** for session history
- **dayjs** for time handling
- **@iarna/toml** for config parsing

## License

MIT
