export interface FlightData {
  airspeed: number
  altitude: number
  pitch: number
  roll: number
  verticalSpeed: number
  heading: number
  turnRate: number
  slipSkid: number
}

export type FlightKey = keyof FlightData

export type FlightMode = 'simulation' | 'live'

export type AircraftProfileId = 'businessJet' | 'lightTrainer'

export type FlightPreset = 'level' | 'climb' | 'descent'

export interface Range {
  min: number
  max: number
}

export interface AirspeedBands {
  white: [number, number]
  green: [number, number]
  amber: [number, number]
  redline: number
}

export interface VerticalSpeedBands {
  safe: number
  caution: number
  limit: number
}

export interface AircraftProfile {
  id: AircraftProfileId
  name: string
  shortName: string
  description: string
  airspeed: {
    min: number
    max: number
    bands: AirspeedBands
  }
  altitude: Range
  verticalSpeed: {
    min: number
    max: number
    bands: VerticalSpeedBands
  }
  pitch: Range
  roll: Range
  turnRate: Range
  baro: number
}

export interface ControlDefinition {
  key: FlightKey
  label: string
  unit: string
  min: number
  max: number
  step: number
  decimals: number
  signed: boolean
}

export interface TapeTick {
  value: number
  major: boolean
  y: number
}
