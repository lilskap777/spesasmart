import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(60000)
    })

    if (!res.ok) {
      throw new Error(`Overpass API error: ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('OSM error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}