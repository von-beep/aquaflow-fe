import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatDateTime } from '@/domain/dates'
import type { ChatMessage } from '@/api/client'

type Props = {
  messages: ChatMessage[]
  selfType: 'consumer' | 'station'
  busy?: boolean
  error?: string | null
  onSend: (body: string) => Promise<void> | void
  emptyHint?: string
}

export function ChatThread({
  messages,
  selfType,
  busy = false,
  error = null,
  onSend,
  emptyHint = 'No messages yet — say hello.',
}: Props) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending || busy) return
    setSending(true)
    try {
      await onSend(body)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-thread">
      <div className="chat-thread-msgs" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-thread-empty">{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === selfType
            return (
              <div
                key={m.id}
                className={`chat-bubble-row${mine ? ' mine' : ''}`}
              >
                <div className={`chat-bubble${mine ? ' mine' : ''}`}>
                  <div className="chat-bubble-body">{m.body}</div>
                  <div className="chat-bubble-meta">{formatDateTime(m.createdAt)}</div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error ? <p className="chat-thread-error">{error}</p> : null}
      <form className="chat-thread-compose" onSubmit={(e) => void submit(e)}>
        <label className="sr-only" htmlFor="chat_draft">
          Message
        </label>
        <input
          id="chat_draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          disabled={sending || busy}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-blue"
          disabled={sending || busy || !draft.trim()}
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
