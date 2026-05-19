'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Registrati() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)

  async function handleRegistrazione(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')

    if (password !== confermaPassword) {
      setErrore('Le password non coincidono')
      return
    }

    if (password.length < 6) {
      setErrore('La password deve essere di almeno 6 caratteri')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome }
      }
    })

    if (error) {
      setErrore(error.message === 'User already registered'
        ? 'Questa email è già registrata'
        : error.message)
      setLoading(false)
      return
    }

    // Se l'email confirmation è disabilitata, vai direttamente alla home
    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    setSuccesso(true)
    setLoading(false)
  }

  if (successo) {
    return (
      <div style={{
        fontFamily: 'system-ui, sans-serif', background: '#faf8f3',
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📧</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a1a18', marginBottom: '10px' }}>
            Controlla la tua email!
          </h2>
          <p style={{ color: '#5a5a52', fontSize: '0.9rem', marginBottom: '24px' }}>
            Abbiamo inviato un link di conferma a <strong>{email}</strong>.
            Clicca il link per attivare il tuo account.
          </p>
          <Link href="/login" style={{
            background: '#1a7a4a', color: 'white', padding: '12px 24px',
            borderRadius: '10px', textDecoration: 'none', fontWeight: '600'
          }}>
            Vai al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif', background: '#faf8f3',
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px'
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
            Crea il tuo account gratuito
          </div>
        </div>

        {/* FORM */}
        <div style={{
          background: 'white', border: '1.5px solid #e8e6de',
          borderRadius: '16px', padding: '28px'
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

          <form onSubmit={handleRegistrazione}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: '600',
                color: '#5a5a52', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Il tuo nome"
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: '600',
                color: '#5a5a52', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Email *</label>
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: '600',
                color: '#5a5a52', marginBottom: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
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
              }}>Conferma password *</label>
              <input
                type="password"
                value={confermaPassword}
                onChange={e => setConfermaPassword(e.target.value)}
                placeholder="Ripeti la password"
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
                fontFamily: 'system-ui'
              }}>
              {loading ? '⏳ Registrazione...' : 'Crea account gratuito'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: '20px',
            fontSize: '0.88rem', color: '#9a9a90'
          }}>
            Hai già un account?{' '}
            <Link href="/login" style={{ color: '#1a7a4a', fontWeight: '600', textDecoration: 'none' }}>
              Accedi
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