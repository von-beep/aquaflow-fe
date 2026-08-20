/** Online checkout prepaid (any method except Cash / empty). */
export function isOnlinePrepaid(payMode: string | null | undefined): boolean {
  const m = (payMode ?? '').trim()
  return Boolean(m) && m !== 'Cash'
}
