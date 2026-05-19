'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Supermercati() {
  const [catene, setCatene] = useState<any[]>([])
  const [puntiVendita, setPuntiVendita] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCatena, setFiltroCatena] = useState('tutte')
  const [ricercaCitta, setRicercaCitta] = useState('')

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    const [{ data: cat }, { data: pv }] = await Promise.all([
      supabase.from('catene').select('*').eq('attiva', true).order('nome'),
      supabase.from('punti_vendita').select('*, catene(nome, colore_hex)').eq('attivo', true).order('citta')
    ])
    setCatene(cat || [])
    setPuntiVendita(pv || [])
    setLoading(false)
  }

  const pvFiltrati = puntiVendita.filter(pv => {
    const matchCatena = filtroCatena === 'tutte' || pv.catene?.nome === filtroCatena
    const matchCitta = pv.citta?.toLowerCase().includes(ricercaCitta.toLowerCase()) ||
      pv.indirizzo?.toLowerCase().includes(ricercaCitta.toLowerCase())
    return matchCatena && matchCitta
  })

  const cittaUniche = [...new Set(pvFiltrati.map(pv => pv.citta))].sort()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a1a18', marginBottom: '8px' }}>
          🏪 Supermercati
        </h1>
        <p style={{ color: '#5a5a52', fontSize: '0.9rem', marginBottom: '28px' }}>
          {puntiVendita.length} punti vendita in Italia
        </p>

        {/* STATS CATENE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {catene.map(c => {
            const count = puntiVendita.filter(pv => pv.catene?.nome === c.nome).length
            return (
              <div
                key={c.id}
                onClick={() => setFiltroCatena(filtroCatena === c.nome ? 'tutte' : c.nome)}
                style={{
                  background: filtroCatena === c.nome ? c.colore_hex + '15' : 'white',
                  border: `1.5px solid ${filtroCatena === c.nome ? c.colore_hex : '#e8e6de'}`,
                  borderRadius: '12px', padding: '14px 16px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.colore_hex }} />
                  <span style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{c.nome}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9a9a90' }}>
                  {count} {count === 1 ? 'punto vendita' : 'punti vendita'}
                </div>
              </div>
            )
          })}
        </div>

        {/* RICERCA */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px', background: 'white', border: '1.5px solid #e8e6de', borderRadius: '10px', padding: '8px 14px' }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Cerca per città o indirizzo..."
              value={ricercaCitta}
              onChange={e => setRicercaCitta(e.target.value)}
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', background: 'transparent', color: '#1a1a18' }}
            />
          </div>
          {(filtroCatena !== 'tutte' || ricercaCitta) && (
            <button
              onClick={() => { setFiltroCatena('tutte'); setRicercaCitta('') }}
              style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#9a9a90' }}>
              ✕ Reset
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
            <div>Caricamento...</div>
          </div>
        ) : pvFiltrati.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>Nessun punto vendita trovato</div>
            <div style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Aggiungi punti vendita dall&apos;admin panel</div>
            <Link href="/admin/supermercati" style={{ background: '#1a7a4a', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.88rem', fontWeight: '600' }}>
              + Aggiungi punti vendita
            </Link>
          </div>
        ) : (
          /* LISTA PER CITTA */
          cittaUniche.map(citta => {
            const pvCitta = pvFiltrati.filter(pv => pv.citta === citta)
            return (
              <div key={citta} style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a1a18', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📍 {citta}
                  <span style={{ fontSize: '0.78rem', fontWeight: '400', color: '#9a9a90' }}>{pvCitta.length} punti vendita</span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {pvCitta.map(pv => (
                    <div key={pv.id} style={{
                      background: 'white', border: '1.5px solid #e8e6de',
                      borderRadius: '12px', padding: '16px',
                      display: 'flex', gap: '12px', alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: pv.catene?.colore_hex + '20' || '#e8f5ee',
                        border: `1.5px solid ${pv.catene?.colore_hex || '#1a7a4a'}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', flexShrink: 0
                      }}>🏪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pv.catene?.colore_hex || '#888' }} />
                          <span style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{pv.catene?.nome}</span>
                          {pv.nome && <span style={{ fontSize: '0.78rem', color: '#9a9a90' }}>· {pv.nome}</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#5a5a52', marginBottom: '4px' }}>
                          📍 {pv.indirizzo}
                        </div>
                        {pv.cap && (
                          <div style={{ fontSize: '0.75rem', color: '#9a9a90' }}>
                            CAP {pv.cap} · {pv.provincia}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}