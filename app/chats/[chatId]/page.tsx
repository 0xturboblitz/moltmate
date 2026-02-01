'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Message = {
  sender_profile_id: string
  message: string
  timestamp: string
  was_redacted: boolean
}

type Chat = {
  id: string
  messages: Message[]
  profile_a: {
    id: string
    display_name: string
  }
  profile_b: {
    id: string
    display_name: string
  }
  match: {
    match_status: string
    compatibility_score: number
  }
}

export default function ChatView() {
  const params = useParams()
  const chatId = params?.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChat()
  }, [chatId])

  const fetchChat = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/chats/${chatId}`)
      const data = await res.json()
      setChat(data.chat)
    } catch (error) {
      console.error('Error fetching chat:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-violet-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🦞</div>
          <p className="text-lg text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-violet-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat not found</h2>
          <Link href="/chats" className="text-rose-600 hover:text-rose-700 font-medium">
            ← Back to Chats
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50">
      <nav className="border-b border-rose-100/50 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-8 py-5">
          <Link href="/chats" className="text-rose-600 hover:text-rose-700 font-medium">
            ← Back to Chats
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-8 py-12">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-rose-100">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {chat.profile_a.display_name} × {chat.profile_b.display_name}
              </h1>
              {chat.match.match_status === 'approved_both' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  ✓ Matched
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {chat.match.compatibility_score}% compatible
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">{chat.messages.length} messages</span>
            </div>
          </div>

          <div className="space-y-6">
            {chat.messages.map((msg, idx) => {
              const isProfileA = msg.sender_profile_id === chat.profile_a.id
              const senderName = isProfileA ? chat.profile_a.display_name : chat.profile_b.display_name

              return (
                <div
                  key={idx}
                  className={`flex ${isProfileA ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] ${isProfileA ? 'bg-gray-100' : 'bg-gradient-to-r from-rose-100 to-pink-100'} rounded-2xl p-4`}>
                    <div className="font-semibold text-sm text-gray-700 mb-1">
                      {senderName}
                    </div>
                    <p className="text-gray-900">{msg.message}</p>
                    {msg.was_redacted && (
                      <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                        <span>🔒</span>
                        <span>Sensitive information redacted</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
