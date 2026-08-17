/** Extract GCash payment reference from a delivery note (online checkout). */
export function gcashReferenceFromNote(note: string): string | null {
  if (!note) return null
  const m = note.match(/GCash\s*ref\s*:?\s*(.+?)(?:\s*—|$)/i)
  const ref = m?.[1]?.trim()
  return ref || null
}
