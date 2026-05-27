import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { nome, marca } = await request.json()

    if (!nome) {
      return NextResponse.json({ found: false })
    }

    // Cerca su Open Food Facts per nome
    const query = encodeURIComponent(`${nome} ${marca || ''}`.trim())
    
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&lc=it&cc=it`,
      {
        headers: {
          'User-Agent': 'SpesaSmart/1.0 (contact@spesasmart.it)'
        },
        signal: AbortSignal.timeout(8000)
      }
    )

    if (!res.ok) throw new Error('Open Food Facts non disponibile')

    const data = await res.json()
    const prodotti = data.products || []

    // Trova il primo prodotto con immagine
    const prodottoConImmagine = prodotti.find((p: any) =>
      p.image_url || p.image_front_url || p.image_front_small_url
    )

    if (!prodottoConImmagine) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      immagine_url: prodottoConImmagine.image_front_url ||
                   prodottoConImmagine.image_url ||
                   prodottoConImmagine.image_front_small_url,
      barcode: prodottoConImmagine.code || null,
      nome_off: prodottoConImmagine.product_name_it ||
                prodottoConImmagine.product_name || null,
      marca_off: prodottoConImmagine.brands || null,
    })

  } catch (error: any) {
    console.error('Food image error:', error)
    return NextResponse.json({ found: false })
  }
}