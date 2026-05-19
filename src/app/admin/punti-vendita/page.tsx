'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { APIProvider } from '@vis.gl/react-google-maps'
import Mappa from '@/components/Mappa'

export default function AdminPuntiVendita() {
  const [puntiVendita, setPuntiVendita] = useState<any[]>([])
  const [catene, setCatene] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostraForm, setMostraForm] = useState(false)
  const [salvataggio, setSalvataggio] = useState(false)
  const [toast, setToast] = useState<{ msg: string, tipo: 'ok' | 'err' } | null>(null)
  const [ricercaIndirizzo, setRicercaIndirizzo] = useState('')
  const [suggerimenti, setSuggerimenti] = useState<any[]>([])
  const [loadingGeo, setLoadingGeo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    catena_id: '',
    nome: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    lat: '',
    lng: '',
    telefono: ''
  })

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    const [{ data: pv }, { data: cat }] = await Promise.all([
      supabase.from('punti_vendita').select('*, catene(nome, colore_hex)').eq('attivo', true).order('citta'),
      supabase.from('catene').select('*').eq('attiva', true).order('nome')
    ])
    setPuntiVendita(pv || [])
    setCatene(cat || [])
    setLoading(false)
  }

  function mostraToast(msg: string, tipo: 'ok' | 'err') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // Geocoding: cerca indirizzo tramite Google
  async function cercaIndirizzo(query: string) {
    if (!query.trim() || query.length < 3) { setSuggerimenti([]); return }
    setLoadingGeo(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', Italia')}&key=${apiKey}&language=it&region=it`
      )
      const data = await res.json()
      setSuggerimenti(data.results?.slice(0, 5) || [])
    } catch (e) {
      console.error(e)
    }
    setLoadingGeo(false)
  }

  function selezionaIndirizzo(risultato: any) {
    const lat = risultato.geometry.location.lat
    const lng = risultato.geometry.location.lng
    const components = risultato.address_components

    const getComp = (type: string) =>
      components.find((c: any) => c.types.includes(type))?.long_name || ''

    const getCompShort = (type: string) =>
      components.find((c: any) => c.types.includes(type))?.short_name || ''

    const strada = getComp('route')
    const numero = getComp('street_number')
    const citta = getComp('locality') || getComp('administrative_area_level_3')
    const cap = getComp('postal_code')
    const provincia = getCompShort('administrative_area_level_2')

    setForm(prev => ({
      ...prev,
      indirizzo: `${strada}${numero ? ' ' + numero : ''}`,
      citta,
      cap,
      provincia,
      lat: lat.toString(),
      lng: lng.toString()
    }))
    setRicercaIndirizzo(risultato.formatted_address)
    setSuggerimenti([])
  }

  async function salva() {
    if (!form.catena_id) { mostraToast('Seleziona la catena', 'err'); return }
    if (!form.indirizzo) { mostraToast('Inserisci l\'indirizzo', 'err'); return }
    if (!form.lat || !form.lng) { mostraToast('Cerca e seleziona l\'indirizzo dalla lista', 'err'); return }

    setSalvataggio(true)
    try {
      const { error } = await supabase.from('punti_vendita').insert({
        catena_id: form.catena_id,
        nome: form.nome || null,
        indirizzo: form.indirizzo,
        citta: form.citta,
        cap: form.cap || null,
        provincia: form.provincia || null,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        telefono: form.telefono || null,
        attivo: true
      })
      if (error) throw error
      mostraToast('Punto vendita aggiunto!', 'ok')
      setMostraForm(false)
      setForm({ catena_id: '', nome: '', indirizzo: '', citta: '', cap: '', provincia: '', lat: '', lng: '', telefono: '' })
      setRicercaIndirizzo('')
      carica()
    } catch (e: any) {
      mostraToast('Errore: ' + e.message, 'err')
    }
    setSalvataggio(false)
  }

  async function elimina(id: string) {
    await supabase.from('punti_vendita').update({ attivo: false }).eq('id', id)
    mostraToast('Punto vendita rimosso', 'ok')
    carica()
  }

  const s = {
    page: { fontFamily: 'system-ui, sans-serif', background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' },
    topbar: { background: '#161b27', borderBottom: '1px solid #2a3045', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    content: { padding: '28px', maxWidth: '1100px', margin: '0 auto' },
    panel: { background: '#161b27', border: '1px solid #2a3045', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' },
    input: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    select: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    label: { fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#4a5568', marginBottom: '6px', display: 'block' },
    btnGreen: { background: '#22c55e', color: '#0a1a0f', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' },
    btnGray: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' },
    btnRed: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
  }

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem' }}>← Admin</Link>
          <span style={{ color: '#4a5568' }}>/</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}>🏪 Punti vendita</span>
        </div>
        <button style={s.btnGreen} onClick={() => setMostraForm(!mostraForm)}>
          {mostraForm ? '✕ Annulla' : '+ Aggiungi punto vendita'}
        </button>
      </div>

      <div style={s.content}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>🏪 Punti vendita</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
          {puntiVendita.length} punti vendita registrati
        </p>

        {/* FORM AGGIUNGI */}
        {mostraForm && (
          <div style={{ ...s.panel, border: '1px solid #22c55e33', marginBottom: '24px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a3045' }}>
              <span style={{ fontWeight: '600', color: '#22c55e' }}>➕ Nuovo punto vendita</span>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* RICERCA INDIRIZZO */}
              <div style={{ gridColumn: '1/-1', position: 'relative' }}>
                <label style={s.label}>🔍 Cerca indirizzo (Google Maps)</label>
                <input
                  ref={inputRef}
                  style={s.input}
                  placeholder="es. Esselunga Via Solari 42 Milano"
                  value={ricercaIndirizzo}
                  onChange={e => {
                    setRicercaIndirizzo(e.target.value)
                    cercaIndirizzo(e.target.value)
                  }}
                />
                {loadingGeo && (
                  <div style={{ position: 'absolute', right: '12px', top: '34px', color: '#4a5568', fontSize: '0.8rem' }}>
                    ⏳
                  </div>
                )}
                {suggerimenti.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '62px', left: 0, right: 0,
                    background: '#1e2535', border: '1px solid #2a3045',
                    borderRadius: '8px', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}>
                    {suggerimenti.map((s, i) => (
                      <div key={i}
                        onClick={() => selezionaIndirizzo(s)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #2a3045', fontSize: '0.82rem', color: '#e2e8f0' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2a3045'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        📍 {s.formatted_address}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={s.label}>Catena *</label>
                <select style={s.select} value={form.catena_id} onChange={e => setForm({ ...form, catena_id: e.target.value })}>
                  <option value="">— Seleziona catena —</option>
                  {catene.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={s.label}>Nome negozio (opzionale)</label>
                <input style={s.input} placeholder="es. Conad City Centro"
                  value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>Indirizzo</label>
                <input style={s.input} placeholder="Via Roma 1"
                  value={form.indirizzo} onChange={e => setForm({ ...form, indirizzo: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>Città</label>
                <input style={s.input} placeholder="Milano"
                  value={form.citta} onChange={e => setForm({ ...form, citta: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>CAP</label>
                <input style={s.input} placeholder="20121"
                  value={form.cap} onChange={e => setForm({ ...form, cap: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>Provincia</label>
                <input style={s.input} placeholder="MI"
                  value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>Latitudine</label>
                <input style={{ ...s.input, color: form.lat ? '#22c55e' : '#4a5568' }}
                  placeholder="Compilato automaticamente"
                  value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>Longitudine</label>
                <input style={{ ...s.input, color: form.lng ? '#22c55e' : '#4a5568' }}
                  placeholder="Compilato automaticamente"
                  value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} />
              </div>

              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px' }}>
                <button style={s.btnGreen} onClick={salva} disabled={salvataggio}>
                  {salvataggio ? '⏳ Salvataggio...' : '💾 Aggiungi punto vendita'}
                </button>
                <button style={s.btnGray} onClick={() => setMostraForm(false)}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* MAPPA */}
        {puntiVendita.length > 0 && (
          <div style={{ ...s.panel, padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '600', marginBottom: '14px', fontSize: '0.9rem' }}>
              🗺️ Mappa punti vendita
            </div>
            <Mappa
              puntiVendita={puntiVendita}
              altezza="350px"
              zoom={6}
              centro={{ lat: 42.5, lng: 12.5 }}
            />
          </div>
        )}

        {/* LISTA */}
        <div style={s.panel}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a3045' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Lista punti vendita</span>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>⏳ Caricamento...</div>
          ) : puntiVendita.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
              <div>Nessun punto vendita ancora</div>
              <button style={{ ...s.btnGreen, marginTop: '16px' }} onClick={() => setMostraForm(true)}>
                + Aggiungi il primo
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e2535' }}>
                  {['Catena', 'Nome', 'Indirizzo', 'Città', 'Coordinate', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {puntiVendita.map(pv => (
                  <tr key={pv.id} style={{ borderBottom: '1px solid #2a3045' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pv.catene?.colore_hex || '#888' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#e2e8f0' }}>{pv.catene?.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>{pv.nome || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>{pv.indirizzo}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>{pv.citta}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: '#4a5568', fontFamily: 'monospace' }}>
                      {Number(pv.lat).toFixed(4)}, {Number(pv.lng).toFixed(4)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button style={s.btnRed} onClick={() => elimina(pv.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#161b27', border: `1px solid ${toast.tipo === 'ok' ? '#22c55e' : '#ef4444'}`,
          borderLeft: `3px solid ${toast.tipo === 'ok' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '10px', padding: '12px 18px', color: '#e2e8f0', fontSize: '0.85rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.tipo === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  )
}