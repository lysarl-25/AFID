import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAttitudeControlStore } from '../attitudeControlStore'
import { useFlightStore } from '../flightStore'

beforeEach(() => setActivePinia(createPinia()))

describe('device attitude', () => {
  it.each([
    [0, 10, 20, 10, 20],
    [90, 10, 20, 20, -10],
    [270, 10, 20, -20, 10],
    [180, 10, 20, -10, -20],
  ])('maps natural device axes at screen angle %s', (angle, beta, gamma, pitch, roll) => {
    const store = useAttitudeControlStore()
    store.setMode('device')
    store.updateSensor(30, 5, angle)
    expect(store.target).toEqual({ pitch: 0, roll: 0 })
    store.updateSensor(30 + beta, 5 + gamma, angle)
    expect(store.target.pitch).toBeCloseTo(pitch)
    expect(store.target.roll).toBeCloseTo(roll)
  })

  it('recalibrates on screen rotation and handles beta wraparound', () => {
    const store = useAttitudeControlStore()
    store.setMode('device')
    store.updateSensor(179, 0, 0)
    store.updateSensor(-179, 0, 0)
    expect(store.target.pitch).toBe(2)
    store.updateSensor(15, 45, 90)
    expect(store.target).toEqual({ pitch: 0, roll: 0 })
    store.updateSensor(15, 55, 90)
    expect(store.target.pitch).toBeCloseTo(10)
    store.calibrate()
    expect(store.target).toEqual({ pitch: 0, roll: 0 })
  })

  it('rejects invalid readings and ignores sensor events in other modes', () => {
    const store = useAttitudeControlStore()
    store.setMode('device')
    expect(store.updateSensor(null, 5, 0)).toBe(false)
    expect(store.updateSensor(NaN, 5, 0)).toBe(false)
    expect(store.calibrated).toBe(false)
    store.setMode('keyboard')
    expect(store.updateSensor(10, 10, 0)).toBe(false)
  })

  it('applies sensitivity and configurable limits without overshooting', () => {
    const store = useAttitudeControlStore()
    store.setMode('device')
    store.configure('sensitivity', 2)
    store.configure('pitchLimit', 15)
    store.configure('rollLimit', 25)
    store.updateSensor(0, 0, 0)
    store.updateSensor(40, -50, 0)
    expect(store.target).toEqual({ pitch: 15, roll: -25 })
    store.tick(1 / 60)
    expect(store.display.pitch).toBeGreaterThan(0)
    expect(store.display.pitch).toBeLessThan(15)
    expect(store.display.roll).toBeGreaterThan(-25)
    store.configure('rollLimit', 5)
    expect(Math.abs(store.display.roll)).toBeLessThanOrEqual(5)
  })

  it('levels and recalibrates at the current device position', () => {
    const store = useAttitudeControlStore()
    store.setMode('device')
    store.updateSensor(0, 0, 0)
    store.updateSensor(10, 20, 0)
    store.tick(0.1)
    store.reset()
    store.updateSensor(10, 20, 0)
    expect(store.target).toEqual({ pitch: 0, roll: 0 })
    expect(store.display).toEqual({ pitch: 0, roll: 0 })
  })
})

describe('keyboard attitude', () => {
  it('moves continuously by elapsed time, clamps, and stops on key release', () => {
    const store = useAttitudeControlStore()
    store.setMode('keyboard')
    store.setKey('ArrowUp', true)
    store.setKey('ArrowLeft', true)
    store.tick(0.1)
    expect(store.target).toEqual({ pitch: 3.5, roll: -3.5 })
    for (let i = 0; i < 50; i++) store.tick(0.1)
    expect(store.target).toEqual({ pitch: 30, roll: -60 })
    store.clearKeys()
    store.reset()
    store.tick(0.1)
    expect(store.target).toEqual({ pitch: 0, roll: 0 })
    store.setKey('ArrowDown', true)
    store.setKey('ArrowRight', true)
    store.tick(0.1)
    expect(store.target).toEqual({ pitch: -3.5, roll: 3.5 })
    store.setKey('ArrowDown', false)
    store.setKey('ArrowRight', false)
    store.tick(0.1)
    expect(store.target).toEqual({ pitch: -3.5, roll: 3.5 })
  })

  it('leaves simulation data and all other flight instruments unchanged', () => {
    const flight = useFlightStore()
    flight.toggleRunning()
    const before = { ...flight.display }
    const store = useAttitudeControlStore()
    store.setMode('keyboard')
    store.setKey('ArrowUp', true)
    store.tick(0.1)
    flight.tick(0.1)
    expect(flight.display).toEqual(before)
    expect(store.display.pitch).toBeGreaterThan(0)
    store.setMode('simulation')
    expect(store.active).toBe(false)
    expect(flight.display).toEqual(before)
  })
})
