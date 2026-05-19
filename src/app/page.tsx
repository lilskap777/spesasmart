'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [prodotti, setProdotti] = useState<any[]>([])
  const [catene, setCatene] = useState<any[]>([])
  const [ricerca, setRicerca] = useState('')
  const [loading, setLoading] = useState(true)
  const [connesso, setConnesso] = useState(false)

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    setLoading(true)
    try {
      const { data: cateneData, error: cateneError } = await supabase
        .from('catene')
        .select('*')
        .eq('attiva', true)
        .order('nome')

      if (cateneError) throw cateneError
      setCatene(cateneData || [])

      const { data: prodottiData, error: prodottiError } = await supabase
        .from('prezzi_attivi')
        .select('*')
        .order('percentuale_sconto', { ascending: false })
        .limit(8)

      if (prodottiError) throw prodottiError
      setProdotti(prodottiData || [])
      setConnesso(true)
    } catch (error) {
      console.error('Errore connessione:', error)
      setConnesso(false)
    }
    setLoading(false)
  }

  const prodottiFiltrati = prodotti.filter(p =>
    p.prodotto_nome?.toLowerCase().includes(ricerca.toLowerCase()) ||
    p.marca?.toLowerCase().includes(ricerca.toLowerCase())
  )

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>

      {/* NAVBAR */}
      {/* HERO */}
      <section style={{ padding: '60px 24px 40px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#e8f5ee', color: '#1a7a4a',
          padding: '6px 14px', borderRadius: '20px',
          fontSize: '0.78rem', fontWeight: '600', marginBottom: '20px'
        }}>
          🇮🇹 Tutti i supermercati d&apos;Italia
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: '800',
          color: '#1a1a18', lineHeight: '1.1', marginBottom: '16px'
        }}>
          Trova il prezzo <span style={{ color: '#1a7a4a' }}>migliore</span><br />
          vicino a casa tua
        </h1>

        <p style={{ fontSize: '1.05rem', color: '#5a5a52', marginBottom: '32px' }}>
          Confrontiamo i volantini di {catene.length > 0 ? catene.length : '40+'} supermercati in tempo reale
        </p>

        {/* SEARCH */}
        <div style={{
          display: 'flex', gap: '8px', maxWidth: '580px', margin: '0 auto',
          background: 'white', border: '1.5px solid #e8e6de',
          borderRadius: '14px', padding: '6px 6px 6px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
        }}>
          <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>🔍</span>
          <input
            type="text"
            placeholder="Cerca un prodotto… es. latte, pasta barilla"
            value={ricerca}
            onChange={e => setRicerca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && router.push(`/cerca?q=${ricerca}`)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '0.95rem', background: 'transparent', color: '#1a1a18'
            }}
          />
          <button
            onClick={() => router.push(`/cerca?q=${ricerca}`)}
            style={{
              background: '#1a7a4a', color: 'white', border: 'none',
              padding: '10px 22px', borderRadius: '10px',
              fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
            }}>Cerca</button>
        </div>
      </section>

      {/* CATENE */}
      {catene.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: '#1a1a18' }}>
            🏪 Supermercati attivi
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {catene.map(catena => (
              <div key={catena.id} style={{
                background: 'white', border: '1.5px solid #e8e6de',
                borderRadius: '10px', padding: '10px 18px',
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: catena.colore_hex || '#888' }} />
                <span style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{catena.nome}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TOP OFFERTE */}
      <section style={{ padding: '0 24px 60px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a1a18' }}>
            🔥 Top offerte {ricerca && `per "${ricerca}"`}
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#9a9a90' }}>
            {loading ? 'Caricamento...' : `${prodottiFiltrati.length} prodotti`}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
            <div>Caricamento offerte dal database...</div>
          </div>
        ) : prodottiFiltrati.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{connesso ? '📭' : '⚠️'}</div>
            <div style={{ fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>
              {connesso ? 'Nessun prodotto trovato' : 'Database non raggiungibile'}
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {connesso ? 'Carica qualche volantino dall\'admin panel' : 'Controlla le chiavi nel file .env.local'}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {prodottiFiltrati.map(prodotto => (
              <Link
                key={prodotto.id}
                href={`/prodotto/${prodotto.prodotto_id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'white', border: '1.5px solid #e8e6de',
                  borderRadius: '14px', overflow: 'hidden',
                  cursor: 'pointer', transition: 'all 0.2s', height: '100%'
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
                  {/* Immagine */}
                  <div style={{
                    background: '#e8f5ee', height: '120px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.8rem', position: 'relative'
                  }}>
                    {prodotto.emoji || '🛒'}
                    {prodotto.percentuale_sconto > 0 && (
                      <div style={{
                        position: 'absolute', top: '10px', left: '10px',
                        background: '#f05a28', color: 'white',
                        fontSize: '0.7rem', fontWeight: '700',
                        padding: '3px 8px', borderRadius: '6px'
                      }}>
                        -{prodotto.percentuale_sconto}%
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9a9a90', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      {prodotto.categoria}
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18', marginBottom: '10px', lineHeight: '1.3' }}>
                      {prodotto.prodotto_nome}
                      {prodotto.marca && <span style={{ color: '#9a9a90', fontWeight: '400' }}> · {prodotto.marca}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1a7a4a' }}>
                        €{Number(prodotto.prezzo_scontato).toFixed(2)}
                      </span>
                      {prodotto.prezzo_pieno && (
                        <span style={{ fontSize: '0.82rem', color: '#9a9a90', textDecoration: 'line-through' }}>
                          €{Number(prodotto.prezzo_pieno).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#5a5a52' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: prodotto.colore_hex || '#888', flexShrink: 0 }} />
                      {prodotto.catena_nome}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '10px 14px', borderTop: '1px solid #e8e6de',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.74rem', color: '#9a9a90' }}>
                      fino al {new Date(prodotto.data_fine).toLocaleDateString('it-IT')}
                    </span>
                    <div style={{
                      background: '#1a7a4a', color: 'white',
                      width: '28px', height: '28px', borderRadius: '7px',
                      fontSize: '1.1rem', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}>+</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#1a1a18', padding: '24px',
        textAlign: 'center', color: 'rgba(255,255,255,0.4)',
        fontSize: '0.82rem'
      }}>
        © 2025 SpesaSmart · Versione locale di sviluppo
      </footer>
    </main>
  )
}