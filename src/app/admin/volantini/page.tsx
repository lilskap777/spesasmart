'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const vuotoVolantino = {
  nome: '', catena_id: '', data_inizio: '', data_fine: '',
  area_geografica: 'italia', stato: 'attivo'
}

const vuotoPrezzo = {
  prodotto_id: '', prezzo_scontato: '', prezzo_pieno: '',
  note_offerta: '', data_inizio: '', data_fine: ''
}

export default function AdminVolantini() {
  const [volantini, setVolantini] = useState<any[]>([])
  const [catene, setCatene] = useState<any[]>([])
  const [prodotti, setProdotti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostraFormVol, setMostraFormVol] = useState(false)
  const [mostraFormPrezzo, setMostraFormPrezzo] = useState(false)
  const [formVol, setFormVol] = useState({ ...vuotoVolantino })
  const [formPrezzo, setFormPrezzo] = useState({ ...vuotoPrezzo })
  const [editVolId, setEditVolId] = useState<string | null>(null)
  const [volantinoAttivo, setVolantinoAttivo] = useState<any | null>(null)
  const [prezziVolantino, setPrezziVolantino] = useState<any[]>([])
  const [salvataggio, setSalvataggio] = useState(false)
  const [toast, setToast] = useState<{ msg: string, tipo: 'ok' | 'err' } | null>(null)
  const [confermaElimina, setConfermaElimina] = useState<string | null>(null)

  useEffect(() => { caricaTutto() }, [])

  async function caricaTutto() {
    setLoading(true)
    const [{ data: vol }, { data: cat }, { data: prod }] = await Promise.all([
      supabase.from('volantini').select('*, catene(nome, colore_hex)').order('created_at', { ascending: false }),
      supabase.from('catene').select('*').eq('attiva', true).order('nome'),
      supabase.from('prodotti').select('*').order('nome')
    ])
    setVolantini(vol || [])
    setCatene(cat || [])
    setProdotti(prod || [])
    setLoading(false)
  }

  async function caricaPrezziVolantino(volId: string) {
    const { data } = await supabase
      .from('prezzi')
      .select('*, prodotti(nome, marca, emoji)')
      .eq('volantino_id', volId)
      .order('created_at', { ascending: false })
    setPrezziVolantino(data || [])
  }

  function mostraToast(msg: string, tipo: 'ok' | 'err') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  function apriNuovoVolantino() {
    setFormVol({ ...vuotoVolantino })
    setEditVolId(null)
    setMostraFormVol(true)
    setVolantinoAttivo(null)
  }

  function apriModificaVolantino(v: any) {
    setFormVol({
      nome: v.nome || '',
      catena_id: v.catena_id || '',
      data_inizio: v.data_inizio || '',
      data_fine: v.data_fine || '',
      area_geografica: v.area_geografica || 'italia',
      stato: v.stato || 'attivo'
    })
    setEditVolId(v.id)
    setMostraFormVol(true)
    setVolantinoAttivo(null)
  }

  async function salvaVolantino() {
    if (!formVol.nome.trim()) { mostraToast('Il nome è obbligatorio', 'err'); return }
    if (!formVol.catena_id) { mostraToast('Seleziona una catena', 'err'); return }
    if (!formVol.data_inizio || !formVol.data_fine) { mostraToast('Inserisci le date di validità', 'err'); return }
    setSalvataggio(true)
    try {
      if (editVolId) {
        const { error } = await supabase.from('volantini').update(formVol).eq('id', editVolId)
        if (error) throw error
        mostraToast('Volantino aggiornato!', 'ok')
      } else {
        const { error } = await supabase.from('volantini').insert(formVol)
        if (error) throw error
        mostraToast('Volantino creato!', 'ok')
      }
      setMostraFormVol(false)
      setEditVolId(null)
      caricaTutto()
    } catch (e: any) {
      mostraToast('Errore: ' + e.message, 'err')
    }
    setSalvataggio(false)
  }

  async function eliminaVolantino(id: string) {
    try {
      await supabase.from('prezzi').delete().eq('volantino_id', id)
      const { error } = await supabase.from('volantini').delete().eq('id', id)
      if (error) throw error
      mostraToast('Volantino eliminato', 'ok')
      setConfermaElimina(null)
      if (volantinoAttivo?.id === id) setVolantinoAttivo(null)
      caricaTutto()
    } catch (e: any) {
      mostraToast('Errore: ' + e.message, 'err')
    }
  }

  function apriGestionePrezzi(v: any) {
    setVolantinoAttivo(v)
    setMostraFormVol(false)
    setFormPrezzo({
      ...vuotoPrezzo,
      data_inizio: v.data_inizio,
      data_fine: v.data_fine
    })
    caricaPrezziVolantino(v.id)
  }

  async function salvaPrezzo() {
    if (!formPrezzo.prodotto_id) { mostraToast('Seleziona un prodotto', 'err'); return }
    if (!formPrezzo.prezzo_scontato) { mostraToast('Inserisci il prezzo', 'err'); return }
    setSalvataggio(true)
    try {
      const catena = catene.find(c => c.id === volantinoAttivo.catena_id)
      const payload = {
        prodotto_id: formPrezzo.prodotto_id,
        volantino_id: volantinoAttivo.id,
        catena_id: volantinoAttivo.catena_id,
        prezzo_scontato: parseFloat(formPrezzo.prezzo_scontato),
        prezzo_pieno: formPrezzo.prezzo_pieno ? parseFloat(formPrezzo.prezzo_pieno) : null,
        note_offerta: formPrezzo.note_offerta || null,
        data_inizio: formPrezzo.data_inizio || volantinoAttivo.data_inizio,
        data_fine: formPrezzo.data_fine || volantinoAttivo.data_fine,
        verificato: true
      }
      const { error } = await supabase.from('prezzi').insert(payload)
      if (error) throw error
      mostraToast('Prezzo aggiunto!', 'ok')
      setFormPrezzo({ ...vuotoPrezzo, data_inizio: volantinoAttivo.data_inizio, data_fine: volantinoAttivo.data_fine })
      caricaPrezziVolantino(volantinoAttivo.id)
    } catch (e: any) {
      mostraToast('Errore: ' + e.message, 'err')
    }
    setSalvataggio(false)
  }

  async function eliminaPrezzo(id: string) {
    await supabase.from('prezzi').delete().eq('id', id)
    mostraToast('Prezzo eliminato', 'ok')
    caricaPrezziVolantino(volantinoAttivo.id)
  }

  const statoColore: Record<string, string> = {
    attivo: '#22c55e', bozza: '#f59e0b', scaduto: '#6b7280', archiviato: '#6b7280'
  }

  const s = {
    page: { fontFamily: 'system-ui, sans-serif', background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' },
    topbar: { background: '#161b27', borderBottom: '1px solid #2a3045', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    content: { padding: '28px', maxWidth: '1100px', margin: '0 auto' },
    panel: { background: '#161b27', border: '1px solid #2a3045', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' },
    panelHeader: { padding: '14px 20px', borderBottom: '1px solid #2a3045', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    input: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    select: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    label: { fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#4a5568', marginBottom: '6px', display: 'block' },
    btnGreen: { background: '#22c55e', color: '#0a1a0f', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' },
    btnBlue: { background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
    btnGray: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '9px 18px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '0.85rem' },
    btnRed: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
    btnEdit: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
  }

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem' }}>← Admin</Link>
          <span style={{ color: '#4a5568' }}>/</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}>Volantini</span>
          {volantinoAttivo && <>
            <span style={{ color: '#4a5568' }}>/</span>
            <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>{volantinoAttivo.nome}</span>
          </>}
        </div>
        {!volantinoAttivo && (
          <button style={s.btnGreen} onClick={apriNuovoVolantino}>+ Nuovo volantino</button>
        )}
        {volantinoAttivo && (
          <button style={s.btnGray} onClick={() => setVolantinoAttivo(null)}>← Torna ai volantini</button>
        )}
      </div>

      <div style={s.content}>

        {/* VISTA PRINCIPALE — lista volantini */}
        {!volantinoAttivo && <>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>📄 Volantini</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>{volantini.length} volantini nel database</p>

          {/* FORM NUOVO/MODIFICA VOLANTINO */}
          {mostraFormVol && (
            <div style={{ ...s.panel, border: '1px solid #22c55e33', marginBottom: '24px' }}>
              <div style={s.panelHeader}>
                <span style={{ fontWeight: '600', color: '#22c55e' }}>
                  {editVolId ? '✏️ Modifica volantino' : '➕ Nuovo volantino'}
                </span>
                <button style={s.btnGray} onClick={() => setMostraFormVol(false)}>✕ Annulla</button>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={s.label}>Nome volantino *</label>
                  <input style={s.input} placeholder="es. Settimana 20 — Offerte speciali"
                    value={formVol.nome} onChange={e => setFormVol({ ...formVol, nome: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Catena *</label>
                  <select style={s.select} value={formVol.catena_id} onChange={e => setFormVol({ ...formVol, catena_id: e.target.value })}>
                    <option value="">— Seleziona catena —</option>
                    {catene.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Area geografica</label>
                  <select style={s.select} value={formVol.area_geografica} onChange={e => setFormVol({ ...formVol, area_geografica: e.target.value })}>
                    <option value="italia">Tutta Italia</option>
                    <option value="nord">Nord Italia</option>
                    <option value="centro">Centro Italia</option>
                    <option value="sud">Sud Italia</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Valido dal *</label>
                  <input style={s.input} type="date" value={formVol.data_inizio} onChange={e => setFormVol({ ...formVol, data_inizio: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Valido fino al *</label>
                  <input style={s.input} type="date" value={formVol.data_fine} onChange={e => setFormVol({ ...formVol, data_fine: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Stato</label>
                  <select style={s.select} value={formVol.stato} onChange={e => setFormVol({ ...formVol, stato: e.target.value })}>
                    <option value="attivo">Attivo</option>
                    <option value="bozza">Bozza</option>
                    <option value="scaduto">Scaduto</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px' }}>
                  <button style={s.btnGreen} onClick={salvaVolantino} disabled={salvataggio}>
                    {salvataggio ? '⏳ Salvataggio...' : editVolId ? '💾 Aggiorna' : '💾 Crea volantino'}
                  </button>
                  <button style={s.btnGray} onClick={() => setMostraFormVol(false)}>Annulla</button>
                </div>
              </div>
            </div>
          )}

          {/* LISTA VOLANTINI */}
          <div style={s.panel}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>⏳ Caricamento...</div>
            ) : volantini.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <div style={{ marginBottom: '16px' }}>Nessun volantino ancora</div>
                <button style={s.btnGreen} onClick={apriNuovoVolantino}>+ Crea il primo volantino</button>
              </div>
            ) : volantini.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid #2a3045' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#1e2535', border: '1px solid #2a3045', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  📄
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '3px' }}>{v.nome}</div>
                  <div style={{ fontSize: '0.75rem', color: '#4a5568', display: 'flex', gap: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.catene?.colore_hex || '#888', display: 'inline-block' }} />
                      {v.catene?.nome || '—'}
                    </span>
                    <span>📅 {v.data_inizio} → {v.data_fine}</span>
                    <span>🌍 {v.area_geografica}</span>
                  </div>
                </div>
                <div style={{ background: `${statoColore[v.stato]}22`, color: statoColore[v.stato], fontSize: '0.72rem', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>
                  {v.stato}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={s.btnBlue} onClick={() => apriGestionePrezzi(v)}>💰 Prezzi</button>
                  <button style={s.btnEdit} onClick={() => apriModificaVolantino(v)}>✏️</button>
                  {confermaElimina === v.id ? (
                    <>
                      <button style={s.btnRed} onClick={() => eliminaVolantino(v.id)}>Sì</button>
                      <button style={s.btnGray} onClick={() => setConfermaElimina(null)}>No</button>
                    </>
                  ) : (
                    <button style={s.btnRed} onClick={() => setConfermaElimina(v.id)}>🗑</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* VISTA PREZZI VOLANTINO */}
        {volantinoAttivo && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '44px', height: '44px', background: '#1e2535', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📄</div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '700' }}>{volantinoAttivo.nome}</h1>
              <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>
                {volantinoAttivo.catene?.nome} · {volantinoAttivo.data_inizio} → {volantinoAttivo.data_fine}
              </div>
            </div>
          </div>

          {/* FORM AGGIUNGI PREZZO */}
          <div style={{ ...s.panel, border: '1px solid #22c55e33', marginBottom: '24px' }}>
            <div style={s.panelHeader}>
              <span style={{ fontWeight: '600', color: '#22c55e' }}>➕ Aggiungi offerta</span>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={s.label}>Prodotto *</label>
                <select style={s.select} value={formPrezzo.prodotto_id} onChange={e => setFormPrezzo({ ...formPrezzo, prodotto_id: e.target.value })}>
                  <option value="">— Seleziona prodotto —</option>
                  {prodotti.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nome} {p.marca ? `— ${p.marca}` : ''} {p.grammatura ? `(${p.grammatura})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Prezzo scontato (€) *</label>
                <input style={s.input} type="number" step="0.01" placeholder="es. 0.99"
                  value={formPrezzo.prezzo_scontato} onChange={e => setFormPrezzo({ ...formPrezzo, prezzo_scontato: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Prezzo pieno (€)</label>
                <input style={s.input} type="number" step="0.01" placeholder="es. 1.49"
                  value={formPrezzo.prezzo_pieno} onChange={e => setFormPrezzo({ ...formPrezzo, prezzo_pieno: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Note offerta</label>
                <input style={s.input} placeholder="es. 2x1, con Fidelity"
                  value={formPrezzo.note_offerta} onChange={e => setFormPrezzo({ ...formPrezzo, note_offerta: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px' }}>
                <button style={s.btnGreen} onClick={salvaPrezzo} disabled={salvataggio}>
                  {salvataggio ? '⏳...' : '💾 Aggiungi offerta'}
                </button>
              </div>
            </div>
          </div>

          {/* LISTA PREZZI */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <span style={{ fontWeight: '600' }}>💰 Offerte in questo volantino ({prezziVolantino.length})</span>
            </div>
            {prezziVolantino.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <div>Nessuna offerta ancora — aggiungine una sopra!</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e2535' }}>
                    {['Prodotto', 'Prezzo offerta', 'Prezzo pieno', 'Sconto', 'Note', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prezziVolantino.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #2a3045' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{p.prodotti?.emoji || '🛒'}</span>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '0.85rem', color: '#e2e8f0' }}>{p.prodotti?.nome}</div>
                            <div style={{ fontSize: '0.72rem', color: '#4a5568' }}>{p.prodotti?.marca}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#22c55e', fontSize: '1rem' }}>€{Number(p.prezzo_scontato).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', color: '#4a5568', textDecoration: 'line-through', fontSize: '0.85rem' }}>
                        {p.prezzo_pieno ? `€${Number(p.prezzo_pieno).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.percentuale_sconto ? (
                          <span style={{ background: '#f59e0b22', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                            -{p.percentuale_sconto}%
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>{p.note_offerta || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button style={s.btnRed} onClick={() => eliminaPrezzo(p.id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#161b27', border: `1px solid ${toast.tipo === 'ok' ? '#22c55e' : '#ef4444'}`,
          borderLeft: `3px solid ${toast.tipo === 'ok' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '10px', padding: '12px 18px',
          color: '#e2e8f0', fontSize: '0.85rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.tipo === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  )
}
