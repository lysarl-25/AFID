import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useAttitudeControlStore, type AttitudeControlMode } from '@/stores/attitudeControlStore'
import { useFlightStore } from '@/stores/flightStore'
import { useLiveTrackingStore } from '@/stores/liveTrackingStore'

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export function useAttitudeControls() {
  const attitude = useAttitudeControlStore()
  const flight = useFlightStore()
  const live = useLiveTrackingStore()
  let generation = 0
  let sensorTimer: ReturnType<typeof setTimeout> | undefined
  let listening = false

  function stopSensor() {
    window.removeEventListener('deviceorientation', onOrientation)
    clearTimeout(sensorTimer)
    sensorTimer = undefined
    listening = false
  }

  function fail(message: string) {
    stopSensor()
    attitude.sensorStatus = 'unavailable'
    attitude.message = message
  }

  function armTimeout() {
    clearTimeout(sensorTimer)
    sensorTimer = setTimeout(() => {
      fail('No sensor data received. Try KEYBOARD or SIMULATION, or retry DEVICE MOTION.')
    }, 5000)
  }

  function onOrientation(event: DeviceOrientationEvent) {
    if (document.hidden) return
    const legacyAngle = (window as Window & { orientation?: number }).orientation
    const angle = window.screen.orientation?.angle ?? legacyAngle ?? 0
    if (attitude.updateSensor(event.beta, event.gamma, angle)) armTimeout()
  }

  async function selectMode(next: AttitudeControlMode) {
    const request = ++generation
    stopSensor()
    if (next !== 'simulation' && flight.mode === 'live') live.stopTracking()
    attitude.setMode(next)
    if (next === 'simulation') {
      attitude.sensorStatus = 'idle'
      attitude.message = 'Simulation controls restored.'
      return
    }
    if (next === 'keyboard') {
      attitude.sensorStatus = 'idle'
      attitude.message = 'Arrow keys control attitude. Space levels. Escape returns to simulation.'
      return
    }
    if (!window.isSecureContext) {
      attitude.sensorStatus = 'insecure'
      attitude.message = 'Device sensors require HTTPS or localhost. Use KEYBOARD or SIMULATION.'
      return
    }
    const orientation = window.DeviceOrientationEvent as OrientationConstructor | undefined
    if (!orientation) {
      fail('Device orientation is unsupported. Use KEYBOARD or SIMULATION.')
      return
    }
    try {
      if (typeof orientation.requestPermission === 'function') {
        attitude.sensorStatus = 'permission'
        attitude.message = 'Waiting for sensor permission.'
        const permission = await orientation.requestPermission()
        if (request !== generation) return
        if (permission !== 'granted') {
          attitude.sensorStatus = 'denied'
          attitude.message = 'Sensor permission denied. Use KEYBOARD or allow motion access and retry.'
          return
        }
      }
      if (request !== generation) return
      attitude.sensorStatus = 'waiting'
      attitude.message = 'Waiting for sensor data. The first reading sets your neutral position.'
      window.addEventListener('deviceorientation', onOrientation)
      listening = true
      armTimeout()
    } catch {
      if (request === generation) fail('Unable to access motion sensors. Use KEYBOARD or SIMULATION.')
    }
  }

  function isEditing(event: KeyboardEvent) {
    return event.target instanceof Element && Boolean(event.target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]',
    ))
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!attitude.active || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Escape') {
      if (document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      void selectMode('simulation')
      return
    }
    if (attitude.mode !== 'keyboard' || isEditing(event)) return
    if (event.code === 'Space' || event.key === ' ') {
      if (event.target instanceof Element && event.target.closest('button')) return
      event.preventDefault()
      attitude.reset()
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      attitude.setKey(event.key, true)
    }
  }

  function onKeyUp(event: KeyboardEvent) { attitude.setKey(event.key, false) }
  function clearKeys() { attitude.clearKeys() }
  function onVisibility() {
    clearKeys()
    if (document.hidden && listening) clearTimeout(sensorTimer)
    else if (listening) armTimeout()
  }

  watch(() => flight.mode, mode => {
    if (mode === 'live') void selectMode('simulation')
  }, { flush: 'sync' })

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    window.addEventListener('focusin', clearKeys)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    generation++
    stopSensor()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', clearKeys)
    window.removeEventListener('focusin', clearKeys)
    document.removeEventListener('visibilitychange', onVisibility)
    attitude.setMode('simulation')
  })

  return { selectMode }
}
