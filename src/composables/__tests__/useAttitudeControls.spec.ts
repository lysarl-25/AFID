import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createRenderer, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAttitudeControls } from '../useAttitudeControls'
import { useAttitudeControlStore } from '@/stores/attitudeControlStore'
import { useFlightStore } from '@/stores/flightStore'

// Mount real Vue lifecycle hooks with a minimal host; browser APIs are event targets.
const renderer = createRenderer<object, object>({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
})
let win: EventTarget & {
  isSecureContext: boolean
  DeviceOrientationEvent?: { requestPermission?: () => Promise<string> }
  screen: { orientation: { angle: number } }
}
let doc: EventTarget & { hidden: boolean; querySelector: () => null }
let unmount: () => void
let controls: ReturnType<typeof useAttitudeControls>

class FakeElement {
  private editing: boolean
  constructor(editing = false) { this.editing = editing }
  closest() { return this.editing ? this : null }
}

beforeEach(() => {
  vi.useFakeTimers()
  win = Object.assign(new EventTarget(), {
    isSecureContext: true, DeviceOrientationEvent: {}, screen: { orientation: { angle: 0 } },
  })
  doc = Object.assign(new EventTarget(), { hidden: false, querySelector: () => null })
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('Element', FakeElement)
  setActivePinia(createPinia())
  const app = renderer.createApp({ setup() {
    controls = useAttitudeControls()
    return () => h('div')
  } })
  app.mount({})
  unmount = () => app.unmount()
})

afterEach(() => {
  unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function orientation(beta: number | null, gamma: number | null) {
  win.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma }))
}

function key(key: string, type = 'keydown', editing = false) {
  const event = Object.assign(new Event(type, { cancelable: true }), { key, code: key === ' ' ? 'Space' : key })
  if (editing) Object.defineProperty(event, 'target', { value: new FakeElement(true) })
  win.dispatchEvent(event)
  return event
}

it('requests iOS permission and starts listening only when granted', async () => {
  const permission = vi.fn().mockResolvedValue('granted')
  win.DeviceOrientationEvent = { requestPermission: permission }
  await controls.selectMode('device')
  expect(permission).toHaveBeenCalledOnce()
  expect(useAttitudeControlStore().sensorStatus).toBe('waiting')
  orientation(30, 5)
  orientation(40, 15)
  expect(useAttitudeControlStore().sensorStatus).toBe('connected')
  expect(useAttitudeControlStore().target).toEqual({ pitch: 10, roll: 10 })
  await controls.selectMode('simulation')
  orientation(60, 40)
  expect(useAttitudeControlStore().target).toEqual({ pitch: 0, roll: 0 })
})

it.each(['denied', 'insecure', 'unsupported', 'throws'])('provides fallback for %s sensor access', async reason => {
  if (reason === 'denied') win.DeviceOrientationEvent = { requestPermission: async () => 'denied' }
  if (reason === 'insecure') win.isSecureContext = false
  if (reason === 'unsupported') win.DeviceOrientationEvent = undefined
  if (reason === 'throws') win.DeviceOrientationEvent = { requestPermission: async () => { throw Error('blocked') } }
  await controls.selectMode('device')
  expect(useAttitudeControlStore().sensorStatus).toBe(
    reason === 'denied' ? 'denied' : reason === 'insecure' ? 'insecure' : 'unavailable',
  )
  expect(useAttitudeControlStore().message).toMatch(/KEYBOARD/)
  await controls.selectMode('keyboard')
  expect(useAttitudeControlStore().mode).toBe('keyboard')
})

it('detects laptops without sensor readings and disconnected sensors', async () => {
  await controls.selectMode('device')
  orientation(null, null)
  await vi.advanceTimersByTimeAsync(5000)
  expect(useAttitudeControlStore().sensorStatus).toBe('unavailable')
  await controls.selectMode('device')
  orientation(0, 0)
  expect(useAttitudeControlStore().sensorStatus).toBe('connected')
  await vi.advanceTimersByTimeAsync(5000)
  expect(useAttitudeControlStore().sensorStatus).toBe('unavailable')
})

it('ignores late permission results after switching mode or unmounting', async () => {
  let grant!: (permission: string) => void
  win.DeviceOrientationEvent = { requestPermission: () => new Promise(resolve => { grant = resolve }) }
  const pending = controls.selectMode('device')
  await controls.selectMode('keyboard')
  grant('granted')
  await pending
  orientation(0, 0)
  expect(useAttitudeControlStore().mode).toBe('keyboard')
  const pendingUnmount = controls.selectMode('device')
  unmount()
  unmount = () => {}
  grant('granted')
  await pendingUnmount
  expect(useAttitudeControlStore().mode).toBe('simulation')
  expect(vi.getTimerCount()).toBe(0)
})

it('handles held arrows, Space, Escape, editable fields and focus loss', async () => {
  const store = useAttitudeControlStore()
  await controls.selectMode('keyboard')
  expect(key('ArrowUp').defaultPrevented).toBe(true)
  store.tick(0.1)
  expect(store.target.pitch).toBe(3.5)
  win.dispatchEvent(new Event('blur'))
  store.tick(0.1)
  expect(store.target.pitch).toBe(3.5)
  expect(key('ArrowDown', 'keydown', true).defaultPrevented).toBe(false)
  store.tick(0.1)
  expect(store.target.pitch).toBe(3.5)
  key(' ')
  expect(store.target.pitch).toBe(0)
  key('ArrowRight')
  key('ArrowRight', 'keyup')
  store.tick(0.1)
  expect(store.target.roll).toBe(0)
  key('Escape')
  expect(store.mode).toBe('simulation')
  expect(key('ArrowUp').defaultPrevented).toBe(false)
})

it('stops motion control when live aircraft tracking starts', async () => {
  await controls.selectMode('device')
  orientation(0, 0)
  useFlightStore().setMode('live')
  expect(useAttitudeControlStore().mode).toBe('simulation')
  expect(vi.getTimerCount()).toBe(0)
})

it('removes listeners and timers on unmount', async () => {
  const remove = vi.spyOn(win, 'removeEventListener')
  await controls.selectMode('device')
  orientation(0, 0)
  unmount()
  unmount = () => {}
  expect(remove.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining([
    'deviceorientation', 'keydown', 'keyup', 'blur', 'focusin',
  ]))
  expect(vi.getTimerCount()).toBe(0)
  orientation(30, 20)
  expect(useAttitudeControlStore().mode).toBe('simulation')
})
