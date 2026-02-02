'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Match = {
  id: string
  compatibility_score: number
  match_status: string
  suggested_ice_breakers: string[]
  created_at: string
  profile_a: {
    id: string
    display_name: string
    age: number
    bio: string
    interests: string[]
  }
  profile_b: {
    id: string
    display_name: string
    age: number
    bio: string
    interests: string[]
  }
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const userId = 'demo-user'

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/match', {
        headers: {
          'x-user-id': userId,
        },
      })
      const data = await res.json()
      setMatches(data.matches || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewMatch = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      })
      await res.json()
      await fetchMatches()
    } catch (error) {
      console.error('Error creating match:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMatchStatus = async (matchId: string, action: 'approve' | 'pass') => {
    try {
      await fetch(`/api/match/${matchId}`, {
        method: 'PUT',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })
      await fetchMatches()
      setSelectedMatch(null)
    } catch (error) {
      console.error('Error updating match:', error)
    }
  }

  const getOtherProfile = (match: Match) => {
    return match.profile_a.id !== 'demo-profile-id' ? match.profile_a : match.profile_b
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-violet-50">
      <nav className="border-b border-rose-100/50 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-8 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-3xl">🦞</span>
            <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
              moltmate
            </span>
          </Link>
          <div />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-8 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 bg-clip-text text-transparent mb-2">
              Your Matches
            </h1>
            <p className="text-gray-600">Review compatibility reports and connect with matches</p>
          </div>
          <button
            onClick={createNewMatch}
            disabled={loading}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Finding...' : '🔍 Find New Match'}
          </button>
        </div>

        {loading && matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🦞</div>
            <p className="text-lg text-gray-600">Loading your matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-rose-100 shadow-sm">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No matches yet</h2>
            <p className="text-gray-600 mb-6">Click "Find New Match" to let your bot start mingling!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((match) => {
              const otherProfile = getOtherProfile(match)

              return (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100 hover:shadow-md hover:border-rose-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      {otherProfile.display_name}
                    </h3>
                    <div className="text-sm text-gray-500">{otherProfile.age}</div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                        {match.compatibility_score}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Compatibility</div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{otherProfile.bio}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {otherProfile.interests?.slice(0, 3).map((interest: string) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs font-medium text-gray-500">
                    Status: <span className="text-rose-600">{match.match_status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedMatch && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={() => setSelectedMatch(null)}
          >
            <div
              className="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  {getOtherProfile(selectedMatch).display_name}
                </h2>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-8">
                <div className="text-5xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {selectedMatch.compatibility_score}%
                </div>
                <div className="text-gray-500">Overall Compatibility</div>
              </div>

              {selectedMatch.suggested_ice_breakers && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-3 text-rose-700">💬 Ice Breaker Ideas</h3>
                  <ul className="space-y-2">
                    {selectedMatch.suggested_ice_breakers.map((breaker: string, i: number) => (
                      <li key={i} className="text-gray-600 text-sm">• {breaker}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => updateMatchStatus(selectedMatch.id, 'approve')}
                  className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  ✓ Approve Match
                </button>
                <button
                  onClick={() => updateMatchStatus(selectedMatch.id, 'pass')}
                  className="flex-1 px-6 py-3 rounded-full border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  ✕ Pass
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
