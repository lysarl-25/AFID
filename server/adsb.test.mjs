import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('ADSB_UPSTREAM_INTERVAL_MS', '-1')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function request(path) {
  const { handleAdsbRequest } = await import('./adsb.mjs')
  const res = { setHeader() {}, end(body) { this.body = JSON.parse(body) } }
  await handleAdsbRequest({ method: 'GET', url: path }, res)
  return res
}

it.each([1700000000, 1700000000000])('preserves provider snapshot age (%s)', async (now) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ now, ac: [{ hex: 'abc123', seen: 2 }] }),
  }))
  const res = await request('/api/adsb/aircraft/abc123')
  expect(res.statusCode).toBe(200)
  expect(res.body.aircraft.updatedAt).toBe(1700000000000)
  expect(res.body.aircraft.seenSeconds).toBe(2)
})

it('falls back when a provider returns an invalid response', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ error: 'Unavailable' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ac: [{ hex: 'abc123' }] }) }))
  const res = await request('/api/adsb/aircraft/abc123')
  expect(res.statusCode).toBe(200)
  expect(res.body.provider).toBe('adsb.lol')
})

it('never substitutes a different aircraft for the requested identity', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ ac: [{ hex: 'def456' }] }),
  }))
  const res = await request('/api/adsb/aircraft/abc123')
  expect(res.statusCode).toBe(404)
  expect(res.body.aircraft).toBeUndefined()
})

it('rejects blank coordinates before contacting a provider', async () => {
  const upstream = vi.fn()
  vi.stubGlobal('fetch', upstream)
  const res = await request('/api/adsb/nearby?lat=&lon=')
  expect(res.statusCode).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
})
