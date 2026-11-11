import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useFlightStore } from '@/stores/flightStore'

export function useSimulationLoop(): void {
  const store = useFlightStore()

  let frameId = 0
  let lastTimestamp = 0

  function frame(timestamp: number): void {
    if (!lastTimestamp) lastTimestamp = timestamp
    const deltaSeconds = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    store.tick(deltaSeconds)
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
    } else if (store.running) {
      start()
    }
  }

  onMounted(() => {
    if (store.running) start()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  watch(
    () => store.running,
    (running) => {
      if (running && !document.hidden) start()
      else stop()
    },
  )

  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
