import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import TurnCoordinator from '../instruments/TurnCoordinator.vue'
import { useFlightStore } from '@/stores/flightStore'

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return {
    store: useFlightStore(),
    render: () => renderToString(createSSRApp(TurnCoordinator).use(pinia)),
  }
}

it.each([-3, 0, 3])('aligns the aircraft with the reference mark at %s degrees per second', async rate => {
  const { store, render } = setup()
  store.display.turnRate = rate
  store.display.roll = 45
  store.display.pitch = 20
  const html = await render()
  expect(html).toContain(`class="turn-aircraft" transform="rotate(${rate / 3 * 20} 160 160)"`)
  expect(html).toContain('NO PITCH')
  expect(html).toContain('INFORMATION')
})

it('centers the ball for coordinated flight and keeps full slip inside the tube', async () => {
  const { store, render } = setup()
  expect(await render()).toContain('class="slip-ball" cx="160" cy="209"')
  store.display.slipSkid = -1
  expect(await render()).toContain('class="slip-ball" cx="111" cy="202"')
  store.display.slipSkid = 1
  expect(await render()).toContain('class="slip-ball" cx="209" cy="202"')
  store.display.slipSkid = 2
  expect(await render()).toContain('class="slip-ball" cx="209" cy="202"')
})

it('limits the aircraft deflection for extreme turn rates', async () => {
  const { store, render } = setup()
  store.display.turnRate = 30
  expect(await render()).toContain('class="turn-aircraft" transform="rotate(40 160 160)"')
  store.display.turnRate = -30
  expect(await render()).toContain('class="turn-aircraft" transform="rotate(-40 160 160)"')
})

it('shows unavailable slip data in live mode instead of a centered ball', async () => {
  const { store, render } = setup()
  store.setMode('live')
  const html = await render()
  expect(html).toContain('TURN / N/A')
  expect(html).toContain('Slip skid is unavailable from ADS-B data.')
  expect(html).toContain('>N/A</text>')
  expect(html).not.toContain('class="slip-ball"')
})
