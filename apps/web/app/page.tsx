'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Plants & Pages 🌱📚</h1>

      {user ? (
        <>
          <p>Logged in as: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
          <button
            onClick={async () => {
              const { data } = await supabase.auth.getSession()
              const token = data.session?.access_token
              if (!token) {
                alert('Not logged in')
                return
              }

              const res = await fetch('http://localhost:8000/whoami', {
                headers: { Authorization: `Bearer ${token}` },
              })

              const text = await res.text()
              alert(text)
            }}
          >
            Test /whoami
          </button>
        </>
      ) : (
        <>
          <p>You are not logged in.</p>
          <a href="/login">Go to Login</a>
        </>
      )}
    </div>
  )
}