# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment Constraints

**Node version:** 18.20.8. Packages that require Node 20+ will fail (e.g. `create-vite@9+`). Pin major versions when installing new deps to avoid accidental upgrades past Node 18 compatibility.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173 (HMR enabled)
npm run build     # tsc type-check then vite production build
npm run lint      # eslint (typescript-eslint + react-hooks + react-refresh rules)
npm run preview   # serve the production build locally
```

No test suite exists yet. `npm run build` is the primary correctness gate — run it before marking any task done.

## Architecture

Pure client-side React + TypeScript app. No backend, no router. All file I/O happens in the browser via `FileReader`.

### Current structure

Everything lives in `src/App.tsx` (single file, ~135 lines). It has three layers:

1. **Parser** — `parseJsonl(filename, text)` splits on newlines, `JSON.parse`s each non-empty line, and returns `{ filename, entries: unknown[], errors: { line, text }[] }`.
2. **Components** — `<DropZone>` (drag-and-drop + file picker), `<EntryCard>` (one JSON entry rendered in a `<pre>`), `<App>` (top-level state: `ParseResult | null`).
3. **Styling** — Tailwind CSS v3 utility classes only. No CSS modules, no `App.css`. Tailwind `content` glob covers `./src/**/*.{ts,tsx}`.

### How to grow the codebase

As features are added, split `src/App.tsx` along these seams:
- `src/lib/parseJsonl.ts` — parser + types (`ParseResult`, `JsonlEntry`)
- `src/components/DropZone.tsx` — file loading UI
- `src/components/EntryCard.tsx` — per-entry rendering
- `src/components/<feature>.tsx` — new rendering features (conversation view, tool call collapsing, etc.)

The `unknown[]` entry type in `ParseResult` is intentionally loose for v1. As structured rendering is added, define typed interfaces for the Claude JSONL schema (see below) and narrow entries at render time.

## Claude JSONL Schema

Session files live at `~/.claude/projects/<encoded-path>/<uuid>.jsonl`. One JSON object per line.

Top-level fields present on every entry:
- `type`: `"user"` | `"assistant"` | `"system"` | `"attachment"` | `"mode"`
- `uuid`: unique ID for this entry
- `parentUuid`: links entries into a conversation tree; follow the longest chain for the main thread
- `timestamp`: ISO 8601

**`assistant` entries** have a `content` array of blocks:
- `{ type: "text", text: string }` — response prose
- `{ type: "thinking", thinking: string }` — extended thinking (may be long)
- `{ type: "tool_use", id, name, input }` — a tool call; `name` is e.g. `"Bash"`, `"Read"`, `"Edit"`

**`user` entries** carry either human text or tool results:
- `{ type: "tool_result", tool_use_id, content }` — result matching a prior `tool_use` block

**`system` entries** carry session metadata: cost summaries, compaction events.

`usage` on assistant entries: `{ input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }`.
