'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Item = {
  prodotto_id: string
  nome: string
  marca: string
  emoji: string
  prezzo: number
  catena: string
  colore_hex: string
  quantita: number
  acquistato: boolean
}

export default function ListaSpesa() {
  const [lista, setLista] = useState<Item[]>([])
  const [ricerca, setRicerca] = useState('')
  const [risultatiRicerca, setRisultatiRicerca] = useState<any[]>([])
  const [loadingRicerca, setLoadingRicerca] = useState(false)
  const [mostraRicerca, setMostraRicerca] = useState(false)
  const [nomeLista, setNomeLista] = useState('Lista della spesa')
  const [salvataggio, setSalvataggio] = useState(false)
  const [linkCondiviso, setLinkCondiviso] = useState('')
  const [mostraCondividi, setMostraCondividi] = useState(false)
  const [copiato, setCopiato] = useState(false)
  const [utente, setUtente] = useState<any>(null)
  const [listaId, setListaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvataggioAuto, setSalvataggioAuto] = useState(false)

  // Carica utente e lista
  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUtente(user)

    if (user) {
      await caricaListaDaDB(user.id)
    } else {
      // Utente non loggato - usa localStorage
      const salvata = localStorage.getItem('spesasmart_lista')
      if (salvata) setLista(JSON.parse(salvata))
      const nome = localStorage.getItem('spesasmart_lista_nome')
      if (nome) setNomeLista(nome)
    }
    setInizializzato(true)
    setLoading(false)
  }

  async function caricaListaDaDB(userId: string) {
    // Cerca lista attiva dell'utente
    const { data: listeData } = await supabase
      .from('liste_spesa')
      .select('*, lista_spesa_items(*)')
      .eq('utente_id', userId)
      .eq('attiva', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (listeData && listeData.length > 0) {
      const listaDB = listeData[0]
      setListaId(listaDB.id)
      setNomeLista(listaDB.nome || 'Lista della spesa')

      // Converti items dal DB al formato locale
      const items = (listaDB.lista_spesa_items || []).map((item: any) => ({
        prodotto_id: item.prodotto_id || item.nome_libero,
        nome: item.nome_libero || '',
        marca: '',
        emoji: '🛒',
        prezzo: 0,
        catena: '',
        colore_hex: '#888',
        quantita: item.quantita || 1,
        acquistato: item.acquistato || false
      }))

      // Recupera dettagli prodotti
      if (items.length > 0) {
        const prodottiIds = items.filter((i: any) => i.prodotto_id).map((i: any) => i.prodotto_id)
        if (prodottiIds.length > 0) {
          const { data: prezziData } = await supabase
            .from('prezzi_attivi')
            .select('*')
            .in('prodotto_id', prodottiIds)

          const prezziMap: Record<string, any> = {}
          if (prezziData) {
            prezziData.forEach(p => {
              if (!prezziMap[p.prodotto_id]) prezziMap[p.prodotto_id] = p
            })
          }

          const itemsArricchiti = items.map((item: any) => ({
            ...item,
            nome: prezziMap[item.prodotto_id]?.prodotto_nome || item.nome,
            marca: prezziMap[item.prodotto_id]?.marca || '',
            emoji: prezziMap[item.prodotto_id]?.emoji || '🛒',
            prezzo: prezziMap[item.prodotto_id]?.prezzo_scontato || 0,
            catena: prezziMap[item.prodotto_id]?.catena_nome || '',
            colore_hex: prezziMap[item.prodotto_id]?.colore_hex || '#888',
          }))
          setLista(itemsArricchiti)
        }
      }
    } else {
      // Crea lista vuota per l'utente
      const { data: nuovaLista } = await supabase
        .from('liste_spesa')
        .insert({ utente_id: userId, nome: 'Lista della spesa', attiva: true })
        .select()
        .single()
      if (nuovaLista) setListaId(nuovaLista.id)
    }
  }

  // Salva automaticamente nel DB quando la lista cambia
  const [inizializzato, setInizializzato] = useState(false)

useEffect(() => {
  if (loading || !inizializzato) return
  if (utente && listaId) {
    salvaAutomatico()
  } else if (!utente) {
    localStorage.setItem('spesasmart_lista', JSON.stringify(lista))
    localStorage.setItem('spesasmart_lista_nome', nomeLista)
  }
}, [lista, nomeLista])

  const salvaTimeout = useRef<any>(null)

async function salvaAutomatico() {
  if (!listaId || !utente) return
  if (salvaTimeout.current) clearTimeout(salvaTimeout.current)
  salvaTimeout.current = setTimeout(async () => {
    setSalvataggioAuto(true)

    try {
      // Aggiorna nome lista
      await supabase.from('liste_spesa').update({ nome: nomeLista }).eq('id', listaId)

      // Cancella items esistenti e reinserisci
      await supabase.from('lista_spesa_items').delete().eq('lista_id', listaId)

      if (lista.length > 0) {
        await supabase.from('lista_spesa_items').insert(
          lista.map(item => ({
            lista_id: listaId,
            prodotto_id: item.prodotto_id,
            nome_libero: item.nome,
            quantita: item.quantita,
            acquistato: item.acquistato
          }))
        )
      }
    } catch (e) {
      console.error('Errore salvataggio auto:', e)
    }

    setTimeout(() => setSalvataggioAuto(false), 1000)
  }, 800)
}

  async function cercaProdotti(q: string) {
    if (!q.trim()) { setRisultatiRicerca([]); return }
    setLoadingRicerca(true)
    const { data } = await supabase
      .from('prezzi_attivi')
      .select('*')
      .or(`prodotto_nome.ilike.%${q}%,marca.ilike.%${q}%`)
      .order('percentuale_sconto', { ascending: false })
      .limit(20)
    setRisultatiRicerca(data || [])
    setLoadingRicerca(false)
  }

  function aggiungiProdotto(p: any) {
    const esistente = lista.find(i => i.prodotto_id === p.prodotto_id)
    if (esistente) {
      setLista(lista.map(i =>
        i.prodotto_id === p.prodotto_id ? { ...i, quantita: i.quantita + 1 } : i
      ))
    } else {
      setLista([...lista, {
        prodotto_id: p.prodotto_id,
        nome: p.prodotto_nome,
        marca: p.marca,
        emoji: p.emoji,
        prezzo: Number(p.prezzo_scontato),
        catena: p.catena_nome,
        colore_hex: p.colore_hex,
        quantita: 1,
        acquistato: false
      }])
    }
    setMostraRicerca(false)
    setRicerca('')
    setRisultatiRicerca([])
  }

  function rimuoviProdotto(prodotto_id: string) {
    setLista(lista.filter(i => i.prodotto_id !== prodotto_id))
  }

  function cambiaQuantita(prodotto_id: string, delta: number) {
    setLista(lista.map(i => {
      if (i.prodotto_id !== prodotto_id) return i
      const nuova = i.quantita + delta
      if (nuova <= 0) return null
      return { ...i, quantita: nuova }
    }).filter(Boolean) as Item[])
  }

  function toggleAcquistato(prodotto_id: string) {
    setLista(lista.map(i =>
      i.prodotto_id === prodotto_id ? { ...i, acquistato: !i.acquistato } : i
    ))
  }

  function svuotaLista() {
    if (confirm('Vuoi svuotare tutta la lista?')) {
      setLista([])
      setLinkCondiviso('')
      setMostraCondividi(false)
    }
  }

  async function condividiLista() {
    if (lista.length === 0) return
    setSalvataggio(true)
    try {
      const { data, error } = await supabase
        .from('liste_condivise')
        .insert({ nome: nomeLista, items: lista })
        .select()
        .single()
      if (error) throw error
      const link = `${window.location.origin}/lista/${data.slug}`
      setLinkCondiviso(link)
      setMostraCondividi(true)
    } catch (e: any) {
      alert('Errore: ' + e.message)
    }
    setSalvataggio(false)
  }

  async function copiaLink() {
    await navigator.clipboard.writeText(linkCondiviso)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  const totaleGenerale = lista.filter(i => !i.acquistato)
    .reduce((acc, i) => acc + i.prezzo * i.quantita, 0)

  const totaliPerCatena = (() => {
    const map: Record<string, number> = {}
    lista.filter(i => !i.acquistato).forEach(i => {
      if (!map[i.catena]) map[i.catena] = 0
      map[i.catena] += i.prezzo * i.quantita
    })
    return Object.entries(map).map(([catena, totale]) => ({ catena, totale })).sort((a, b) => a.totale - b.totale)
  })()

  const prodottiDaAcquistare = lista.filter(i => !i.acquistato)
  const prodottiAcquistati = lista.filter(i => i.acquistato)

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', background: '#faf8f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9a90' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
        <div>Caricamento lista...</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <input
              value={nomeLista}
              onChange={e => setNomeLista(e.target.value)}
              style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a1a18', border: 'none', background: 'transparent', outline: 'none', width: '100%', fontFamily: 'system-ui' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <p style={{ color: '#5a5a52', fontSize: '0.9rem', margin: 0 }}>
                {prodottiDaAcquistare.length} prodotti · totale stimato{' '}
                <strong style={{ color: '#1a7a4a' }}>€{totaleGenerale.toFixed(2)}</strong>
              </p>
              {utente ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                  {salvataggioAuto ? (
                    <span style={{ color: '#9a9a90' }}>💾 Salvataggio...</span>
                  ) : (
                    <span style={{ color: '#1a7a4a' }}>✓ Sincronizzata</span>
                  )}
                </div>
              ) : (
                <Link href="/login" style={{ fontSize: '0.78rem', color: '#f05a28', textDecoration: 'none', background: '#fff1ec', padding: '3px 10px', borderRadius: '20px' }}>
                  ⚠️ Accedi per salvare
                </Link>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>
            {lista.length > 0 && (
              <>
                <button onClick={condividiLista} disabled={salvataggio}
                  style={{ background: '#1a7a4a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                  {salvataggio ? '⏳' : '🔗 Condividi'}
                </button>
                <button onClick={svuotaLista}
                  style={{ background: 'none', border: '1.5px solid #e8e6de', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#9a9a90' }}>
                  🗑
                </button>
              </>
            )}
          </div>
        </div>

        {/* BANNER LINK CONDIVISO */}
        {mostraCondividi && linkCondiviso && (
          <div style={{ background: '#e8f5ee', border: '1.5px solid #1a7a4a30', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1a7a4a', marginBottom: '10px' }}>🔗 Lista condivisa!</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, background: 'white', border: '1px solid #c8e6d4', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#1a1a18', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {linkCondiviso}
              </div>
              <button onClick={copiaLink}
                style={{ background: copiato ? '#1a7a4a' : 'white', color: copiato ? 'white' : '#1a7a4a', border: '1.5px solid #1a7a4a', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' as const }}>
                {copiato ? '✓ Copiato!' : 'Copia link'}
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#5a5a52', marginTop: '8px' }}>
              💡 Chi ha il link può vedere la lista e flaggare i prodotti acquistati
            </div>
          </div>
        )}

        {/* AGGIUNGI PRODOTTO */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', padding: '16px', marginBottom: '20px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, display: 'flex', gap: '8px', background: '#faf8f3', border: '1.5px solid #e8e6de', borderRadius: '10px', padding: '10px 14px' }}>
              <span>🔍</span>
              <input type="text" placeholder="Cerca e aggiungi un prodotto..."
                value={ricerca}
                onChange={e => { setRicerca(e.target.value); cercaProdotti(e.target.value); setMostraRicerca(true) }}
                onFocus={() => setMostraRicerca(true)}
                style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', background: 'transparent', color: '#1a1a18' }} />
            </div>
            <button onClick={() => { setMostraRicerca(true); cercaProdotti(ricerca) }}
              style={{ background: '#1a7a4a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.88rem' }}>
              Cerca
            </button>
          </div>

          {mostraRicerca && ricerca.trim() && (
            <div style={{ position: 'absolute', top: '70px', left: '16px', right: '16px', background: 'white', border: '1.5px solid #e8e6de', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
              {loadingRicerca ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9a9a90', fontSize: '0.85rem' }}>⏳ Ricerca...</div>
              ) : risultatiRicerca.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9a9a90', fontSize: '0.85rem' }}>Nessun risultato</div>
              ) : (
                risultatiRicerca.map(p => (
                  <div key={p.id} onClick={() => aggiungiProdotto(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f0ea', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0faf4'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <span style={{ fontSize: '1.4rem' }}>{p.emoji || '🛒'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{p.prodotto_nome}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9a9a90' }}>{p.marca} · {p.catena_nome}</div>
                    </div>
                    <div style={{ fontWeight: '700', color: '#1a7a4a', fontSize: '0.95rem' }}>€{Number(p.prezzo_scontato).toFixed(2)}</div>
                    <div style={{ background: '#e8f5ee', color: '#1a7a4a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>+ Aggiungi</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {mostraRicerca && <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setMostraRicerca(false)} />}

        {lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#9a9a90' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛒</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>La lista è vuota</div>
            <div style={{ fontSize: '0.9rem', marginBottom: '24px' }}>Cerca un prodotto qui sopra o sfoglia le offerte</div>
            <Link href="/cerca" style={{ background: '#1a7a4a', color: 'white', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
              🔍 Cerca prodotti
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
            <div>
              {prodottiDaAcquistare.length > 0 && (
                <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e6de' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1a1a18' }}>Da acquistare ({prodottiDaAcquistare.length})</span>
                  </div>
                  {prodottiDaAcquistare.map(item => (
                    <div key={item.prodotto_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #f5f5f0' }}>
                      <button onClick={() => toggleAcquistato(item.prodotto_id)}
                        style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid #d0d0c8', background: 'white', cursor: 'pointer', flexShrink: 0 }} />
                      <span style={{ fontSize: '1.4rem' }}>{item.emoji || '🛒'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{item.nome}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9a9a90', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.colore_hex || '#888' }} />
                          {item.catena}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => cambiaQuantita(item.prodotto_id, -1)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1.5px solid #e8e6de', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: '600', minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantita}</span>
                        <button onClick={() => cambiaQuantita(item.prodotto_id, 1)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1.5px solid #e8e6de', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <div style={{ minWidth: '60px', textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', color: '#1a7a4a', fontSize: '0.95rem' }}>€{(item.prezzo * item.quantita).toFixed(2)}</div>
                        {item.quantita > 1 && <div style={{ fontSize: '0.72rem', color: '#9a9a90' }}>€{item.prezzo.toFixed(2)} cad.</div>}
                      </div>
                      <button onClick={() => rimuoviProdotto(item.prodotto_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d0d0c8', fontSize: '1rem' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#d0d0c8'}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {prodottiAcquistati.length > 0 && (
                <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden', opacity: 0.7 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e6de' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#9a9a90' }}>✅ Acquistati ({prodottiAcquistati.length})</span>
                  </div>
                  {prodottiAcquistati.map(item => (
                    <div key={item.prodotto_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: '1px solid #f5f5f0' }}>
                      <button onClick={() => toggleAcquistato(item.prodotto_id)}
                        style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid #1a7a4a', background: '#1a7a4a', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>✓</button>
                      <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>{item.emoji || '🛒'}</span>
                      <div style={{ flex: 1, textDecoration: 'line-through', color: '#9a9a90', fontSize: '0.85rem' }}>{item.nome}</div>
                      <div style={{ color: '#9a9a90', fontSize: '0.85rem' }}>€{(item.prezzo * item.quantita).toFixed(2)}</div>
                      <button onClick={() => rimuoviProdotto(item.prodotto_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d0d0c8', fontSize: '0.9rem' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SIDEBAR TOTALI */}
            <div style={{ position: 'sticky', top: '80px' }}>
              <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #e8e6de' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1a1a18', marginBottom: '4px' }}>💰 Totale per supermercato</div>
                  <div style={{ fontSize: '0.78rem', color: '#9a9a90' }}>Prezzi dalle offerte attive</div>
                </div>
                {totaliPerCatena.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9a9a90', fontSize: '0.85rem' }}>Aggiungi prodotti per vedere il totale</div>
                ) : (
                  <>
                    {totaliPerCatena.map((t, i) => (
                      <div key={t.catena} style={{ padding: '14px 18px', borderBottom: '1px solid #f5f5f0', background: i === 0 ? '#f0faf4' : 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {i === 0 && <span style={{ fontSize: '0.8rem' }}>🏆</span>}
                            <span style={{ fontWeight: i === 0 ? '700' : '500', fontSize: '0.88rem', color: i === 0 ? '#1a7a4a' : '#1a1a18' }}>{t.catena}</span>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '1rem', color: i === 0 ? '#1a7a4a' : '#1a1a18' }}>€{t.totale.toFixed(2)}</span>
                        </div>
                        {i === 0 && totaliPerCatena.length > 1 && (
                          <div style={{ fontSize: '0.72rem', color: '#1a7a4a', marginTop: '4px' }}>
                            Risparmi €{(totaliPerCatena[totaliPerCatena.length - 1].totale - t.totale).toFixed(2)} rispetto al più caro
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ padding: '14px 18px', background: '#1a1a18', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Totale lista</span>
                      <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'white' }}>€{totaleGenerale.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <Link href="/cerca" style={{ display: 'block', textAlign: 'center', marginTop: '12px', background: '#1a7a4a', color: 'white', padding: '12px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '0.88rem' }}>
                + Aggiungi altri prodotti
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}