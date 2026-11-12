import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFlightStore } from '../flightStore'
import { normalizeHeading } from '@/utils/math'

describe('flight store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with the demonstration flight state', () => {
    const store = useFlightStore()

    expect(store.target.airspeed).toBe(280)
    expect(store.target.altitude).toBe(33000)
    expect(store.target.heading).toBe(180)
    expect(store.target.verticalSpeed).toBe(0)
    expect(store.running).toBe(true)
    expect(store.profile.id).toBe('businessJet')
  })

  it('sanitizes values against the active profile and wraps headings', () => {
    const store = useFlightStore()

    store.setField('airspeed', 999)
    store.setField('altitude', -500)
    store.setField('heading', -10)

    expect(store.target.airspeed).toBe(store.profile.airspeed.max)
    expect(store.target.altitude).toBe(0)
    expect(store.target.heading).toBe(350)
  })

  it('snaps display values to targets when paused', () => {
    const store = useFlightStore()

    store.setField('airspeed', 350)
    store.toggleRunning()

    expect(store.running).toBe(false)
    expect(store.display.airspeed).toBe(350)
  })

  it('clamps all values when switching to a lower-performance profile', () => {
    const store = useFlightStore()

    store.setField('airspeed', 440)
    store.setField('altitude', 48000)
    store.setField('verticalSpeed', 2500)
    store.setProfile('lightTrainer')

    expect(store.profile.id).toBe('lightTrainer')
    expect(store.target.airspeed).toBe(200)
    expect(store.target.altitude).toBe(20000)
    expect(store.target.verticalSpeed).toBe(2000)
  })

  it('resets to the demonstration values for the active profile', () => {
    const store = useFlightStore()

    store.setField('airspeed', 120)
    store.setField('altitude', 12000)
    store.reset()

    expect(store.target.airspeed).toBe(280)
    expect(store.target.altitude).toBe(33000)
    expect(store.target.heading).toBe(180)
    expect(store.target.verticalSpeed).toBe(0)
  })

  it('applies live snapshots, switches profiles, and blocks manual input', () => {
    const store = useFlightStore()

    store.setMode('live')
    expect(store.profile.shortName).toBe('LIVE')

    store.applyLiveSnapshot(
      {
        data: {
          airspeed: 412,
          altitude: 38000,
          heading: 275,
          verticalSpeed: -600,
          pitch: 1.5,
          roll: -14,
          turnRate: 1.2,
          slipSkid: 0,
        },
        meta: {
          onGround: false,
          airspeedKind: 'IAS',
          headingKind: 'MAG',
          altitudeKind: 'QNE',
          attitudeEstimated: true,
          slipAvailable: false,
          source: 'airplanes.live',
          seenSeconds: 1,
        },
      },
      true,
    )

    expect(store.display.airspeed).toBe(412)
    expect(store.display.heading).toBe(275)
    expect(store.liveMeta.airspeedKind).toBe('IAS')

    store.setField('airspeed', 100)
    expect(store.target.airspeed).toBe(412)

    store.setMode('simulation')
    expect(store.profile.shortName).toBe('BIZJET')
    expect(store.target.airspeed).toBe(280)
    expect(store.display.heading).toBe(180)
  })

  it('does not carry simulation values into a partial live snapshot', () => {
    const store = useFlightStore()

    store.setField('airspeed', 320)
    store.setField('altitude', 41000)
    store.setMode('live')
    store.applyLiveSnapshot(
      {
        data: { airspeed: 210 },
        meta: {
          onGround: false,
          airspeedKind: 'IAS',
          headingKind: 'TRK',
          altitudeKind: null,
          attitudeEstimated: true,
          slipAvailable: false,
          source: 'adsb.lol',
          seenSeconds: 0,
        },
      },
      true,
    )

    expect(store.display.airspeed).toBe(210)
    expect(store.display.altitude).toBe(0)
    expect(store.display.heading).toBe(0)
    expect(store.display.verticalSpeed).toBe(0)
  })

  it('smooths heading across north using the shortest rotation', () => {
    const store = useFlightStore()

    store.setField('heading', 359)
    store.toggleRunning()
    store.toggleRunning()
    store.setField('heading', 1)

    for (let index = 0; index < 30; index += 1) store.tick(0.1)

    expect(store.display.heading).toBeGreaterThan(360)
    expect(normalizeHeading(store.display.heading)).toBeCloseTo(1, 1)
  })
})
