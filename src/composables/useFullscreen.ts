import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useFullscreen() {
  const isSupported = ref(
    typeof document !== 'undefined' && document.fullscreenEnabled === true,
  )
  const isFullscreen = ref(false)

  function syncState(): void {
    isFullscreen.value = Boolean(document.fullscreenElement)
  }

  async function toggleFullscreen(): Promise<void> {
    if (!isSupported.value) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      syncState()
    }
  }

  onMounted(() => {
    syncState()
    document.addEventListener('fullscreenchange', syncState)
    isSupported.value = document.fullscreenEnabled === true
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', syncState)
  })

  return {
    isSupported,
    isFullscreen,
    toggleFullscreen,
  }
}
