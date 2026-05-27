'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const CATEGORIE = [
  'tutte', 'latticini', 'carne', 'pesce', 'salumi', 'frutta',
  'verdura', 'pasta_riso', 'condimenti', 'bevande',
  'dolci_snack', 'pane_bakery', 'surgelati',
  'igiene_persona', 'pulizia_casa', 'altro'
]

function Cerca() {
  const searchParams = useSearchParams()
  const [risultati, setRisultati] = useState<any[]>([])
  const [catene, setCatene] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [categoria, setCategoria] = useState('tutte')
  const [catenaFiltro, setCatenaFiltro] = useState('tutte')
  const [ordinamento, setOrdinamento] = useState('sconto')
  const [cercato, setCercato] = useState(false)

  useEffect(() => {
    supabase.from('catene').select('*').eq('attiva', true).order('nome')
      .then(({ data }) => setCatene(data || []))
    if (searchParams.get('q')) cerca(searchParams.get('q') || '')
  }, [])

  async function cerca(q?: string) {
    const termine = q ?? query
    setLoading(true)
    setCercato(true)
    try {
      let queryBuilder = supabase.from('prezzi_attivi').select('*')

      if (termine.trim()) {
        queryBuilder = queryBuilder.or(
          `prodotto_nome.ilike.%${termine}%,marca.ilike.%${termine}%`
        )
      }

      if (categoria !== 'tutte') {
        queryBuilder = queryBuilder.eq('categoria', categoria)
      }

      if (catenaFiltro !== 'tutte') {
        queryBuilder = queryBuilder.eq('catena_nome', catenaFiltro)
      }

      if (ordinamento === 'sconto') {
        queryBuilder = queryBuilder.order('percentuale_sconto', { ascending: false })
      } else if (ordinamento === 'prezzo_asc') {
        queryBuilder = queryBuilder.order('prezzo_scontato', { ascending: true })
      } else if (ordinamento === 'prezzo_desc') {
        queryBuilder = queryBuilder.order('prezzo_scontato', { ascending: false })
      }

      queryBuilder = queryBuilder.limit(50)

      const { data, error } = await queryBuilder
      if (error) throw error
      setRisultati(data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') cerca()
  }

  const s = {
    page: { fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' },
    nav: { background: 'white', borderBottom: '1px solid #e8e6de', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100 },
    content: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
    searchBox: { display: 'flex', gap: '8px', background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', padding: '6px 6px 6px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '20px' },
    input: { flex: 1, border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent', color: '#1a1a18', fontFamily: 'system-ui' },
    btnGreen: { background: '#1a7a4a', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' as const },
    filterBar: { display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginBottom: '28px', alignItems: 'center' },
    select: { background: 'white', border: '1.5px solid #e8e6de', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', color: '#1a1a18', outline: 'none', cursor: 'pointer', fontFamily: 'system-ui' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' },
    card: { background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', display: 'block' },
  }

  return (
    <div style={s.page}>

      {/* NAVBAR */}
      <div style={s.content}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a1a18', marginBottom: '8px' }}>
          🔍 Cerca prodotti
        </h1>
        <p style={{ color: '#5a5a52', fontSize: '0.9rem', marginBottom: '24px' }}>
          Trova il miglior prezzo tra tutti i supermercati
        </p>

        {/* SEARCH BOX */}
        <div style={s.searchBox}>
          <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>🔍</span>
          <input
            style={s.input}
            type="text"
            placeholder="Cerca prodotto, marca… es. latte, pasta barilla, olio"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button style={s.btnGreen} onClick={() => cerca()}>Cerca</button>
        </div>

        {/* FILTRI */}
        <div style={s.filterBar}>
          <span style={{ fontSize: '0.82rem', color: '#9a9a90', fontWeight: '500' }}>Filtra:</span>

          <select style={s.select} value={categoria} onChange={e => setCategoria(e.target.value)}>
            {CATEGORIE.map(c => (
              <option key={c} value={c}>{c === 'tutte' ? 'Tutte le categorie' : c}</option>
            ))}
          </select>

          <select style={s.select} value={catenaFiltro} onChange={e => setCatenaFiltro(e.target.value)}>
            <option value="tutte">Tutti i supermercati</option>
            {catene.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>

          <select style={s.select} value={ordinamento} onChange={e => setOrdinamento(e.target.value)}>
            <option value="sconto">Maggiore sconto</option>
            <option value="prezzo_asc">Prezzo crescente</option>
            <option value="prezzo_desc">Prezzo decrescente</option>
          </select>

          {(categoria !== 'tutte' || catenaFiltro !== 'tutte') && (
            <button
              style={{ background: 'none', border: '1px solid #e8e6de', borderRadius: '8px', padding: '7px 12px', fontSize: '0.8rem', color: '#9a9a90', cursor: 'pointer' }}
              onClick={() => { setCategoria('tutte'); setCatenaFiltro('tutte') }}>
              ✕ Reset filtri
            </button>
          )}
        </div>

        {/* RISULTATI */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
            <div>Ricerca in corso...</div>
          </div>
        ) : !cercato ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>
              Cosa stai cercando?
            </div>
            <div style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
              Digita il nome di un prodotto e premi Cerca
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['latte', 'pasta', 'olio', 'caffè', 'burro', 'yogurt'].map(sug => (
                <button key={sug}
                  style={{ background: '#e8f5ee', color: '#1a7a4a', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                  onClick={() => { setQuery(sug); cerca(sug) }}>
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : risultati.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>Nessun risultato per &ldquo;{query}&rdquo;</div>
            <div style={{ fontSize: '0.85rem' }}>Prova con un termine diverso o aggiungi prodotti dall&apos;admin panel</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.85rem', color: '#9a9a90', marginBottom: '16px' }}>
              <strong style={{ color: '#1a1a18' }}>{risultati.length}</strong> risultati
              {query && <> per <strong style={{ color: '#1a7a4a' }}>&ldquo;{query}&rdquo;</strong></>}
            </div>

            <div style={s.grid}>
              {risultati.map(p => (
                <Link key={p.id} href={`/prodotto/${p.prodotto_id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={s.card}
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
<div style={{ background: '#e8f5ee', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', position: 'relative', overflow: 'hidden' }}>
  {p.immagine_url ? (
    <img
      src={p.immagine_url}
      alt={p.prodotto_nome}
      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
      onError={e => {
        e.currentTarget.style.display = 'none'
        if (e.currentTarget.nextElementSibling) {
          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
        }
      }}
    />
  ) : null}
  <span style={{ display: p.immagine_url ? 'none' : 'flex' }}>
    {p.emoji || '🛒'}
  </span>
  {p.percentuale_sconto > 0 && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#f05a28', color: 'white', fontSize: '0.7rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>
                          -{p.percentuale_sconto}%
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#9a9a90', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        {p.categoria}
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1a1a18', marginBottom: '10px', lineHeight: '1.3' }}>
                        {p.prodotto_nome}
                        {p.marca && <span style={{ color: '#9a9a90', fontWeight: '400' }}> · {p.marca}</span>}
                      </div>
                      {p.grammatura && (
                        <div style={{ fontSize: '0.75rem', color: '#9a9a90', marginBottom: '8px' }}>{p.grammatura}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a7a4a' }}>
                          €{Number(p.prezzo_scontato).toFixed(2)}
                        </span>
                        {p.prezzo_pieno && (
                          <span style={{ fontSize: '0.82rem', color: '#9a9a90', textDecoration: 'line-through' }}>
                            €{Number(p.prezzo_pieno).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#5a5a52' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.colore_hex || '#888' }} />
                        {p.catena_nome}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '10px 14px', borderTop: '1px solid #e8e6de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: '#9a9a90' }}>
                        fino al {new Date(p.data_fine).toLocaleDateString('it-IT')}
                      </span>
                      <div style={{ background: '#1a7a4a', color: 'white', width: '28px', height: '28px', borderRadius: '7px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export default function CercaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>⏳ Caricamento...</div>}>
      <Cerca />
    </Suspense>
  )
}