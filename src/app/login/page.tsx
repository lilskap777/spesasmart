'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrore('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrore(error.message === 'Invalid login credentials'
        ? 'Email o password errati'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      background: '#faf8f3',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '56px', height: '56px', background: '#1a7a4a',
              borderRadius: '16px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 12px'
            }}>🛒</div>
            <div style={{ fontWeight: '800', fontSize: '1.5rem', color: '#1a7a4a' }}>SpesaSmart</div>
          </Link>
          <div style={{ color: '#9a9a90', fontSize: '0.9rem', marginTop: '6px' }}>
            Accedi al tuo account
          </div>
        </div>

        {/* FORM */}
        <div style={{
          background: 'white',
          border: '1.5px solid #e8e6de',
          borderRadius: '16px',
          padding: '28px'
        }}>
          {errore && (
            <div style={{
              background: '#fff1f1', border: '1px solid #ffcdd2',
              borderRadius: '8px', padding: '12px 14px',
              color: '#d32f2f', fontSize: '0.85rem', marginBottom: '20px'
            }}>
              ❌ {errore}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: '600',
                color: '#5a5a52', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tuaemail@esempio.it"
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #e8e6de', borderRadius: '10px',
                  fontSize: '0.95rem', outline: 'none', fontFamily: 'system-ui',
                  color: '#1a1a18', background: '#faf8f3',
                  boxSizing: 'border-box' as const
                }}
                onFocus={e => e.target.style.borderColor = '#1a7a4a'}
                onBlur={e => e.target.style.borderColor = '#e8e6de'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: '600',
                color: '#5a5a52', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #e8e6de', borderRadius: '10px',
                  fontSize: '0.95rem', outline: 'none', fontFamily: 'system-ui',
                  color: '#1a1a18', background: '#faf8f3',
                  boxSizing: 'border-box' as const
                }}
                onFocus={e => e.target.style.borderColor = '#1a7a4a'}
                onBlur={e => e.target.style.borderColor = '#e8e6de'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#9a9a90' : '#1a7a4a',
                color: 'white', border: 'none',
                borderRadius: '10px', fontSize: '1rem',
                fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'system-ui', transition: 'background 0.2s'
              }}>
              {loading ? '⏳ Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: '20px',
            fontSize: '0.88rem', color: '#9a9a90'
          }}>
            Non hai un account?{' '}
            <Link href="/registrati" style={{ color: '#1a7a4a', fontWeight: '600', textDecoration: 'none' }}>
              Registrati gratis
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/" style={{ color: '#9a9a90', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Torna alla homepage
          </Link>
        </div>
      </div>
    </div>
  )
}