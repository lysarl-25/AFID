<script setup lang="ts">
import { computed } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { buildTapeTicks } from '@/utils/svg'
import { formatNumber } from '@/utils/format'

const SCALE = 0.08
const CENTER_Y = 160
const TICK_X = 202

const store = useFlightStore()

const ticks = computed(() =>
  buildTapeTicks(
    store.profile.altitude.min,
    store.profile.altitude.max,
    100,
    1000,
    CENTER_Y,
    SCALE,
  ),
)

const tapeOffset = computed(() => store.display.altitude * SCALE)
const readout = computed(() => Math.round(store.display.altitude / 10) * 10)

const ariaLabel = computed(
  () =>
    `Altimeter. Altitude ${formatNumber(readout.value)} feet. Barometric setting ${store.baro.toFixed(2)} inches of mercury.`,
)
</script>

<template>
  <InstrumentFrame
    title="Altimeter"
    code="ALT"
    unit="FT"
    :label="ariaLabel"
  >
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <clipPath id="alt-tape-clip">
          <rect x="62" y="16" width="196" height="288" rx="24" />
        </clipPath>
        <linearGradient id="alt-fade-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#06101b" stop-opacity="1" />
          <stop offset="1" stop-color="#06101b" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="alt-fade-bottom" x1="0" y1="1" x2="0" y2="0">
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
        x="62"
        y="16"
        width="196"
        height="288"
        rx="24"
        fill="#07111c"
        stroke="rgba(141, 188, 216, 0.08)"
      />

      <g clip-path="url(#alt-tape-clip)">
        <g :transform="`translate(0 ${tapeOffset})`">
          <g v-for="tick in ticks" :key="tick.value">
            <line
              :x1="TICK_X - (tick.major ? 18 : 8)"
              :x2="TICK_X"
              :y1="tick.y"
              :y2="tick.y"
              :stroke="tick.major ? 'rgba(233, 245, 255, 0.78)' : 'rgba(141, 188, 216, 0.32)'"
              :stroke-width="tick.major ? 1.3 : 0.75"
            />
            <text
              v-if="tick.major"
              :x="TICK_X + 13"
              :y="tick.y + 3.6"
              class="tape-label"
            >
              {{ formatNumber(tick.value) }}
            </text>
          </g>
        </g>

        <rect x="62" y="16" width="196" height="44" fill="url(#alt-fade-top)" />
        <rect x="62" y="260" width="196" height="44" fill="url(#alt-fade-bottom)" />
      </g>

      <text x="70" y="32" class="tape-caption">ALT</text>
      <text x="250" y="32" class="tape-caption" text-anchor="end">FEET</text>

      <path
        d="M58 151 L71 160 L58 169 Z"
        fill="#3ce8ff"
        stroke="#06101b"
        stroke-width="1.2"
      />

      <g>
        <rect
          x="72"
          y="128"
          width="176"
          height="60"
          rx="9"
          fill="rgba(2, 8, 15, 0.95)"
          stroke="rgba(60, 232, 255, 0.46)"
          stroke-width="1.2"
        />
        <text x="160" y="162" class="readout-value" text-anchor="middle">
          {{ formatNumber(readout) }}
        </text>
        <text x="160" y="177" class="readout-unit" text-anchor="middle">
          FEET
        </text>
      </g>

      <g>
        <rect
          x="84"
          y="253"
          width="152"
          height="29"
          rx="7"
          fill="rgba(2, 8, 15, 0.94)"
          stroke="rgba(141, 188, 216, 0.18)"
        />
        <text x="96" y="271" class="baro-label">BARO</text>
        <text x="224" y="271" class="baro-value" text-anchor="end">
          {{ store.baro.toFixed(2) }} IN
        </text>
      </g>

      <text x="70" y="292" class="tape-caption">SIM INPUT</text>
      <text x="250" y="292" class="tape-caption" text-anchor="end">
        {{ store.profile.shortName }}
      </text>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.tape-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  fill: rgba(233, 245, 255, 0.76);
}

.tape-caption {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  fill: rgba(125, 149, 171, 0.68);
}

.readout-value {
  font-family: var(--font-mono);
  font-size: 31px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  fill: var(--white);
  letter-spacing: 0.01em;
}

.readout-unit {
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.24em;
  fill: var(--cyan);
}

.baro-label {
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.16em;
  fill: var(--muted);
}

.baro-value {
  font-family: var(--font-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  fill: var(--cyan-soft);
}
</style>
