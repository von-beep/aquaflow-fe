import { useEffect, useRef } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const DEFAULT_CENTER: L.LatLngExpression = [12.8797, 121.774]
const DEFAULT_ZOOM = 5
const PIN_ZOOM = 16

type Props = {
  lat: number | null | undefined
  lng: number | null | undefined
  stationName?: string
  address?: string
  /** Smaller map for marketplace station card. */
  compact?: boolean
}

/** Read-only OpenStreetMap pin for the public landing page. */
export function StationMapView({ lat, lng, stationName, address, compact = false }: Props) {
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return

    const map = L.map(mapEl.current, {
      scrollWheelZoom: false,
      dragging: true,
      zoomControl: true,
    }).setView(hasPin ? [lat!, lng!] : DEFAULT_CENTER, hasPin ? PIN_ZOOM : DEFAULT_ZOOM)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(mapEl.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPin) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      map.invalidateSize()
      return
    }

    const pos: L.LatLngExpression = [lat!, lng!]
    if (markerRef.current) {
      markerRef.current.setLatLng(pos)
    } else {
      const marker = L.marker(pos, { icon: DefaultIcon, interactive: false }).addTo(map)
      markerRef.current = marker
    }

    const label = [stationName, address].filter(Boolean).join(' — ')
    if (label) markerRef.current.bindPopup(label)
    map.setView(pos, PIN_ZOOM)
    // Leaflet needs a tick after layout changes in a flex grid
    window.setTimeout(() => map.invalidateSize(), 50)
  }, [hasPin, lat, lng, stationName, address])

  const minH = compact ? 160 : 280

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: minH }}>
      <div
        ref={mapEl}
        style={{
          flex: 1,
          minHeight: minH,
          width: '100%',
          borderRadius: compact ? 0 : 10,
          border: compact ? 'none' : '1px solid var(--line)',
          zIndex: 0,
        }}
        role="img"
        aria-label={
          hasPin
            ? `Map showing ${stationName ?? 'station'} location`
            : 'Map — no pin set for this station'
        }
      />
      {!hasPin ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: compact ? 0 : 8, padding: compact ? '8px 0 0' : 0 }}>
          No map pin set for this station yet.
        </p>
      ) : compact ? null : (
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          © OpenStreetMap contributors
          {address ? ` · ${address}` : ''}
        </p>
      )}
    </div>
  )
}
