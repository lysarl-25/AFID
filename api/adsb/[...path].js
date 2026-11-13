import { handleAdsbRequest } from '../../server/adsb.mjs'

// Use the same proxy in Vite, the standalone server, and Vercel Functions.
export default async function handler(req, res) {
  const handled = await handleAdsbRequest(req, res)
  if (!handled) {
    res.statusCode = 404
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Unknown ADS-B endpoint' }))
  }
}
