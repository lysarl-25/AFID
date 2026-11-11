import { describe, expect, it } from 'vitest'
import {
  clamp,
  normalizeHeading,
  roundToStep,
  shortestAngleDiff,
  smoothFactor,
} from '../math'
import { buildTapeTicks } from '../svg'
import { formatHeading, formatSigned } from '../format'
import { AIRCRAFT_PROFILES, DEFAULT_FLIGHT_DATA } from '@/data/aircraftProfiles'

describe('flight math', () => {
  it('clamps values to an instrument range', () => {
    expect(clamp(120, 0, 100)).toBe(100)
    expect(clamp(-1, 0, 100)).toBe(0)
    expect(clamp(45, 0, 100)).toBe(45)
  })

  it('normalizes headings across the zero boundary', () => {
    expect(normalizeHeading(0)).toBe(0)
    expect(normalizeHeading(360)).toBe(0)
    expect(normalizeHeading(361)).toBe(1)
    expect(normalizeHeading(-1)).toBe(359)
    expect(normalizeHeading(-370)).toBe(350)
  })

  it('takes the shortest path between headings', () => {
    expect(shortestAngleDiff(359, 1)).toBe(2)
    expect(shortestAngleDiff(1, 359)).toBe(-2)
    expect(shortestAngleDiff(10, 350)).toBe(-20)
    expect(shortestAngleDiff(350, 10)).toBe(20)
  })

  it('formats headings and signed values', () => {
    expect(formatHeading(1)).toBe('001°')
    expect(formatHeading(-1)).toBe('359°')
    expect(formatHeading(359.6)).toBe('000°')
    expect(formatHeading(360)).toBe('000°')
    expect(formatSigned(1200)).toBe('+1,200')
    expect(formatSigned(-5, 1)).toBe('-5.0')
    expect(formatSigned(0, 1)).toBe('0.0')
  })

  it('rounds control values to their configured step', () => {
    expect(roundToStep(12.27, 0.1, 1)).toBe(12.3)
    expect(roundToStep(33186, 100, 0)).toBe(33200)
  })

  it('never produces a smoothing factor outside zero and one', () => {
    expect(smoothFactor(0, 0.3)).toBe(0)
    expect(smoothFactor(0.3, 0.3)).toBeCloseTo(0.632, 3)
    expect(smoothFactor(10, 0.3)).toBeCloseTo(1, 6)
  })
})

describe('tape tick generation', () => {
  it('creates ticks and marks major labels at the requested interval', () => {
    const ticks = buildTapeTicks(0, 100, 10, 20, 160, 2)

    expect(ticks).toHaveLength(11)
    expect(ticks[0]).toMatchObject({ value: 0, major: true, y: 160 })
    expect(ticks[1]).toMatchObject({ value: 10, major: false, y: 140 })
    expect(ticks[2]).toMatchObject({ value: 20, major: true, y: 120 })
  })
})

describe('aircraft profiles', () => {
  it('keeps the default demonstration values valid for the default profile', () => {
    const profile = AIRCRAFT_PROFILES.businessJet

    expect(DEFAULT_FLIGHT_DATA.airspeed).toBe(280)
    expect(DEFAULT_FLIGHT_DATA.altitude).toBe(33000)
    expect(DEFAULT_FLIGHT_DATA.heading).toBe(180)
    expect(DEFAULT_FLIGHT_DATA.airspeed).toBeGreaterThanOrEqual(profile.airspeed.min)
    expect(DEFAULT_FLIGHT_DATA.airspeed).toBeLessThanOrEqual(profile.airspeed.max)
    expect(DEFAULT_FLIGHT_DATA.altitude).toBeGreaterThanOrEqual(profile.altitude.min)
    expect(DEFAULT_FLIGHT_DATA.altitude).toBeLessThanOrEqual(profile.altitude.max)
  })

  it('defines ordered color bands for each profile', () => {
    for (const profile of Object.values(AIRCRAFT_PROFILES)) {
      const bands = profile.airspeed.bands
      expect(bands.white[0]).toBeLessThan(bands.white[1])
      expect(bands.green[0]).toBeLessThan(bands.green[1])
      expect(bands.amber[0]).toBeLessThan(bands.amber[1])
      expect(bands.redline).toBeGreaterThanOrEqual(bands.amber[1])
      expect(profile.verticalSpeed.bands.safe).toBeLessThan(
        profile.verticalSpeed.bands.caution,
      )
      expect(profile.verticalSpeed.bands.caution).toBeLessThan(
        profile.verticalSpeed.bands.limit,
      )
    }
  })
})
