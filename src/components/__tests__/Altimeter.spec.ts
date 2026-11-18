import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import Altimeter from '../instruments/Altimeter.vue'
import { useFlightStore } from '@/stores/flightStore'

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return {
    store: useFlightStore(),
    render: () => renderToString(createSSRApp(Altimeter).use(pinia)),
  }
}

it('reads 12,500 feet with separate hundreds, thousands and ten-thousands hands', async () => {
  const { store, render } = setup()
  store.display.altitude = 12500
  const html = await render()
  expect(html).toContain('class="hundreds-hand" transform="rotate(4500 160 160)"')
  const thousandsAngle = html.match(/class="thousands-hand" transform="rotate\(([^ ]+)/)?.[1]
  expect(Number(thousandsAngle)).toBeCloseTo(450)
  expect(html).toContain('class="ten-thousands-hand" transform="rotate(45 160 160)"')
  expect(html).toContain('12,500')
  expect(html).toContain('viewBox="0 0 320 320"')
})

it('keeps the hundreds hand continuous through the thousand-foot boundary', async () => {
  const { store, render } = setup()
  store.display.altitude = 999
  expect(await render()).toContain('class="hundreds-hand" transform="rotate(359.64 160 160)"')
  store.display.altitude = 1000
  expect(await render()).toContain('class="hundreds-hand" transform="rotate(360 160 160)"')
})

it('updates both pressure units and preserves standard pressure in live mode', async () => {
  const { store, render } = setup()
  store.setBaro(30.1)
  let html = await render()
  expect(html).toContain('BARO 30.10 IN')
  expect(html).toContain('>1019</text>')
  store.setMode('live')
  store.liveMeta.altitudeKind = 'QNE'
  html = await render()
  expect(html).toContain('STD 29.92 IN')
  expect(html).toContain('pressure altitude with standard pressure setting')
  expect(html).toContain('>1013</text>')
})

it('identifies live GNSS altitude without presenting a pressure scale', async () => {
  const { store, render } = setup()
  store.setMode('live')
  store.liveMeta.altitudeKind = 'GNSS'
  const html = await render()
  expect(html).toContain('FT GNSS')
  expect(html).toContain('GNSS / ADS-B')
  expect(html).toContain('GNSS altitude')
  expect(html).not.toContain('class="pressure-scale"')
})
