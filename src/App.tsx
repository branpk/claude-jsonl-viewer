import { useState, useCallback, useRef, DragEvent, ChangeEvent, ReactNode } from 'react'

// ---- Types ----

interface TextBlock { type: 'text'; text: string }
interface ThinkingBlock { type: 'thinking'; thinking: string }
interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: unknown }
type AssistantBlock = TextBlock | ThinkingBlock | ToolUseBlock

interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: unknown }
type UserBlock = ToolResultBlock | TextBlock

interface AssistantEntry {
  type: 'assistant'
  uuid: string
  parentUuid?: string | null
  timestamp: string
  message: {
    content: AssistantBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
}

interface UserEntry {
  type: 'user'
  uuid: string
  parentUuid?: string | null
  timestamp: string
  message: {
    content: UserBlock[] | string
  }
}

interface SystemEntry {
  type: 'system'
  uuid: string
  parentUuid?: string | null
  timestamp: string
  subtype?: string
  content?: string
  [key: string]: unknown
}

// ---- Parser ----

interface ParseResult {
  filename: string
  entries: unknown[]
  errors: { line: number; text: string }[]
}

function parseJsonl(filename: string, text: string): ParseResult {
  const entries: unknown[] = []
  const errors: { line: number; text: string }[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    try {
      entries.push(JSON.parse(line))
    } catch {
      errors.push({ line: i + 1, text: line })
    }
  }
  return { filename, entries, errors }
}

// ---- Type guards ----

function isAssistantEntry(e: unknown): e is AssistantEntry {
  return typeof e === 'object' && e !== null && (e as Record<string, unknown>).type === 'assistant'
}

function isUserEntry(e: unknown): e is UserEntry {
  return typeof e === 'object' && e !== null && (e as Record<string, unknown>).type === 'user'
}

function isSystemEntry(e: unknown): e is SystemEntry {
  return typeof e === 'object' && e !== null && (e as Record<string, unknown>).type === 'system'
}

// ---- Helpers ----

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return ts
  }
}

function getEntryType(entry: unknown): string {
  if (typeof entry === 'object' && entry !== null) {
    const t = (entry as Record<string, unknown>).type
    if (typeof t === 'string') return t
  }
  return 'unknown'
}

function getEntryTimestamp(entry: unknown): string | null {
  if (typeof entry === 'object' && entry !== null) {
    const ts = (entry as Record<string, unknown>).timestamp
    if (typeof ts === 'string') return formatTimestamp(ts)
  }
  return null
}

function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(c => {
      if (typeof c === 'string') return c
      if (typeof c === 'object' && c !== null && 'text' in c) return (c as TextBlock).text
      return JSON.stringify(c)
    }).join('\n')
  }
  return JSON.stringify(content, null, 2)
}

// ---- Sub-components ----

function Collapsible({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span className="font-mono">{open ? '▾' : '▸'}</span>
        <span>{label}</span>
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  )
}

function CodeBox({ text }: { text: string }) {
  return (
    <pre className="text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-words p-2.5 bg-zinc-950 rounded border border-zinc-800 leading-relaxed">
      {text}
    </pre>
  )
}

function ToolUseCard({ block }: { block: ToolUseBlock }) {
  return (
    <div className="rounded-md border border-zinc-700 overflow-hidden">
      <div className="px-3 py-1.5 bg-zinc-800 text-xs font-mono flex items-center gap-2">
        <span className="text-purple-400 font-medium">tool_use</span>
        <span className="text-zinc-100 font-semibold">{block.name}</span>
        <span className="text-zinc-600 ml-auto truncate">{block.id}</span>
      </div>
      <div className="p-3">
        <Collapsible label="Input" defaultOpen>
          <CodeBox text={JSON.stringify(block.input, null, 2)} />
        </Collapsible>
      </div>
    </div>
  )
}

function ToolResultCard({ block }: { block: ToolResultBlock }) {
  const text = toolResultText(block.content)
  return (
    <div className="rounded-md border border-zinc-700 overflow-hidden">
      <div className="px-3 py-1.5 bg-zinc-800 text-xs font-mono flex items-center gap-2">
        <span className="text-green-400 font-medium">tool_result</span>
        <span className="text-zinc-600 truncate">{block.tool_use_id}</span>
      </div>
      <div className="p-3">
        <Collapsible label={`Output · ${text.length.toLocaleString()} chars`} defaultOpen>
          <CodeBox text={text} />
        </Collapsible>
      </div>
    </div>
  )
}

// ---- Rendered entry views ----

function RenderedAssistant({ entry }: { entry: AssistantEntry }) {
  const content = entry.message?.content ?? []
  const usage = entry.message?.usage
  return (
    <div className="flex flex-col gap-3">
      {content.map((block, i) => {
        if (block.type === 'text') {
          return (
            <p key={i} className="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {block.text}
            </p>
          )
        }
        if (block.type === 'thinking') {
          return (
            <Collapsible key={i} label="Thinking" defaultOpen>
              <p className="text-xs text-zinc-500 italic whitespace-pre-wrap leading-relaxed pl-3 border-l border-zinc-700 py-1">
                {block.thinking}
              </p>
            </Collapsible>
          )
        }
        if (block.type === 'tool_use') {
          return <ToolUseCard key={i} block={block} />
        }
        return null
      })}
      {usage && (
        <div className="flex items-center gap-3 text-xs text-zinc-600 font-mono pt-2 border-t border-zinc-800">
          <span>{usage.input_tokens.toLocaleString()} in</span>
          <span>{usage.output_tokens.toLocaleString()} out</span>
          {(usage.cache_read_input_tokens ?? 0) > 0 && (
            <span>{usage.cache_read_input_tokens!.toLocaleString()} cached</span>
          )}
        </div>
      )}
    </div>
  )
}

function RenderedUser({ entry }: { entry: UserEntry }) {
  const content = entry.message?.content ?? []
  if (typeof content === 'string') {
    return (
      <p className="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {content.map((block, i) => {
        if (block.type === 'text') {
          return (
            <p key={i} className="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {block.text}
            </p>
          )
        }
        if (block.type === 'tool_result') {
          return <ToolResultCard key={i} block={block} />
        }
        return (
          <CodeBox key={i} text={JSON.stringify(block, null, 2)} />
        )
      })}
    </div>
  )
}

function RenderedSystem({ entry }: { entry: SystemEntry }) {
  const { type: _t, uuid: _u, parentUuid: _p, timestamp: _ts, isSidechain: _s, ...rest } = entry
  const meta = Object.fromEntries(Object.entries(rest).filter(([k]) => k !== 'content'))
  return (
    <div className="flex flex-col gap-2">
      {entry.content && (
        <p className="text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
      )}
      {Object.keys(meta).length > 0 && (
        <Collapsible label="Metadata" defaultOpen>
          <CodeBox text={JSON.stringify(meta, null, 2)} />
        </Collapsible>
      )}
    </div>
  )
}

function RenderedEntry({ entry }: { entry: unknown }) {
  if (isAssistantEntry(entry)) return <RenderedAssistant entry={entry} />
  if (isUserEntry(entry)) return <RenderedUser entry={entry} />
  if (isSystemEntry(entry)) return <RenderedSystem entry={entry} />
  return (
    <CodeBox text={JSON.stringify(entry, null, 2)} />
  )
}

// ---- EntryCard with toggle ----

const TYPE_COLOR: Record<string, string> = {
  user: 'text-blue-400',
  assistant: 'text-emerald-400',
  system: 'text-yellow-500',
  attachment: 'text-orange-400',
  mode: 'text-zinc-500',
}

function EntryCard({ entry, index }: { entry: unknown; index: number }) {
  const [raw, setRaw] = useState(false)
  const type = getEntryType(entry)
  const ts = getEntryTimestamp(entry)
  const typeColor = TYPE_COLOR[type] ?? 'text-zinc-400'

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono min-w-0">
          <span className="text-zinc-600 shrink-0">#{index + 1}</span>
          <span className={`${typeColor} shrink-0`}>{type}</span>
          {ts && <span className="text-zinc-600 truncate">{ts}</span>}
        </div>
        <button
          onClick={() => setRaw(r => !r)}
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
        >
          {raw ? 'rendered' : 'raw'}
        </button>
      </div>
      <div className="p-4">
        {raw ? (
          <pre className="text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
            {JSON.stringify(entry, null, 2)}
          </pre>
        ) : (
          <RenderedEntry entry={entry} />
        )}
      </div>
    </div>
  )
}

// ---- DropZone ----

function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-16 cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-400 bg-blue-950/30'
          : 'border-zinc-600 hover:border-zinc-400 bg-zinc-900'
      }`}
    >
      <svg className="w-12 h-12 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-zinc-300 text-lg font-medium">Drop a .jsonl file here</p>
      <p className="text-zinc-500 text-sm">or</p>
      <label className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm cursor-pointer transition-colors">
        Browse file
        <input type="file" accept=".jsonl" className="hidden" onChange={handleChange} />
      </label>
    </div>
  )
}

// ---- App ----

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [draggingOver, setDraggingOver] = useState(false)
  const dragCounter = useRef(0)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setResult(parseJsonl(file.name, text))
    }
    reader.readAsText(file)
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current++
    setDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDraggingOver(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current = 0
    setDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleHeaderFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {draggingOver && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-blue-400 rounded-2xl px-20 py-12 text-blue-300 text-xl font-medium">
            Drop to open
          </div>
        </div>
      )}

      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">Claude JSONL Viewer</span>
          {result && (
            <span className="text-xs text-zinc-500 font-mono">{result.filename}</span>
          )}
        </div>
        {result && (
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>{result.entries.length} entries</span>
            {result.errors.length > 0 && (
              <span className="text-yellow-500">{result.errors.length} parse errors</span>
            )}
            <label className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs cursor-pointer">
              Open file
              <input type="file" accept=".jsonl" className="hidden" onChange={handleHeaderFileChange} />
            </label>
            <button
              onClick={() => setResult(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
            >
              Close
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!result ? (
          <DropZone onFile={handleFile} />
        ) : (
          <div className="flex flex-col gap-3">
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-yellow-700 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-400">
                {result.errors.length} line{result.errors.length !== 1 ? 's' : ''} could not be parsed (lines:{' '}
                {result.errors.map((e) => e.line).join(', ')})
              </div>
            )}
            {result.entries.map((entry, i) => (
              <EntryCard key={i} entry={entry} index={i} />
            ))}
            {result.entries.length === 0 && (
              <p className="text-zinc-500 text-center py-16">No entries found in this file.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
