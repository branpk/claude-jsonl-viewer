# Claude JSONL Viewer

> **Warning:** This app is hastily thrown together and incomplete. Expect missing features and rough edges.

A client-side web app for reading Claude Code session logs. Drag a `.jsonl` file onto the page to inspect it.

**Live app:** [https://branpk.github.io/claude-jsonl-viewer/](https://branpk.github.io/claude-jsonl-viewer/)

## Overview

Claude Code saves every conversation to `~/.claude/projects/<project>/` as a JSONL file — one JSON object per line. These files are the canonical record of what Claude did, what tools it called, and what it said.

Session files live at:
```
~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl
```

## JSONL Format

Each line in a session file is one event. Key entry types:

| Type | Description |
|------|-------------|
| `user` | A user turn: text, tool results, slash commands |
| `assistant` | A Claude turn: text, thinking blocks, tool calls |
| `attachment` | File or image attached to a message |
| `system` | Session-level metadata (cost summaries, compaction events) |
| `mode` | Session mode (normal, auto, etc.) |

Messages form a tree via `parentUuid`. Assistant content blocks: `text`, `thinking`, `tool_use`. Tool results arrive as `user` entries with `tool_result` content blocks. Content for `user` and `assistant` entries is nested under `entry.message.content`; `system` entries have `content` directly on the entry.

## Features

- Drag and drop a `.jsonl` file onto the page to load it (or use the file picker)
- Parse error reporting for malformed lines
- Each entry shows type badge (color-coded), timestamp, and rendered↔raw toggle
- **Rendered view** (default): human-readable display per entry type
  - `assistant`: prose text, collapsible thinking blocks, tool call cards with expanded input; `Edit` calls show a diff view (red/green lines), `Write` calls show full file content with green highlighting
  - `user`: text messages, tool result cards with expanded output and char count
  - `system`: content string + collapsible metadata
  - Unknown types: pretty-printed JSON fallback
- **Raw view**: full `JSON.stringify` output for any entry
- All text uses monospace font; collapsible sections open by default

**Planned**
- Conversation timeline view (follow `parentUuid` chain to render as chat)
- Syntax-highlighted code blocks via Shiki
- Token usage and cost summary per session

## Tech Stack

- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS v3
- **Bundler:** Vite 5
- Pure client-side — no backend required

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), then drag a `.jsonl` session file onto the page.
