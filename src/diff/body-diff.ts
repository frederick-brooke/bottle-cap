import type { DiffSummary, DiffDetail } from './types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function tryParseJson(text: string): { parsed: unknown; valid: boolean } {
  try {
    return { parsed: JSON.parse(text), valid: true }
  } catch {
    return { parsed: null, valid: false }
  }
}

function computeDiff(
  original: unknown,
  replayed: unknown,
  path: string[],
  details: DiffDetail[],
  depth: number,
  maxDepth: number,
): { added: number; removed: number; changed: number } {
  let added = 0
  let removed = 0
  let changed = 0

  if (depth >= maxDepth) {
    if (JSON.stringify(original) !== JSON.stringify(replayed)) {
      changed++
      details.push({ path: path.join('.'), kind: 'edited', lhs: original, rhs: replayed })
    }
    return { added, removed, changed }
  }

  const origObj = isPlainObject(original)
  const repObj = isPlainObject(replayed)
  const origArr = Array.isArray(original)
  const repArr = Array.isArray(replayed)

  if (origObj && repObj) {
    const allKeys = new Set([...Object.keys(original as Record<string, unknown>), ...Object.keys(replayed as Record<string, unknown>)])
    for (const key of allKeys) {
      const inOrig = key in (original as Record<string, unknown>)
      const inReplayed = key in (replayed as Record<string, unknown>)
      if (inOrig && !inReplayed) {
        removed++
        details.push({ path: [...path, key].join('.'), kind: 'removed', lhs: (original as Record<string, unknown>)[key] })
      } else if (!inOrig && inReplayed) {
        added++
        details.push({ path: [...path, key].join('.'), kind: 'added', rhs: (replayed as Record<string, unknown>)[key] })
      } else {
        const sub = computeDiff(
          (original as Record<string, unknown>)[key],
          (replayed as Record<string, unknown>)[key],
          [...path, key],
          details,
          depth + 1,
          maxDepth,
        )
        added += sub.added
        removed += sub.removed
        changed += sub.changed
      }
    }
  } else if (origArr && repArr) {
    const maxLen = Math.max(original.length, replayed.length)
    for (let i = 0; i < maxLen; i++) {
      if (i >= original.length) {
        added++
        details.push({ path: [...path, String(i)].join('.'), kind: 'added', rhs: replayed[i] })
      } else if (i >= replayed.length) {
        removed++
        details.push({ path: [...path, String(i)].join('.'), kind: 'removed', lhs: original[i] })
      } else {
        const sub = computeDiff(original[i], replayed[i], [...path, String(i)], details, depth + 1, maxDepth)
        added += sub.added
        removed += sub.removed
        changed += sub.changed
      }
    }
  } else if (original !== replayed) {
    changed++
    details.push({ path: path.join('.'), kind: 'edited', lhs: original, rhs: replayed })
  }

  return { added, removed, changed }
}

export function diffBody(
  originalBody: string | null,
  replayedBody: string | null,
  maxDepth: number = 64,
): DiffSummary {
  const details: DiffDetail[] = []

  if (originalBody === null && replayedBody === null) {
    return { added: 0, removed: 0, changed: 0, details }
  }

  if (originalBody === null && replayedBody !== null) {
    return { added: 0, removed: 0, changed: 1, details: [{ path: '', kind: 'edited', lhs: null, rhs: replayedBody }] }
  }

  if (originalBody !== null && replayedBody === null) {
    return { added: 0, removed: 0, changed: 1, details: [{ path: '', kind: 'edited', lhs: originalBody, rhs: null }] }
  }

  const origParsed = tryParseJson(originalBody!)
  const repParsed = tryParseJson(replayedBody!)

  if (origParsed.valid && repParsed.valid) {
    const counts = computeDiff(origParsed.parsed, repParsed.parsed, [], details, 0, maxDepth)
    return { ...counts, details }
  }

  if (originalBody === replayedBody) {
    return { added: 0, removed: 0, changed: 0, details }
  }

  return { added: 0, removed: 0, changed: 1, details: [{ path: '', kind: 'edited', lhs: originalBody, rhs: replayedBody }] }
}
