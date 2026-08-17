import { emptyStationState, seed } from '@/domain/seed'
import {
  isAquaFlowState,
  normalizeSettings,
  STORAGE_KEY,
  type AquaFlowState,
} from '@/domain/types'

export function stationStorageKey(stationId: string): string {
  return `${STORAGE_KEY}:${stationId}`
}

function parseState(raw: string | null): AquaFlowState | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isAquaFlowState(parsed)) {
      return { ...parsed, settings: normalizeSettings(parsed.settings) }
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Active workspace (legacy key). Prefer station-scoped helpers when signed in. */
export function loadState(): AquaFlowState {
  const fromActive = parseState(localStorage.getItem(STORAGE_KEY))
  if (fromActive) return fromActive
  const initial = seed()
  saveState(initial)
  return initial
}

export function saveState(state: AquaFlowState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Per-station workspace — prevents CoyTubig data bleeding into CurtTubig. */
export function loadStateForStation(stationId: string): AquaFlowState | null {
  return parseState(localStorage.getItem(stationStorageKey(stationId)))
}

export function saveStateForStation(stationId: string, state: AquaFlowState): void {
  localStorage.setItem(stationStorageKey(stationId), JSON.stringify(state))
}

export function workspaceForStation(
  stationId: string,
  stationName: string,
): AquaFlowState {
  const scoped = loadStateForStation(stationId)
  if (scoped) {
    return {
      ...scoped,
      settings: {
        ...scoped.settings,
        stationName: stationName || scoped.settings.stationName,
      },
    }
  }
  return emptyStationState(stationName)
}

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
