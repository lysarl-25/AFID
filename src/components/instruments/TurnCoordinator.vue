<script setup lang="ts">
import { computed } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { describeArc, polarToCartesian } from '@/utils/svg'
import { clamp } from '@/utils/math'
import { formatSigned } from '@/utils/format'

const CENTER_X = 160
const AIRCRAFT_Y = 112

const store = useFlightStore()

const bankAngle = computed(() =>
  clamp((store.display.turnRate / 3) * 20, -40, 40),
)

const aircraftTransform = computed(
  () => `rotate(${bankAngle.value} ${CENTER_X} ${AIRCRAFT_Y})`,
)

const scalePath = describeArc(CENTER_X, AIRCRAFT_Y, 104, -40, 40)

const scaleTicks = [-6, -4.5, -3, -1.5, 0, 1.5, 3, 4.5, 6].map((rate) => {
  const angle = (rate / 3) * 20
  const major = Math.abs(rate) === 3 || rate === 0
  const outer = polarToCartesian(CENTER_X, AIRCRAFT_Y, 104, angle)
  const inner = polarToCartesian(
    CENTER_X,
    AIRCRAFT_Y,
    major ? 91 : 97,
    angle,
  )
  return { rate, major, outer, inner }
})

const bankLabels = [-48, 48].map((angle, index) => ({
  ...polarToCartesian(CENTER_X, AIRCRAFT_Y, 78, angle),
  text: index === 0 ? 'L' : 'R',
}))

const ballPosition = computed(() => {
  const t = (clamp(store.display.slipSkid, -1, 1) + 1) / 2
  return {
    x: 96 + 128 * t,
    y: 222 + 60 * t * (1 - t),
  }
})

const ariaLabel = computed(
  () =>
    `Turn coordinator. Turn rate ${formatSigned(store.display.turnRate, 1)} degrees per second. Slip skid ${formatSigned(store.display.slipSkid, 2)}.`,
)
</script>

<template>
  <InstrumentFrame
    title="Turn Coordinator"
    code="TC"
    unit="TURN / SLIP"
    :label="ariaLabel"
  >
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <radialGradient id="tc-ball" cx="35%" cy="28%" r="72%">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.42" stop-color="#d7e6ef" />
          <stop offset="1" stop-color="#718696" />
        </radialGradient>
        <linearGradient id="tc-tube" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#07131f" />
          <stop offset="0.55" stop-color="#0e2234" />
          <stop offset="1" stop-color="#050c14" />
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

      <path
        :d="scalePath"
        fill="none"
        stroke="rgba(233, 245, 255, 0.3)"
        stroke-width="1.2"
      />
      <g v-for="tick in scaleTicks" :key="tick.rate">
        <line
          :x1="tick.outer.x"
          :y1="tick.outer.y"
          :x2="tick.inner.x"
          :y2="tick.inner.y"
          :stroke="tick.major ? 'rgba(233, 245, 255, 0.86)' : 'rgba(233, 245, 255, 0.38)'"
          :stroke-width="tick.major ? 1.5 : 0.9"
        />
      </g>
      <text
        v-for="label in bankLabels"
        :key="label.text"
        :x="label.x"
        :y="label.y + 3"
        class="bank-label"
        text-anchor="middle"
      >
        {{ label.text }}
      </text>
      <text x="160" y="37" class="standard-rate-label" text-anchor="middle">
        2 MIN
      </text>

      <g :transform="aircraftTransform">
        <path
          d="M160 79 L166 103 L203 116 L203 124 L166 120 L166 140 L176 149 L176 156 L160 151 L144 156 L144 149 L154 140 L154 120 L117 124 L117 116 L154 103 Z"
          fill="#f2faff"
          stroke="#07131f"
          stroke-width="2.2"
          stroke-linejoin="round"
        />
        <circle
          cx="160"
          cy="110"
          r="3.1"
          fill="#3ce8ff"
          stroke="#07131f"
          stroke-width="1.4"
        />
      </g>

      <path
        d="M96 222 Q 160 252 224 222"
        fill="none"
        stroke="#03080e"
        stroke-width="29"
        stroke-linecap="round"
      />
      <path
        d="M96 222 Q 160 252 224 222"
        fill="none"
        stroke="url(#tc-tube)"
        stroke-width="24"
        stroke-linecap="round"
      />
      <path
        d="M96 222 Q 160 252 224 222"
        fill="none"
        stroke="rgba(141, 188, 216, 0.18)"
        stroke-width="1"
        stroke-linecap="round"
      />
      <line
        x1="160"
        y1="219"
        x2="160"
        y2="256"
        stroke="rgba(233, 245, 255, 0.28)"
        stroke-width="1"
      />
      <text x="82" y="235" class="tube-label" text-anchor="middle">L</text>
      <text x="238" y="235" class="tube-label" text-anchor="middle">R</text>

      <circle
        :cx="ballPosition.x"
        :cy="ballPosition.y"
        r="8.6"
        fill="url(#tc-ball)"
        stroke="#223949"
        stroke-width="1"
      />
      <circle
        :cx="ballPosition.x - 2.5"
        :cy="ballPosition.y - 2.8"
        r="2"
        fill="rgba(255, 255, 255, 0.85)"
      />

      <text x="160" y="276" class="tube-caption" text-anchor="middle">
        SLIP / SKID
      </text>

      <g>
        <rect
          x="46"
          y="281"
          width="108"
          height="27"
          rx="6"
          fill="rgba(2, 8, 15, 0.92)"
          stroke="rgba(141, 188, 216, 0.16)"
        />
        <text x="100" y="290" class="data-label" text-anchor="middle">
          TURN RATE
        </text>
        <text x="100" y="302" class="data-value" text-anchor="middle">
          {{ formatSigned(store.display.turnRate, 1) }}°/S
        </text>
      </g>
      <g>
        <rect
          x="166"
          y="281"
          width="108"
          height="27"
          rx="6"
          fill="rgba(2, 8, 15, 0.92)"
          stroke="rgba(141, 188, 216, 0.16)"
        />
        <text x="220" y="290" class="data-label" text-anchor="middle">
          BALL
        </text>
        <text x="220" y="302" class="data-value" text-anchor="middle">
          {{ formatSigned(store.display.slipSkid, 2) }}
        </text>
      </g>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.bank-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  fill: rgba(233, 245, 255, 0.74);
}

.standard-rate-label {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
  fill: rgba(125, 149, 171, 0.62);
}

.tube-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  fill: rgba(233, 245, 255, 0.45);
}

.tube-caption {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.16em;
  fill: rgba(125, 149, 171, 0.62);
}

.data-label {
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.13em;
  fill: var(--muted);
}

.data-value {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  fill: var(--cyan-soft);
}
</style>
