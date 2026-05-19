'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const CATEGORIE = [
  'latticini', 'carne', 'pesce', 'salumi', 'frutta',
  'verdura', 'pasta_riso', 'condimenti', 'bevande',
  'dolci_snack', 'pane_bakery', 'surgelati',
  'igiene_persona', 'pulizia_casa', 'altro'
]

type Prodotto = {
  id: string
  nome: string
  marca: string
  grammatura: string
  prezzo_scontato: number
  prezzo_pieno: number | null
  categoria: string
  emoji: string
  confidence: number
  selezionato: boolean
  modificato: boolean
}

export default function AdminParser() {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [catena, setCatena] = useState('')
  const [cateneDB, setCateneDB] = useState<any[]>([])
  const [catenaId, setCatenaId] = useState('')
  const [volantinoId, setVolantinoId] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [errore, setErrore] = useState('')
  const [progress, setProgress] = useState(0)
  const [tokensUsati, setTokensUsati] = useState(0)
  const [costoStimato, setCostoStimato] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [prodottiSalvati, setProdottiSalvati] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carica catene al mount
  useState(() => {
    supabase.from('catene').select('*').eq('attiva', true).order('nome')
      .then(({ data }) => setCateneDB(data || []))
  })

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  function handleFileSelect(f: File) {
    setFile(f)
    setErrore('')
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function avviaAnalisi() {
    if (!file) return
    if (!catenaId) { setErrore('Seleziona la catena del supermercato'); return }
    if (!dataInizio || !dataFine) { setErrore('Inserisci le date di validità'); return }

    setStep('processing')
    setProgress(0)
    setErrore('')

    // Simula progress mentre aspettiamo Claude
    const interval = setInterval(() => {
      setProgress(p => p < 85 ? p + Math.random() * 8 : p)
    }, 800)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('catena', catena)
      formData.append('data_inizio', dataInizio)
      formData.append('data_fine', dataFine)

      const res = await fetch('/api/parser', { method: 'POST', body: formData })
      const data = await res.json()

      clearInterval(interval)
      setProgress(100)

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Errore sconosciuto')
      }

      setTokensUsati(data.tokens_usati)
      setCostoStimato(data.costo_stimato)

      // Prepara i prodotti per la review
      const prodottiConId = (data.prodotti || []).map((p: any, i: number) => ({
        ...p,
        id: `p${i}`,
        prezzo_scontato: Number(p.prezzo_scontato) || 0,
        prezzo_pieno: p.prezzo_pieno ? Number(p.prezzo_pieno) : null,
        selezionato: p.confidence >= 70,
        modificato: false
      }))

      setProdotti(prodottiConId)
      setStep('review')

    } catch (e: any) {
      clearInterval(interval)
      setErrore(e.message)
      setStep('upload')
    }
  }

  function aggiornaProdotto(id: string, campo: string, valore: any) {
    setProdotti(ps => ps.map(p =>
      p.id === id ? { ...p, [campo]: valore, modificato: true } : p
    ))
  }

  function rimuoviProdotto(id: string) {
    setProdotti(ps => ps.filter(p => p.id !== id))
  }

  function toggleSelezionato(id: string) {
    setProdotti(ps => ps.map(p =>
      p.id === id ? { ...p, selezionato: !p.selezionato } : p
    ))
  }

  function selezionaTutti() {
    setProdotti(ps => ps.map(p => ({ ...p, selezionato: true })))
  }

  function deselezionaTutti() {
    setProdotti(ps => ps.map(p => ({ ...p, selezionato: false })))
  }

  // Drag & drop per riordinare
  function onDragStart(i: number) { setDragIndex(i) }
  function onDragOverItem(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    const nuovi = [...prodotti]
    const [mosso] = nuovi.splice(dragIndex, 1)
    nuovi.splice(i, 0, mosso)
    setProdotti(nuovi)
    setDragIndex(i)
  }
  function onDragEnd() { setDragIndex(null) }

  async function salvaNelDB() {
    const selezionati = prodotti.filter(p => p.selezionato)
    if (selezionati.length === 0) { setErrore('Seleziona almeno un prodotto da salvare'); return }

    setStep('saving')
    setErrore('')
    let salvati = 0

    try {
      // Prima crea il volantino se non esiste
      let volId = volantinoId
      if (!volId) {
        const nomeVol = `${catena} — ${dataInizio} / ${dataFine}`
        const { data: volData, error: volErr } = await supabase
          .from('volantini')
          .insert({
            catena_id: catenaId,
            nome: nomeVol,
            data_inizio: dataInizio,
            data_fine: dataFine,
            stato: 'attivo',
            area_geografica: 'italia'
          })
          .select()
          .single()
        if (volErr) throw volErr
        volId = volData.id
        setVolantinoId(volId)
      }

      for (const p of selezionati) {
        // 1. Cerca se il prodotto esiste già
        let prodottoId: string

        const { data: esistente } = await supabase
          .from('prodotti')
          .select('id')
          .ilike('nome', p.nome)
          .limit(1)
          .single()

        if (esistente) {
          prodottoId = esistente.id
        } else {
          // Crea il prodotto
          const { data: nuovoProd, error: prodErr } = await supabase
            .from('prodotti')
            .insert({
              nome: p.nome,
              marca: p.marca || null,
              grammatura: p.grammatura || null,
              categoria: p.categoria,
              emoji: p.emoji || '🛒',
              attivo: true
            })
            .select()
            .single()
          if (prodErr) throw prodErr
          prodottoId = nuovoProd.id
        }

        // 2. Inserisci il prezzo
        const { error: prezzoErr } = await supabase
          .from('prezzi')
          .insert({
            prodotto_id: prodottoId,
            volantino_id: volId,
            catena_id: catenaId,
            prezzo_scontato: p.prezzo_scontato,
            prezzo_pieno: p.prezzo_pieno,
            data_inizio: dataInizio,
            data_fine: dataFine,
            verificato: true,
            ai_confidence: p.confidence
          })
        if (prezzoErr) throw prezzoErr

        salvati++
        setProdottiSalvati(salvati)
      }

      setStep('done')

    } catch (e: any) {
      setErrore('Errore salvataggio: ' + e.message)
      setStep('review')
    }
  }

  const prodottiSelezionati = prodotti.filter(p => p.selezionato).length
  const prodottiDubbi = prodotti.filter(p => p.confidence < 70).length

  const s = {
    page: { fontFamily: 'system-ui, sans-serif', background: '#0f1117', minHeight: '100vh', color: '#e2e8f0' },
    topbar: { background: '#161b27', borderBottom: '1px solid #2a3045', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    content: { padding: '28px', maxWidth: '1100px', margin: '0 auto' },
    panel: { background: '#161b27', border: '1px solid #2a3045', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' },
    input: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    select: { background: '#1e2535', border: '1px solid #2a3045', borderRadius: '8px', padding: '9px 12px', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', width: '100%', fontFamily: 'system-ui' },
    label: { fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#4a5568', marginBottom: '6px', display: 'block' },
    btnGreen: { background: '#22c55e', color: '#0a1a0f', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.88rem' },
    btnGray: { background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3045', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' },
  }

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem' }}>← Admin</Link>
          <span style={{ color: '#4a5568' }}>/</span>
          <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: '600' }}>✦ AI Parser Volantini</span>
        </div>
        {step === 'review' && (
          <div style={{ fontSize: '0.78rem', color: '#4a5568', fontFamily: 'monospace' }}>
            {tokensUsati} tokens · ~€{costoStimato}
          </div>
        )}
      </div>

      <div style={s.content}>

        {/* STEP INDICATOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          {['Upload', 'Analisi AI', 'Review', 'Salvataggio'].map((label, i) => {
            const stepIndex = { upload: 0, processing: 1, review: 2, saving: 3, done: 3 }[step]
            const isActive = i === stepIndex
            const isDone = i < stepIndex
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: isDone ? '#22c55e' : isActive ? '#22c55e22' : '#1e2535',
                  border: `1.5px solid ${isDone || isActive ? '#22c55e' : '#2a3045'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: '600',
                  color: isDone ? '#0a1a0f' : isActive ? '#22c55e' : '#4a5568'
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.82rem', color: isActive ? '#e2e8f0' : '#4a5568', fontWeight: isActive ? '600' : '400' }}>
                  {label}
                </span>
                {i < 3 && <span style={{ color: '#2a3045', fontSize: '1rem' }}>→</span>}
              </div>
            )
          })}
        </div>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>✦ AI Parser Volantini</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
              Carica un'immagine del volantino — Claude la analizzerà e estrarrà automaticamente tutti i prodotti con prezzi e sconti.
            </p>

            {errore && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.85rem' }}>
                ❌ {errore}
              </div>
            )}

            {/* DROP ZONE */}
            <div
              style={{ ...s.panel, border: `2px dashed ${dragOver ? '#22c55e' : '#2a3045'}`, background: dragOver ? 'rgba(34,197,94,0.04)' : '#161b27', cursor: 'pointer', transition: 'all 0.2s' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

              {preview ? (
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'center' }}>
                  <img src={preview} alt="Anteprima volantino" style={{ width: '100%', borderRadius: '8px', border: '1px solid #2a3045' }} />
                  <div>
                    <div style={{ color: '#22c55e', fontWeight: '600', marginBottom: '6px' }}>✓ File caricato</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>{file?.name}</div>
                    <div style={{ color: '#4a5568', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      {file ? (file.size / 1024).toFixed(0) + ' KB' : ''}
                    </div>
                    <button style={{ ...s.btnGray, marginTop: '12px', fontSize: '0.78rem' }}
                      onClick={e => { e.stopPropagation(); setFile(null); setPreview('') }}>
                      Cambia file
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📁</div>
                  <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' }}>
                    Trascina qui l'immagine del volantino
                  </div>
                  <div style={{ color: '#4a5568', fontSize: '0.82rem' }}>
                    Supportati: JPG, PNG, WebP · Max 5MB
                  </div>
                  <div style={{ marginTop: '16px', color: '#22c55e', fontSize: '0.82rem', fontWeight: '600' }}>
                    oppure clicca per selezionare
                  </div>
                </div>
              )}
            </div>

            {/* DATI VOLANTINO */}
            <div style={s.panel}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a3045' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>📋 Dati del volantino</span>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={s.label}>Catena supermercato *</label>
                  <select style={s.select} value={catenaId} onChange={e => {
                    setCatenaId(e.target.value)
                    const c = cateneDB.find(c => c.id === e.target.value)
                    if (c) setCatena(c.nome)
                  }}>
                    <option value="">— Seleziona catena —</option>
                    {cateneDB.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Valido dal *</label>
                  <input style={s.input} type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Valido fino al *</label>
                  <input style={s.input} type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} />
                </div>
              </div>
              <div style={{ padding: '0 20px 20px' }}>
                <button style={{ ...s.btnGreen, opacity: !file || !catenaId ? 0.5 : 1 }}
                  onClick={avviaAnalisi} disabled={!file || !catenaId}>
                  ✦ Avvia analisi con Claude AI
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>✦</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px', color: '#22c55e' }}>
              Claude sta leggendo il volantino...
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '32px' }}>
              Sto identificando tutti i prodotti, prezzi e sconti nell'immagine
            </p>
            <div style={{ background: '#1e2535', borderRadius: '8px', height: '8px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto 12px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #22c55e, #3b82f6)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ color: '#4a5568', fontSize: '0.82rem', fontFamily: 'monospace' }}>{Math.round(progress)}%</div>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === 'review' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '4px' }}>
                  Review prodotti estratti
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Claude ha trovato <strong style={{ color: '#e2e8f0' }}>{prodotti.length} prodotti</strong> ·{' '}
                  {prodottiDubbi > 0 && <span style={{ color: '#f59e0b' }}>{prodottiDubbi} con bassa certezza ·{' '}</span>}
                  <span style={{ color: '#22c55e' }}>{prodottiSelezionati} selezionati</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.btnGray} onClick={selezionaTutti}>Seleziona tutti</button>
                <button style={s.btnGray} onClick={deselezionaTutti}>Deseleziona tutti</button>
                <button style={s.btnGreen} onClick={salvaNelDB}>
                  💾 Salva {prodottiSelezionati} prodotti
                </button>
              </div>
            </div>

            {errore && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#ef4444', fontSize: '0.85rem' }}>
                ❌ {errore}
              </div>
            )}

            {/* ISTRUZIONI */}
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
              <span>☑ Spunta per selezionare/deselezionare</span>
              <span>⠿ Trascina per riordinare</span>
              <span>✏️ Modifica i campi direttamente</span>
              <span>🗑 Elimina righe errate</span>
              <span style={{ color: '#f59e0b' }}>⚠ Giallo = bassa certezza AI</span>
            </div>

            {/* TABELLA PRODOTTI */}
            <div style={s.panel}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e2535' }}>
                    <th style={{ width: '32px', padding: '10px 8px', borderBottom: '1px solid #2a3045' }}></th>
                    <th style={{ width: '24px', padding: '10px 4px', borderBottom: '1px solid #2a3045' }}></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>Prodotto</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>Categoria</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>Prezzo offerta</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>Prezzo pieno</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5568', borderBottom: '1px solid #2a3045' }}>Conf.</th>
                    <th style={{ width: '40px', padding: '10px 12px', borderBottom: '1px solid #2a3045' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {prodotti.map((p, i) => (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={e => onDragOverItem(e, i)}
                      onDragEnd={onDragEnd}
                      style={{
                        background: !p.selezionato ? 'rgba(0,0,0,0.2)' : p.confidence < 70 ? 'rgba(245,158,11,0.04)' : 'transparent',
                        borderBottom: '1px solid #2a3045',
                        opacity: p.selezionato ? 1 : 0.5,
                        cursor: 'grab'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <input type="checkbox" checked={p.selezionato} onChange={() => toggleSelezionato(p.id)}
                          style={{ accentColor: '#22c55e', width: '15px', height: '15px', cursor: 'pointer' }} />
                      </td>
                      {/* Drag handle */}
                      <td style={{ padding: '10px 4px', color: '#4a5568', fontSize: '1rem', cursor: 'grab', userSelect: 'none' }}>⠿</td>
                      {/* Prodotto */}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input value={p.emoji} onChange={e => aggiornaProdotto(p.id, 'emoji', e.target.value)}
                            style={{ width: '36px', background: '#1e2535', border: '1px solid #2a3045', borderRadius: '6px', padding: '4px', textAlign: 'center', fontSize: '1.1rem', color: '#e2e8f0' }} />
                          <div>
                            <input value={p.nome} onChange={e => aggiornaProdotto(p.id, 'nome', e.target.value)}
                              style={{ ...s.input, marginBottom: '4px', padding: '5px 8px', fontSize: '0.82rem' }} />
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input value={p.marca || ''} placeholder="Marca" onChange={e => aggiornaProdotto(p.id, 'marca', e.target.value)}
                                style={{ ...s.input, padding: '3px 8px', fontSize: '0.75rem', color: '#94a3b8' }} />
                              <input value={p.grammatura || ''} placeholder="Gram." onChange={e => aggiornaProdotto(p.id, 'grammatura', e.target.value)}
                                style={{ ...s.input, width: '80px', padding: '3px 8px', fontSize: '0.75rem', color: '#94a3b8' }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Categoria */}
                      <td style={{ padding: '8px 12px' }}>
                        <select value={p.categoria} onChange={e => aggiornaProdotto(p.id, 'categoria', e.target.value)}
                          style={{ ...s.select, padding: '5px 8px', fontSize: '0.78rem' }}>
                          {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      {/* Prezzo scontato */}
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" step="0.01" value={p.prezzo_scontato}
                          onChange={e => aggiornaProdotto(p.id, 'prezzo_scontato', parseFloat(e.target.value))}
                          style={{ ...s.input, padding: '5px 8px', fontSize: '0.85rem', fontWeight: '600', color: '#22c55e', width: '90px' }} />
                      </td>
                      {/* Prezzo pieno */}
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" step="0.01" value={p.prezzo_pieno || ''}
                          placeholder="—"
                          onChange={e => aggiornaProdotto(p.id, 'prezzo_pieno', e.target.value ? parseFloat(e.target.value) : null)}
                          style={{ ...s.input, padding: '5px 8px', fontSize: '0.85rem', color: '#94a3b8', width: '90px' }} />
                      </td>
                      {/* Confidence */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: p.confidence >= 90 ? 'rgba(34,197,94,0.15)' : p.confidence >= 70 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: p.confidence >= 90 ? '#22c55e' : p.confidence >= 70 ? '#f59e0b' : '#ef4444',
                          fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace'
                        }}>
                          {p.confidence}%
                        </span>
                      </td>
                      {/* Elimina */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button onClick={() => rimuoviProdotto(p.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '0.9rem' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER REVIEW */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button style={s.btnGray} onClick={() => { setStep('upload'); setProdotti([]) }}>
                ← Ricarica altro volantino
              </button>
              <button style={{ ...s.btnGreen, padding: '12px 28px', fontSize: '0.95rem' }} onClick={salvaNelDB}>
                💾 Salva {prodottiSelezionati} prodotti nel database
              </button>
            </div>
          </>
        )}

        {/* STEP: SAVING */}
        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>💾</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px' }}>
              Salvataggio in corso...
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              {prodottiSalvati} / {prodotti.filter(p => p.selezionato).length} prodotti salvati
            </p>
            <div style={{ background: '#1e2535', borderRadius: '8px', height: '8px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto' }}>
              <div style={{
                height: '100%',
                width: `${(prodottiSalvati / Math.max(prodotti.filter(p => p.selezionato).length, 1)) * 100}%`,
                background: '#22c55e',
                borderRadius: '8px',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', color: '#22c55e' }}>
              Completato!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
              <strong style={{ color: '#e2e8f0' }}>{prodottiSalvati} prodotti</strong> salvati nel database con successo
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <button style={s.btnGreen} onClick={() => {
                setStep('upload'); setFile(null); setPreview(''); setProdotti([])
                setVolantinoId(''); setProdottiSalvati(0)
              }}>
                ✦ Analizza altro volantino
              </button>
              <Link href="/admin/prodotti" style={{ ...s.btnGray, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Vedi prodotti →
              </Link>
              <Link href="/" style={{ ...s.btnGray, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                🏠 Homepage
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}