import type { AircraftProfile, AircraftProfileId, FlightData } from '@/types/flight'

export const DEFAULT_FLIGHT_DATA: FlightData = {
  airspeed: 280,
  altitude: 33000,
  pitch: 0,
  roll: 0,
  verticalSpeed: 0,
  heading: 180,
  turnRate: 0,
  slipSkid: 0,
}

export const AIRCRAFT_PROFILES: Record<AircraftProfileId, AircraftProfile> = {
  businessJet: {
    id: 'businessJet',
    name: 'Generic Business Jet',
    shortName: 'BIZJET',
    description:
      'Twin-engine business jet demonstration profile with a 280 KTS cruise, 33,000 FT cruise altitude, and high-speed scheduling.',
    airspeed: {
      min: 0,
      max: 450,
      bands: {
        white: [80, 130],
        green: [130, 330],
        amber: [330, 350],
        redline: 350,
      },
    },
    altitude: { min: 0, max: 50000 },
    verticalSpeed: {
      min: -3000,
      max: 3000,
      bands: { safe: 1500, caution: 2500, limit: 3000 },
    },
    pitch: { min: -30, max: 30 },
    roll: { min: -60, max: 60 },
    turnRate: { min: -6, max: 6 },
    baro: 29.92,
  },
  lightTrainer: {
    id: 'lightTrainer',
    name: 'Light Trainer (Piston)',
    shortName: 'TRAINER',
    description:
      'Single-engine training profile with lower airspeed and altitude limits, a tighter vertical-speed envelope, and a 2,000 FT/MIN VSI scale.',
    airspeed: {
      min: 0,
      max: 200,
      bands: {
        white: [45, 70],
        green: [70, 130],
        amber: [130, 160],
        redline: 160,
      },
    },
    altitude: { min: 0, max: 20000 },
    verticalSpeed: {
      min: -2000,
      max: 2000,
      bands: { safe: 1000, caution: 1500, limit: 2000 },
    },
    pitch: { min: -30, max: 30 },
    roll: { min: -60, max: 60 },
    turnRate: { min: -6, max: 6 },
    baro: 29.92,
  },
}

export const DEFAULT_PROFILE_ID: AircraftProfileId = 'businessJet'

export const AIRCRAFT_PROFILE_LIST = Object.values(AIRCRAFT_PROFILES)
