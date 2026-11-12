import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useFlightStore } from '@/stores/flightStore'
import { fetchLiveAircraft, fetchNearbyAircraft } from '@/services/liveApi'
import type {
  LiveAircraft,
  LiveConnectionState,
  LivePosition,
} from '@/types/live'
import { mapLiveAircraft } from '@/utils/liveMapping'
import { clamp } from '@/utils/math'

const STORAGE_KEY = 'afid.live.position'
const POLL_INTERVAL_MS = 5000
const NEARBY_REFRESH_MS = 15000
const DATA_STALE_MS = 15000
const DATA_LOST_MS = 60000

function readStoredPosition(): LivePosition | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LivePosition>
    if (
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number' &&
      Math.abs(parsed.lat) <= 90 &&
      Math.abs(parsed.lon) <= 180
    ) {
      return { lat: parsed.lat, lon: parsed.lon }
    }
  } catch {
    return null
  }
  return null
}

function storePosition(position: LivePosition): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  } catch {
    // Local storage is optional; tracking still works without it.
  }
}

function distanceNmBetween(from: LivePosition, lat: number, lon: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(lat - from.lat)
  const dLon = toRad(lon - from.lon)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2
  return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearingBetween(from: LivePosition, lat: number, lon: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLon = toRad(lon - from.lon)
  const y = Math.sin(dLon) * Math.cos(toRad(lat))
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export const useLiveTrackingStore = defineStore('liveTracking', () => {
  const flight = useFlightStore()

  const nearby = ref<LiveAircraft[]>([])
  const selected = ref<LiveAircraft | null>(null)
  const position = ref<LivePosition | null>(readStoredPosition())
  const radiusNm = ref(50)
  const provider = ref('')
  const attribution = ref('')
  const nearbyStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const nearbyError = ref('')
  const nearbyFetchedAt = ref<number | null>(null)
  const streamState = ref<'idle' | 'loading' | 'active'>('idle')
  const errorMessage = ref('')
  const lastUpdatedAt = ref<number | null>(null)
  const pickerOpen = ref(false)
  const locating = ref(false)
  const locationError = ref('')
  const now = ref(Date.now())

  let previousAircraft: LiveAircraft | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let ageTimer: ReturnType<typeof setInterval> | null = null
  let nearbyTimer: ReturnType<typeof setInterval> | null = null
  let nearbyRequestId = 0
  let nearbyAbort: AbortController | null = null
  let aircraftAbort: AbortController | null = null
  let aircraftPolling = false

  const selectedName = computed(() => {
    if (!selected.value) return ''
    return (
      selected.value.callsign ??
      selected.value.registration ??
      selected.value.icao24.toUpperCase()
    )
  })

  const selectedSubtitle = computed(() => {
    if (!selected.value) return ''
    const parts = [
      selected.value.typeCode,
      selected.value.registration,
      selected.value.icao24.toUpperCase(),
    ].filter((part): part is string => Boolean(part))
    return parts.join(' · ')
  })

  const dataAgeSeconds = computed(() => {
    if (!lastUpdatedAt.value) return null
    return Math.max(
      0,
      (now.value - lastUpdatedAt.value) / 1000 + (selected.value?.seenSeconds ?? 0),
    )
  })

  const status = computed<LiveConnectionState>(() => {
    if (!selected.value) return 'idle'
    if (!lastUpdatedAt.value) {
      return streamState.value === 'loading' ? 'loading' : 'error'
    }
    const ageMs = (dataAgeSeconds.value ?? 0) * 1000
    if (ageMs > DATA_LOST_MS) return 'lost'
    if (ageMs > DATA_STALE_MS) return 'stale'
    return 'live'
  })

  const statusLabel = computed(() => {
    switch (status.value) {
      case 'loading':
        return 'LIVE CONNECTING'
      case 'live':
        return 'LIVE TRACKING'
      case 'stale':
        return 'LIVE STALE'
      case 'lost':
        return 'LIVE LOST'
      case 'error':
        return 'LIVE ERROR'
      default:
        return 'SIMULATION'
    }
  })

  const positionLabel = computed(() => {
    if (!position.value) return 'No location selected'
    return `${position.value.lat.toFixed(4)}, ${position.value.lon.toFixed(4)}`
  })

  function clearTimers(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (ageTimer) {
      clearInterval(ageTimer)
      ageTimer = null
    }
    if (nearbyTimer) {
      clearInterval(nearbyTimer)
      nearbyTimer = null
    }
  }

  function abortRequests(): void {
    nearbyAbort?.abort()
    nearbyAbort = null
    aircraftAbort?.abort()
    aircraftAbort = null
    aircraftPolling = false
  }

  function applyAircraft(aircraft: LiveAircraft, snap: boolean): void {
    const enriched =
      position.value && aircraft.lat != null && aircraft.lon != null
        ? {
            ...aircraft,
            distanceNm: distanceNmBetween(position.value, aircraft.lat, aircraft.lon),
            bearingDeg: bearingBetween(position.value, aircraft.lat, aircraft.lon),
          }
        : aircraft

    const snapshot = mapLiveAircraft(enriched, previousAircraft)
    previousAircraft = enriched
    selected.value = enriched
    flight.applyLiveSnapshot(snapshot, snap)
  }

  async function searchNearby(): Promise<void> {
    if (!position.value) return

    const requestId = ++nearbyRequestId
    nearbyAbort?.abort()
    const controller = new AbortController()
    nearbyAbort = controller
    const timeout = window.setTimeout(() => controller.abort(), 20000)

    nearbyStatus.value = 'loading'
    nearbyError.value = ''

    try {
      const response = await fetchNearbyAircraft(position.value, radiusNm.value, controller.signal)
      if (requestId !== nearbyRequestId) return
      nearby.value = response.aircraft
      provider.value = response.provider
      attribution.value = response.attribution
      nearbyFetchedAt.value = response.fetchedAt
      nearbyStatus.value = 'ready'
    } catch (error) {
      if (requestId !== nearbyRequestId) return
      nearbyStatus.value = 'error'
      nearbyError.value =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Nearby aircraft request timed out.'
          : error instanceof Error
            ? error.message
            : 'Unable to load nearby aircraft.'
    } finally {
      window.clearTimeout(timeout)
      if (nearbyAbort === controller) nearbyAbort = null
    }
  }

  async function refreshSelected(): Promise<void> {
    if (!selected.value || aircraftPolling) return

    aircraftPolling = true
    const icao24 = selected.value.icao24
    const controller = new AbortController()
    aircraftAbort = controller
    const timeout = window.setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetchLiveAircraft(icao24, controller.signal)
      if (controller.signal.aborted || aircraftAbort !== controller ||
          !selected.value || selected.value.icao24 !== icao24) return

      applyAircraft(response.aircraft, false)
      provider.value = response.provider
      attribution.value = response.attribution
      lastUpdatedAt.value = response.aircraft.updatedAt
      now.value = Date.now()
      streamState.value = 'active'
      errorMessage.value = ''
    } catch (error) {
      if (aircraftAbort !== controller ||
          !selected.value || selected.value.icao24 !== icao24) return
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage.value = 'Live aircraft request timed out.'
      } else {
        errorMessage.value =
          error instanceof Error ? error.message : 'Unable to refresh live aircraft.'
      }
      if (!lastUpdatedAt.value) streamState.value = 'idle'
    } finally {
      window.clearTimeout(timeout)
      if (aircraftAbort === controller) {
        aircraftAbort = null
        aircraftPolling = false
      }
    }
  }

  function startTracking(): void {
    clearTimers()
    now.value = Date.now()
    ageTimer = window.setInterval(() => {
      now.value = Date.now()
      if (status.value === 'lost' && selected.value) {
        void refreshSelected()
      }
    }, 1000)
    pollTimer = window.setInterval(() => void refreshSelected(), POLL_INTERVAL_MS)
    void refreshSelected()
  }

  function selectAircraft(aircraft: LiveAircraft): void {
    clearTimers()
    aircraftAbort?.abort()
    aircraftAbort = null
    aircraftPolling = false

    previousAircraft = null
    errorMessage.value = ''
    streamState.value = 'loading'
    lastUpdatedAt.value = aircraft.updatedAt

    flight.setMode('live')
    applyAircraft(aircraft, true)

    pickerOpen.value = false
    startTracking()
  }

  function stopTracking(): void {
    clearTimers()
    abortRequests()
    selected.value = null
    previousAircraft = null
    lastUpdatedAt.value = null
    streamState.value = 'idle'
    errorMessage.value = ''
    pickerOpen.value = false
    flight.setMode('simulation')
  }

  function setPickerOpen(open: boolean): void {
    pickerOpen.value = open
    if (!open) {
      if (nearbyTimer) {
        clearInterval(nearbyTimer)
        nearbyTimer = null
      }
      return
    }

    if (nearbyTimer) clearInterval(nearbyTimer)
    nearbyTimer = window.setInterval(() => {
      if (pickerOpen.value && position.value && nearbyStatus.value !== 'loading') {
        void searchNearby()
      }
    }, NEARBY_REFRESH_MS)

    if (
      position.value &&
      (!nearbyFetchedAt.value || Date.now() - nearbyFetchedAt.value > NEARBY_REFRESH_MS)
    ) {
      void searchNearby()
    }
  }

  function openPicker(): void {
    setPickerOpen(true)
  }

  function closePicker(): void {
    setPickerOpen(false)
  }

  function setRadius(value: number): void {
    radiusNm.value = clamp(Math.round(value), 5, 250)
  }

  function setPosition(next: LivePosition): void {
    if (
      !Number.isFinite(next.lat) ||
      !Number.isFinite(next.lon) ||
      Math.abs(next.lat) > 90 ||
      Math.abs(next.lon) > 180
    ) {
      return
    }

    position.value = { lat: next.lat, lon: next.lon }
    locationError.value = ''
    storePosition(position.value)
    void searchNearby()
  }

  function locate(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      locationError.value = 'Geolocation is not available in this browser.'
      return Promise.resolve()
    }

    locating.value = true
    locationError.value = ''

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          locating.value = false
          setPosition({
            lat: result.coords.latitude,
            lon: result.coords.longitude,
          })
          resolve()
        },
        (error) => {
          locating.value = false
          locationError.value =
            error.code === 1
              ? 'Location permission was denied. Enter coordinates manually.'
              : 'Unable to determine your location. Enter coordinates manually.'
          resolve()
        },
        {
          enableHighAccuracy: false,
          maximumAge: 600000,
          timeout: 12000,
        },
      )
    })
  }

  return {
    nearby,
    selected,
    position,
    positionLabel,
    radiusNm,
    provider,
    attribution,
    nearbyStatus,
    nearbyError,
    nearbyFetchedAt,
    errorMessage,
    lastUpdatedAt,
    pickerOpen,
    locating,
    locationError,
    selectedName,
    selectedSubtitle,
    dataAgeSeconds,
    status,
    statusLabel,
    searchNearby,
    refreshSelected,
    selectAircraft,
    stopTracking,
    setPickerOpen,
    openPicker,
    closePicker,
    setRadius,
    setPosition,
    locate,
  }
})
