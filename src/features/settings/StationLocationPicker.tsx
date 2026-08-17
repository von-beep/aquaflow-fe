import { useEffect, useRef, useState } from 'react'
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
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

/** Rough center of the Philippines when no pin is set. */
const DEFAULT_CENTER: L.LatLngExpression = [12.8797, 121.774]
const DEFAULT_ZOOM = 5
const PIN_ZOOM = 16

export type StationLocationValue = {
  address: string
  lat: number | null
  lng: number | null
}

type SearchHit = {
  displayName: string
  lat: number
  lng: number
}

type Props = {
  value: StationLocationValue
  apiBaseUrl: string
  onChange: (next: StationLocationValue) => void
}

export function StationLocationPicker({ value, apiBaseUrl, onChange }: Props) {
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  valueRef.current = value
  onChangeRef.current = onChange

  const [query, setQuery] = useState(value.address)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setQuery(value.address)
  }, [value.address])

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return

    const base = apiBaseUrl.replace(/\/$/, '')
    const initial = valueRef.current
    const hasPin = initial.lat != null && initial.lng != null

    const map = L.map(mapEl.current, { scrollWheelZoom: true }).setView(
      hasPin ? [initial.lat!, initial.lng!] : DEFAULT_CENTER,
      hasPin ? PIN_ZOOM : DEFAULT_ZOOM,
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    const reverseAndEmit = async (lat: number, lng: number) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(
          `${base}/public/geocode/reverse?lat=${lat}&lng=${lng}`,
        )
        const body = (await res.json()) as { displayName?: string; message?: string }
        if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`)
        const address =
          body.displayName?.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        setQuery(address)
        onChangeRef.current({ address, lat, lng })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Reverse geocode failed')
        onChangeRef.current({
          address: valueRef.current.address,
          lat,
          lng,
        })
      } finally {
        setBusy(false)
      }
    }

    const ensureMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          void reverseAndEmit(pos.lat, pos.lng)
        })
        markerRef.current = marker
      }
      map.setView([lat, lng], Math.max(map.getZoom(), PIN_ZOOM))
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      ensureMarker(e.latlng.lat, e.latlng.lng)
      void reverseAndEmit(e.latlng.lat, e.latlng.lng)
    })

    if (hasPin) ensureMarker(initial.lat!, initial.lng!)

    mapRef.current = map
    ;(
      map as unknown as {
        __ensureMarker: typeof ensureMarker
      }
    ).__ensureMarker = ensureMarker

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(mapEl.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [apiBaseUrl])

  useEffect(() => {
    const map = mapRef.current
    if (!map || value.lat == null || value.lng == null) return
    const ensure = (
      map as unknown as { __ensureMarker?: (lat: number, lng: number) => void }
    ).__ensureMarker
    ensure?.(value.lat, value.lng)
  }, [value.lat, value.lng])

  async function onSearch() {
    const q = query.trim()
    if (q.length < 3) {
      setError('Type at least 3 characters to search')
      return
    }
    setBusy(true)
    setError(null)
    setHits([])
    try {
      const res = await fetch(
        `${apiBaseUrl.replace(/\/$/, '')}/public/geocode/search?q=${encodeURIComponent(q)}`,
      )
      const body = (await res.json()) as { results?: SearchHit[]; message?: string }
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`)
      const results = body.results ?? []
      setHits(results)
      if (!results.length) setError('No places found')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setBusy(false)
    }
  }

  function pickHit(hit: SearchHit) {
    setHits([])
    setQuery(hit.displayName)
    onChange({ address: hit.displayName, lat: hit.lat, lng: hit.lng })
    const map = mapRef.current
    const ensure = (
      map as unknown as { __ensureMarker?: (lat: number, lng: number) => void }
    )?.__ensureMarker
    ensure?.(hit.lat, hit.lng)
  }

  function clearPin() {
    setHits([])
    setQuery('')
    setError(null)
    onChange({ address: '', lat: null, lng: null })
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
  }

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="s_addr">Address / map pin</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input
          id="s_addr"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange({ ...value, address: e.target.value })
          }}
          placeholder="Search address or click the map"
          style={{ flex: '1 1 200px' }}
        />
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => void onSearch()}
        >
          {busy ? '…' : 'Search'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={clearPin}>
          Clear
        </button>
      </div>

      {hits.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            margin: '0 0 8px',
            padding: 0,
            border: '1px solid var(--line)',
            borderRadius: 8,
            maxHeight: 160,
            overflowY: 'auto',
            background: 'var(--panel)',
          }}
        >
          {hits.map((h) => (
            <li key={`${h.lat},${h.lng},${h.displayName}`}>
              <button
                type="button"
                onClick={() => pickHit(h)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'var(--ink)',
                  borderBottom: '1px solid var(--line2)',
                }}
              >
                {h.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</p>
      ) : null}

      <div
        ref={mapEl}
        style={{
          height: 260,
          width: '100%',
          borderRadius: 10,
          border: '1px solid var(--line)',
          zIndex: 0,
        }}
        role="application"
        aria-label="Station location map"
      />
      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
        Click the map or drag the pin. Map data © OpenStreetMap contributors.
        {value.lat != null && value.lng != null
          ? ` · ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : ''}
      </p>
    </div>
  )
}
