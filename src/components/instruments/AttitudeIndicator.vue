<script setup lang="ts">
import { computed } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { describeArc, polarToCartesian } from '@/utils/svg'
import { formatSigned } from '@/utils/format'

const CENTER = 160
const PITCH_SCALE = 4.2

const store = useFlightStore()

const pitchMarks = Array.from({ length: 13 }, (_, index) => {
  const value = (index - 6) * 5
  const halfWidth = Math.abs(value) % 10 === 0 ? 44 : 25
  return {
    value,
    major: Math.abs(value) % 10 === 0,
    y: CENTER - value * PITCH_SCALE,
    halfWidth,
  }
}).filter((mark) => mark.value !== 0)

const rollScalePath = describeArc(CENTER, CENTER, 136, -60, 60)

const rollTicks = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map((angle) => {
  const major = Math.abs(angle) === 30 || Math.abs(angle) === 60 || angle === 0
  const outer = polarToCartesian(CENTER, CENTER, 136, angle)
  const inner = polarToCartesian(CENTER, CENTER, major ? 119 : 126, angle)
  return { angle, major, outer, inner }
})

const rollLabels = [-60, -30, 30, 60].map((angle) => {
  const point = polarToCartesian(CENTER, CENTER, 110, angle)
  return { angle, ...point, text: String(Math.abs(angle)) }
})

const horizonTransform = computed(
  () =>
    `rotate(${-store.display.roll} ${CENTER} ${CENTER}) translate(0 ${store.display.pitch * PITCH_SCALE})`,
)

const rollPointerTransform = computed(
  () => `rotate(${store.display.roll} ${CENTER} ${CENTER})`,
)

const ariaLabel = computed(
  () =>
    `Attitude indicator. Pitch ${formatSigned(store.display.pitch, 1)} degrees, roll ${formatSigned(store.display.roll, 1)} degrees.`,
)
</script>

<template>
  <InstrumentFrame
    title="Attitude Indicator"
    code="ATT"
    unit="PITCH / ROLL"
    :label="ariaLabel"
  >
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <clipPath id="att-clip">
          <circle :cx="CENTER" :cy="CENTER" r="132" />
        </clipPath>
        <linearGradient id="att-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a4f8f" />
          <stop offset="0.62" stop-color="#0d74b8" />
          <stop offset="1" stop-color="#1594d4" />
        </linearGradient>
        <linearGradient id="att-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7b5531" />
          <stop offset="0.55" stop-color="#4d331c" />
          <stop offset="1" stop-color="#271808" />
        </linearGradient>
      </defs>

      <circle
        :cx="CENTER"
        :cy="CENTER"
        r="147"
        fill="#050c14"
        stroke="rgba(93, 215, 255, 0.16)"
      />
      <circle
        :cx="CENTER"
        :cy="CENTER"
        r="133"
        fill="none"
        stroke="rgba(233, 245, 255, 0.16)"
      />

      <g clip-path="url(#att-clip)">
        <g :transform="horizonTransform">
          <rect x="-240" y="-460" width="800" height="620" fill="url(#att-sky)" />
          <rect x="-240" y="160" width="800" height="620" fill="url(#att-ground)" />

          <line
            x1="-240"
            :y1="CENTER"
            x2="560"
            :y2="CENTER"
            stroke="#f4fbff"
            stroke-width="2.4"
          />

          <g v-for="mark in pitchMarks" :key="mark.value">
            <line
              :x1="CENTER - mark.halfWidth"
              :x2="CENTER - 15"
              :y1="mark.y"
              :y2="mark.y"
              stroke="rgba(244, 251, 255, 0.86)"
              :stroke-width="mark.major ? 1.8 : 1.1"
            />
            <line
              :x1="CENTER + 15"
              :x2="CENTER + mark.halfWidth"
              :y1="mark.y"
              :y2="mark.y"
              stroke="rgba(244, 251, 255, 0.86)"
              :stroke-width="mark.major ? 1.8 : 1.1"
            />
            <text
              v-if="mark.major"
              :x="CENTER - mark.halfWidth - 8"
              :y="mark.y + 3.5"
              class="pitch-label"
              text-anchor="end"
            >
              {{ Math.abs(mark.value) }}
            </text>
          </g>
        </g>

        <circle
          :cx="CENTER"
          :cy="CENTER"
          r="132"
          fill="none"
          stroke="rgba(2, 8, 14, 0.34)"
          stroke-width="9"
        />
      </g>

      <path
        :d="rollScalePath"
        fill="none"
        stroke="rgba(233, 245, 255, 0.4)"
        stroke-width="1.2"
      />
      <g v-for="tick in rollTicks" :key="tick.angle">
        <line
          :x1="tick.outer.x"
          :y1="tick.outer.y"
          :x2="tick.inner.x"
          :y2="tick.inner.y"
          :stroke="tick.major ? 'rgba(233, 245, 255, 0.88)' : 'rgba(233, 245, 255, 0.44)'"
          :stroke-width="tick.major ? 1.5 : 0.9"
        />
      </g>
      <text
        v-for="label in rollLabels"
        :key="`roll-${label.angle}`"
        :x="label.x"
        :y="label.y + 2.5"
        class="roll-label"
        text-anchor="middle"
      >
        {{ label.text }}
      </text>

      <g :transform="rollPointerTransform">
        <path
          d="M160 33 L151 16 L169 16 Z"
          fill="#ffc247"
          stroke="#05101b"
          stroke-width="1.2"
        />
      </g>

      <g class="aircraft-reference">
        <path
          d="M101 160 H142 M178 160 H219 M160 144 V177"
          fill="none"
          stroke="#04101a"
          stroke-width="6.5"
          stroke-linecap="round"
        />
        <path
          d="M101 160 H142 M178 160 H219 M160 144 V177"
          fill="none"
          stroke="#ffc247"
          stroke-width="2.6"
          stroke-linecap="round"
        />
        <circle
          :cx="CENTER"
          :cy="CENTER"
          r="4.2"
          fill="#ffc247"
          stroke="#04101a"
          stroke-width="2"
        />
      </g>

      <g>
        <rect
          x="42"
          y="271"
          width="112"
          height="36"
          rx="8"
          fill="rgba(2, 8, 15, 0.9)"
          stroke="rgba(60, 232, 255, 0.2)"
        />
        <text x="98" y="283" class="data-label" text-anchor="middle">PITCH</text>
        <text x="98" y="299" class="data-value" text-anchor="middle">
          {{ formatSigned(store.display.pitch, 1) }}°
        </text>
      </g>
      <g>
        <rect
          x="166"
          y="271"
          width="112"
          height="36"
          rx="8"
          fill="rgba(2, 8, 15, 0.9)"
          stroke="rgba(60, 232, 255, 0.2)"
        />
        <text x="222" y="283" class="data-label" text-anchor="middle">ROLL</text>
        <text x="222" y="299" class="data-value" text-anchor="middle">
          {{ formatSigned(store.display.roll, 1) }}°
        </text>
      </g>

      <text x="35" y="43" class="att-caption">SKY</text>
      <text x="24" y="292" class="att-caption">GND</text>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.pitch-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  fill: rgba(244, 251, 255, 0.78);
}

.roll-label {
  font-family: var(--font-mono);
  font-size: 7.5px;
  fill: rgba(233, 245, 255, 0.48);
}

.data-label {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.16em;
  fill: var(--muted);
}

.data-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  fill: var(--cyan-soft);
}

.att-caption {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
  fill: rgba(125, 149, 171, 0.52);
}
</style>
