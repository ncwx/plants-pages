'use client'

import { useState } from 'react'
import { useSearchParams} from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom') || '/'

  const sendMagicLink = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `http://localhost:3000/auth/callback?next=${encodeURIComponent(redirectedFrom)}`,
      },
    })

    setMessage(error ? error.message : 'Check your email for the login link.')
    setLoading(false)
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h1>Login</h1>

      <label>
        Email
        <input
          style={{ display: 'block', width: '100%', marginTop: 8, padding: 10 }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <button
        style={{ marginTop: 12, padding: 10, width: '100%' }}
        onClick={sendMagicLink}
        disabled={loading || !email}
      >
        {loading ? 'Sending…' : 'Send magic link'}
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  )
}