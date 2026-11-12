import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLiveTrackingStore } from '../liveTrackingStore'
import { fetchLiveAircraft } from '@/services/liveApi'
import type { LiveAircraft, LiveAircraftResponse } from '@/types/live'

vi.mock('@/services/liveApi', () => ({
  fetchLiveAircraft: vi.fn(),
  fetchNearbyAircraft: vi.fn(),
}))

function aircraft(): LiveAircraft {
  return {
    icao24: 'abc123', callsign: 'TEST123', registration: null, typeCode: null,
    description: null, category: null, lat: null, lon: null, onGround: false,
    altitudeBaroFt: 30000, altitudeGeomFt: null, groundSpeedKt: 250,
    indicatedAirspeedKt: null, trueAirspeedKt: null, trackDeg: 90,
    magneticHeadingDeg: null, verticalRateFpm: 0, rollDeg: null,
    turnRateDegSec: null, squawk: null, emergency: null, seenSeconds: 2,
    seenPositionSeconds: null, distanceNm: null, bearingDeg: null,
    source: 'airplanes.live', updatedAt: Date.now(),
  }
}

function response(item: LiveAircraft): LiveAircraftResponse {
  return { aircraft: item, provider: item.source, attribution: '', fetchedAt: Date.now() }
}

describe('live tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-11T00:00:00Z'))
    vi.stubGlobal('window', {
      setTimeout, clearTimeout, setInterval, clearInterval,
      localStorage: { getItem: () => null },
    })
    setActivePinia(createPinia())
    vi.mocked(fetchLiveAircraft).mockReset()
  })

  afterEach(() => {
    useLiveTrackingStore().stopTracking()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not mark cached aircraft as fresh when a request completes', async () => {
    const item = { ...aircraft(), updatedAt: Date.now() - 65000 }
    vi.mocked(fetchLiveAircraft).mockResolvedValue(response(item))
    const store = useLiveTrackingStore()
    store.selectAircraft(item)
    await Promise.resolve()
    expect(store.dataAgeSeconds).toBe(67)
    expect(store.status).toBe('lost')
  })

  it('ignores an old request after reselecting the same aircraft', async () => {
    let resolveOld!: (value: LiveAircraftResponse) => void
    vi.mocked(fetchLiveAircraft)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce(response({ ...aircraft(), callsign: 'NEW' }))
    const store = useLiveTrackingStore()
    store.selectAircraft(aircraft())
    store.selectAircraft(aircraft())
    await Promise.resolve()
    resolveOld(response({ ...aircraft(), callsign: 'OLD' }))
    await Promise.resolve()
    expect(store.selectedName).toBe('NEW')
  })
})
