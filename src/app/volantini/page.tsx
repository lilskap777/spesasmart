'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Volantini() {
  const [volantini, setVolantini] = useState<any[]>([])
  const [catene, setCatene] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('tutte')
  const [volatinoAperto, setVolantinoAperto] = useState<any>(null)
  const [offerte, setOfferte] = useState<any[]>([])
  const [loadingOfferte, setLoadingOfferte] = useState(false)

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    const [{ data: vol }, { data: cat }] = await Promise.all([
      supabase
        .from('volantini')
        .select('*, catene(nome, colore_hex)')
        .eq('stato', 'attivo')
        .order('data_fine', { ascending: true }),
      supabase.from('catene').select('*').eq('attiva', true).order('nome')
    ])
    setVolantini(vol || [])
    setCatene(cat || [])
    setLoading(false)
  }

  async function apriVolantino(v: any) {
    setVolantinoAperto(v)
    setLoadingOfferte(true)
    const { data } = await supabase
      .from('prezzi_attivi')
      .select('*')
      .eq('volantino_id', v.id)
      .order('percentuale_sconto', { ascending: false })
    setOfferte(data || [])
    setLoadingOfferte(false)
  }

  const volantiniFiltrati = volantini.filter(v =>
    filtroCategoria === 'tutte' || v.catene?.nome === filtroCategoria
  )

  const giorniRimanenti = (dataFine: string) => {
    const oggi = new Date()
    const fine = new Date(dataFine)
    const diff = Math.ceil((fine.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {!volatinoAperto ? (
          <>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a1a18', marginBottom: '8px' }}>
              📄 Volantini attivi
            </h1>
            <p style={{ color: '#5a5a52', fontSize: '0.9rem', marginBottom: '28px' }}>
              {volantini.length} volantini in corso questa settimana
            </p>

            {/* FILTRO CATENE */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <button
                onClick={() => setFiltroCategoria('tutte')}
                style={{
                  padding: '7px 16px', borderRadius: '20px',
                  cursor: 'pointer', fontSize: '0.84rem', fontWeight: '600',
                  background: filtroCategoria === 'tutte' ? '#1a7a4a' : 'white',
                  color: filtroCategoria === 'tutte' ? 'white' : '#5a5a52',
                  border: filtroCategoria === 'tutte' ? 'none' : '1.5px solid #e8e6de'
                }}>
                Tutti
              </button>
              {catene.map(c => (
                <button key={c.id}
                  onClick={() => setFiltroCategoria(c.nome)}
                  style={{
                    padding: '7px 16px', borderRadius: '20px',
                    cursor: 'pointer', fontSize: '0.84rem', fontWeight: '500',
                    background: filtroCategoria === c.nome ? c.colore_hex + '22' : 'white',
                    color: filtroCategoria === c.nome ? c.colore_hex : '#5a5a52',
                    border: `1.5px solid ${filtroCategoria === c.nome ? c.colore_hex : '#e8e6de'}`,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.colore_hex }} />
                  {c.nome}
                </button>
              ))}
            </div>

            {/* GRIGLIA VOLANTINI */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                <div>Caricamento volantini...</div>
              </div>
            ) : volantiniFiltrati.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                <div style={{ fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>
                  Nessun volantino attivo
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Carica i volantini dall&apos;
                  <Link href="/admin/volantini" style={{ color: '#1a7a4a' }}>admin panel</Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {volantiniFiltrati.map(v => {
                  const giorni = giorniRimanenti(v.data_fine)
                  return (
                    <div
                      key={v.id}
                      onClick={() => apriVolantino(v)}
                      style={{
                        background: 'white', border: '1.5px solid #e8e6de',
                        borderRadius: '14px', overflow: 'hidden',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#1a7a4a'
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e8e6de'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Header colorato */}
                      <div style={{
                        background: v.catene?.colore_hex || '#1a7a4a',
                        padding: '20px', display: 'flex', alignItems: 'center', gap: '12px'
                      }}>
                        <div style={{
                          width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)',
                          borderRadius: '12px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '1.5rem'
                        }}>📄</div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'white', fontSize: '1rem' }}>
                            {v.catene?.nome}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '2px' }}>
                            {v.nome}
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#5a5a52' }}>
                            📅 {new Date(v.data_inizio).toLocaleDateString('it-IT')} — {new Date(v.data_fine).toLocaleDateString('it-IT')}
                          </div>
                          <div style={{
                            background: giorni <= 2 ? '#fff1ec' : '#e8f5ee',
                            color: giorni <= 2 ? '#f05a28' : '#1a7a4a',
                            fontSize: '0.72rem', fontWeight: '700',
                            padding: '3px 10px', borderRadius: '20px'
                          }}>
                            {giorni <= 0 ? 'Scade oggi' : `${giorni} giorni`}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#9a9a90' }}>
                            🌍 {v.area_geografica}
                          </div>
                          <button style={{
                            background: '#e8f5ee', color: '#1a7a4a',
                            border: 'none', padding: '6px 14px', borderRadius: '8px',
                            fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer'
                          }}>
                            Vedi offerte →
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* VISTA OFFERTE VOLANTINO */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <button
                onClick={() => { setVolantinoAperto(null); setOfferte([]) }}
                style={{ background: 'white', border: '1.5px solid #e8e6de', color: '#1a1a18', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '500' }}>
                ← Tutti i volantini
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: volatinoAperto.catene?.colore_hex || '#888' }} />
                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1a1a18' }}>{volatinoAperto.catene?.nome}</span>
                <span style={{ color: '#9a9a90', fontSize: '0.9rem' }}>— {volatinoAperto.nome}</span>
              </div>
            </div>

            <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.85rem', color: '#5a5a52' }}>
                📅 Valido dal <strong>{new Date(volatinoAperto.data_inizio).toLocaleDateString('it-IT')}</strong> al <strong>{new Date(volatinoAperto.data_fine).toLocaleDateString('it-IT')}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#5a5a52' }}>
                🌍 {volatinoAperto.area_geografica}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1a7a4a', fontWeight: '600' }}>
                💰 {offerte.length} offerte
              </div>
            </div>

            {loadingOfferte ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9a9a90' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                <div>Caricamento offerte...</div>
              </div>
            ) : offerte.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9a9a90' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                <div>Nessuna offerta in questo volantino</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {offerte.map(p => (
                  <Link key={p.id} href={`/prodotto/${p.prodotto_id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'white', border: '1.5px solid #e8e6de',
                      borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#1a7a4a'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e8e6de'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ background: '#e8f5ee', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem', position: 'relative' }}>
                        {p.emoji || '🛒'}
                        {p.percentuale_sconto > 0 && (
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#f05a28', color: 'white', fontSize: '0.68rem', fontWeight: '700', padding: '2px 7px', borderRadius: '5px' }}>
                            -{p.percentuale_sconto}%
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9a9a90', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{p.categoria}</div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1a1a18', marginBottom: '8px', lineHeight: '1.3' }}>
                          {p.prodotto_nome}
                          {p.marca && <span style={{ color: '#9a9a90', fontWeight: '400' }}> · {p.marca}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1a7a4a' }}>€{Number(p.prezzo_scontato).toFixed(2)}</span>
                          {p.prezzo_pieno && <span style={{ fontSize: '0.78rem', color: '#9a9a90', textDecoration: 'line-through' }}>€{Number(p.prezzo_pieno).toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}