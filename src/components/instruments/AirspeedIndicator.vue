<script setup lang="ts">
import { computed } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { buildTapeTicks } from '@/utils/svg'
import { formatNumber } from '@/utils/format'

const SCALE = 2.4
const CENTER_Y = 160
const TICK_X = 192

const store = useFlightStore()

const ticks = computed(() =>
  buildTapeTicks(
    store.profile.airspeed.min,
    store.profile.airspeed.max,
    10,
    20,
    CENTER_Y,
    SCALE,
  ),
)

const bands = computed(() => {
  const aircraft = store.profile.airspeed
  const segments = [
    {
      from: aircraft.bands.white[0],
      to: aircraft.bands.white[1],
      color: '#dceeff',
    },
    {
      from: aircraft.bands.green[0],
      to: aircraft.bands.green[1],
      color: '#3df59a',
    },
    {
      from: aircraft.bands.amber[0],
      to: aircraft.bands.amber[1],
      color: '#ffc247',
    },
    {
      from: aircraft.bands.redline,
      to: aircraft.max,
      color: '#ff5d6c',
    },
  ]

  return segments
    .filter((segment) => segment.to > segment.from)
    .map((segment) => ({
      ...segment,
      y: CENTER_Y - segment.to * SCALE,
      height: (segment.to - segment.from) * SCALE,
    }))
})

const tapeOffset = computed(() => store.display.airspeed * SCALE)
const readout = computed(() => Math.round(store.display.airspeed))

const ariaLabel = computed(
  () => `Airspeed indicator. Indicated airspeed ${readout.value} knots.`,
)
</script>

<template>
  <InstrumentFrame
    title="Airspeed Indicator"
    code="ASI"
    unit="KTS"
    :label="ariaLabel"
  >
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <clipPath id="asi-tape-clip">
          <rect x="54" y="16" width="212" height="288" rx="24" />
        </clipPath>
        <linearGradient id="asi-fade-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#06101b" stop-opacity="1" />
          <stop offset="1" stop-color="#06101b" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="asi-fade-bottom" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#06101b" stop-opacity="1" />
          <stop offset="1" stop-color="#06101b" stop-opacity="0" />
        </linearGradient>
      </defs>

      <rect
        x="18"
        y="9"
        width="284"
        height="302"
        rx="30"
        fill="#050d16"
        stroke="rgba(93, 215, 255, 0.14)"
      />
      <rect
        x="54"
        y="16"
        width="212"
        height="288"
        rx="24"
        fill="#07111c"
        stroke="rgba(141, 188, 216, 0.08)"
      />

      <g clip-path="url(#asi-tape-clip)">
        <g :transform="`translate(0 ${tapeOffset})`">
          <rect
            v-for="band in bands"
            :key="`${band.from}-${band.to}`"
            x="198"
            :y="band.y"
            width="9"
            :height="band.height"
            :fill="band.color"
            opacity="0.82"
          />

          <g v-for="tick in ticks" :key="tick.value">
            <line
              :x1="TICK_X - (tick.major ? 17 : 9)"
              :x2="TICK_X"
              :y1="tick.y"
              :y2="tick.y"
              :stroke="tick.major ? 'rgba(233, 245, 255, 0.82)' : 'rgba(141, 188, 216, 0.38)'"
              :stroke-width="tick.major ? 1.4 : 0.8"
            />
            <text
              v-if="tick.major"
              :x="TICK_X - 23"
              :y="tick.y + 3.5"
              class="tape-label"
              text-anchor="end"
            >
              {{ tick.value }}
            </text>
          </g>

          <line
            :x1="206"
            :x2="228"
            :y1="CENTER_Y - store.profile.airspeed.bands.redline * SCALE"
            :y2="CENTER_Y - store.profile.airspeed.bands.redline * SCALE"
            stroke="#ff5d6c"
            stroke-width="2"
          />
        </g>

        <rect x="54" y="16" width="212" height="44" fill="url(#asi-fade-top)" />
        <rect x="54" y="260" width="212" height="44" fill="url(#asi-fade-bottom)" />
      </g>

      <text x="62" y="32" class="tape-caption">IAS</text>
      <text x="216" y="32" class="tape-caption" text-anchor="end">×100</text>

      <path
        d="M258 151 L245 160 L258 169 Z"
        fill="#ffc247"
        stroke="#06101b"
        stroke-width="1.2"
      />

      <g>
        <rect
          x="82"
          y="133"
          width="156"
          height="54"
          rx="9"
          fill="rgba(2, 8, 15, 0.94)"
          stroke="rgba(60, 232, 255, 0.48)"
          stroke-width="1.2"
        />
        <text x="160" y="165" class="readout-value" text-anchor="middle">
          {{ formatNumber(readout) }}
        </text>
        <text x="160" y="178" class="readout-unit" text-anchor="middle">
          KNOTS
        </text>
      </g>

      <text x="62" y="292" class="tape-caption">SIM INPUT</text>
      <text x="258" y="292" class="tape-caption" text-anchor="end">
        {{ store.profile.shortName }}
      </text>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.tape-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  fill: rgba(233, 245, 255, 0.78);
}

.tape-caption {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  fill: rgba(125, 149, 171, 0.68);
}

.readout-value {
  font-family: var(--font-mono);
  font-size: 29px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  fill: var(--white);
  letter-spacing: 0.02em;
}

.readout-unit {
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.24em;
  fill: var(--cyan);
}
</style>
