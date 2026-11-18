import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import HeadingIndicator from '../instruments/HeadingIndicator.vue'
import { useFlightStore } from '@/stores/flightStore'

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return {
    store: useFlightStore(),
    render: () => renderToString(createSSRApp(HeadingIndicator).use(pinia)),
  }
}

it('rotates the compass card opposite the heading and keeps the aircraft and index fixed', async () => {
  const { store, render } = setup()
  store.display.heading = 90
  const html = await render()
  expect(html).toContain('class="compass-card" transform="rotate(-90 160 160)"')
  for (const name of ['aircraft-reference', 'heading-index']) {
    const tag = html.match(new RegExp(`<path[^>]*class="${name}"[^>]*>`))?.[0]
    expect(tag).toBeDefined()
    expect(tag).not.toContain('transform=')
  }
  expect(html).toContain('090°')
  expect(html).toContain('Current magnetic heading 90 degrees')
})

it('keeps the compass card continuous through north and normalizes the readout', async () => {
  const { store, render } = setup()
  store.display.heading = 359
  expect(await render()).toContain('rotate(-359 160 160)')
  store.display.heading = 361
  const html = await render()
  expect(html).toContain('rotate(-361 160 160)')
  expect(html).toContain('001°')
  expect(html).toContain('Current magnetic heading 1 degrees')
})

it('identifies live ground track separately from magnetic heading', async () => {
  const { store, render } = setup()
  store.setMode('live')
  store.liveMeta.headingKind = 'TRK'
  let html = await render()
  expect(html).toContain('>TRACK</text>')
  expect(html).toContain('Current track')
  expect(html).toContain('from live ADS-B data')
  store.liveMeta.headingKind = 'MAG'
  html = await render()
  expect(html).toContain('>MAG HDG</text>')
  expect(html).toContain('Current magnetic heading')
})
