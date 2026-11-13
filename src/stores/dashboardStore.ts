import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { INSTRUMENTS, type InstrumentView } from '@/data/instruments'

export const useDashboardStore = defineStore('dashboard', () => {
  const view = ref<InstrumentView>('ALL')
  const selected = computed(() => INSTRUMENTS.find(item => item.code === view.value))
  const title = computed(() => selected.value?.title ?? 'All instruments')
  function selectView(next: InstrumentView) {
    if (next === 'ALL' || INSTRUMENTS.some(item => item.code === next)) view.value = next
  }
  return { view, selected, title, selectView }
})
