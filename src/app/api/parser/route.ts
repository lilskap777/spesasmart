import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

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

    // Converti il file in base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Verifica che sia un'immagine supportata
    const tipiSupportati = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!tipiSupportati.includes(file.type)) {
      return NextResponse.json({
        error: 'Formato non supportato. Carica un\'immagine JPG, PNG o WebP. Per i PDF, convertili prima in immagini.'
      }, { status: 400 })
    }

    // Chiama Claude Vision API
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
                media_type: mimeType,
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

Il campo "confidence" è da 0 a 100 e indica quanto sei sicuro dell'estrazione (100 = certissimo, sotto 70 = dubbio).
Se un campo non è visibile nell'immagine, metti null.
Estrai TUTTI i prodotti visibili, anche quelli parzialmente leggibili.`
            }
          ]
        }
      ]
    })

    // Estrai il JSON dalla risposta
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Risposta inattesa da Claude')
    }

    // Pulisci la risposta e parsifica il JSON
    let jsonText = content.text.trim()
    // Rimuovi eventuali blocchi markdown
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const parsed = JSON.parse(jsonText)

    return NextResponse.json({
      success: true,
      prodotti: parsed.prodotti || [],
      tokens_usati: response.usage.input_tokens + response.usage.output_tokens,
      costo_stimato: ((response.usage.input_tokens * 0.000015) + (response.usage.output_tokens * 0.000075)).toFixed(4)
    })

  } catch (error: any) {
    console.error('Errore parser:', error)
    return NextResponse.json({
      error: error.message || 'Errore durante l\'analisi del volantino'
    }, { status: 500 })
  }
}