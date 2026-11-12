import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { clamp, smoothFactor } from '@/utils/math'
import { relativeDeviceAttitude, type DeviceTilt } from '@/utils/deviceAttitude'

export type AttitudeControlMode = 'simulation' | 'device' | 'keyboard'
export type SensorStatus = 'idle' | 'permission' | 'waiting' | 'connected' | 'unavailable' | 'denied' | 'insecure'

export const useAttitudeControlStore = defineStore('attitudeControl', () => {
  const mode = ref<AttitudeControlMode>('simulation')
  const active = computed(() => mode.value !== 'simulation')
  const modeLabel = computed(() => ({ simulation: 'SIMULATION', device: 'DEVICE MOTION', keyboard: 'KEYBOARD' })[mode.value])
  const sensorStatus = ref<SensorStatus>('idle')
  const message = ref('Choose DEVICE MOTION on a phone, or KEYBOARD on a laptop.')
  const sensitivity = ref(1)
  const pitchLimit = ref(30)
  const rollLimit = ref(60)
  const target = reactive({ pitch: 0, roll: 0 })
  const display = reactive({ pitch: 0, roll: 0 })
  const calibrated = ref(false)
  let neutral: DeviceTilt | null = null
  let latest: DeviceTilt | null = null
  let screenAngle = 0
  const keys = new Set<string>()

  function clearKeys() { keys.clear() }

  function setMode(next: AttitudeControlMode) {
    mode.value = next
    sensorStatus.value = 'idle'
    clearKeys()
    neutral = latest = null
    calibrated.value = false
    target.pitch = target.roll = display.pitch = display.roll = 0
  }

  function calibrate() {
    neutral = latest ? { ...latest } : null
    calibrated.value = Boolean(neutral)
    target.pitch = target.roll = 0
  }

  function reset() {
    clearKeys()
    if (mode.value === 'device') calibrate()
    target.pitch = target.roll = display.pitch = display.roll = 0
  }

  function updateSensor(beta: number | null, gamma: number | null, angle: number) {
    if (mode.value !== 'device' || beta == null || gamma == null ||
        !Number.isFinite(beta) || !Number.isFinite(gamma)) return false
    if (angle !== screenAngle) neutral = null
    screenAngle = angle
    latest = { beta, gamma }
    if (!neutral) calibrate()
    const attitude = relativeDeviceAttitude(latest, neutral!, angle)
    target.pitch = clamp(attitude.pitch * sensitivity.value, -pitchLimit.value, pitchLimit.value) || 0
    target.roll = clamp(attitude.roll * sensitivity.value, -rollLimit.value, rollLimit.value) || 0
    sensorStatus.value = 'connected'
    message.value = 'Sensor connected. Hold a comfortable position and calibrate to level.'
    return true
  }

  function setKey(key: string, down: boolean) {
    if (mode.value !== 'keyboard') return
    if (down) keys.add(key)
    else keys.delete(key)
  }

  function configure(setting: 'sensitivity' | 'pitchLimit' | 'rollLimit', value: number) {
    if (!Number.isFinite(value)) return
    if (setting === 'sensitivity') sensitivity.value = clamp(value, 0.25, 3)
    if (setting === 'pitchLimit') pitchLimit.value = clamp(value, 5, 45)
    if (setting === 'rollLimit') rollLimit.value = clamp(value, 5, 80)
    if (latest && mode.value === 'device') updateSensor(latest.beta, latest.gamma, screenAngle)
    target.pitch = clamp(target.pitch, -pitchLimit.value, pitchLimit.value)
    target.roll = clamp(target.roll, -rollLimit.value, rollLimit.value)
    display.pitch = clamp(display.pitch, -pitchLimit.value, pitchLimit.value)
    display.roll = clamp(display.roll, -rollLimit.value, rollLimit.value)
  }

  function tick(deltaSeconds: number) {
    if (!active.value) return
    const dt = clamp(deltaSeconds, 0, 0.1)
    if (mode.value === 'keyboard') {
      const step = dt * 35 * sensitivity.value
      target.pitch += (Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'))) * step
      target.roll += (Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'))) * step
    }
    target.pitch = clamp(target.pitch, -pitchLimit.value, pitchLimit.value)
    target.roll = clamp(target.roll, -rollLimit.value, rollLimit.value)
    const smoothing = smoothFactor(dt, 0.12)
    display.pitch += (target.pitch - display.pitch) * smoothing
    display.roll += (target.roll - display.roll) * smoothing
  }

  return { mode, modeLabel, active, sensorStatus, message, sensitivity, pitchLimit, rollLimit,
    target, display, calibrated, setMode, calibrate, reset, updateSensor, setKey, clearKeys, configure, tick }
})
