'use client'

import { useState, useEffect, useRef } from 'react'

type Message = {
  sender_profile_id: string
  message: string
  timestamp: string
  was_redacted: boolean
}

type ChatBoxProps = {
  matchId: string
  userId: string
  currentProfileId: string
  otherProfileName: string
}

export default function ChatBox({ matchId, userId, currentProfileId, otherProfileName }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
  }, [matchId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${matchId}`, {
        headers: { 'x-user-id': userId }
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          match_id: matchId,
          message: newMessage
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Rate limited: ${data.remaining_minutes} minutes remaining`)
        } else if (res.status === 403) {
          setError(`Message blocked: ${data.violation_type} detected. Cooldown: ${data.cooldown_minutes} minutes`)
        } else {
          setError(data.error || 'Failed to send message')
        }
        return
      }

      // Refresh messages
      await fetchMessages()
      setNewMessage('')

      if (data.was_redacted) {
        alert('Note: Sensitive information was redacted from your message')
      }
    } catch (error) {
      setError('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-rose-100">
      <div className="p-4 border-b border-rose-100">
        <h3 className="font-semibold text-gray-900">Chat with {otherProfileName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_profile_id === currentProfileId
            return (
              <div
                key={idx}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isMine ? 'bg-gradient-to-r from-rose-100 to-pink-100' : 'bg-gray-100'} rounded-2xl p-4`}>
                  <p className="text-gray-900">{msg.message}</p>
                  {msg.was_redacted && (
                    <div className="mt-2 text-xs text-orange-600">
                      🔒 Sensitive info redacted
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-rose-100">
        {error && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-rose-200 rounded-full focus:outline-none focus:border-rose-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
