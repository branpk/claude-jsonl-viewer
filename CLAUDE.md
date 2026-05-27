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

Everything lives in `src/App.tsx` (~550 lines). It has these layers:

1. **Types** — TypeScript interfaces for `AssistantEntry`, `UserEntry`, `SystemEntry` and their content blocks.
2. **Parser** — `parseJsonl(filename, text)` splits on newlines, `JSON.parse`s each non-empty line, returns `{ filename, entries: unknown[], errors }`.
3. **Type guards** — `isAssistantEntry`, `isUserEntry`, `isSystemEntry` narrow `unknown` entries at render time.
4. **Rendered components** — `RenderedAssistant`, `RenderedUser`, `RenderedSystem` plus `ToolUseCard`, `ToolResultCard`, `Collapsible`, `CodeBox`.
   - `ToolUseCard` dispatches to `EditToolCard` or `WriteToolCard` for those tools; all others fall back to raw JSON input. `EditToolCard` renders a diff view (red `-` lines for `old_string`, green `+` lines for `new_string`). `WriteToolCard` renders the full file content with green `+` line highlighting.
5. **EntryCard** — wraps any entry with a type/timestamp header and a rendered↔raw toggle (defaults to rendered).
6. **DropZone / App** — file loading UI and top-level state.

### How to grow the codebase

Split `src/App.tsx` along these seams when it gets unwieldy:
- `src/lib/parseJsonl.ts` — parser + `ParseResult` type
- `src/types/jsonl.ts` — entry interfaces and type guards
- `src/components/DropZone.tsx` — file loading UI
- `src/components/EntryCard.tsx` — card shell + toggle
- `src/components/RenderedEntry.tsx` — rendered views per type

## Claude JSONL Schema

Session files live at `~/.claude/projects/<encoded-path>/<uuid>.jsonl`. One JSON object per line.

**IMPORTANT:** Always verify the schema against real files before writing typed interfaces. Run:
```bash
python3 -c "
import json, sys
with open('path/to/file.jsonl') as f:
    for line in f:
        obj = json.loads(line.strip())
        print(obj.get('type'), list(obj.keys()))
"
```

### Top-level fields on every entry
- `type`: `"user"` | `"assistant"` | `"system"` | `"attachment"` | `"mode"` | `"permission-mode"` | `"file-history-snapshot"`
- `uuid`, `parentUuid` (tree linkage), `timestamp` (ISO 8601)
- `isSidechain`, `sessionId`, `version`, `gitBranch`, `slug`, `cwd`, `entrypoint`, `userType` — session metadata

### `assistant` entries
Content and usage are nested inside `entry.message` (not directly on the entry):
```
entry.message.content  — AssistantBlock[]
entry.message.usage    — { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }
entry.message.model    — model ID string
entry.message.id       — API message ID
```
Content block types:
- `{ type: "text", text: string }`
- `{ type: "thinking", thinking: string, signature: string }`
- `{ type: "tool_use", id, name, input, caller }` — `name` is e.g. `"Bash"`, `"Read"`, `"Edit"`

### `user` entries
Content is also nested inside `entry.message`:
```
entry.message.content  — string | UserBlock[]
```
- String: slash commands and plain user messages
- Array: `{ type: "text", text }` or `{ type: "tool_result", tool_use_id, content: string }`

### `system` entries
`content` is a **string directly on the entry** (not in `message`):
```
entry.content  — string (may contain XML-like tags)
entry.subtype  — e.g. "local_command"
entry.level    — "info" | etc.
```

### Other entry types
- `mode`: `entry.mode` field
- `permission-mode`: `entry.permissionMode` field
- `file-history-snapshot`: `entry.messageId`, `entry.snapshot`, `entry.isSnapshotUpdate`

## Component conventions

**`<Collapsible defaultOpen>`** — all collapsible sections in the app currently open by default. Pass `defaultOpen` when adding new ones unless the content is large enough that expanding it on load would be disruptive.

## Lessons learned

**Check real files before writing typed interfaces.** The schema above was derived from documentation and turned out to be wrong in a key detail: both `user` and `assistant` entries nest content inside `entry.message`, not directly on the entry. Coding against the wrong assumption caused runtime crashes on every rendered entry. Before adding new typed interfaces or extending existing ones, sample real JSONL files with the command in the schema section above.
