import type {
  LiveAircraftResponse,
  LiveNearbyResponse,
  LivePosition,
} from '@/types/live'

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: { accept: 'application/json' },
    signal,
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `Live data request failed (${response.status})`
    throw new Error(message)
  }

  return payload as T
}

export function fetchNearbyAircraft(
  position: LivePosition,
  radiusNm: number,
  signal?: AbortSignal,
): Promise<LiveNearbyResponse> {
  const params = new URLSearchParams({
    lat: position.lat.toFixed(6),
    lon: position.lon.toFixed(6),
    radius: String(Math.round(radiusNm)),
  })

  return requestJson<LiveNearbyResponse>(`/api/adsb/nearby?${params}`, signal)
}

export function fetchLiveAircraft(
  icao24: string,
  signal?: AbortSignal,
): Promise<LiveAircraftResponse> {
  return requestJson<LiveAircraftResponse>(
    `/api/adsb/aircraft/${encodeURIComponent(icao24)}`,
    signal,
  )
}
