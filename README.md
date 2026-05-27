# Claude JSONL Viewer

A client-side web app for reading Claude Code session logs. Drag a `.jsonl` file onto the page to view it as a readable conversation.

## Overview

Claude Code saves every conversation to `~/.claude/projects/<project>/` as a JSONL file — one JSON object per line. These files are the canonical record of what Claude did, what tools it called, and what it said. This app makes those logs human-readable: a clean conversation UI instead of raw JSON.

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

Messages form a tree via `parentUuid` — the viewer follows the main chain by default and can optionally show sidechains.

Assistant content blocks include:
- `text` — Claude's response prose
- `thinking` — Extended thinking (shown collapsibly)
- `tool_use` — A tool call with name and input
- Tool results arrive as `user` entries with `tool_result` content blocks

## Planned Features

### Drop Zone
- Drag and drop a `.jsonl` file onto the page to load it
- Click to open a file picker as an alternative
- Drop a new file at any time to replace the current session

### Conversation View
- Render the conversation as a readable chat timeline
- Collapsible tool call / tool result pairs (Bash, Read, Edit, Write, etc.)
- Syntax-highlighted code blocks in tool inputs and outputs
- Collapsible thinking blocks
- Token usage and cost summary per turn (from `usage` fields)

## Tech Stack

- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS
- **Syntax highlighting:** Shiki
- **Bundler:** Vite
- Pure client-side — no backend required

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), then drag a `.jsonl` session file onto the page.
