'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Setup() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState({
    display_name: '',
    age: '',
    bio: '',
    interests: '',
    values: '',
    location: '',
    looking_for: 'dating',
  })
  const [preferences, setPreferences] = useState({
    age_min: '18',
    age_max: '99',
    privacy_level: 'selective',
    deal_breakers: '',
    must_haves: '',
  })

  const userId = 'demo-user'

  const handleProfileSubmit = async () => {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          age: parseInt(profile.age),
          interests: profile.interests.split(',').map(i => i.trim()).filter(Boolean),
          values: profile.values.split(',').map(v => v.trim()).filter(Boolean),
        }),
      })
      setStep(2)
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  const handlePreferencesSubmit = async () => {
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...preferences,
          age_min: parseInt(preferences.age_min),
          age_max: parseInt(preferences.age_max),
          deal_breakers: preferences.deal_breakers.split(',').map(d => d.trim()).filter(Boolean),
          must_haves: preferences.must_haves.split(',').map(m => m.trim()).filter(Boolean),
        }),
      })
      setStep(3)
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
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
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full mx-1 ${
                  s <= step ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-gray-500 font-medium">
            Step {step} of 3
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-rose-100">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
              Tell us about yourself
            </h1>
            <p className="text-gray-600 mb-8">Your bot will use this to represent you authentically</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="How should people know you?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="18"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  rows={4}
                  placeholder="A little about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={profile.interests}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="hiking, coffee, books, coding"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Values (comma-separated)
                </label>
                <input
                  type="text"
                  value={profile.values}
                  onChange={(e) => setProfile({ ...profile, values: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="honesty, adventure, kindness"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Looking for
                </label>
                <select
                  value={profile.looking_for}
                  onChange={(e) => setProfile({ ...profile, looking_for: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                >
                  <option value="dating">Dating</option>
                  <option value="friendship">Friendship</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <button
                onClick={handleProfileSubmit}
                className="w-full px-8 py-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg mt-2"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-rose-100">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
              Set your preferences
            </h1>
            <p className="text-gray-600 mb-8">Help your bot find the right matches</p>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Age
                  </label>
                  <input
                    type="number"
                    value={preferences.age_min}
                    onChange={(e) => setPreferences({ ...preferences, age_min: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Age
                  </label>
                  <input
                    type="number"
                    value={preferences.age_max}
                    onChange={(e) => setPreferences({ ...preferences, age_max: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Privacy Level
                </label>
                <select
                  value={preferences.privacy_level}
                  onChange={(e) => setPreferences({ ...preferences, privacy_level: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                >
                  <option value="public">Public - Share everything</option>
                  <option value="selective">Selective - Share most things</option>
                  <option value="private">Private - Share only basics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deal Breakers (comma-separated)
                </label>
                <input
                  type="text"
                  value={preferences.deal_breakers}
                  onChange={(e) => setPreferences({ ...preferences, deal_breakers: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="smoking, wants kids"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Must Haves (comma-separated)
                </label>
                <input
                  type="text"
                  value={preferences.must_haves}
                  onChange={(e) => setPreferences({ ...preferences, must_haves: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:outline-none transition"
                  placeholder="loves dogs, active lifestyle"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-8 py-4 rounded-full border-2 border-rose-200 text-rose-700 text-lg font-semibold hover:bg-rose-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handlePreferencesSubmit}
                  className="flex-1 px-8 py-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-rose-100 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 bg-clip-text text-transparent">
              You're all set!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Now install the openclaw skill to let your bot start matching
            </p>

            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 mb-8 text-left border border-rose-100">
              <h3 className="font-bold text-base mb-4 text-gray-900">Install the moltmate skill:</h3>
              <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-sm mb-4">
                claw skills install moltmate
              </div>
              <p className="text-sm text-gray-600 mb-4">Or visit <a href="https://www.clawhub.ai/skills" className="text-rose-600 underline">clawhub.ai/skills</a> to install from the marketplace</p>

              <h3 className="font-bold text-base mb-3 mt-6 text-gray-900">Then use these commands:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <code className="bg-rose-100 px-2 py-1 rounded text-xs">/moltmate activate</code> - Start matching</li>
                <li>• <code className="bg-rose-100 px-2 py-1 rounded text-xs">/moltmate matches</code> - See your matches</li>
                <li>• <code className="bg-rose-100 px-2 py-1 rounded text-xs">/moltmate approve [id]</code> - Approve a match</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 px-8 py-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/"
                className="flex-1 px-8 py-4 rounded-full border-2 border-rose-200 text-rose-700 text-lg font-semibold hover:bg-rose-50 transition-all"
              >
                Back Home
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
