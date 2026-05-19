'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    catene: 0, prodotti: 0, volantini: 0, prezzi: 0
  })
  const [loading, setLoading] = useState(true)
  const [attivita, setAttivita] = useState<any[]>([])

  useEffect(() => {
    caricaStats()
  }, [])

  async function caricaStats() {
    setLoading(true)
    try {
      const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }] = await Promise.all([
        supabase.from('catene').select('*', { count: 'exact', head: true }),
        supabase.from('prodotti').select('*', { count: 'exact', head: true }),
        supabase.from('volantini').select('*', { count: 'exact', head: true }),
        supabase.from('prezzi').select('*', { count: 'exact', head: true }),
      ])
      setStats({ catene: c1 || 0, prodotti: c2 || 0, volantini: c3 || 0, prezzi: c4 || 0 })

      // Ultimi prodotti inseriti
      const { data } = await supabase
        .from('prodotti')
        .select('*, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      setAttivita(data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const statCards = [
    { label: 'Catene', value: stats.catene, icon: '🏬', color: '#1a7a4a', bg: '#e8f5ee' },
    { label: 'Prodotti', value: stats.prodotti, icon: '📦', color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Volantini', value: stats.volantini, icon: '📄', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Prezzi', value: stats.prezzi, icon: '💰', color: '#ef4444', bg: '#fef2f2' },
  ]

  const navItems = [
    { href: '/admin/prodotti', icon: '📦', label: 'Gestisci Prodotti', desc: 'Aggiungi, modifica, elimina prodotti' },
    { href: '/admin/volantini', icon: '📄', label: 'Gestisci Volantini', desc: 'Carica volantini e prezzi' },
    { href: '/admin/parser', icon: '✦', label: 'AI Parser Volantini', desc: 'Carica volantino e estrai prodotti con AI' },
    { href: '/', icon: '🌐', label: 'Vai al sito', desc: 'Visualizza la homepage pubblica' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' }}>

      {/* TOPBAR */}
      <div style={{
        background: '#161b27', borderBottom: '1px solid #2a3045',
        padding: '0 28px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '1rem' }}>▲ SpesaSmart</span>
          <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Admin</span>
        </div>
        <div style={{
          background: '#22c55e22', color: '#22c55e',
          padding: '4px 12px', borderRadius: '20px',
          fontSize: '0.75rem', fontWeight: '600'
        }}>
          🟢 Database connesso
        </div>
      </div>

      <div style={{ padding: '32px 28px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>Dashboard</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '32px' }}>
          Benvenuto nell&apos;admin panel di SpesaSmart
        </p>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '32px' }}>
          {statCards.map(s => (
            <div key={s.label} style={{
              background: '#161b27', border: '1px solid #2a3045',
              borderRadius: '10px', padding: '20px',
              borderTop: `2px solid ${s.color}`
            }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', marginBottom: '10px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#e2e8f0' }}>
                {loading ? '...' : s.value}
              </div>
              <div style={{ fontSize: '1.2rem', marginTop: '4px' }}>{s.icon}</div>
            </div>
          ))}
        </div>

        {/* NAV CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#161b27', border: '1px solid #2a3045',
                borderRadius: '10px', padding: '20px', cursor: 'pointer',
                transition: 'border-color 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a3045'}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{item.icon}</div>
                <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* ULTIMI PRODOTTI */}
        <div style={{ background: '#161b27', border: '1px solid #2a3045', borderRadius: '10px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a3045', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>📦 Ultimi prodotti inseriti</span>
            <Link href="/admin/prodotti" style={{ fontSize: '0.78rem', color: '#22c55e', textDecoration: 'none' }}>
              Vedi tutti →
            </Link>
          </div>
          {attivita.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📭</div>
              <div>Nessun prodotto ancora. <Link href="/admin/prodotti" style={{ color: '#22c55e' }}>Aggiungi il primo →</Link></div>
            </div>
          ) : (
            attivita.map((p: any) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 20px', borderBottom: '1px solid #2a3045'
              }}>
                <span style={{ fontSize: '1.4rem' }}>{p.emoji || '🛒'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: '500', color: '#e2e8f0' }}>{p.nome}</div>
                  <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>{p.marca} · {p.categoria}</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#4a5568' }}>
                  {new Date(p.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
