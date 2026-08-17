import {
  CONSUMER_SESSION_KEY,
  defaultConsumerSession,
  type ConsumerSession,
} from '@/consumer/types'

export function loadConsumerSession(): ConsumerSession {
  try {
    const raw = localStorage.getItem(CONSUMER_SESSION_KEY)
    if (!raw) return defaultConsumerSession()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultConsumerSession()
    const o = parsed as Record<string, unknown>
    const token = typeof o.token === 'string' ? o.token : null
    const c = o.consumer
    if (!token || !c || typeof c !== 'object') return defaultConsumerSession()
    const consumer = c as Record<string, unknown>
    if (
      typeof consumer.id !== 'string' ||
      typeof consumer.email !== 'string' ||
      typeof consumer.name !== 'string'
    ) {
      return defaultConsumerSession()
    }
    return {
      token,
      consumer: {
        id: consumer.id,
        email: consumer.email,
        name: consumer.name,
        phone: typeof consumer.phone === 'string' ? consumer.phone : '',
      },
    }
  } catch {
    return defaultConsumerSession()
  }
}

export function saveConsumerSession(session: ConsumerSession): void {
  if (!session.token || !session.consumer) {
    localStorage.removeItem(CONSUMER_SESSION_KEY)
    return
  }
  localStorage.setItem(CONSUMER_SESSION_KEY, JSON.stringify(session))
}

export function clearConsumerSession(): void {
  localStorage.removeItem(CONSUMER_SESSION_KEY)
}
