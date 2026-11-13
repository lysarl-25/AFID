import { afterEach, expect, it, vi } from 'vitest'
import { fetchNearbyAircraft } from '../liveApi'

afterEach(() => vi.unstubAllGlobals())

it('explains a missing backend when static hosting returns HTML with status 200', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => { throw new SyntaxError('HTML response') },
  }))
  await expect(fetchNearbyAircraft({ lat: 13, lon: 100 }, 50)).rejects.toThrow('ADS-B server is deployed')
})

it('passes normalized aircraft responses through to the store', async () => {
  const response = { aircraft: [], provider: 'adsb.lol', fetchedAt: 1000, attribution: '' }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response }))
  expect(await fetchNearbyAircraft({ lat: 13, lon: 100 }, 50)).toEqual(response)
})
