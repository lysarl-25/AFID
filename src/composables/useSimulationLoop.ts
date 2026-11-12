import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useFlightStore } from '@/stores/flightStore'
import { useAttitudeControlStore } from '@/stores/attitudeControlStore'

export function useSimulationLoop(): void {
  const store = useFlightStore()
  const attitude = useAttitudeControlStore()
  const shouldRun = computed(() => store.mode === 'live' || store.running || attitude.active)

  let frameId = 0
  let lastTimestamp = 0

  function frame(timestamp: number): void {
    if (!lastTimestamp) lastTimestamp = timestamp
    const deltaSeconds = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    store.tick(deltaSeconds)
    attitude.tick(deltaSeconds)
    frameId = requestAnimationFrame(frame)
  }

  function start(): void {
    if (frameId) return
    lastTimestamp = 0
    frameId = requestAnimationFrame(frame)
  }

  function stop(): void {
    if (!frameId) return
    cancelAnimationFrame(frameId)
    frameId = 0
    lastTimestamp = 0
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      stop()
    } else if (shouldRun.value) {
      start()
    }
  }

  onMounted(() => {
    if (shouldRun.value) start()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  watch(shouldRun, (run) => {
    if (run && !document.hidden) start()
    else stop()
  })

  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
