/** Extracts the consumer-provided reason from a delivery note. */
export function customerCancelReason(note: string): string | null {
  const marker = 'Cancelled by customer: '
  const idx = note.indexOf(marker)
  if (idx < 0) return null
  const reason = note.slice(idx + marker.length).trim()
  return reason || null
}

export function isCustomerCancelled(note: string): boolean {
  return note.includes('Cancelled by customer')
}
