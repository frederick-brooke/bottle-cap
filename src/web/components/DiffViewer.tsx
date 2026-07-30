'use client'

import { useState } from 'react'

interface DiffViewerProps {
  originalBody: string | null
  replayedBody: string | null
}

interface DiffLine {
  type: 'same' | 'added' | 'removed'
  content: string
  lineNumber?: number
}

function parseJsonLines(text: string): string[] {
  try {
    const obj = JSON.parse(text)
    return JSON.stringify(obj, null, 2).split('\n')
  } catch {
    return text.split('\n')
  }
}

function computeDiff(originalLines: string[], replayedLines: string[]): DiffLine[] {
  const result: DiffLine[] = []

  let i = 0
  let j = 0

  while (i < originalLines.length || j < replayedLines.length) {
    const origLine = i < originalLines.length ? originalLines[i] : undefined
    const replLine = j < replayedLines.length ? replayedLines[j] : undefined

    if (origLine === undefined) {
      result.push({ type: 'added', content: replLine! })
      j++
    } else if (replLine === undefined) {
      result.push({ type: 'removed', content: origLine })
      i++
    } else if (origLine === replLine) {
      result.push({ type: 'same', content: origLine })
      i++
      j++
    } else {
      result.push({ type: 'removed', content: origLine })
      result.push({ type: 'added', content: replLine })
      i++
      j++
    }
  }

  return result
}

export function DiffViewer({ originalBody, replayedBody }: DiffViewerProps) {
  const [view, setView] = useState<'diff' | 'side'>('diff')

  if (!originalBody && !replayedBody) {
    return <p className="text-zinc-500 text-sm py-4 text-center">No body data available.</p>
  }

  if (!originalBody) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-500 text-sm">Original response body not available.</p>
        {replayedBody && (
          <pre className="mt-2 text-xs text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto">
            {replayedBody}
          </pre>
        )}
      </div>
    )
  }

  if (!replayedBody) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-500 text-sm">Replayed response body not available.</p>
        <pre className="mt-2 text-xs text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto">
          {originalBody}
        </pre>
      </div>
    )
  }

  const originalLines = parseJsonLines(originalBody)
  const replayedLines = parseJsonLines(replayedBody)
  const diff = computeDiff(originalLines, replayedLines)
  const hasChanges = diff.some(d => d.type !== 'same')

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
        <button
          onClick={() => setView('diff')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            view === 'diff' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Diff
        </button>
        <button
          onClick={() => setView('side')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            view === 'side' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Side by Side
        </button>
        {hasChanges && (
          <span className="text-xs text-amber-400 ml-auto">
            {diff.filter(d => d.type === 'added').length} additions, {diff.filter(d => d.type === 'removed').length} removals
          </span>
        )}
        {!hasChanges && (
          <span className="text-xs text-emerald-400 ml-auto">Bodies are identical</span>
        )}
      </div>

      {view === 'diff' ? (
        <div className="max-h-96 overflow-y-auto">
          {diff.map((line, i) => (
            <div
              key={i}
              className={`px-4 py-0.5 text-xs font-mono ${
                line.type === 'added' ? 'bg-emerald-900/30 text-emerald-300' :
                line.type === 'removed' ? 'bg-red-900/30 text-red-300' :
                'text-zinc-400'
              }`}
            >
              <span className="inline-block w-4 text-zinc-600 select-none">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              {line.content}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 max-h-96 overflow-y-auto">
          <div className="border-r border-zinc-800">
            <div className="px-4 py-1 text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-950">Original</div>
            {originalLines.map((line, i) => (
              <div key={i} className="px-4 py-0.5 text-xs font-mono text-zinc-400 hover:bg-zinc-800/50">
                {line}
              </div>
            ))}
          </div>
          <div>
            <div className="px-4 py-1 text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-950">Replayed</div>
            {replayedLines.map((line, i) => (
              <div key={i} className="px-4 py-0.5 text-xs font-mono text-zinc-400 hover:bg-zinc-800/50">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
