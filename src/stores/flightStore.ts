import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  AIRCRAFT_PROFILES,
  DEFAULT_FLIGHT_DATA,
  DEFAULT_PROFILE_ID,
} from '@/data/aircraftProfiles'
import type {
  AircraftProfileId,
  ControlDefinition,
  FlightData,
  FlightKey,
  FlightPreset,
} from '@/types/flight'
import {
  clamp,
  normalizeHeading,
  roundToStep,
  shortestAngleDiff,
  smoothFactor,
} from '@/utils/math'

const FLIGHT_KEYS: FlightKey[] = [
  'airspeed',
  'altitude',
  'pitch',
  'roll',
  'verticalSpeed',
  'heading',
  'turnRate',
  'slipSkid',
]

const SMOOTHING_TIME_CONSTANT: Record<FlightKey, number> = {
  airspeed: 0.42,
  altitude: 0.52,
  pitch: 0.14,
  roll: 0.14,
  verticalSpeed: 0.3,
  heading: 0.22,
  turnRate: 0.16,
  slipSkid: 0.14,
}

const PRESET_VALUES: Record<FlightPreset, Partial<FlightData>> = {
  level: {
    pitch: 0,
    roll: 0,
    verticalSpeed: 0,
    turnRate: 0,
    slipSkid: 0,
  },
  climb: {
    pitch: 6,
    roll: 0,
    verticalSpeed: 1500,
    turnRate: 0,
    slipSkid: 0,
  },
  descent: {
    pitch: -5,
    roll: 0,
    verticalSpeed: -1500,
    turnRate: 0,
    slipSkid: 0,
  },
}

export const useFlightStore = defineStore('flight', () => {
  const activeProfileId = ref<AircraftProfileId>(DEFAULT_PROFILE_ID)
  const running = ref(true)
  const turbulence = ref(true)
  const baro = ref(AIRCRAFT_PROFILES[DEFAULT_PROFILE_ID].baro)
  const simTime = ref(0)

  const profile = computed(() => AIRCRAFT_PROFILES[activeProfileId.value])

  const target = reactive<FlightData>({ ...DEFAULT_FLIGHT_DATA })
  const smoothed = reactive<FlightData>({ ...DEFAULT_FLIGHT_DATA })
  const display = reactive<FlightData>({ ...DEFAULT_FLIGHT_DATA })

  const controls = computed<ControlDefinition[]>(() => {
    const aircraft = profile.value

    return [
      {
        key: 'airspeed',
        label: 'Airspeed',
        unit: 'KTS',
        min: aircraft.airspeed.min,
        max: aircraft.airspeed.max,
        step: 1,
        decimals: 0,
        signed: false,
      },
      {
        key: 'altitude',
        label: 'Altitude',
        unit: 'FT',
        min: aircraft.altitude.min,
        max: aircraft.altitude.max,
        step: 100,
        decimals: 0,
        signed: false,
      },
      {
        key: 'pitch',
        label: 'Pitch',
        unit: 'DEG',
        min: aircraft.pitch.min,
        max: aircraft.pitch.max,
        step: 0.5,
        decimals: 1,
        signed: true,
      },
      {
        key: 'roll',
        label: 'Roll',
        unit: 'DEG',
        min: aircraft.roll.min,
        max: aircraft.roll.max,
        step: 0.5,
        decimals: 1,
        signed: true,
      },
      {
        key: 'verticalSpeed',
        label: 'Vertical Speed',
        unit: 'FT/MIN',
        min: aircraft.verticalSpeed.min,
        max: aircraft.verticalSpeed.max,
        step: 50,
        decimals: 0,
        signed: true,
      },
      {
        key: 'heading',
        label: 'Heading',
        unit: 'DEG',
        min: 0,
        max: 359,
        step: 1,
        decimals: 0,
        signed: false,
      },
      {
        key: 'turnRate',
        label: 'Turn Rate',
        unit: 'DEG/S',
        min: aircraft.turnRate.min,
        max: aircraft.turnRate.max,
        step: 0.1,
        decimals: 1,
        signed: true,
      },
      {
        key: 'slipSkid',
        label: 'Slip / Skid',
        unit: 'BALL',
        min: -1,
        max: 1,
        step: 0.01,
        decimals: 2,
        signed: true,
      },
    ]
  })

  const controlByKey = computed<Record<FlightKey, ControlDefinition>>(() => {
    const map = {} as Record<FlightKey, ControlDefinition>
    for (const control of controls.value) {
      map[control.key] = control
    }
    return map
  })

  const flightMode = computed(() => {
    if (!running.value) return 'PAUSED'

    if (Math.abs(display.turnRate) >= 0.5) {
      return display.turnRate > 0 ? 'TURN RIGHT' : 'TURN LEFT'
    }
    if (display.verticalSpeed > 200) return 'CLIMB'
    if (display.verticalSpeed < -200) return 'DESCENT'
    return 'LEVEL FLIGHT'
  })

  function sanitize(key: FlightKey, value: number): number {
    const control = controlByKey.value[key]
    const finiteValue = Number.isFinite(value) ? value : target[key]

    if (key === 'heading') return normalizeHeading(finiteValue)
    return clamp(finiteValue, control.min, control.max)
  }

  function snapToTarget(): void {
    for (const key of FLIGHT_KEYS) {
      smoothed[key] = target[key]
      display[key] = target[key]
    }
    simTime.value = 0
  }

  function setField(key: FlightKey, value: number): void {
    const next = sanitize(key, value)
    target[key] = next

    if (!running.value) {
      smoothed[key] = next
      display[key] = next
    }
  }

  function stepField(key: FlightKey, direction: number): void {
    const control = controlByKey.value[key]
    const next = roundToStep(
      target[key] + control.step * direction,
      control.step,
      control.decimals,
    )
    setField(key, next)
  }

  function setBaro(value: number): void {
    baro.value = Number(clamp(value, 28, 31).toFixed(2))
  }

  function setProfile(id: AircraftProfileId): void {
    if (!AIRCRAFT_PROFILES[id]) return

    activeProfileId.value = id
    baro.value = profile.value.baro

    for (const key of FLIGHT_KEYS) {
      const next = sanitize(key, target[key])
      target[key] = next
      smoothed[key] = next
      display[key] = next
    }
  }

  function reset(): void {
    for (const key of FLIGHT_KEYS) {
      const next = sanitize(key, DEFAULT_FLIGHT_DATA[key])
      target[key] = next
      smoothed[key] = next
      display[key] = next
    }
    baro.value = profile.value.baro
    simTime.value = 0
  }

  function applyPreset(preset: FlightPreset): void {
    for (const [key, value] of Object.entries(PRESET_VALUES[preset])) {
      setField(key as FlightKey, value)
    }
  }

  function toggleRunning(): void {
    running.value = !running.value
    if (!running.value) snapToTarget()
  }

  function tick(deltaSeconds: number): void {
    if (!running.value) return

    const dt = Math.min(Math.max(deltaSeconds, 0), 0.1)
    simTime.value += dt
    const time = simTime.value

    for (const key of FLIGHT_KEYS) {
      const goal = target[key]
      const difference =
        key === 'heading'
          ? shortestAngleDiff(smoothed[key], goal)
          : goal - smoothed[key]

      if (Math.abs(difference) < 0.0001) {
        smoothed[key] = key === 'heading' ? smoothed[key] + difference : goal
      } else {
        smoothed[key] += difference * smoothFactor(dt, SMOOTHING_TIME_CONSTANT[key])
      }
      display[key] = smoothed[key]
    }

    if (turbulence.value) {
      const airspeedLimits = controlByKey.value.airspeed
      const altitudeLimits = controlByKey.value.altitude
      const pitchLimits = controlByKey.value.pitch
      const rollLimits = controlByKey.value.roll
      const turnRateLimits = controlByKey.value.turnRate
      const slipSkidLimits = controlByKey.value.slipSkid

      display.airspeed = clamp(
        smoothed.airspeed + Math.sin(time * 0.9) * 0.4 + Math.sin(time * 2.7) * 0.15,
        airspeedLimits.min,
        airspeedLimits.max,
      )
      display.altitude = clamp(
        smoothed.altitude + Math.sin(time * 0.55) * 2 + Math.sin(time * 1.9),
        altitudeLimits.min,
        altitudeLimits.max,
      )
      display.pitch = clamp(
        smoothed.pitch + Math.sin(time * 1.1) * 0.12 + Math.sin(time * 0.37) * 0.06,
        pitchLimits.min,
        pitchLimits.max,
      )
      display.roll = clamp(
        smoothed.roll + Math.sin(time * 0.8) * 0.16 + Math.sin(time * 2.3) * 0.05,
        rollLimits.min,
        rollLimits.max,
      )
      display.turnRate = clamp(
        smoothed.turnRate + Math.sin(time * 1.6) * 0.02,
        turnRateLimits.min,
        turnRateLimits.max,
      )
      display.slipSkid = clamp(
        smoothed.slipSkid + Math.sin(time * 1.7) * 0.004,
        slipSkidLimits.min,
        slipSkidLimits.max,
      )
    }
  }

  return {
    activeProfileId,
    profile,
    running,
    turbulence,
    baro,
    simTime,
    target,
    display,
    controls,
    controlByKey,
    flightMode,
    setField,
    stepField,
    setBaro,
    setProfile,
    reset,
    applyPreset,
    toggleRunning,
    tick,
  }
})
