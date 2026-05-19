'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const Mappa = dynamic(() => import('@/components/Mappa'), { ssr: false })

export default function Supermercati() {
  const [catene, setCatene] = useState<any[]>([])
  const [puntiVendita, setPuntiVendita] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCatena, setFiltroCatena] = useState('tutte')
  const [ricercaCitta, setRicercaCitta] = useState('')
  const [vistaMappa, setVistaMappa] = useState(false)
  const [raggio, setRaggio] = useState(10)
  const [posizione, setPosizione] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    carica()
    // Prova a ottenere posizione utente
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setPosizione({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

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

  // Calcola distanza in km tra due coordinate
  function distanza(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const pvFiltrati = puntiVendita.filter(pv => {
    const matchCatena = filtroCatena === 'tutte' || pv.catene?.nome === filtroCatena
    const matchCitta = !ricercaCitta ||
      pv.citta?.toLowerCase().includes(ricercaCitta.toLowerCase()) ||
      pv.indirizzo?.toLowerCase().includes(ricercaCitta.toLowerCase())
    const matchRaggio = !posizione ||
      distanza(posizione.lat, posizione.lng, pv.lat, pv.lng) <= raggio
    return matchCatena && matchCitta && (ricercaCitta ? matchCitta : matchRaggio)
  }).map(pv => ({
    ...pv,
    distanza_km: posizione
      ? distanza(posizione.lat, posizione.lng, pv.lat, pv.lng).toFixed(1)
      : null
  })).sort((a, b) => {
    if (a.distanza_km && b.distanza_km) return Number(a.distanza_km) - Number(b.distanza_km)
    return 0
  })

  const cittaUniche = [...new Set(pvFiltrati.map(pv => pv.citta))].sort()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#faf8f3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a1a18' }}>🏪 Supermercati</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setVistaMappa(false)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e8e6de', background: !vistaMappa ? '#1a7a4a' : 'white', color: !vistaMappa ? 'white' : '#5a5a52', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>
              📋 Lista
            </button>
            <button
              onClick={() => setVistaMappa(true)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e8e6de', background: vistaMappa ? '#1a7a4a' : 'white', color: vistaMappa ? 'white' : '#5a5a52', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>
              🗺️ Mappa
            </button>
          </div>
        </div>

        <p style={{ color: '#5a5a52', fontSize: '0.9rem', marginBottom: '28px' }}>
          {pvFiltrati.length} punti vendita
          {posizione && ` · entro ${raggio} km da te`}
        </p>

        {/* FILTRI */}
        <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' as const, alignItems: 'center' }}>

          {/* Raggio geolocalizzazione */}
          {posizione && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#5a5a52' }}>
              <span>📍 Entro</span>
              <select
                style={{ background: '#e8f5ee', border: 'none', borderRadius: '8px', padding: '5px 10px', color: '#1a7a4a', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                value={raggio} onChange={e => setRaggio(Number(e.target.value))}>
                <option value={3}>3 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
                <option value={999}>Tutta Italia</option>
              </select>
            </div>
          )}

          <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px', background: '#faf8f3', border: '1.5px solid #e8e6de', borderRadius: '10px', padding: '8px 14px' }}>
            <span>🔍</span>
            <input type="text" placeholder="Cerca per città o indirizzo..."
              value={ricercaCitta} onChange={e => setRicercaCitta(e.target.value)}
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', background: 'transparent', color: '#1a1a18' }} />
          </div>

          <select
            style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', color: '#1a1a18', outline: 'none' }}
            value={filtroCatena} onChange={e => setFiltroCatena(e.target.value)}>
            <option value="tutte">Tutte le catene</option>
            {catene.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </div>

        {/* CATENE STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          {catene.map(c => {
            const count = pvFiltrati.filter(pv => pv.catene?.nome === c.nome).length
            return (
              <div key={c.id}
                onClick={() => setFiltroCatena(filtroCatena === c.nome ? 'tutte' : c.nome)}
                style={{ background: filtroCatena === c.nome ? c.colore_hex + '15' : 'white', border: `1.5px solid ${filtroCatena === c.nome ? c.colore_hex : '#e8e6de'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.colore_hex }} />
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1a1a18' }}>{c.nome}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9a9a90' }}>{count} punti vendita</div>
              </div>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>⏳ Caricamento...</div>
        ) : pvFiltrati.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9a90' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: '600', color: '#1a1a18', marginBottom: '8px' }}>Nessun punto vendita trovato</div>
            <div style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Prova ad aumentare il raggio o cambia i filtri</div>
          </div>
        ) : vistaMappa ? (
          /* VISTA MAPPA */
          <div style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '14px', overflow: 'hidden' }}>
            <Mappa
              puntiVendita={pvFiltrati}
              altezza="500px"
              centro={posizione || { lat: 42.5, lng: 12.5 }}
              zoom={posizione ? 12 : 6}
            />
          </div>
        ) : (
          /* VISTA LISTA */
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
                    <div key={pv.id} style={{ background: 'white', border: '1.5px solid #e8e6de', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: (pv.catene?.colore_hex || '#1a7a4a') + '20', border: `1.5px solid ${pv.catene?.colore_hex || '#1a7a4a'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🏪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pv.catene?.colore_hex || '#888' }} />
                            <span style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1a1a18' }}>{pv.catene?.nome}</span>
                          </div>
                          {pv.distanza_km && (
                            <span style={{ background: '#e8f5ee', color: '#1a7a4a', fontSize: '0.72rem', fontWeight: '600', padding: '2px 8px', borderRadius: '10px' }}>
                              {pv.distanza_km} km
                            </span>
                          )}
                        </div>
                        {pv.nome && <div style={{ fontSize: '0.8rem', color: '#5a5a52', marginBottom: '3px' }}>{pv.nome}</div>}
                        <div style={{ fontSize: '0.78rem', color: '#9a9a90' }}>📍 {pv.indirizzo}</div>
                        {pv.cap && <div style={{ fontSize: '0.75rem', color: '#9a9a90' }}>CAP {pv.cap} · {pv.provincia}</div>}
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