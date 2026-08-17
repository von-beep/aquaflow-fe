import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { ChatThread } from '@/features/chat/ChatThread'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'

type Props = {
  open: boolean
  apiBaseUrl: string
  token: string
  stationId: string
  stationName: string
  onClose: () => void
}

export function ConsumerChatModal({
  open,
  apiBaseUrl,
  token,
  stationId,
  stationName,
  onClose,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<api.ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadThread = useCallback(
    async (convId: string) => {
      const res = await api.listConsumerChatMessages(apiBaseUrl, token, convId)
      setMessages(res.messages)
      setConversationId(res.conversation.id)
    },
    [apiBaseUrl, token],
  )

  useEffect(() => {
    if (!open || !stationId) {
      setConversationId(null)
      setMessages([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void api
      .openConsumerChatConversation(apiBaseUrl, token, stationId)
      .then(async (res) => {
        if (cancelled) return
        setConversationId(res.conversation.id)
        await loadThread(res.conversation.id)
        if (!cancelled) setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to open chat',
        )
      })

    return () => {
      cancelled = true
    }
  }, [open, apiBaseUrl, token, stationId, loadThread])

  useEffect(() => {
    if (!open || !conversationId) return
    const id = window.setInterval(() => {
      void loadThread(conversationId).catch(() => {
        /* keep current messages */
      })
    }, 8_000)
    return () => window.clearInterval(id)
  }, [open, conversationId, loadThread])

  async function onSend(body: string) {
    if (!conversationId) return
    setError(null)
    try {
      const res = await api.sendConsumerChatMessage(
        apiBaseUrl,
        token,
        conversationId,
        body,
      )
      setMessages((prev) => [...prev, res.message])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
      throw err
    }
  }

  return (
    <Modal
      title={`Chat · ${stationName}`}
      open={open}
      onClose={onClose}
      cancelLabel="Close"
      elevated
    >
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
        One chat with this station · messages kept for 30 days after the last reply.
      </p>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink2)' }}>Opening chat…</p>
      ) : (
        <ChatThread
          messages={messages}
          selfType="consumer"
          error={error}
          busy={!conversationId}
          onSend={onSend}
          emptyHint="Ask the station about delivery, address, or payment."
        />
      )}
    </Modal>
  )
}
