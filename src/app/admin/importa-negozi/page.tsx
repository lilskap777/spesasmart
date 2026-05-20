'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const CATENE_OSM: Record<string, { nomi: string[], colore: string }> = {
  'Esselunga': { nomi: ['Esselunga'], colore: '#e63329' },
  'Conad': { nomi: ['Conad', 'Conad City', 'Conad Superstore'], colore: '#1a7a4a' },
  'Carrefour': { nomi: ['Carrefour', 'Carrefour Market', 'Carrefour Express'], colore: '#0066cc' },
  'Lidl': { nomi: ['Lidl'], colore: '#f7c200' },
  'Pam': { nomi: ['Pam', 'Panorama', 'Pam Panorama'], colore: '#e63329' },
  'Eurospin': { nomi: ['Eurospin'], colore: '#ff6b00' },
  'Coop': { nomi: ['Coop', 'Ipercoop', 'Unicoop'], colore: '#e30613' },
  'Aldi': { nomi: ['Aldi'], colore: '#00529b' },
  'MD': { nomi: ['MD', 'MD Discount'], colore: '#d40000' },
}

type Negozio = {
  osm_id: number
  nome: string
  indirizzo: string
  citta: string
  cap: string
  provincia: string
  lat: number
  lng: number
  selezionato: boolean
}

export default function ImportaNegozi() {
  const [catenaSelezionata, setCatenaSelezionata] = useState('')
  const [catenaDB, setCatenaDB] = useState<any>(null)
  const [negozi, setNegozi] = useState<Negozio[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'scegli' | 'anteprima' | 'importing' | 'done'>('scegli')
  const [importati, setImportati] = useState(0)
  const [errore, setErrore] = useState('')
  const [regione, setRegione] = useState('italia')

  const REGIONI: Record<string, string> = {
    italia: 'Italia',
    lombardia: 'Lombardia',
    lazio: 'Lazio',
    campania: 'Campania',
    sicilia: 'Sicilia',
    veneto: 'Veneto',
    piemonte: 'Piemonte',
    emilia_romagna: 'Emilia-Romagna',
    toscana: 'Toscana',
    puglia: 'Puglia',
  }

  // Bounding box per regione italiana
  const BBOX: Record<string, string> = {
    italia: '36.0,6.0,47.5,19.0',
    lombardia: '44.6,8.5,46.7,11.4',
    lazio: '41.1,11.4,42.8,13.9',
    campania: '39.9,13.8,41.5,16.0',
    sicilia: '36.5,11.9,38.4,15.7',
    veneto: '44.7,10.6,46.7,13.1',
    piemonte: '43.8,6.6,45.9,9.3',
    emilia_romagna: '43.7,9.1,45.1,12.8',
    toscana: '42.2,9.7,44.5,12.4',
    puglia: '39.7,14.9,41.9,18.5',
  }

  async function cercaNegozi() {
    if (!catenaSelezionata) { setErrore('Seleziona una catena'); return }
    setLoading(true)
    setErrore('')
    setNegozi([])

    try {
      // Prima trova la catena nel DB
      const { data: catData } = await supabase
        .from('catene')
        .select('*')
        .ilike('nome', `%${catenaSelezionata}%`)
        .single()
      setCatenaDB(catData)

      // Nomi da cercare su OSM
      const nomi = CATENE_OSM[catenaSelezionata]?.nomi || [catenaSelezionata]
      const bbox = BBOX[regione] || BBOX.italia

      // Query Overpass API
      const nomiQuery = nomi.map(n =>
        `node["shop"="supermarket"]["name"~"${n}",i](${bbox});
         way["shop"="supermarket"]["name"~"${n}",i](${bbox});`
      ).join('\n')

      const query = `
        [out:json][timeout:60];
        (
          ${nomiQuery}
        );
        out center;
      `

      const res = await fetch('/api/osm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
})

if (!res.ok) throw new Error('Errore Overpass API')

const data = await res.json()
      const elementi = data.elements || []

      // Trasforma i risultati
      const negoziFiltrati: Negozio[] = elementi
        .filter((el: any) => el.lat || el.center?.lat)
        .map((el: any) => {
          const lat = el.lat || el.center?.lat
          const lng = el.lon || el.center?.lon
          const tags = el.tags || {}

          const via = tags['addr:street'] || ''
          const numero = tags['addr:housenumber'] || ''
          const indirizzo = via ? `${via}${numero ? ' ' + numero : ''}` : 'Indirizzo non disponibile'
          const citta = tags['addr:city'] || tags['addr:municipality'] || ''
          const cap = tags['addr:postcode'] || ''

          return {
            osm_id: el.id,
            nome: tags.name || catenaSelezionata,
            indirizzo,
            citta,
            cap,
            provincia: '',
            lat,
            lng,
            selezionato: true
          }
        })
        .filter((n: Negozio) => n.citta || n.indirizzo !== 'Indirizzo non disponibile')

      setNegozi(negoziFiltrati)
      setStep('anteprima')

    } catch (e: any) {
      setErrore('Errore: ' + e.message + '. Riprova tra qualche secondo.')
    }
    setLoading(false)
  }

  async function importa() {
    if (!catenaDB) { setErrore('Catena non trovata nel database'); return }
    const selezionati = negozi.filter(n => n.selezionato)
    if (selezionati.length === 0) { setErrore('Seleziona almeno un negozio'); return }

    setStep('importing')
    setImportati(0)
    let count = 0

    for (const negozio of selezionati) {
      try {
        // Controlla se esiste già (stesse coordinate)
        const { data: esistente } = await supabase
          .from('punti_vendita')
          .select('id')
          .eq('catena_id', catenaDB.id)
          .gte('lat', negozio.lat - 0.001)
          .lte('lat', negozio.lat + 0.001)
          .limit(1)

        if (esistente && esistente.length > 0) {
          count++
          setImportati(count)
          continue
        }

        await supabase.from('punti_vendita').insert({
          catena_id: catenaDB.id,
          nome: negozio.nome !== catenaSelezionata ? negozio.nome : null,
          indirizzo: negozio.indirizzo,
          citta: negozio.citta || 'Non disponibile',
          cap: negozio.cap || null,
          lat: negozio.lat,
          lng: negozio.lng,
          attivo: true
        })
        count++
        setImportati(count)
      } catch (e) {
        console.error('Errore inserimento:', e)
        count++
        setImportati(count)
      }
    }

    setStep('done')
  }

  const s = {
    page: { fontFamily: 'system-ui, sans-serif', background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' },
    topbar: { background: '#161b27', borderBottom: '1px solid #2a3045', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    content: { padding: '28px', maxWidth: '900px', margin: '0 auto' },
    panel: { background: '#161b27', border: '1px solid #2a3045', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' },
    select: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    btnGreen: { background: '#22c55e', color: '#0a1a0f', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
    btnGray: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem' },
  }

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin/punti-vendita" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem' }}>← Punti vendita</Link>
          <span style={{ color: '#4a5568' }}>/</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}>🗺️ Importa da OpenStreetMap</span>
        </div>
      </div>

      <div style={s.content}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>🗺️ Importa negozi da OpenStreetMap</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
          Cerca e importa automaticamente tutti i punti vendita di una catena in Italia. Gratis, nessun limite.
        </p>

        {errore && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.85rem' }}>
            ❌ {errore}
          </div>
        )}

        {/* STEP: SCEGLI */}
        {step === 'scegli' && (
          <div style={s.panel}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a3045' }}>
              <span style={{ fontWeight: '600' }}>1. Seleziona catena e area</span>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#4a5568', marginBottom: '6px', display: 'block' }}>
                  Catena supermercato
                </label>
                <select style={s.select} value={catenaSelezionata} onChange={e => setCatenaSelezionata(e.target.value)}>
                  <option value="">— Seleziona catena —</option>
                  {Object.keys(CATENE_OSM).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#4a5568', marginBottom: '6px', display: 'block' }}>
                  Area geografica
                </label>
                <select style={s.select} value={regione} onChange={e => setRegione(e.target.value)}>
                  {Object.entries(REGIONI).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '16px' }}>
                  💡 OpenStreetMap è un database geografico open source aggiornato dalla community. I dati dei supermercati italiani sono molto completi. La ricerca può richiedere 10-30 secondi.
                </div>
                <button style={s.btnGreen} onClick={cercaNegozi} disabled={loading}>
                  {loading ? '⏳ Ricerca in corso...' : '🔍 Cerca negozi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: ANTEPRIMA */}
        {step === 'anteprima' && (
          <>
            <div style={{ ...s.panel, border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a3045', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#22c55e' }}>
                    ✓ Trovati {negozi.length} negozi {catenaSelezionata}
                  </span>
                  <span style={{ color: '#4a5568', fontSize: '0.82rem', marginLeft: '8px' }}>
                    in {REGIONI[regione]}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {negozi.filter(n => n.selezionato).length} selezionati
                  </span>
                  <button style={s.btnGray} onClick={() => setNegozi(negozi.map(n => ({ ...n, selezionato: true })))}>
                    Tutti
                  </button>
                  <button style={s.btnGray} onClick={() => setNegozi(negozi.map(n => ({ ...n, selezionato: false })))}>
                    Nessuno
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {negozi.map((negozio, i) => (
                  <div key={negozio.osm_id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px', borderBottom: '1px solid #2a3045',
                    opacity: negozio.selezionato ? 1 : 0.4,
                    transition: 'opacity 0.15s'
                  }}>
                    <input type="checkbox" checked={negozio.selezionato}
                      onChange={() => setNegozi(negozi.map((n, j) => j === i ? { ...n, selezionato: !n.selezionato } : n))}
                      style={{ accentColor: '#22c55e', width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '500', color: '#e2e8f0' }}>{negozio.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                        📍 {negozio.indirizzo}{negozio.citta ? ` · ${negozio.citta}` : ''}{negozio.cap ? ` ${negozio.cap}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#4a5568', fontFamily: 'monospace' }}>
                      {negozio.lat.toFixed(4)}, {negozio.lng.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={s.btnGreen} onClick={importa}>
                💾 Importa {negozi.filter(n => n.selezionato).length} negozi nel database
              </button>
              <button style={s.btnGray} onClick={() => { setStep('scegli'); setNegozi([]) }}>
                ← Cambia catena
              </button>
            </div>
          </>
        )}

        {/* STEP: IMPORTING */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>💾</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px' }}>
              Importazione in corso...
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
              {importati} / {negozi.filter(n => n.selezionato).length} negozi importati
            </p>
            <div style={{ background: '#1e2535', borderRadius: '8px', height: '8px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto' }}>
              <div style={{
                height: '100%',
                width: `${(importati / Math.max(negozi.filter(n => n.selezionato).length, 1)) * 100}%`,
                background: '#22c55e', borderRadius: '8px', transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', color: '#22c55e' }}>
              Importazione completata!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
              <strong style={{ color: '#e2e8f0' }}>{importati} negozi {catenaSelezionata}</strong> importati nel database
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <button style={s.btnGreen} onClick={() => { setStep('scegli'); setNegozi([]); setCatenaSelezionata('') }}>
                🔄 Importa un'altra catena
              </button>
              <Link href="/admin/punti-vendita" style={{ ...s.btnGray, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                🏪 Vedi punti vendita →
              </Link>
              <Link href="/supermercati" style={{ ...s.btnGray, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                🌐 Vedi sul sito
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}