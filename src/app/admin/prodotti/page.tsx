'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const CATEGORIE = [
  'latticini', 'carne', 'pesce', 'salumi', 'frutta',
  'verdura', 'pasta_riso', 'condimenti', 'bevande',
  'dolci_snack', 'pane_bakery', 'surgelati',
  'igiene_persona', 'pulizia_casa', 'altro'
]

const EMOJI_MAP: Record<string, string> = {
  latticini: '🥛', carne: '🥩', pesce: '🐟', salumi: '🥓',
  frutta: '🍎', verdura: '🥦', pasta_riso: '🍝', condimenti: '🫒',
  bevande: '🥤', dolci_snack: '🍫', pane_bakery: '🍞',
  surgelati: '🧊', igiene_persona: '🧴', pulizia_casa: '🧹', altro: '🛒'
}

const vuoto = {
  nome: '', marca: '', categoria: 'altro', grammatura: '',
  descrizione: '', emoji: '🛒', barcode: ''
}

export default function AdminProdotti() {
  const [prodotti, setProdotti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostraForm, setMostraForm] = useState(false)
  const [form, setForm] = useState({ ...vuoto })
  const [editId, setEditId] = useState<string | null>(null)
  const [salvataggio, setSalvataggio] = useState(false)
  const [ricerca, setRicerca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('tutte')
  const [toast, setToast] = useState<{ msg: string, tipo: 'ok' | 'err' } | null>(null)
  const [confermaElimina, setConfermaElimina] = useState<string | null>(null)

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    const { data } = await supabase
      .from('prodotti')
      .select('*')
      .order('created_at', { ascending: false })
    setProdotti(data || [])
    setLoading(false)
  }

  function mostraToast(msg: string, tipo: 'ok' | 'err') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  function apriNuovo() {
    setForm({ ...vuoto })
    setEditId(null)
    setMostraForm(true)
  }

  function apriModifica(p: any) {
    setForm({
      nome: p.nome || '',
      marca: p.marca || '',
      categoria: p.categoria || 'altro',
      grammatura: p.grammatura || '',
      descrizione: p.descrizione || '',
      emoji: p.emoji || '🛒',
      barcode: p.barcode || ''
    })
    setEditId(p.id)
    setMostraForm(true)
  }

  function aggiornaForm(campo: string, valore: string) {
    const aggiornato = { ...form, [campo]: valore }
    if (campo === 'categoria') {
      aggiornato.emoji = EMOJI_MAP[valore] || '🛒'
    }
    setForm(aggiornato)
  }

  async function salva() {
    if (!form.nome.trim()) { mostraToast('Il nome è obbligatorio', 'err'); return }
    setSalvataggio(true)
    try {
      if (editId) {
        const { error } = await supabase.from('prodotti').update(form).eq('id', editId)
        if (error) throw error
        mostraToast('Prodotto aggiornato!', 'ok')
      } else {
        const { error } = await supabase.from('prodotti').insert(form)
        if (error) throw error
        mostraToast('Prodotto aggiunto!', 'ok')
      }
      setMostraForm(false)
      setEditId(null)
      setForm({ ...vuoto })
      carica()
    } catch (e: any) {
      mostraToast('Errore: ' + e.message, 'err')
    }
    setSalvataggio(false)
  }

  async function elimina(id: string) {
    try {
      const { error } = await supabase.from('prodotti').delete().eq('id', id)
      if (error) throw error
      mostraToast('Prodotto eliminato', 'ok')
      setConfermaElimina(null)
      carica()
    } catch (e: any) {
      mostraToast('Errore: ' + e.message, 'err')
    }
  }

  const prodottiFiltrati = prodotti.filter(p => {
    const matchRicerca = p.nome?.toLowerCase().includes(ricerca.toLowerCase()) ||
      p.marca?.toLowerCase().includes(ricerca.toLowerCase())
    const matchCategoria = filtroCategoria === 'tutte' || p.categoria === filtroCategoria
    return matchRicerca && matchCategoria
  })

  const s = {
    page: { fontFamily: 'system-ui, sans-serif', background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' },
    topbar: { background: '#161b27', borderBottom: '1px solid #2a3045', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    content: { padding: '28px', maxWidth: '1100px', margin: '0 auto' },
    panel: { background: '#161b27', border: '1px solid #2a3045', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' },
    panelHeader: { padding: '14px 20px', borderBottom: '1px solid #2a3045', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    input: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    select: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', fontFamily: 'system-ui' },
    label: { fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#4a5568', marginBottom: '6px', display: 'block' },
    btnGreen: { background: '#22c55e', color: '#0a1a0f', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' },
    btnGray: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '9px 18px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '0.85rem' },
    btnRed: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
    btnEdit: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' },
  }

  return (
    <div style={s.page}>

      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem' }}>← Admin</Link>
          <span style={{ color: '#4a5568' }}>/</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}>Prodotti</span>
        </div>
        <button style={s.btnGreen} onClick={apriNuovo}>+ Nuovo prodotto</button>
      </div>

      <div style={s.content}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>📦 Prodotti</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
          {prodotti.length} prodotti nel database
        </p>

        {/* FORM AGGIUNTA / MODIFICA */}
        {mostraForm && (
          <div style={{ ...s.panel, border: '1px solid #22c55e33', marginBottom: '24px' }}>
            <div style={s.panelHeader}>
              <span style={{ fontWeight: '600', color: '#22c55e' }}>
                {editId ? '✏️ Modifica prodotto' : '➕ Nuovo prodotto'}
              </span>
              <button style={s.btnGray} onClick={() => { setMostraForm(false); setEditId(null) }}>✕ Annulla</button>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={s.label}>Nome prodotto *</label>
                <input style={s.input} placeholder="es. Latte Intero UHT 1L"
                  value={form.nome} onChange={e => aggiornaForm('nome', e.target.value)} />
              </div>

              <div>
                <label style={s.label}>Marca</label>
                <input style={s.input} placeholder="es. Granarolo"
                  value={form.marca} onChange={e => aggiornaForm('marca', e.target.value)} />
              </div>

              <div>
                <label style={s.label}>Grammatura</label>
                <input style={s.input} placeholder="es. 1L, 500g, 6 pz"
                  value={form.grammatura} onChange={e => aggiornaForm('grammatura', e.target.value)} />
              </div>

              <div>
                <label style={s.label}>Categoria</label>
                <select style={{ ...s.select, width: '100%' }}
                  value={form.categoria} onChange={e => aggiornaForm('categoria', e.target.value)}>
                  {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={s.label}>Emoji</label>
                <input style={s.input} placeholder="🛒"
                  value={form.emoji} onChange={e => aggiornaForm('emoji', e.target.value)} />
              </div>

              <div>
                <label style={s.label}>Barcode (opzionale)</label>
                <input style={s.input} placeholder="es. 8001234567890"
                  value={form.barcode} onChange={e => aggiornaForm('barcode', e.target.value)} />
              </div>

              <div>
                <label style={s.label}>Descrizione (opzionale)</label>
                <input style={s.input} placeholder="Descrizione breve"
                  value={form.descrizione} onChange={e => aggiornaForm('descrizione', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button style={s.btnGreen} onClick={salva} disabled={salvataggio}>
                  {salvataggio ? '⏳ Salvataggio...' : editId ? '💾 Aggiorna' : '💾 Salva prodotto'}
                </button>
                <button style={s.btnGray} onClick={() => { setMostraForm(false); setEditId(null) }}>Annulla</button>
              </div>
            </div>
          </div>
        )}

        {/* FILTRI */}
        <div style={{ ...s.panel }}>
          <div style={{ padding: '14px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
            <input style={{ ...s.input, maxWidth: '280px' }}
              placeholder="🔍 Cerca prodotto o marca..."
              value={ricerca} onChange={e => setRicerca(e.target.value)} />
            <select style={s.select}
              value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="tutte">Tutte le categorie</option>
              {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ color: '#4a5568', fontSize: '0.82rem', display: 'flex', alignItems: 'center' }}>
              {prodottiFiltrati.length} risultati
            </span>
          </div>

          {/* TABELLA */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>⏳ Caricamento...</div>
          ) : prodottiFiltrati.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#4a5568' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
              <div>Nessun prodotto trovato</div>
              <button style={{ ...s.btnGreen, marginTop: '16px' }} onClick={apriNuovo}>+ Aggiungi il primo</button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e2535' }}>
                  {['Prodotto', 'Categoria', 'Grammatura', 'Barcode', 'Azioni'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prodottiFiltrati.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #2a3045' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                          {p.emoji || '🛒'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '0.88rem', color: '#e2e8f0' }}>{p.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>{p.marca || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>{p.categoria}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>{p.grammatura || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: '#4a5568', fontFamily: 'monospace' }}>{p.barcode || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {confermaElimina === p.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Sicuro?</span>
                          <button style={s.btnRed} onClick={() => elimina(p.id)}>Sì, elimina</button>
                          <button style={s.btnGray} onClick={() => setConfermaElimina(null)}>No</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={s.btnEdit} onClick={() => apriModifica(p)}>✏️ Modifica</button>
                          <button style={s.btnRed} onClick={() => setConfermaElimina(p.id)}>🗑 Elimina</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
