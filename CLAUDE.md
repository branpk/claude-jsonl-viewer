# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # tsc type-check + vite production build
npm run lint      # eslint
npm run preview   # serve the production build locally
```

No test suite exists yet. The build command (`tsc -b && vite build`) is the primary correctness check — always run it before reporting a task done.

## Architecture

This is a pure client-side React + TypeScript app (no backend). All file processing happens in the browser via the FileReader API.

**Single-component file:** `src/App.tsx` contains the entire application:
- `parseJsonl(filename, text)` — splits on newlines, attempts `JSON.parse` on each, collects both successful entries and parse errors
- `<DropZone>` — handles drag-and-drop and `<input type="file">` for loading a `.jsonl` file
- `<EntryCard>` — renders a single parsed entry as formatted JSON in a `<pre>` block
- `<App>` — top-level state (`ParseResult | null`); shows DropZone when no file is loaded, entry list when one is

**Styling:** Tailwind CSS v3 utility classes only — no `App.css`, no CSS modules. The `content` glob in `tailwind.config.js` covers `./src/**/*.{ts,tsx}`.

## JSONL Format

Claude Code session files (from `~/.claude/projects/<encoded-path>/<uuid>.jsonl`) have one JSON object per line. Key fields:

- `type`: `"user"` | `"assistant"` | `"system"` | `"attachment"` | `"mode"`
- `parentUuid`: links messages into a tree; the main chain is the longest path
- Assistant entries carry a `content` array of blocks: `text`, `thinking`, `tool_use`
- Tool results come back as `user` entries with `tool_result` content blocks
- `usage` fields on assistant entries carry token counts and cost data
