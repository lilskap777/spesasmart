'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ListaCondivisa() {
  const params = useParams()
  const slug = params.slug as string
  const [lista, setLista] = useState<any[]>([])
  const [nomeLista, setNomeLista] = useState('Lista della spesa')
  const [loading, setLoading] = useState(true)
  const [nonTrovata, setNonTrovata] = useState(false)
  const [copiato, setCopiato] = useState(false)

  useEffect(() => { if (slug) carica() }, [slug])

  async function carica() {
    setLoading(true)
    const { data, error } = await supabase
      .from('liste_condivise')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      setNonTrovata(true)
    } else {
      setNomeLista(data.nome || 'Lista della spesa')
      setLista(data.items || [])
    }
    setLoading(false)
  }

  function toggleAcquistato(prodotto_id: string) {
    setLista(lista.map(i =>
      i.prodotto_id === prodotto_id ? { ...i, acquistato: !i.acquistato } : i
    ))
  }

  async function copiaLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  const prodottiDaAcquistare = lista.filter(i => !i.acquistato)
  const prodottiAcquistati = lista.filter(i => i.acquistato)
  const totale = prodottiDaAcquistare.reduce((acc, i) => acc + i.prezzo * i.quantita, 0)

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', background: '#faf8f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9a90' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
        <div>Caricamento lista...</div>
      </div>
    </div>
  )

  if (nonTrovata) return (
    <div style={{ fontFamily: 'system-ui', background: '#faf8f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#9a9a90' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>❌</div>
        <div style={{ fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>Lista non trovata</div>
        <div style={{ fontSize: '0.85rem', marginBottom: '20px' }}>Il link potrebbe essere scaduto o non valido</div>
        <Link href="/lista-spesa" style={{ background: '#1a7a4a', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
          Crea una nuova lista
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', background: '#1a7a4a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🛒</div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a1a18', margin: 0 }}>{nomeLista}</h1>
              <div style={{ fontSize: '0.82rem', color: '#9a9a90' }}>Lista condivisa via SpesaSmart</div>
            </div>
          </div>

          <div style={{ background: '#e8f5ee', border: '1px solid #c8e6d4', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#1a7a4a' }}>
              <strong>{prodottiDaAcquistare.length}</strong> prodotti da acquistare · totale stimato <strong>€{totale.toFixed(2)}</strong>
            </div>
            <button
              onClick={copiaLink}
              style={{ background: copiato ? '#1a7a4a' : 'white', color: copiato ? 'white' : '#1a7a4a', border: '1px solid #1a7a4a', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}>
              {copiato ? '✓ Copiato' : '🔗 Copia link'}
            </button>
          </div>
        </div>

        {/* ISTRUZIONI */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', fontSize: '0.82rem', color: '#5a5a52' }}>
          💡 Spunta i prodotti man mano che li metti nel carrello
        </div>

        {/* LISTA DA ACQUISTARE */}
        {prodottiDaAcquistare.length > 0 && (
          <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e6de' }}>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1a1a18' }}>
                Da acquistare ({prodottiDaAcquistare.length})
              </span>
            </div>
            {prodottiDaAcquistare.map(item => (
              <div
                key={item.prodotto_id}
                onClick={() => toggleAcquistato(item.prodotto_id)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '1px solid #f5f5f0', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faf8'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #d0d0c8', background: 'white', flexShrink: 0 }} />
                <span style={{ fontSize: '1.5rem' }}>{item.emoji || '🛒'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1a1a18' }}>{item.nome}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9a9a90', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    {item.marca && <span>{item.marca} ·</span>}
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.colore_hex || '#888' }} />
                    {item.catena}
                    {item.quantita > 1 && <span>· x{item.quantita}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: '#1a7a4a', fontSize: '1rem' }}>
                    €{(item.prezzo * item.quantita).toFixed(2)}
                  </div>
                  {item.quantita > 1 && (
                    <div style={{ fontSize: '0.72rem', color: '#9a9a90' }}>€{item.prezzo.toFixed(2)} cad.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACQUISTATI */}
        {prodottiAcquistati.length > 0 && (
          <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', opacity: 0.65, marginBottom: '24px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e6de' }}>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#9a9a90' }}>✅ Acquistati ({prodottiAcquistati.length})</span>
            </div>
            {prodottiAcquistati.map(item => (
              <div
                key={item.prodotto_id}
                onClick={() => toggleAcquistato(item.prodotto_id)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: '1px solid #f5f5f0', cursor: 'pointer' }}
              >
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #1a7a4a', background: '#1a7a4a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</div>
                <span style={{ fontSize: '1.3rem', opacity: 0.5 }}>{item.emoji || '🛒'}</span>
                <div style={{ flex: 1, textDecoration: 'line-through', color: '#9a9a90', fontSize: '0.9rem' }}>{item.nome}</div>
                <div style={{ color: '#9a9a90', fontSize: '0.88rem' }}>€{(item.prezzo * item.quantita).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '0.8rem', color: '#9a9a90', marginBottom: '12px' }}>
            Creata con SpesaSmart · il comparatore prezzi italiano
          </div>
          <Link href="/" style={{ background: '#1a7a4a', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>
            🛒 Crea la tua lista
          </Link>
        </div>
      </div>
    </div>
  )
}