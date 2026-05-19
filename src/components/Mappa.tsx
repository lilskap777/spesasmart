'use client'

import { useEffect, useState, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps'

type PuntoVendita = {
  id: string
  nome: string
  indirizzo: string
  citta: string
  lat: number
  lng: number
  catene: {
    nome: string
    colore_hex: string
  }
}

type Props = {
  puntiVendita: PuntoVendita[]
  centro?: { lat: number; lng: number }
  zoom?: number
  altezza?: string
  mostraGeolocalizzazione?: boolean
  onPuntoClick?: (punto: PuntoVendita) => void
}

export default function Mappa({
  puntiVendita,
  centro,
  zoom = 12,
  altezza = '400px',
  mostraGeolocalizzazione = true,
  onPuntoClick
}: Props) {
  const [posizione, setPosizione] = useState<{ lat: number; lng: number } | null>(null)
  const [puntoSelezionato, setPuntoSelezionato] = useState<PuntoVendita | null>(null)
  const [centroCarta, setCentroCarta] = useState(centro || { lat: 41.9028, lng: 12.4964 }) // Roma default

  useEffect(() => {
    if (mostraGeolocalizzazione && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const nuovaPosizione = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setPosizione(nuovaPosizione)
          if (!centro) setCentroCarta(nuovaPosizione)
        },
        err => console.log('Geolocalizzazione non disponibile:', err)
      )
    }
  }, [])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

  return (
    <APIProvider apiKey={apiKey}>
      <div style={{ height: altezza, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
        <Map
          defaultCenter={centroCarta}
          defaultZoom={zoom}
          mapId="spesasmart-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {/* Pin posizione utente */}
          {posizione && (
            <AdvancedMarker position={posizione}>
              <div style={{
                width: '16px', height: '16px',
                background: '#4a9eff',
                borderRadius: '50%',
                border: '3px solid white',
                boxShadow: '0 0 0 3px rgba(74,158,255,0.3)'
              }} />
            </AdvancedMarker>
          )}

          {/* Pin supermercati */}
          {puntiVendita.map(punto => (
            <AdvancedMarker
              key={punto.id}
              position={{ lat: punto.lat, lng: punto.lng }}
              onClick={() => {
                setPuntoSelezionato(punto)
                onPuntoClick?.(punto)
              }}
            >
              <div style={{
                background: punto.catene?.colore_hex || '#1a7a4a',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                fontFamily: 'system-ui'
              }}>
                {punto.catene?.nome || 'Supermercato'}
              </div>
            </AdvancedMarker>
          ))}

          {/* Info window al click */}
          {puntoSelezionato && (
            <InfoWindow
              position={{ lat: puntoSelezionato.lat, lng: puntoSelezionato.lng }}
              onCloseClick={() => setPuntoSelezionato(null)}
            >
              <div style={{ fontFamily: 'system-ui', padding: '4px', minWidth: '160px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px'
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: puntoSelezionato.catene?.colore_hex || '#888',
                    flexShrink: 0
                  }} />
                  <strong style={{ fontSize: '0.88rem', color: '#1a1a18' }}>
                    {puntoSelezionato.catene?.nome}
                  </strong>
                </div>
                {puntoSelezionato.nome && (
                  <div style={{ fontSize: '0.8rem', color: '#5a5a52', marginBottom: '4px' }}>
                    {puntoSelezionato.nome}
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: '#9a9a90' }}>
                  📍 {puntoSelezionato.indirizzo}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9a9a90' }}>
                  {puntoSelezionato.citta}
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  )
}