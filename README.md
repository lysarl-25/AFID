# Aircraft Flight Instruments

A modern, responsive Primary Flight Display (PFD) style dashboard for an
educational aircraft instrument simulator. Six flight instruments are rendered
entirely with SVG, CSS, and TypeScript. They respond to simulated flight data or,
optionally, to nearby aircraft from community ADS-B feeds.

> **NOT FOR NAVIGATION OR FLIGHT.** This project is an educational
> demonstration. Simulated values are invented; live ADS-B values are delayed,
> incomplete, and may be wrong. Attitude is estimated. This is not certified
> aviation equipment.

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
- Optional live ADS-B tracking for nearby aircraft (`airplanes.live`, with
  `adsb.lol` fallback)
- Local Node proxy with caching, request throttling, and provider failover
- Live/simulation mode switching, stale-data handling, and aircraft picker
- Fullscreen mode and accessible settings and live-picker modals
- Responsive cockpit layout for desktop, tablet, and mobile
- No static images used for instruments

## Technology

- Vue 3 + TypeScript
- Vite
- Pinia
- SCSS
- SVG
- Lucide Vue icons (`@lucide/vue`)
- Node.js HTTP server for the production build and ADS-B proxy
- Vitest for utility, mapping, and store tests

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

Open the local URL printed by Vite. The ADS-B proxy is mounted directly in the
Vite dev server, so no second terminal is required.

## Production Build

```bash
npm run build
npm start
```

`npm start` runs `server/index.mjs`, which serves `dist/` and the `/api/adsb/*`
proxy on `http://localhost:8787` by default. Set `PORT` to override the port.

Preview the Vite production build with the proxy enabled:

```bash
npm run preview
```

Optional server settings are documented in `.env.example`:
`ADSB_CACHE_TTL_MS`, `ADSB_REQUEST_TIMEOUT_MS`, `ADSB_UPSTREAM_INTERVAL_MS`, and
`ADSB_USER_AGENT`.

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

## Device Motion and Keyboard Attitude Control

The **Attitude control** section has three input modes:

- **SIMULATION** uses the existing flight controls and turbulence.
- **DEVICE MOTION** reads the phone's `DeviceOrientationEvent` beta/gamma angles.
  Tap the button to request sensor permission where required (including iOS Safari).
  Hold the phone comfortably: the first valid reading establishes neutral.
  Tap **Calibrate** to set a new neutral position. Tap **DEVICE MOTION** again
  while connected or waiting to turn it off, or choose **SIMULATION**.
- **KEYBOARD** uses held arrow keys: left/right bank, up/down pitch. Release to
  hold the current attitude. **Space** levels the attitude; **Escape** exits.
  Arrow scrolling is prevented during control, while form inputs retain normal
  keyboard behavior. Click an instrument to move focus out of a form input.

Both input modes use time-based smoothing in the existing animation loop and work
when the simulation is paused. Sensitivity is adjustable from 0.25 to 3 times;
pitch limits from ±5 to ±45 degrees and roll limits from ±5 to ±80 degrees.
**Reset attitude** levels the display; in device mode it also sets the current
phone position as neutral. Changing portrait/landscape orientation automatically
establishes a new neutral on the next reading.

Only the attitude indicator's horizon and pitch ladder respond to these inputs.
The aircraft reference stays fixed. The other five instruments retain their
existing simulation data, and returning to simulation restores the original
attitude controls. Selecting a device/keyboard mode leaves live ADS-B tracking;
starting live tracking disables device/keyboard control.

Sensors require **HTTPS or localhost**. A phone opening an HTTP URL on your
laptop's LAN IP is not using localhost; serve it over HTTPS for motion access.
API support does not guarantee sensor hardware. Unsupported APIs, denied
permission, insecure connections, and missing readings show an explanation and
offer keyboard/simulation fallback. After five seconds without readings, select
**DEVICE MOTION** again to retry. This is a device-controlled demonstration,
not a connection to real aircraft attitude sensors.

### Motion Control Verification

`npm test` covers portrait, both landscape directions, inverted portrait,
calibration, sensitivity, limits, smoothing, keyboard input, permission failures,
missing readings, listener cleanup, and the SVG horizon/reference transforms.
These tests use synthetic sensor events; they do not replace hardware testing.

For a physical phone check, open the dashboard over HTTPS in Android Chrome and
iOS Safari, choose **DEVICE MOTION**, grant permission, and calibrate. Tilt
right/left and forward/back: bank should move the horizon opposite the aircraft,
and positive pitch should move the horizon down. Rotate into each landscape
direction, let the next reading reestablish level, and repeat. Verify denial,
reset, switching to simulation, and keyboard fallback. On a laptop, verify held
arrows, Space, Escape, and normal editing in input fields.

## Live ADS-B Tracking

Use the radio-tower button in the header to open the live aircraft picker. When
already tracking, the control panel also has a **Change** button:

1. Use browser geolocation or enter latitude/longitude manually.
2. Choose a search radius (5–250 NM).
3. Select an aircraft from the nearest-first list.

The selected aircraft is polled every five seconds through the local proxy.
The app does not call ADS-B providers directly from the browser.
If the primary provider is unavailable, the proxy tries `adsb.lol` automatically.
The displayed data age includes the provider snapshot timestamp and the aircraft's
last-seen age, so cached responses do not reset the freshness indicator.

| Instrument value | ADS-B source | Notes |
| --- | --- | --- |
| Airspeed | `ias`, then `tas`, then `gs` | Labeled IAS/TAS/GS; ground speed is not indicated airspeed |
| Altitude | `alt_baro`, then `alt_geom` | Displayed as STD/QNE or GNSS; ground targets show 0 FT |
| Vertical speed | `baro_rate`, then `geom_rate` | FT/MIN |
| Heading | `mag_heading`, then `track` | Labeled MAG or TRK |
| Turn rate | `track_rate` or derived from track changes | Estimated when derived |
| Bank | provider `roll`, otherwise derived from turn rate | Labeled EST |
| Pitch | estimated from vertical rate and ground speed | Labeled EST; not a real attitude source |
| Slip / skid | unavailable | Displayed as `N/A`; never fabricated |

- Data older than 15 seconds is marked stale; older than 60 seconds is marked
  lost while the app keeps retrying.
- Simulation controls, profiles, presets, reset, and turbulence are disabled in
  live mode.
- Return to simulation from the picker or the control panel.
- The last manually entered or geolocated position is saved in browser local
  storage. Location data is not sent anywhere except as query parameters to the
  local proxy.

### ADS-B Limitations

Community ADS-B is not equivalent to aircraft avionics. Position and altitude may
be delayed, missing, or incorrect. Ground speed is not airspeed. Attitude, pitch,
bank, IAS, and slip/skid are not reliably broadcast; this dashboard estimates or
marks them unavailable. Receiver coverage varies by location. Providers'
attribution and terms apply.

## Aircraft Profiles

Ranges and warning thresholds are profile-based rather than universal:

- **Generic Business Jet** — 0–450 KTS, 0–50,000 FT, ±3,000 FT/MIN VSI
- **Light Trainer (Piston)** — 0–200 KTS, 0–20,000 FT, ±2,000 FT/MIN VSI

Changing the aircraft profile immediately clamps the current values to the new
aircraft envelope and updates the instrument color bands and VSI zones.

## Project Structure

```text
server/
├── adsb.mjs          ADS-B provider proxy, cache, throttling, normalization
├── adsb.d.mts        Types for the Vite middleware import
└── index.mjs         Production static server + API
src/
├── App.vue
├── main.ts
├── components/
│   ├── DashboardHeader.vue
│   ├── FlightControlPanel.vue
│   ├── LiveFlightPicker.vue
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
├── services/
│   └── liveApi.ts
├── stores/
│   ├── flightStore.ts
│   ├── liveTrackingStore.ts
│   └── __tests__/flightStore.spec.ts
├── styles/
│   ├── _mixins.scss
│   ├── _tokens.scss
│   └── main.scss
├── types/
│   ├── flight.ts
│   └── live.ts
└── utils/
    ├── format.ts
    ├── liveMapping.ts
    ├── math.ts
    ├── svg.ts
    └── __tests__/
        ├── liveMapping.spec.ts
        └── math.spec.ts
```

## Architecture Notes

- `flightStore.ts` owns target values, smoothed display values, the active
  profile, simulation/live mode, and the per-frame `tick()` interpolation.
- `liveTrackingStore.ts` owns geolocation, nearby searches, selected-aircraft
  polling, request cancellation, staleness classification, and mode switching.
- `utils/liveMapping.ts` converts normalized ADS-B fields into instrument data
  and explicit source/estimate metadata.
- `server/adsb.mjs` normalizes provider responses, caches results briefly,
  de-duplicates in-flight requests, throttles upstream calls, and falls back
  from `airplanes.live` to `adsb.lol`.
- Heading values use shortest-angle interpolation and a continuous display
  angle so 359° ↔ 000° does not spin the compass card the long way around.
- `useSimulationLoop.ts` manages a single requestAnimationFrame loop, keeps
  running in live mode for smoothing, pauses when the tab is hidden, and cleans
  up on unmount.
- `useFullscreen.ts` detects browser support, syncs fullscreen state, and
  removes its listener on unmount.
- Instrument tape/scale geometry is generated from reusable utilities in
  `utils/svg.ts`; profile changes regenerate only the static markings.
- `prefers-reduced-motion` is respected for decorative CSS animation.

## Safety and Limitations

- Simulation data is invented and clearly labeled SIM. Live data is community
  ADS-B, labeled LIVE, and is delayed, incomplete, and not flight-quality.
- No instrument is connected to certified avionics or aircraft sensors.
- Live attitude, pitch, and bank are estimates; IAS and slip/skid may be
  unavailable. ADS-B ground speed must not be treated as indicated airspeed.
- Color ranges are demonstration values, not aircraft operational limitations.
  Warning bands are hidden in live mode.
- Provider attribution and terms apply to ADS-B data.
- Do not use this application for navigation, flight planning, or flight
  operations.
