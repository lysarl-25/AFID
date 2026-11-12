const PROVIDERS = [
  {
    name: 'airplanes.live',
    baseUrl: 'https://api.airplanes.live/v2',
    attribution: 'Aircraft data © airplanes.live',
  },
  {
    name: 'adsb.lol',
    baseUrl: 'https://api.adsb.lol/v2',
    attribution: 'Aircraft data © adsb.lol (ODbL)',
  },
]

const CACHE_TTL_MS = Number(process.env.ADSB_CACHE_TTL_MS) || 4500
const REQUEST_TIMEOUT_MS = Number(process.env.ADSB_REQUEST_TIMEOUT_MS) || 8000
const UPSTREAM_INTERVAL_MS = Number(process.env.ADSB_UPSTREAM_INTERVAL_MS) || 1100
const USER_AGENT =
  process.env.ADSB_USER_AGENT || 'AFID-Dashboard/1.0 (local educational flight display)'

const cache = new Map()
const inflight = new Map()
let upstreamQueue = Promise.resolve()
let lastUpstreamAt = 0

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function toFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function cleanText(value, maxLength = 64) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusNm = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const toDeg = (radians) => (radians * 180) / Math.PI
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function normalizeAircraft(raw, provider, updatedAt) {
  if (!raw || typeof raw !== 'object') return null
  const hex = cleanText(raw.hex, 8)
  if (!hex) return null

  const onGround = raw.alt_baro === 'ground' || raw.ground === true || raw.on_ground === true
  const altitudeBaroFt = raw.alt_baro === 'ground' ? 0 : toFiniteNumber(raw.alt_baro)
  const altitudeGeomFt = toFiniteNumber(raw.alt_geom)
  const verticalRateFpm =
    toFiniteNumber(raw.baro_rate) ?? toFiniteNumber(raw.geom_rate) ?? toFiniteNumber(raw.vert_rate)

  return {
    icao24: hex.toLowerCase(),
    callsign: cleanText(raw.flight, 16),
    registration: cleanText(raw.r, 16),
    typeCode: cleanText(raw.t, 16),
    description: cleanText(raw.desc, 96),
    category: cleanText(raw.category, 8),
    lat: toFiniteNumber(raw.lat),
    lon: toFiniteNumber(raw.lon),
    onGround,
    altitudeBaroFt,
    altitudeGeomFt,
    groundSpeedKt: toFiniteNumber(raw.gs),
    indicatedAirspeedKt: toFiniteNumber(raw.ias),
    trueAirspeedKt: toFiniteNumber(raw.tas),
    trackDeg: toFiniteNumber(raw.track),
    magneticHeadingDeg: toFiniteNumber(raw.mag_heading),
    verticalRateFpm,
    rollDeg: toFiniteNumber(raw.roll),
    turnRateDegSec: toFiniteNumber(raw.track_rate),
    squawk: cleanText(raw.squawk, 8),
    emergency: cleanText(raw.emergency, 16),
    seenSeconds: toFiniteNumber(raw.seen) ?? 0,
    seenPositionSeconds: toFiniteNumber(raw.seen_pos),
    distanceNm: toFiniteNumber(raw.dst),
    bearingDeg: toFiniteNumber(raw.dir),
    source: provider.name,
    updatedAt,
  }
}

function queueUpstream(task) {
  const run = upstreamQueue.then(async () => {
    const waitMs = Math.max(0, lastUpstreamAt + UPSTREAM_INTERVAL_MS - Date.now())
    if (waitMs > 0) await delay(waitMs)
    lastUpstreamAt = Date.now()
    return task()
  })
  upstreamQueue = run.catch(() => {})
  return run
}

async function fetchJson(url) {
  return queueUpstream(async () => {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText || 'upstream error'}`)
    }

    return response.json()
  })
}

async function fetchFromProviders(path) {
  const failures = []

  for (const provider of PROVIDERS) {
    try {
      const payload = await fetchJson(`${provider.baseUrl}${path}`)
      if (!payload || !Array.isArray(payload.ac)) {
        throw new Error('Invalid aircraft response')
      }
      // Providers use Unix milliseconds or seconds for the snapshot timestamp.
      const timestamp = toFiniteNumber(payload.now)
      const updatedAt = timestamp != null && timestamp > 0
        ? Math.min(Date.now(), timestamp < 1e12 ? timestamp * 1000 : timestamp)
        : Date.now()
      const aircraft = payload.ac
        .map((item) => normalizeAircraft(item, provider, updatedAt)).filter(Boolean)

      if (path.startsWith('/hex/') && aircraft.length === 0) {
        failures.push(`${provider.name}: no matching aircraft`)
        continue
      }

      return { aircraft, provider }
    } catch (error) {
      failures.push(`${provider.name}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }

  throw new Error(`ADS-B providers unavailable (${failures.join('; ')})`)
}

async function cached(key, loader) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  const pending = inflight.get(key)
  if (pending) return pending

  const request = (async () => {
    try {
      const value = await loader()
      cache.set(key, { at: Date.now(), value })
      return value
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, request)
  return request
}

async function getNearby(lat, lon, radiusNm) {
  const key = `nearby:${lat.toFixed(4)}:${lon.toFixed(4)}:${radiusNm}`
  return cached(key, async () => {
    const { aircraft, provider } = await fetchFromProviders(`/point/${lat}/${lon}/${radiusNm}`)

    const enriched = aircraft
      .map((item) => {
        if (item.lat == null || item.lon == null) return item
        return {
          ...item,
          distanceNm:
            item.distanceNm ?? haversineNm(lat, lon, item.lat, item.lon),
          bearingDeg: item.bearingDeg ?? bearingDeg(lat, lon, item.lat, item.lon),
        }
      })
      .sort((a, b) => (a.distanceNm ?? Infinity) - (b.distanceNm ?? Infinity))
      .slice(0, 40)

    return {
      aircraft: enriched,
      provider: provider.name,
      attribution: provider.attribution,
      fetchedAt: Date.now(),
    }
  })
}

async function getAircraft(icao24) {
  const key = `aircraft:${icao24}`
  return cached(key, async () => {
    const { aircraft, provider } = await fetchFromProviders(`/hex/${icao24}`)
    const match = aircraft.find((item) => item.icao24 === icao24) ?? null

    if (!match) {
      const error = new Error('Aircraft not found')
      error.statusCode = 404
      throw error
    }

    return {
      aircraft: match,
      provider: provider.name,
      attribution: provider.attribution,
      fetchedAt: Date.now(),
    }
  })
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

function validCoordinate(value, maxAbs) {
  return Number.isFinite(value) && Math.abs(value) <= maxAbs
}

export async function handleAdsbRequest(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const pathname = url.pathname

  if (!pathname.startsWith('/api/adsb/')) return false

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return true
  }

  try {
    if (pathname === '/api/adsb/nearby') {
      const latRaw = url.searchParams.get('lat')
      const lonRaw = url.searchParams.get('lon')
      const lat = Number(latRaw)
      const lon = Number(lonRaw)
      const requestedRadius = Number(url.searchParams.get('radius') ?? 50)
      const radiusNm = Math.round(
        Number.isFinite(requestedRadius) ? Math.min(250, Math.max(1, requestedRadius)) : 50,
      )

      if (
        latRaw == null ||
        lonRaw == null ||
        latRaw.trim() === '' ||
        lonRaw.trim() === '' ||
        !validCoordinate(lat, 90) ||
        !validCoordinate(lon, 180)
      ) {
        sendJson(res, 400, { error: 'Valid lat and lon query parameters are required' })
        return true
      }

      sendJson(res, 200, await getNearby(lat, lon, radiusNm))
      return true
    }

    const aircraftMatch = pathname.match(/^\/api\/adsb\/aircraft\/([a-fA-F0-9]{6})$/)
    if (aircraftMatch) {
      sendJson(res, 200, await getAircraft(aircraftMatch[1].toLowerCase()))
      return true
    }

    sendJson(res, 404, { error: 'Unknown ADS-B endpoint' })
    return true
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode) || 502
        : 502
    const message = error instanceof Error ? error.message : 'ADS-B request failed'
    sendJson(res, statusCode, { error: message })
    return true
  }
}

export function createAdsbMiddleware() {
  return (req, res, next) => {
    handleAdsbRequest(req, res)
      .then((handled) => {
        if (!handled && typeof next === 'function') next()
      })
      .catch((error) => {
        if (!res.headersSent) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : 'Internal server error',
          })
        } else if (!res.writableEnded) {
          res.end()
        }
      })
  }
}
