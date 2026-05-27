import { useState, useCallback, DragEvent, ChangeEvent } from 'react'

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

function EntryCard({ entry, index }: { entry: unknown; index: number }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 text-xs text-zinc-500 font-mono">
        #{index + 1}
      </div>
      <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
        {JSON.stringify(entry, null, 2)}
      </pre>
    </div>
  )
}

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setResult(parseJsonl(file.name, text))
    }
    reader.readAsText(file)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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
