import { afterEach, expect, it, vi } from 'vitest'
import handler from '../api/adsb/[...path].js'

afterEach(() => vi.unstubAllGlobals())

async function request(url, method = 'GET') {
  const res = { setHeader() {}, end(body) { this.body = JSON.parse(body) } }
  await handler({ url, method }, res)
  return res
}

it('serves real proxy response structure through the Vercel handler', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    now: Date.now(), ac: [{ hex: 'abc789', flight: 'LIVE789', gs: 250, alt_baro: 15000, track: 45, baro_rate: 500 }],
  }) }))
  const res = await request('/api/adsb/nearby?lat=13.7&lon=100.7&radius=25')
  expect(res.statusCode).toBe(200)
  expect(res.body.aircraft[0]).toMatchObject({
    icao24: 'abc789', groundSpeedKt: 250, altitudeBaroFt: 15000, trackDeg: 45, verticalRateFpm: 500,
  })
  expect(typeof res.body.fetchedAt).toBe('number')
})

it('rejects invalid API requests and unsupported methods', async () => {
  expect((await request('/api/adsb/nearby?lat=&lon=')).statusCode).toBe(400)
  expect((await request('/api/adsb/nearby', 'POST')).statusCode).toBe(405)
  expect((await request('/api/adsb/unknown')).statusCode).toBe(404)
  expect((await request('/other')).statusCode).toBe(404)
})
