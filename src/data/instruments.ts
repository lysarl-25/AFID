import type { FlightKey } from '@/types/flight'

export const INSTRUMENTS = [
  { code: 'ASI', title: 'Airspeed Indicator', shortTitle: 'Airspeed', controls: ['airspeed'] },
  { code: 'ATT', title: 'Attitude Indicator', shortTitle: 'Attitude', controls: ['pitch', 'roll'] },
  { code: 'ALT', title: 'Altimeter', shortTitle: 'Altitude', controls: ['altitude'] },
  { code: 'TC', title: 'Turn Coordinator', shortTitle: 'Turn', controls: ['roll', 'turnRate', 'slipSkid'] },
  { code: 'HDG', title: 'Heading Indicator', shortTitle: 'Heading', controls: ['heading'] },
  { code: 'VSI', title: 'Vertical Speed Indicator', shortTitle: 'Vertical speed', controls: ['verticalSpeed'] },
] as const satisfies ReadonlyArray<{ code: string; title: string; shortTitle: string; controls: readonly FlightKey[] }>

export type InstrumentCode = typeof INSTRUMENTS[number]['code']
export type InstrumentView = 'ALL' | InstrumentCode
