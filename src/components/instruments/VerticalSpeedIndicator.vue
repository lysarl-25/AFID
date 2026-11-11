<script setup lang="ts">
import { computed } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { buildTapeTicks } from '@/utils/svg'
import { clamp } from '@/utils/math'
import { formatSigned } from '@/utils/format'

const CENTER_Y = 155
const HALF_RANGE = 111

const store = useFlightStore()

const maxAbs = computed(() =>
  Math.max(
    Math.abs(store.profile.verticalSpeed.min),
    Math.abs(store.profile.verticalSpeed.max),
  ),
)

const scale = computed(() => HALF_RANGE / maxAbs.value)
const tickStep = computed(() => (maxAbs.value > 2500 ? 250 : 200))

const ticks = computed(() =>
  buildTapeTicks(
    -maxAbs.value,
    maxAbs.value,
    tickStep.value,
    1000,
    CENTER_Y,
    scale.value,
  ),
)

const bands = computed(() => {
  const bands = store.profile.verticalSpeed.bands
  const safe = Math.min(bands.safe, maxAbs.value)
  const caution = Math.min(bands.caution, maxAbs.value)
  const limit = Math.min(bands.limit, maxAbs.value)

  const segments = [
    { from: -safe, to: safe, color: '#3df59a' },
    { from: safe, to: caution, color: '#ffc247' },
    { from: -caution, to: -safe, color: '#ffc247' },
    { from: caution, to: limit, color: '#ff5d6c' },
    { from: -limit, to: -caution, color: '#ff5d6c' },
  ]

  return segments
    .filter((segment) => segment.to > segment.from)
    .map((segment) => ({
      ...segment,
      y: CENTER_Y - segment.to * scale.value,
      height: (segment.to - segment.from) * scale.value,
    }))
})

const pointerY = computed(
  () =>
    CENTER_Y -
    clamp(store.display.verticalSpeed, -maxAbs.value, maxAbs.value) * scale.value,
)

const readoutColor = computed(() => {
  if (store.display.verticalSpeed > 50) return '#3df59a'
  if (store.display.verticalSpeed < -50) return '#ffc247'
  return '#3ce8ff'
})

function formatScaleLabel(value: number): string {
  if (value === 0) return '0'
  return formatSigned(value / 1000, 1)
}

const ariaLabel = computed(
  () =>
    `Vertical speed indicator. ${formatSigned(store.display.verticalSpeed)} feet per minute.`,
)
</script>

<template>
  <InstrumentFrame
    title="Vertical Speed"
    code="VSI"
    unit="FT/MIN"
    :label="ariaLabel"
  >
    <svg viewBox="0 0 320 320" aria-hidden="true">
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
        x="88"
        y="38"
        width="166"
        height="232"
        rx="18"
        fill="#07111c"
        stroke="rgba(141, 188, 216, 0.08)"
      />

      <g v-for="band in bands" :key="`${band.from}-${band.to}`">
        <rect
          x="97"
          :y="band.y"
          width="10"
          :height="band.height"
          rx="3"
          :fill="band.color"
          opacity="0.84"
        />
      </g>

      <line
        x1="92"
        x2="204"
        :y1="CENTER_Y"
        :y2="CENTER_Y"
        stroke="rgba(233, 245, 255, 0.22)"
        stroke-width="1"
        stroke-dasharray="3 4"
      />

      <g v-for="tick in ticks" :key="tick.value">
        <line
          :x1="202 - (tick.major ? 14 : 7)"
          x2="202"
          :y1="tick.y"
          :y2="tick.y"
          :stroke="tick.major ? 'rgba(233, 245, 255, 0.8)' : 'rgba(141, 188, 216, 0.34)'"
          :stroke-width="tick.major ? 1.3 : 0.8"
        />
        <text
          v-if="tick.major"
          x="215"
          :y="tick.y + 3.5"
          class="scale-label"
        >
          {{ formatScaleLabel(tick.value) }}
        </text>
      </g>

      <text x="215" y="35" class="scale-caption">×1000</text>
      <text x="68" y="47" class="zone-label zone-label--up">UP</text>
      <text x="68" y="270" class="zone-label zone-label--down">DN</text>

      <g :transform="`translate(0 ${pointerY})`">
        <line
          x1="108"
          x2="202"
          y1="0"
          y2="0"
          stroke="rgba(60, 232, 255, 0.74)"
          stroke-width="1.4"
        />
        <path
          d="M108 -6 L120 0 L108 6 Z"
          fill="#3ce8ff"
          stroke="#06101b"
          stroke-width="1"
        />
        <circle cx="202" cy="0" r="2.6" fill="#3ce8ff" />
      </g>

      <g>
        <rect
          x="66"
          y="272"
          width="188"
          height="38"
          rx="8"
          fill="rgba(2, 8, 15, 0.95)"
          stroke="rgba(60, 232, 255, 0.32)"
        />
        <text
          x="160"
          y="297"
          class="readout-value"
          text-anchor="middle"
          :fill="readoutColor"
        >
          {{ formatSigned(store.display.verticalSpeed) }}
        </text>
        <text x="160" y="307" class="readout-unit" text-anchor="middle">
          FT/MIN
        </text>
      </g>

    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.scale-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  fill: rgba(233, 245, 255, 0.76);
}

.scale-caption {
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.1em;
  fill: rgba(125, 149, 171, 0.58);
}

.zone-label {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;

  &--up {
    fill: rgba(61, 245, 154, 0.58);
  }

  &--down {
    fill: rgba(255, 93, 108, 0.58);
  }
}

.readout-value {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.readout-unit {
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.2em;
  fill: var(--muted);
}
</style>
