import type { FlightData } from './flight'

export type LiveAirspeedKind = 'GS' | 'IAS' | 'TAS'
export type LiveHeadingKind = 'MAG' | 'TRK'
export type LiveAltitudeKind = 'QNE' | 'GNSS'

export interface LiveAircraft {
  icao24: string
  callsign: string | null
  registration: string | null
  typeCode: string | null
  description: string | null
  category: string | null
  lat: number | null
  lon: number | null
  onGround: boolean
  altitudeBaroFt: number | null
  altitudeGeomFt: number | null
  groundSpeedKt: number | null
  indicatedAirspeedKt: number | null
  trueAirspeedKt: number | null
  trackDeg: number | null
  magneticHeadingDeg: number | null
  verticalRateFpm: number | null
  rollDeg: number | null
  turnRateDegSec: number | null
  squawk: string | null
  emergency: string | null
  seenSeconds: number
  seenPositionSeconds: number | null
  distanceNm: number | null
  bearingDeg: number | null
  source: string
  updatedAt: number
}

export interface LiveMeta {
  onGround: boolean
  airspeedKind: LiveAirspeedKind
  headingKind: LiveHeadingKind
  altitudeKind: LiveAltitudeKind | null
  attitudeEstimated: boolean
  slipAvailable: boolean
  source: string
  seenSeconds: number
}

export interface LiveSnapshot {
  data: Partial<FlightData>
  meta: LiveMeta
}

export interface LiveNearbyResponse {
  aircraft: LiveAircraft[]
  provider: string
  attribution: string
  fetchedAt: number
}

export interface LiveAircraftResponse {
  aircraft: LiveAircraft
  provider: string
  attribution: string
  fetchedAt: number
}

export interface LivePosition {
  lat: number
  lon: number
}

export type LiveConnectionState = 'idle' | 'loading' | 'live' | 'stale' | 'lost' | 'error'
