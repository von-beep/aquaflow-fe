import { useCallback, useEffect, useState } from 'react'
import { formatDateTime } from '@/domain/dates'
import { ChatThread } from '@/features/chat/ChatThread'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function ChatPage() {
  const { session } = useAquaFlow()
  const token = session.token
  const apiBaseUrl = session.apiBaseUrl

  const [conversations, setConversations] = useState<api.ChatConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<api.ChatMessage[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  const refreshList = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.listStationChatConversations(apiBaseUrl, token)
      setConversations(res.conversations)
      setListError(null)
      setSelectedId((prev) => {
        if (prev && res.conversations.some((c) => c.id === prev)) return prev
        return res.conversations[0]?.id ?? null
      })
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to load chats')
    } finally {
      setLoadingList(false)
    }
  }, [apiBaseUrl, token])

  const refreshThread = useCallback(
    async (conversationId: string) => {
      if (!token) return
      setLoadingThread(true)
      setThreadError(null)
      try {
        const res = await api.listStationChatMessages(
          apiBaseUrl,
          token,
          conversationId,
        )
        setMessages(res.messages)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...res.conversation, unreadCount: 0 }
              : c,
          ),
        )
      } catch (err: unknown) {
        setThreadError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load messages',
        )
      } finally {
        setLoadingThread(false)
      }
    },
    [apiBaseUrl, token],
  )

  useEffect(() => {
    if (!token) {
      setLoadingList(false)
      return
    }
    void refreshList()
    const id = window.setInterval(() => {
      void refreshList()
    }, 15_000)
    return () => window.clearInterval(id)
  }, [token, refreshList])

  useEffect(() => {
    if (!token || !selectedId) {
      setMessages([])
      return
    }
    void refreshThread(selectedId)
    const id = window.setInterval(() => {
      void refreshThread(selectedId)
    }, 8_000)
    return () => window.clearInterval(id)
  }, [token, selectedId, refreshThread])

  async function onSend(body: string) {
    if (!token || !selectedId) return
    setThreadError(null)
    try {
      const res = await api.sendStationChatMessage(
        apiBaseUrl,
        token,
        selectedId,
        body,
      )
      setMessages((prev) => [...prev, res.message])
      void refreshList()
    } catch (err: unknown) {
      setThreadError(
        err instanceof Error ? err.message : 'Failed to send message',
      )
      throw err
    }
  }

  if (!token) {
    return (
      <>
        <div className="pagehead">
          <div>
            <h2>Chat</h2>
            <div className="sub">Message customers about their orders</div>
          </div>
        </div>
        <div className="card">
          <div className="card-b">
            <p style={{ fontSize: 13, color: 'var(--ink2)' }}>
              Sign in to view and reply to customer chats.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Chat</h2>
          <div className="sub">
            Order chats with customers · one thread per customer · kept for 30 days
          </div>
        </div>
      </div>

      <div className="chat-layout">
        <div className="card chat-inbox">
          <div className="card-h">
            <h3>Inbox</h3>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            {loadingList && conversations.length === 0 ? (
              <p className="chat-inbox-empty">Loading…</p>
            ) : listError ? (
              <p className="chat-inbox-empty" style={{ color: 'var(--red)' }}>
                {listError}
              </p>
            ) : conversations.length === 0 ? (
              <p className="chat-inbox-empty">
                No chats yet. Customers can message you from Chat Station on the landing page.
              </p>
            ) : (
              <ul className="chat-inbox-list">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`chat-inbox-item${c.id === selectedId ? ' active' : ''}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <div className="chat-inbox-top">
                        <b>{c.consumerName || 'Customer'}</b>
                        {c.unreadCount > 0 ? (
                          <span className="chat-unread">{c.unreadCount}</span>
                        ) : null}
                      </div>
                      <div className="chat-inbox-meta">
                        {c.consumerPhone ? `${c.consumerPhone} · ` : ''}
                        {c.lastMessageAt ? formatDateTime(c.lastMessageAt) : ''}
                      </div>
                      <div className="chat-inbox-preview">
                        {c.lastMessagePreview || 'No messages yet'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card chat-panel">
          <div className="card-h">
            <h3>
              {selected
                ? `${selected.consumerName || 'Customer'}${selected.consumerPhone ? ` · ${selected.consumerPhone}` : ''}`
                : 'Conversation'}
            </h3>
          </div>
          <div className="card-b" style={{ padding: 0, minHeight: 360 }}>
            {!selected ? (
              <p className="chat-inbox-empty">Select a conversation</p>
            ) : loadingThread && messages.length === 0 ? (
              <p className="chat-inbox-empty">Loading messages…</p>
            ) : (
              <ChatThread
                messages={messages}
                selfType="station"
                error={threadError}
                onSend={onSend}
                emptyHint="No messages yet — wait for the customer or send the first reply."
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
