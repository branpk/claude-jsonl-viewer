# Claude JSONL Viewer

A client-side web app for reading Claude Code session logs. Drag a `.jsonl` file onto the page to inspect it.

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

Messages form a tree via `parentUuid`. Assistant content blocks: `text`, `thinking`, `tool_use`. Tool results arrive as `user` entries with `tool_result` content blocks.

## Features

**Implemented (v1)**
- Drag and drop a `.jsonl` file onto the page to load it
- Click to open a file picker as an alternative
- Each entry displayed as formatted raw JSON
- Parse error reporting for malformed lines

**Planned**
- Conversation view: render the session as a readable chat timeline
- Collapsible tool call / tool result pairs (Bash, Read, Edit, Write, etc.)
- Syntax-highlighted code blocks via Shiki
- Collapsible thinking blocks
- Token usage and cost summary per turn

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
