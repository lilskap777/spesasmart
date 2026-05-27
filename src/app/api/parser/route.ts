import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

async function analizzaImmagine(base64: string, mimeType: string, catena: string, dataInizio: string, dataFine: string) {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: base64
            }
          },
          {
            type: 'text',
            text: `Sei un assistente specializzato nell'analisi di volantini di supermercati italiani.

Analizza questa immagine del volantino di ${catena} e estrai TUTTI i prodotti in offerta.

Per ogni prodotto trova:
1. Nome del prodotto (completo, con marca se presente)
2. Marca/brand (se visibile separatamente)  
3. Grammatura/quantità (es: 500g, 1L, 6 pz)
4. Prezzo scontato (il prezzo in offerta)
5. Prezzo pieno originale (se visibile, altrimenti null)
6. Categoria (scegli tra: latticini, carne, pesce, salumi, frutta, verdura, pasta_riso, condimenti, bevande, dolci_snack, pane_bakery, surgelati, igiene_persona, pulizia_casa, altro)
7. Emoji rappresentativa del prodotto

Rispondi SOLO con un JSON valido, senza testo aggiuntivo, in questo formato esatto:
{
  "prodotti": [
    {
      "nome": "Latte Intero UHT",
      "marca": "Granarolo",
      "grammatura": "1L",
      "prezzo_scontato": 0.99,
      "prezzo_pieno": 1.49,
      "categoria": "latticini",
      "emoji": "🥛",
      "confidence": 95
    }
  ]
}

Il campo "confidence" è da 0 a 100 e indica quanto sei sicuro dell'estrazione.
Se un campo non è visibile nell'immagine, metti null.
Estrai TUTTI i prodotti visibili, anche quelli parzialmente leggibili.`
          }
        ]
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Risposta inattesa da Claude')

  let jsonText = content.text.trim()
  jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const parsed = JSON.parse(jsonText)
  return {
    prodotti: parsed.prodotti || [],
    tokens: response.usage.input_tokens + response.usage.output_tokens
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const catena = formData.get('catena') as string || 'Supermercato'
    const dataInizio = formData.get('data_inizio') as string || ''
    const dataFine = formData.get('data_fine') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let tuttiIProdotti: any[] = []
    let tokensUsati = 0

    // Gestione PDF
    if (file.type === 'application/pdf') {
      try {
        // Converti PDF in immagini
        const { pdf } = await import('pdf-to-img')
        const documento = await pdf(buffer, { scale: 2 })
        let paginaNum = 0

        for await (const pagina of documento) {
          paginaNum++
          // Converti la pagina in base64
          const base64Pagina = pagina.toString('base64')

          try {
            const risultato = await analizzaImmagine(
              base64Pagina,
              'image/png',
              catena,
              dataInizio,
              dataFine
            )
            tuttiIProdotti = [...tuttiIProdotti, ...risultato.prodotti]
            tokensUsati += risultato.tokens
          } catch (e) {
            console.error(`Errore pagina ${paginaNum}:`, e)
          }
        }

        // Rimuovi duplicati per nome
        const prodottiUnici = tuttiIProdotti.filter((p, i, arr) =>
          arr.findIndex(q => q.nome?.toLowerCase() === p.nome?.toLowerCase()) === i
        )
        tuttiIProdotti = prodottiUnici

      } catch (e: any) {
        return NextResponse.json({
          error: 'Errore nella lettura del PDF: ' + e.message
        }, { status: 400 })
      }

    } else {
      // Gestione immagine normale
      const tipiSupportati = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!tipiSupportati.includes(file.type)) {
        return NextResponse.json({
          error: 'Formato non supportato. Carica un\'immagine JPG, PNG, WebP o un PDF.'
        }, { status: 400 })
      }

      const base64 = buffer.toString('base64')
      const risultato = await analizzaImmagine(base64, file.type, catena, dataInizio, dataFine)
      tuttiIProdotti = risultato.prodotti
      tokensUsati = risultato.tokens
    }

    return NextResponse.json({
      success: true,
      prodotti: tuttiIProdotti,
      tokens_usati: tokensUsati,
      costo_stimato: ((tokensUsati * 0.000015) + (tokensUsati * 0.000075)).toFixed(4)
    })

  } catch (error: any) {
    console.error('Errore parser:', error)
    return NextResponse.json({
      error: error.message || 'Errore durante l\'analisi del volantino'
    }, { status: 500 })
  }
}