'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Account() {
  const router = useRouter()
  const [utente, setUtente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => { caricaUtente() }, [])

  async function caricaUtente() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUtente(user)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function mostraToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', background: '#faf8f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#9a9a90' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
        <div>Caricamento...</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#1a7a4a', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0
          }}>
            {utente?.user_metadata?.nome?.[0]?.toUpperCase() || '👤'}
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a1a18', marginBottom: '4px' }}>
              {utente?.user_metadata?.nome || 'Il mio account'}
            </h1>
            <div style={{ fontSize: '0.88rem', color: '#9a9a90' }}>{utente?.email}</div>
          </div>
        </div>

        {/* INFO ACCOUNT */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e6de' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a18' }}>👤 Informazioni account</span>
          </div>

          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#9a9a90' }}>Email</span>
              <span style={{ fontSize: '0.85rem', color: '#1a1a18', fontWeight: '500' }}>{utente?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#9a9a90' }}>Account creato</span>
              <span style={{ fontSize: '0.85rem', color: '#1a1a18' }}>
                {new Date(utente?.created_at).toLocaleDateString('it-IT')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: '0.85rem', color: '#9a9a90' }}>Piano</span>
              <span style={{ background: '#e8f5ee', color: '#1a7a4a', fontSize: '0.78rem', fontWeight: '600', padding: '2px 10px', borderRadius: '20px' }}>
                Gratuito
              </span>
            </div>
          </div>
        </div>

        {/* LINK RAPIDI */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e6de' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a18' }}>🔗 Accesso rapido</span>
          </div>
          {[
            { href: '/lista-spesa', icon: '🛒', label: 'Lista della spesa', desc: 'Gestisci la tua lista' },
            { href: '/cerca', icon: '🔍', label: 'Cerca prodotti', desc: 'Trova il miglior prezzo' },
            { href: '/volantini', icon: '📄', label: 'Volantini', desc: 'Sfoglia le offerte' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 20px', borderBottom: '1px solid #f5f5f0',
                transition: 'background 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faf8'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{item.label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9a9a90' }}>{item.desc}</div>
                </div>
                <span style={{ color: '#9a9a90', fontSize: '0.9rem' }}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '13px',
            background: 'white', color: '#ef4444',
            border: '1.5px solid #ffcdd2', borderRadius: '10px',
            fontSize: '0.95rem', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'system-ui'
          }}>
          🚪 Esci dall&apos;account
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/" style={{ color: '#9a9a90', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Torna alla homepage
          </Link>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#1a1a18', color: 'white',
          padding: '12px 18px', borderRadius: '10px',
          fontSize: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}