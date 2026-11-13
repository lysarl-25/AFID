import { beforeEach, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import InstrumentDisplay from '../InstrumentDisplay.vue'
import InstrumentNavigation from '../InstrumentNavigation.vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFlightStore } from '@/stores/flightStore'
import { INSTRUMENTS } from '@/data/instruments'

let pinia: Pinia
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

it('shows all six instruments by default and restores them with ALL', async () => {
  const dashboard = useDashboardStore()
  expect(dashboard.view).toBe('ALL')
  let html = await renderToString(createSSRApp(InstrumentDisplay).use(pinia))
  expect(html.match(/role="img"/g)).toHaveLength(6)
  dashboard.selectView('ASI')
  dashboard.selectView('ALL')
  html = await renderToString(createSSRApp(InstrumentDisplay).use(pinia))
  expect(html.match(/role="img"/g)).toHaveLength(6)
})

it.each(INSTRUMENTS)('shows only $code without changing flight state', async instrument => {
  const dashboard = useDashboardStore()
  const flight = useFlightStore()
  flight.setField('airspeed', 150)
  flight.setField('pitch', 12)
  const before = { ...flight.target }
  dashboard.selectView(instrument.code)
  const html = await renderToString(createSSRApp(InstrumentDisplay).use(pinia))
  expect(html.match(/role="img"/g)).toHaveLength(1)
  expect(html).toContain(`aria-label="${instrument.title}"`)
  expect(html).toContain(`>${instrument.code}</span>`)
  expect(html).toContain('instrument-grid--single')
  expect(flight.target).toEqual(before)
  const nav = await renderToString(createSSRApp(InstrumentNavigation).use(pinia))
  expect(nav.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(nav).toContain(`aria-label="Show ${instrument.title}"`)
})
