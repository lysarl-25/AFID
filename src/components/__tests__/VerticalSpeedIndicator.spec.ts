import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import VerticalSpeedIndicator from '../instruments/VerticalSpeedIndicator.vue'
import { useFlightStore } from '@/stores/flightStore'

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return {
    store: useFlightStore(),
    render: () => renderToString(createSSRApp(VerticalSpeedIndicator).use(pinia)),
  }
}

it.each([
  { rate: 0, angle: -90, direction: 'Level flight' },
  { rate: 1000, angle: 0, direction: 'Climb' },
  { rate: -1000, angle: -180, direction: 'Descent' },
])('shows $direction at $rate ft/min on the trainer dial', async ({ rate, angle, direction }) => {
  const { store, render } = setup()
  store.setProfile('lightTrainer')
  store.display.verticalSpeed = rate
  const html = await render()
  expect(html).toContain(`class="vsi-needle" transform="rotate(${angle} 160 160)"`)
  expect(html).toContain(`Vertical speed indicator. ${direction}.`)
  expect(html).toContain('Scale up to 2000 feet per minute.')
})

it('expands the scale for jet and live rates without losing the signed readout', async () => {
  const { store, render } = setup()
  store.display.verticalSpeed = 3000
  let html = await render()
  expect(html).toContain('rotate(45 160 160)')
  expect(html).toContain('+3,000')
  expect(html).toContain('Scale up to 4000 feet per minute.')
  store.setMode('live')
  store.display.verticalSpeed = -6000
  html = await render()
  expect(html).toContain('rotate(-225 160 160)')
  expect(html).toContain('-6,000')
  expect(html).toContain('from live ADS-B data')
  expect(html).toContain('Scale up to 8000 feet per minute.')
})
