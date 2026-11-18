<script setup lang="ts">
import { computed, useId } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { polarToCartesian } from '@/utils/svg'
import { formatHeading } from '@/utils/format'
import { normalizeHeading } from '@/utils/math'

const store = useFlightStore()
const id = `hdg-${useId().replace(/:/g, '')}`
const cardTicks = Array.from({ length: 72 }, (_, index) => {
  const angle = index * 5
  const major = angle % 30 === 0
  return {
    angle, major,
    outer: polarToCartesian(160, 160, 121, angle),
    inner: polarToCartesian(160, 160, major ? 107 : 113, angle),
  }
})
const cardLabels = Array.from({ length: 12 }, (_, index) => ({
  angle: index * 30,
  label: ['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'][index],
  cardinal: index % 3 === 0,
}))
const screws = [{ x: 28, y: 29 }, { x: 292, y: 29 }, { x: 292, y: 291 }]
// The card turns opposite the heading; the aircraft and top index stay fixed.
// Keep the continuous store angle so crossing north does not reverse the card.
const cardTransform = computed(() => `rotate(${-store.display.heading} 160 160)`)
const headingText = computed(() => formatHeading(store.display.heading))
const headingKind = computed(() =>
  store.mode === 'live' && store.liveMeta.headingKind === 'TRK' ? 'TRK' : 'MAG',
)
const headingLabel = computed(() => headingKind.value === 'TRK' ? 'TRACK' : 'MAG HDG')
const ariaLabel = computed(() => {
  const kind = headingKind.value === 'TRK' ? 'track' : 'magnetic heading'
  const suffix = store.mode === 'live' ? ', from live ADS-B data' : ''
  return `Heading indicator. Current ${kind} ${Math.round(normalizeHeading(store.display.heading)) % 360} degrees${suffix}.`
})
</script>

<template>
  <InstrumentFrame title="Heading Indicator" code="HDG" :unit="headingKind" :label="ariaLabel">
    <svg class="heading-dial" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <linearGradient :id="`${id}-housing`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#383838" />
          <stop offset="0.5" stop-color="#1d1d1d" />
          <stop offset="1" stop-color="#101010" />
        </linearGradient>
        <linearGradient :id="`${id}-bezel`" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#555555" />
          <stop offset="0.3" stop-color="#111111" />
          <stop offset="0.7" stop-color="#242424" />
          <stop offset="1" stop-color="#555555" />
        </linearGradient>
        <radialGradient :id="`${id}-face`" cx="48%" cy="42%" r="60%">
          <stop offset="0" stop-color="#202122" />
          <stop offset="0.75" stop-color="#151617" />
          <stop offset="1" stop-color="#060606" />
        </radialGradient>
        <radialGradient :id="`${id}-screw`" cx="35%" cy="25%">
          <stop offset="0" stop-color="#636363" />
          <stop offset="0.5" stop-color="#292929" />
          <stop offset="1" stop-color="#080808" />
        </radialGradient>
        <linearGradient :id="`${id}-knob`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#656565" />
          <stop offset="0.4" stop-color="#303030" />
          <stop offset="1" stop-color="#101010" />
        </linearGradient>
      </defs>

      <rect x="3" y="3" width="314" height="314" rx="41"
        :fill="`url(#${id}-housing)`" stroke="#505050" stroke-width="1.2" />
      <rect x="7" y="7" width="306" height="306" rx="38" fill="none" stroke="#141414" />
      <g v-for="screw in screws" :key="`${screw.x}-${screw.y}`" :transform="`translate(${screw.x} ${screw.y})`">
        <circle r="11" :fill="`url(#${id}-screw)`" stroke="#080808" stroke-width="1.5" />
        <path d="M-2 -7 H2 V-2 H7 V2 H2 V7 H-2 V2 H-7 V-2 H-2Z"
          fill="#070707" transform="rotate(20)" />
      </g>
      <circle cx="160" cy="160" r="150" fill="#0b0b0b" stroke="#505050" stroke-width="1" />
      <circle cx="160" cy="160" r="146" :fill="`url(#${id}-bezel)`" stroke="#161616" stroke-width="2" />
      <circle cx="160" cy="160" r="137" fill="#070707" stroke="#3b3b3b" />
      <circle cx="160" cy="160" r="130" :fill="`url(#${id}-face)`" />

      <g class="compass-card" :transform="cardTransform">
        <g class="card-ticks">
          <line v-for="tick in cardTicks" :key="tick.angle"
            :x1="tick.outer.x" :y1="tick.outer.y" :x2="tick.inner.x" :y2="tick.inner.y"
            :stroke-width="tick.major ? 3.2 : 1.3" :opacity="tick.major ? 1 : 0.8" />
        </g>
        <text v-for="label in cardLabels" :key="label.angle" x="160" y="68"
          :transform="`rotate(${label.angle} 160 160)`"
          class="card-label" :class="{ 'card-label--cardinal': label.cardinal }"
          text-anchor="middle" dominant-baseline="central">{{ label.label }}</text>
      </g>

      <path class="heading-index" d="M158 23 H162 V56 H165 L160 73 L155 56 H158Z" fill="#d6d3c8" />
      <path class="aircraft-reference"
        d="M160 87 Q156 98 156 111 V139 L108 157 V165 H156 V198 L145 212 H175 L164 198 V165 H212 V157 L164 139 V111 Q164 98 160 87Z"
        fill="none" stroke="#d6d3c8" stroke-width="2.5" stroke-linejoin="miter" />
      <text x="160" y="225" class="heading-unit" text-anchor="middle">{{ headingLabel }}</text>
      <text x="160" y="238" class="heading-value" text-anchor="middle">{{ headingText }}</text>

      <g class="decorative-knob" transform="translate(32 285)">
        <circle r="26" fill="#0b0b0b" stroke="#343434" stroke-width="2" />
        <circle r="22" :fill="`url(#${id}-knob)`" stroke="#101010" stroke-width="2" />
        <circle r="18" fill="#292929" stroke="#484848" stroke-width="1" />
      </g>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.heading-dial {
  font-family: Arial, Helvetica, sans-serif;
  font-variant-numeric: tabular-nums;
}
.card-ticks { stroke: #dbd9d2; }
.card-label { fill: #dbd9d2; font-size: 18px; font-weight: 600; }
.card-label--cardinal { font-size: 22px; font-weight: 700; }
.heading-value { font-family: var(--font-mono); font-size: 12px; fill: #e5e2d8; }
.heading-unit { font-size: 6px; letter-spacing: 1px; fill: #a8a69f; }
</style>
