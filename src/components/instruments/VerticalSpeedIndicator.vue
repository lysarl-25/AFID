<script setup lang="ts">
import { computed, useId } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { polarToCartesian } from '@/utils/svg'
import { clamp } from '@/utils/math'
import { formatSigned } from '@/utils/format'

const store = useFlightStore()
const id = `vsi-${useId().replace(/:/g, '')}`
// Preserve the reference's 2,000 ft/min dial for the trainer and expand the
// scale for jet/live data so higher rates remain readable rather than pegging.
const scaleMax = computed(() => {
  const limit = Math.max(Math.abs(store.profile.verticalSpeed.min), Math.abs(store.profile.verticalSpeed.max))
  return limit <= 2000 ? 2000 : limit <= 4000 ? 4000 : 8000
})
const ticks = Array.from({ length: 80 }, (_, index) => ({
  index,
  major: index % 10 === 0,
  medium: index % 5 === 0,
  outer: polarToCartesian(160, 160, 128, -90 + index * 4.5),
  inner: polarToCartesian(160, 160, index % 10 === 0 ? 111 : index % 5 === 0 ? 115 : 119, -90 + index * 4.5),
}))
const labels = computed(() => [-1, 1].flatMap(direction => [0.25, 0.5, 0.75].map(fraction => ({
  key: `${direction}-${fraction}`,
  position: polarToCartesian(160, 160, 96, -90 + direction * fraction * 180),
  text: String(scaleMax.value * fraction / 1000).replace(/^0\./, '.'),
}))))
// Zero points left. Climb moves through the upper half, descent through the lower.
const needleTransform = computed(() =>
  `rotate(${-90 + clamp(store.display.verticalSpeed / scaleMax.value, -1, 1) * 180} 160 160)`,
)
const readout = computed(() => formatSigned(store.display.verticalSpeed))
const ariaLabel = computed(() => {
  const direction = store.display.verticalSpeed > 0 ? 'Climb' : store.display.verticalSpeed < 0 ? 'Descent' : 'Level flight'
  return `Vertical speed indicator. ${direction}. ${readout.value} feet per minute${store.mode === 'live' ? ', from live ADS-B data' : ''}. Scale up to ${scaleMax.value} feet per minute.`
})
const mounts = [{ x: 39, y: 39 }, { x: 281, y: 39 }, { x: 39, y: 281 }, { x: 281, y: 281 }]
</script>

<template>
  <InstrumentFrame title="Vertical Speed" code="VSI" unit="FT/MIN" :label="ariaLabel">
    <svg class="vertical-speed-dial" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <linearGradient :id="`${id}-housing`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#45494c" />
          <stop offset="0.45" stop-color="#25282b" />
          <stop offset="1" stop-color="#111315" />
        </linearGradient>
        <linearGradient :id="`${id}-rim`" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#474b4e" />
          <stop offset="0.3" stop-color="#090a0b" />
          <stop offset="0.7" stop-color="#151719" />
          <stop offset="1" stop-color="#4a4d50" />
        </linearGradient>
        <radialGradient :id="`${id}-face`" cx="48%" cy="45%" r="60%">
          <stop offset="0" stop-color="#242426" />
          <stop offset="0.8" stop-color="#1a1a1c" />
          <stop offset="1" stop-color="#09090a" />
        </radialGradient>
        <radialGradient :id="`${id}-hub`" cx="35%" cy="25%">
          <stop offset="0" stop-color="#5a6064" />
          <stop offset="0.45" stop-color="#252a2e" />
          <stop offset="1" stop-color="#090c0f" />
        </radialGradient>
      </defs>

      <path d="M45 11 Q160 -8 275 11 Q302 16 309 45 Q328 160 309 275 Q302 302 275 309 Q160 328 45 309 Q18 302 11 275 Q-8 160 11 45 Q18 18 45 11Z"
        :fill="`url(#${id}-housing)`" stroke="#141719" stroke-width="2" />
      <g v-for="mount in mounts" :key="`${mount.x}-${mount.y}`" :transform="`translate(${mount.x} ${mount.y})`">
        <circle r="11" fill="#08090a" stroke="#55585a" stroke-width="1" />
        <circle r="7" fill="#101216" stroke="#282a2c" stroke-width="2" />
        <circle r="4.5" fill="#c1bba8" />
      </g>
      <circle cx="160" cy="160" r="150" fill="#08090a" stroke="#3d4144" stroke-width="1.5" />
      <circle cx="160" cy="160" r="146" :fill="`url(#${id}-rim)`" />
      <circle cx="160" cy="160" r="136" :fill="`url(#${id}-face)`" stroke="#070808" stroke-width="3" />

      <g class="dial-ticks">
        <line v-for="tick in ticks" :key="tick.index"
          :x1="tick.inner.x" :y1="tick.inner.y" :x2="tick.outer.x" :y2="tick.outer.y"
          :stroke-width="tick.major ? 4.3 : tick.medium ? 2.8 : 1.8" />
      </g>
      <g class="dial-numbers" text-anchor="middle" dominant-baseline="central">
        <text x="64" y="160">0</text>
        <text x="257" y="160">{{ scaleMax / 1000 }}</text>
        <text v-for="label in labels" :key="label.key" :x="label.position.x" :y="label.position.y">{{ label.text }}</text>
      </g>

      <text x="160" y="122" class="dial-title" text-anchor="middle">VERTICAL</text>
      <text x="160" y="139" class="dial-title" text-anchor="middle">SPEED</text>
      <text x="160" y="187" class="dial-unit" text-anchor="middle">1000 ft</text>
      <text x="160" y="201" class="dial-unit" text-anchor="middle">per min</text>
      <text x="160" y="223" class="rate-readout" text-anchor="middle">{{ readout }}</text>

      <g class="direction-cues">
        <path d="M79 145 H61 V129 M57 134 L61 123 L65 134 M79 175 H61 V191 M57 186 L61 197 L65 186"
          fill="none" stroke="#eeede7" stroke-width="2" />
        <text x="83" y="147">up</text>
        <text x="83" y="179">dn</text>
      </g>

      <g class="vsi-needle" :transform="needleTransform">
        <path d="M156 160 L156 58 L160 35 L164 58 L164 160Z" fill="#f5f4ee" stroke="#d2d1cb" stroke-width="0.4" />
        <path d="M155 158 H165 L168 190 Q168 201 160 201 Q152 201 152 190Z" :fill="`url(#${id}-hub)`" />
      </g>
      <circle cx="160" cy="160" r="9" :fill="`url(#${id}-hub)`" stroke="#111619" />
      <circle cx="158" cy="157" r="2" fill="#5c6264" opacity="0.65" />
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.vertical-speed-dial {
  font-family: Arial, Helvetica, sans-serif;
  font-variant-numeric: tabular-nums;
  fill: #eeede7;
}
.dial-ticks { stroke: #eeede7; }
.dial-numbers { font-size: 22px; font-weight: 500; }
.dial-title { font-size: 16px; letter-spacing: 0.5px; }
.dial-unit { font-size: 12px; letter-spacing: 1px; }
.direction-cues { font-size: 12px; }
.rate-readout { font-family: var(--font-mono); font-size: 10px; fill: #c9c8c2; }
</style>
