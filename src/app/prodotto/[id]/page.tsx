'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function SchedaProdotto() {
  const params = useParams()
  const id = params.id as string
  const [prodotto, setProdotto] = useState<any>(null)
  const [prezzi, setPrezzi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) carica() }, [id])

  async function carica() {
    setLoading(true)
    try {
      const { data: prod } = await supabase
        .from('prodotti')
        .select('*')
        .eq('id', id)
        .single()
      setProdotto(prod)

      const { data: prez } = await supabase
        .from('prezzi_attivi')
        .select('*')
        .eq('prodotto_id', id)
        .order('prezzo_scontato', { ascending: true })
      setPrezzi(prez || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', background: '#faf8f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9a90' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
        <div>Caricamento...</div>
      </div>
    </div>
  )

  if (!prodotto) return (
    <div style={{ fontFamily: 'system-ui', background: '#faf8f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#9a9a90' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>❌</div>
        <div>Prodotto non trovato</div>
        <Link href="/cerca" style={{ color: '#1a7a4a', marginTop: '12px', display: 'inline-block' }}>← Torna alla ricerca</Link>
      </div>
    </div>
  )

  const prezzoMin = prezzi.length > 0 ? Math.min(...prezzi.map(p => Number(p.prezzo_scontato))) : null
  const prezzoMax = prezzi.length > 0 ? Math.max(...prezzi.map(p => Number(p.prezzo_scontato))) : null
  const risparmio = prezzoMin && prezzoMax ? (prezzoMax - prezzoMin).toFixed(2) : null

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>

      {/* NAVBAR */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {/* BREADCRUMB */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#9a9a90', marginBottom: '24px' }}>
          <Link href="/" style={{ color: '#9a9a90', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href="/cerca" style={{ color: '#9a9a90', textDecoration: 'none' }}>Cerca</Link>
          <span>›</span>
          <span style={{ color: '#1a1a18' }}>{prodotto.nome}</span>
        </div>

        {/* HERO PRODOTTO */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '16px', padding: '28px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '28px', marginBottom: '24px' }}>
          <div style={{ background: '#e8f5ee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', aspectRatio: '1', overflow: 'hidden' }}>
  {prodotto.immagine_url ? (
    <img 
      src={prodotto.immagine_url} 
      alt={prodotto.nome}
      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
      onError={e => { 
  (e.target as HTMLImageElement).style.display = 'none'
}}
    />
  ) : null}
  <span style={{ display: prodotto.immagine_url ? 'none' : 'flex' }}>{prodotto.emoji || '🛒'}</span>
</div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9a9a90', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              {prodotto.categoria}
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a1a18', marginBottom: '6px', lineHeight: '1.2' }}>
              {prodotto.nome}
            </h1>
            {prodotto.marca && (
              <div style={{ fontSize: '1rem', color: '#5a5a52', marginBottom: '4px' }}>di <strong>{prodotto.marca}</strong></div>
            )}
            {prodotto.grammatura && (
              <div style={{ fontSize: '0.85rem', color: '#9a9a90', marginBottom: '16px' }}>{prodotto.grammatura}</div>
            )}

            {prezzoMin && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#5a5a52' }}>A partire da</span>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: '#1a7a4a' }}>€{prezzoMin.toFixed(2)}</span>
                {risparmio && Number(risparmio) > 0 && (
                  <span style={{ background: '#fff1ec', color: '#f05a28', fontSize: '0.82rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>
                    Risparmi fino a €{risparmio}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ background: '#e8f5ee', color: '#1a7a4a', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600' }}>
                🏪 {prezzi.length} {prezzi.length === 1 ? 'supermercato' : 'supermercati'}
              </div>
              {prodotto.barcode && (
                <div style={{ background: '#f5f5f0', color: '#5a5a52', padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                  📊 {prodotto.barcode}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONFRONTO PREZZI */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e8e6de', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a1a18' }}>💰 Confronto prezzi</h2>
            <span style={{ fontSize: '0.8rem', color: '#9a9a90' }}>Aggiornato dai volantini correnti</span>
          </div>

          {prezzi.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9a9a90' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
              <div>Nessuna offerta attiva per questo prodotto</div>
            </div>
          ) : (
            prezzi.map((p, i) => {
              const isMinimo = Number(p.prezzo_scontato) === prezzoMin
              const barWidth = prezzoMax && prezzoMax > 0
                ? (Number(p.prezzo_scontato) / prezzoMax) * 100
                : 100
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 24px',
                  borderBottom: i < prezzi.length - 1 ? '1px solid #e8e6de' : 'none',
                  background: isMinimo ? '#f0faf4' : 'white'
                }}>
                  {/* Posizione */}
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isMinimo ? '#1a7a4a' : '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: '700', color: isMinimo ? 'white' : '#9a9a90', flexShrink: 0 }}>
                    {i + 1}
                  </div>

                  {/* Catena */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.colore_hex || '#888', flexShrink: 0 }} />
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1a1a18' }}>{p.catena_nome}</span>
                    {isMinimo && <span style={{ background: '#1a7a4a', color: 'white', fontSize: '0.65rem', fontWeight: '700', padding: '2px 7px', borderRadius: '10px' }}>MIGLIOR PREZZO</span>}
                  </div>

                  {/* Barra prezzo */}
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '6px', background: '#f0f0ea', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: isMinimo ? '#1a7a4a' : '#d0d0c8', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>

                  {/* Prezzo */}
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: isMinimo ? '#1a7a4a' : '#1a1a18' }}>
                      €{Number(p.prezzo_scontato).toFixed(2)}
                    </div>
                    {p.prezzo_pieno && (
                      <div style={{ fontSize: '0.75rem', color: '#9a9a90', textDecoration: 'line-through' }}>
                        €{Number(p.prezzo_pieno).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Sconto */}
                  {p.percentuale_sconto > 0 && (
                    <div style={{ background: '#fff1ec', color: '#f05a28', fontSize: '0.75rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', minWidth: '44px', textAlign: 'center' }}>
                      -{p.percentuale_sconto}%
                    </div>
                  )}

                  {/* Aggiungi lista */}
                  <button style={{ background: '#1a7a4a', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                </div>
              )
            })
          )}
        </div>

        {/* INFO PRODOTTO */}
        {prodotto.descrizione && (
          <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a18', marginBottom: '10px' }}>📋 Descrizione</h2>
            <p style={{ color: '#5a5a52', fontSize: '0.9rem', lineHeight: '1.6' }}>{prodotto.descrizione}</p>
          </div>
        )}

        {/* TORNA INDIETRO */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/cerca" style={{ background: 'white', border: '1.5px solid #e8e6de', color: '#1a1a18', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
            ← Torna alla ricerca
          </Link>
          <Link href="/" style={{ background: '#1a7a4a', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
            🏠 Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}