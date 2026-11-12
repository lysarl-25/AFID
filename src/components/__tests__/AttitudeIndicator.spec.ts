import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import AttitudeIndicator from '../instruments/AttitudeIndicator.vue'
import AttitudeControls from '../AttitudeControls.vue'
import { useAttitudeControlStore } from '@/stores/attitudeControlStore'
import { useFlightStore } from '@/stores/flightStore'

it('moves only the horizon and ladder while keeping the aircraft reference fixed', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const attitude = useAttitudeControlStore()
  attitude.setMode('keyboard')
  attitude.display.pitch = 10
  attitude.display.roll = 20
  const html = await renderToString(createSSRApp(AttitudeIndicator).use(pinia))
  expect(html).toContain('rotate(-20 160 160) translate(0 42)')
  expect(html).toMatch(/<svg[^>]*viewBox="0 0 320 320"[^>]*>/)
  expect(html.match(/<svg[^>]*>/)?.[0]).not.toContain('transform=')
  expect(html.match(/<g[^>]*class="aircraft-reference"[^>]*>/)?.[0]).not.toContain('transform=')
  expect(html).toContain('KEYBOARD / PITCH / ROLL')
})

it('restores the existing simulated attitude when motion control exits', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const flight = useFlightStore()
  flight.display.pitch = -10
  flight.display.roll = -15
  useAttitudeControlStore().setMode('simulation')
  const html = await renderToString(createSSRApp(AttitudeIndicator).use(pinia))
  expect(html).toContain('rotate(15 160 160) translate(0 -42)')
})

it('renders mode selection, sensor status, calibration, sensitivity and limits', async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAttitudeControlStore().setMode('device')
  const html = await renderToString(createSSRApp(AttitudeControls).use(pinia))
  for (const label of ['SIMULATION', 'DEVICE MOTION', 'KEYBOARD', 'Sensor:', 'Calibrate',
    'Sensitivity', 'Reset attitude', 'Pitch limit', 'Roll limit']) {
    expect(html).toContain(label)
  }
  expect(html).toContain('aria-pressed="true"')
})
