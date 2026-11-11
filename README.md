# Aircraft Flight Instruments

A modern, responsive Primary Flight Display (PFD) style dashboard for an
educational aircraft instrument simulator. Six flight instruments are rendered
entirely with SVG, CSS, and TypeScript, and respond in real time to simulated
flight data.

> **SIMULATION ONLY.** This project is an educational demonstration. It is not
> certified aviation equipment and must not be used for navigation, flight
> planning, or any real-world aviation decision.

## Features

- Six functional instruments:
  - Airspeed indicator with moving tape and profile color bands
  - Attitude indicator with sky/ground, pitch ladder, and roll scale
  - Altimeter with moving tape and configurable BARO setting
  - Vertical speed indicator with safe/caution/limit zones
  - Rotating heading indicator with compass card and degree markings
  - Turn coordinator with banked miniature aircraft and slip/skid ball
- Centralized Pinia store with smooth, time-based value interpolation
- Interactive control panel for all eight flight parameters
- Pause/resume, reset, and Level/Climb/Descent presets
- Optional ambient turbulence simulation
- Two configurable aircraft profiles with different ranges and warning bands
- Fullscreen mode and accessible settings modal
- Responsive cockpit layout for desktop, tablet, and mobile
- No static images used for instruments

## Technology

- Vue 3 + TypeScript
- Vite
- Pinia
- SCSS
- SVG
- Lucide Vue icons (`@lucide/vue`)
- Vitest for utility and store tests

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- npm 10+

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the local URL printed by Vite.

## Production Build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Flight Controls

The control panel accepts target values for:

| Control | Unit | Default |
| --- | --- | --- |
| Airspeed | KTS | 280 |
| Altitude | FT | 33,000 |
| Pitch | DEG | 0 |
| Roll | DEG | 0 |
| Vertical speed | FT/MIN | 0 |
| Heading | DEG | 180 |
| Turn rate | DEG/S | 0 |
| Slip / skid | BALL | 0.00 |

Each parameter has a slider, editable numeric input, and decrease/increase
buttons. Instruments animate toward the selected target values.

- **Pause/Resume** freezes or restarts the simulation loop.
- **Reset** restores the demonstration values, clamped to the active profile.
- **Presets** quickly configure level, climb, or descent attitudes.
- **Settings** changes the aircraft profile, BARO setting, and turbulence.

## Aircraft Profiles

Ranges and warning thresholds are profile-based rather than universal:

- **Generic Business Jet** — 0–450 KTS, 0–50,000 FT, ±3,000 FT/MIN VSI
- **Light Trainer (Piston)** — 0–200 KTS, 0–20,000 FT, ±2,000 FT/MIN VSI

Changing the aircraft profile immediately clamps the current values to the new
aircraft envelope and updates the instrument color bands and VSI zones.

## Project Structure

```text
src/
├── App.vue
├── main.ts
├── components/
│   ├── DashboardHeader.vue
│   ├── FlightControlPanel.vue
│   ├── SettingsPanel.vue
│   ├── instruments/
│   │   ├── AirspeedIndicator.vue
│   │   ├── AttitudeIndicator.vue
│   │   ├── Altimeter.vue
│   │   ├── VerticalSpeedIndicator.vue
│   │   ├── HeadingIndicator.vue
│   │   └── TurnCoordinator.vue
│   └── ui/
│       ├── InstrumentFrame.vue
│       └── ControlField.vue
├── composables/
│   ├── useFullscreen.ts
│   └── useSimulationLoop.ts
├── data/
│   └── aircraftProfiles.ts
├── stores/
│   ├── flightStore.ts
│   └── __tests__/flightStore.spec.ts
├── styles/
│   ├── _mixins.scss
│   ├── _tokens.scss
│   └── main.scss
├── types/
│   └── flight.ts
└── utils/
    ├── format.ts
    ├── math.ts
    ├── svg.ts
    └── __tests__/math.spec.ts
```

## Architecture Notes

- `flightStore.ts` owns target values, smoothed display values, the active
  profile, simulation state, and the per-frame `tick()` interpolation.
- Heading values use shortest-angle interpolation and a continuous display
  angle so 359° ↔ 000° does not spin the compass card the long way around.
- `useSimulationLoop.ts` manages a single requestAnimationFrame loop, pauses
  when the tab is hidden, and cleans up on unmount.
- `useFullscreen.ts` detects browser support, syncs fullscreen state, and
  removes its listener on unmount.
- Instrument tape/scale geometry is generated from reusable utilities in
  `utils/svg.ts`; profile changes regenerate only the static markings.
- `prefers-reduced-motion` is respected for decorative CSS animation.

## Safety and Limitations

- All data is simulated and is clearly labeled as such.
- No instrument is connected to real avionics or sensor data.
- Color ranges are demonstration values for the selected generic aircraft
  profile and are not operational limitations.
- Do not use this application for flight operations.
