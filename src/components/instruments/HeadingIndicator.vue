<script setup lang="ts">
import { computed } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { polarToCartesian } from '@/utils/svg'
import { formatHeading } from '@/utils/format'
import { normalizeHeading } from '@/utils/math'

const CENTER = 160

const store = useFlightStore()

const cardTicks = Array.from({ length: 72 }, (_, index) => {
  const angle = index * 5
  const cardinal = angle % 45 === 0
  const major = angle % 10 === 0
  const outer = polarToCartesian(CENTER, CENTER, 122, angle)
  const inner = polarToCartesian(
    CENTER,
    CENTER,
    cardinal ? 102 : major ? 111 : 116,
    angle,
  )
  return { angle, cardinal, major, outer, inner }
})

const directionLabels = [
  { angle: 0, label: 'N' },
  { angle: 45, label: 'NE' },
  { angle: 90, label: 'E' },
  { angle: 135, label: 'SE' },
  { angle: 180, label: 'S' },
  { angle: 225, label: 'SW' },
  { angle: 270, label: 'W' },
  { angle: 315, label: 'NW' },
]

const degreeLabels = [30, 60, 120, 150, 210, 240, 300, 330].map((angle) => ({
  angle,
  label: String(angle).padStart(3, '0'),
}))

const cardTransform = computed(
  () => `rotate(${-store.display.heading} ${CENTER} ${CENTER})`,
)

const headingText = computed(() => formatHeading(store.display.heading))

const headingKind = computed(() =>
  store.mode === 'live' && store.liveMeta.headingKind === 'TRK' ? 'TRK' : 'MAG',
)

const headingLabel = computed(() =>
  headingKind.value === 'TRK' ? 'TRACK' : 'MAG HDG',
)

const ariaLabel = computed(() => {
  const kind = headingKind.value === 'TRK' ? 'track' : 'magnetic heading'
  const suffix = store.mode === 'live' ? ', from live ADS-B data' : ''
  return `Heading indicator. Current ${kind} ${Math.round(normalizeHeading(store.display.heading)) % 360} degrees${suffix}.`
})
</script>

<template>
  <InstrumentFrame
    title="Heading Indicator"
    code="HDG"
    :unit="headingKind"
    :label="ariaLabel"
  >
    <svg viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <radialGradient id="hdg-face" cx="50%" cy="44%" r="62%">
          <stop offset="0" stop-color="#0a1b2c" />
          <stop offset="0.74" stop-color="#06111d" />
          <stop offset="1" stop-color="#030a12" />
        </radialGradient>
      </defs>

      <circle
        :cx="CENTER"
        :cy="CENTER"
        r="148"
        fill="#050c14"
        stroke="rgba(93, 215, 255, 0.16)"
      />
      <circle
        :cx="CENTER"
        :cy="CENTER"
        r="139"
        fill="none"
        stroke="rgba(93, 215, 255, 0.08)"
      />

      <g :transform="cardTransform">
        <circle
          :cx="CENTER"
          :cy="CENTER"
          r="127"
          fill="url(#hdg-face)"
          stroke="rgba(141, 188, 216, 0.22)"
          stroke-width="1.2"
        />

        <g v-for="tick in cardTicks" :key="tick.angle">
          <line
            :x1="tick.outer.x"
            :y1="tick.outer.y"
            :x2="tick.inner.x"
            :y2="tick.inner.y"
            :stroke="
              tick.cardinal
                ? 'rgba(233, 245, 255, 0.88)'
                : tick.major
                  ? 'rgba(233, 245, 255, 0.56)'
                  : 'rgba(141, 188, 216, 0.28)'
            "
            :stroke-width="tick.cardinal ? 1.5 : tick.major ? 1.1 : 0.7"
          />
        </g>

        <text
          v-for="direction in directionLabels"
          :key="direction.label"
          x="160"
          y="86"
          :transform="`rotate(${direction.angle} 160 160)`"
          class="direction-label"
          :class="{ 'direction-label--diagonal': direction.label.length > 1 }"
          text-anchor="middle"
        >
          {{ direction.label }}
        </text>

        <text
          v-for="degree in degreeLabels"
          :key="degree.angle"
          x="160"
          y="101"
          :transform="`rotate(${degree.angle} 160 160)`"
          class="degree-label"
          text-anchor="middle"
        >
          {{ degree.label }}
        </text>

        <circle
          :cx="CENTER"
          :cy="CENTER"
          r="68"
          fill="none"
          stroke="rgba(141, 188, 216, 0.06)"
        />
      </g>

      <path
        d="M160 39 L151 18 L169 18 Z"
        fill="#3ce8ff"
        stroke="#06101b"
        stroke-width="1.2"
      />
      <line
        x1="160"
        y1="20"
        x2="160"
        y2="30"
        stroke="#3ce8ff"
        stroke-width="1.4"
      />

      <g>
        <rect
          x="99"
          y="142"
          width="122"
          height="59"
          rx="9"
          fill="rgba(2, 8, 15, 0.95)"
          stroke="rgba(60, 232, 255, 0.42)"
          stroke-width="1.1"
        />
        <text x="160" y="177" class="heading-value" text-anchor="middle">
          {{ headingText }}
        </text>
        <text x="160" y="191" class="heading-unit" text-anchor="middle">
          {{ headingLabel }}
        </text>
      </g>

      <text x="34" y="43" class="hdg-caption">LUBBER</text>
      <text x="286" y="43" class="hdg-caption" text-anchor="end">CARD</text>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.direction-label {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  fill: rgba(233, 245, 255, 0.94);

  &--diagonal {
    font-size: 9px;
    font-weight: 500;
    fill: rgba(233, 245, 255, 0.68);
  }
}

.degree-label {
  font-family: var(--font-mono);
  font-size: 7px;
  fill: rgba(125, 149, 171, 0.68);
}

.heading-value {
  font-family: var(--font-mono);
  font-size: 29px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  fill: var(--cyan-soft);
  letter-spacing: 0.01em;
}

.heading-unit {
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.18em;
  fill: var(--muted);
}

.hdg-caption {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
  fill: rgba(125, 149, 171, 0.5);
}
</style>
