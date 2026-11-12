import { describe, expect, it } from 'vitest'
import type { LiveAircraft } from '@/types/live'
import { mapLiveAircraft } from '../liveMapping'

function aircraft(overrides: Partial<LiveAircraft> = {}): LiveAircraft {
  return {
    icao24: 'abc123',
    callsign: 'TEST123',
    registration: 'N12345',
    typeCode: 'B738',
    description: 'Boeing 737-800',
    category: 'A3',
    lat: 51.47,
    lon: -0.45,
    onGround: false,
    altitudeBaroFt: 33000,
    altitudeGeomFt: 33400,
    groundSpeedKt: 250,
    indicatedAirspeedKt: null,
    trueAirspeedKt: null,
    trackDeg: 90,
    magneticHeadingDeg: null,
    verticalRateFpm: 1000,
    rollDeg: null,
    turnRateDegSec: null,
    squawk: '1234',
    emergency: null,
    seenSeconds: 2,
    seenPositionSeconds: 1,
    distanceNm: 12.5,
    bearingDeg: 45,
    source: 'airplanes.live',
    updatedAt: 1000,
    ...overrides,
  }
}

describe('mapLiveAircraft', () => {
  it('maps baro altitude, ground speed, track, and vertical rate', () => {
    const { data, meta } = mapLiveAircraft(aircraft())

    expect(data.airspeed).toBe(250)
    expect(data.altitude).toBe(33000)
    expect(data.verticalSpeed).toBe(1000)
    expect(data.heading).toBe(90)
    expect(data.slipSkid).toBe(0)
    expect(meta.airspeedKind).toBe('GS')
    expect(meta.headingKind).toBe('TRK')
    expect(meta.altitudeKind).toBe('QNE')
    expect(meta.slipAvailable).toBe(false)
    expect(meta.attitudeEstimated).toBe(true)
  })

  it('prefers indicated airspeed and magnetic heading when available', () => {
    const { data, meta } = mapLiveAircraft(
      aircraft({
        indicatedAirspeedKt: 210,
        trueAirspeedKt: 260,
        magneticHeadingDeg: 355,
      }),
    )

    expect(data.airspeed).toBe(210)
    expect(data.heading).toBe(355)
    expect(meta.airspeedKind).toBe('IAS')
    expect(meta.headingKind).toBe('MAG')
  })

  it('uses GNSS altitude when barometric altitude is unavailable', () => {
    const { data, meta } = mapLiveAircraft(
      aircraft({ altitudeBaroFt: null, altitudeGeomFt: 12500 }),
    )

    expect(data.altitude).toBe(12500)
    expect(meta.altitudeKind).toBe('GNSS')
  })

  it('shows ground speed but zeros attitude and vertical speed on the ground', () => {
    const { data, meta } = mapLiveAircraft(
      aircraft({
        onGround: true,
        altitudeBaroFt: 0,
        groundSpeedKt: 14,
        verticalRateFpm: null,
        rollDeg: 12,
      }),
    )

    expect(data.airspeed).toBe(14)
    expect(data.altitude).toBe(0)
    expect(data.verticalSpeed).toBe(0)
    expect(data.pitch).toBe(0)
    expect(data.roll).toBe(0)
    expect(data.turnRate).toBe(0)
    expect(meta.onGround).toBe(true)
  })

  it('estimates pitch from vertical rate and ground speed', () => {
    const { data } = mapLiveAircraft(aircraft({ verticalRateFpm: 1000 }))

    expect(data.pitch).toBeCloseTo(2.26, 1)
  })

  it('uses provider roll when it is available', () => {
    const { data } = mapLiveAircraft(aircraft({ rollDeg: 22.5 }))

    expect(data.roll).toBe(22.5)
  })

  it('derives turn rate from consecutive track updates', () => {
    const previous = aircraft({ trackDeg: 350, updatedAt: 1000 })
    const current = aircraft({ trackDeg: 10, updatedAt: 6000, turnRateDegSec: null })
    const { data } = mapLiveAircraft(current, previous)

    expect(data.turnRate).toBeCloseTo(4, 5)
  })
})
