import type { FlightData } from '@/types/flight'
import type {
  LiveAircraft,
  LiveAltitudeKind,
  LiveAirspeedKind,
  LiveHeadingKind,
  LiveMeta,
  LiveSnapshot,
} from '@/types/live'
import { clamp, normalizeHeading, shortestAngleDiff } from './math'

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function airspeedFor(aircraft: LiveAircraft): {
  value: number | null
  kind: LiveAirspeedKind
} {
  if (!aircraft.onGround && finite(aircraft.indicatedAirspeedKt)) {
    return { value: aircraft.indicatedAirspeedKt, kind: 'IAS' }
  }
  if (!aircraft.onGround && finite(aircraft.trueAirspeedKt)) {
    return { value: aircraft.trueAirspeedKt, kind: 'TAS' }
  }
  if (finite(aircraft.groundSpeedKt)) {
    return { value: aircraft.groundSpeedKt, kind: 'GS' }
  }
  return { value: null, kind: 'GS' }
}

function altitudeFor(aircraft: LiveAircraft): {
  value: number | null
  kind: LiveAltitudeKind | null
} {
  if (aircraft.onGround) return { value: 0, kind: null }
  if (finite(aircraft.altitudeBaroFt)) {
    return { value: aircraft.altitudeBaroFt, kind: 'QNE' }
  }
  if (finite(aircraft.altitudeGeomFt)) {
    return { value: aircraft.altitudeGeomFt, kind: 'GNSS' }
  }
  return { value: null, kind: null }
}

function headingFor(aircraft: LiveAircraft): {
  value: number | null
  kind: LiveHeadingKind
} {
  if (finite(aircraft.magneticHeadingDeg)) {
    return { value: aircraft.magneticHeadingDeg, kind: 'MAG' }
  }
  if (finite(aircraft.trackDeg)) {
    return { value: aircraft.trackDeg, kind: 'TRK' }
  }
  return { value: null, kind: 'TRK' }
}

function derivedTurnRate(
  aircraft: LiveAircraft,
  previous: LiveAircraft | null,
): number | null {
  if (finite(aircraft.turnRateDegSec)) return aircraft.turnRateDegSec
  if (
    !previous ||
    !finite(aircraft.trackDeg) ||
    !finite(previous.trackDeg) ||
    aircraft.updatedAt <= previous.updatedAt
  ) {
    return null
  }

  const seconds = (aircraft.updatedAt - previous.updatedAt) / 1000
  return shortestAngleDiff(previous.trackDeg, aircraft.trackDeg) / seconds
}

function referenceSpeedKt(aircraft: LiveAircraft): number | null {
  if (finite(aircraft.groundSpeedKt)) return aircraft.groundSpeedKt
  if (finite(aircraft.trueAirspeedKt)) return aircraft.trueAirspeedKt
  if (finite(aircraft.indicatedAirspeedKt)) return aircraft.indicatedAirspeedKt
  return null
}

export function mapLiveAircraft(
  aircraft: LiveAircraft,
  previous: LiveAircraft | null = null,
): LiveSnapshot {
  const data: Partial<FlightData> = {}
  const airspeed = airspeedFor(aircraft)
  const altitude = altitudeFor(aircraft)
  const heading = headingFor(aircraft)

  if (airspeed.value != null) data.airspeed = airspeed.value
  if (altitude.value != null) data.altitude = altitude.value
  if (heading.value != null) data.heading = normalizeHeading(heading.value)

  if (aircraft.onGround) {
    data.verticalSpeed = 0
    data.pitch = 0
    data.roll = 0
    data.turnRate = 0
  } else {
    if (finite(aircraft.verticalRateFpm)) {
      data.verticalSpeed = aircraft.verticalRateFpm
    }

    const turnRate = derivedTurnRate(aircraft, previous)
    if (turnRate != null) data.turnRate = turnRate

    const speedKt = referenceSpeedKt(aircraft)
    const speedMps = speedKt != null ? Math.max(0, speedKt) * 0.514444 : 0
    const verticalMps =
      finite(aircraft.verticalRateFpm) ? aircraft.verticalRateFpm * 0.00508 : 0

    if (speedMps > 1) {
      data.pitch = clamp((Math.atan2(verticalMps, speedMps) * 180) / Math.PI, -30, 30)
    } else {
      data.pitch = 0
    }

    if (finite(aircraft.rollDeg)) {
      data.roll = clamp(aircraft.rollDeg, -60, 60)
    } else if (turnRate != null && speedMps > 1) {
      const bankRad = Math.atan((turnRate * Math.PI * speedMps) / (180 * 9.80665))
      data.roll = clamp((bankRad * 180) / Math.PI, -60, 60)
    } else {
      data.roll = 0
    }
  }

  data.slipSkid = 0

  const meta: LiveMeta = {
    onGround: aircraft.onGround,
    airspeedKind: airspeed.kind,
    headingKind: heading.kind,
    altitudeKind: altitude.kind,
    attitudeEstimated: true,
    slipAvailable: false,
    source: aircraft.source,
    seenSeconds: aircraft.seenSeconds,
  }

  return { data, meta }
}
