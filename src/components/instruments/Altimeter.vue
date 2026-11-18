<script setup lang="ts">
import { computed, useId } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { polarToCartesian } from '@/utils/svg'
import { formatNumber } from '@/utils/format'

const store = useFlightStore()
const id = `alt-${useId().replace(/:/g, '')}`
const readout = computed(() => Math.round(store.display.altitude / 10) * 10)

// Continuous angles keep the hands moving clockwise through each revolution.
// One turn represents 1,000 / 10,000 / 100,000 feet respectively.
const hundredsAngle = computed(() => store.display.altitude * 0.36)
const thousandsAngle = computed(() => store.display.altitude * 0.036)
const tenThousandsAngle = computed(() => store.display.altitude * 0.0036)
const ticks = Array.from({ length: 50 }, (_, index) => ({
  index,
  major: index % 5 === 0,
  outer: polarToCartesian(160, 160, 129, index * 7.2),
  inner: polarToCartesian(160, 160, index % 5 === 0 ? 109 : 117, index * 7.2),
}))
const numerals = Array.from({ length: 10 }, (_, value) => ({
  value,
  position: polarToCartesian(160, 160, 94, value * 36),
}))
const screws = [{ x: 28, y: 28 }, { x: 292, y: 28 }, { x: 28, y: 292 }, { x: 292, y: 292 }]
const pressureTicks = Array.from({ length: 21 }, (_, index) => ({
  index,
  y: 146 + index * 1.4,
  length: index % 10 === 0 ? 11 : index % 5 === 0 ? 8 : 5,
}))
const isGnss = computed(() => store.mode === 'live' && store.liveMeta.altitudeKind === 'GNSS')
const pressure = computed(() => store.mode === 'live' ? 29.92 : store.baro)
const pressureLabels = computed(() => [-0.1, 0, 0.1].map(offset => ({
  inches: (pressure.value + offset).toFixed(1),
  hpa: Math.round((pressure.value + offset) * 33.8639),
})))
const unitLabel = computed(() => store.mode !== 'live' ? 'FT' : isGnss.value ? 'FT GNSS' : 'FT STD')
const baroValue = computed(() => isGnss.value ? 'GNSS / ADS-B'
  : store.mode === 'live' ? 'STD 29.92 IN' : `BARO ${store.baro.toFixed(2)} IN`)
const ariaLabel = computed(() => {
  if (store.mode === 'live') {
    const source = isGnss.value ? 'GNSS altitude' : 'pressure altitude with standard pressure setting'
    return `Altimeter. ${source} ${formatNumber(readout.value)} feet, from live ADS-B data.`
  }
  return `Altimeter. Altitude ${formatNumber(readout.value)} feet. Barometric setting ${store.baro.toFixed(2)} inches of mercury.`
})
</script>

<template>
  <InstrumentFrame title="Altimeter" code="ALT" :unit="unitLabel" :label="ariaLabel">
    <svg class="altimeter-dial" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <linearGradient :id="`${id}-housing`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3d3d3d" />
          <stop offset="0.45" stop-color="#151515" />
          <stop offset="1" stop-color="#303030" />
        </linearGradient>
        <linearGradient :id="`${id}-rim`" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#484848" />
          <stop offset="0.45" stop-color="#242424" />
          <stop offset="1" stop-color="#090909" />
        </linearGradient>
        <radialGradient :id="`${id}-face`" cx="48%" cy="42%" r="60%">
          <stop offset="0" stop-color="#242424" />
          <stop offset="0.8" stop-color="#191919" />
          <stop offset="1" stop-color="#080808" />
        </radialGradient>
        <linearGradient :id="`${id}-hand`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#d4d4d4" />
          <stop offset="0.5" stop-color="#ffffff" />
          <stop offset="1" stop-color="#eeeeee" />
        </linearGradient>
      </defs>

      <path d="M52 5 Q160 -5 268 5 Q303 8 311 44 Q325 160 311 276 Q307 307 276 313 Q160 325 44 313 Q13 307 9 276 Q-5 160 9 44 Q17 8 52 5Z"
        :fill="`url(#${id}-housing)`" stroke="#080808" stroke-width="3" />
      <g v-for="screw in screws" :key="`${screw.x}-${screw.y}`" :transform="`translate(${screw.x} ${screw.y})`">
        <circle r="13" fill="#303030" stroke="#080808" stroke-width="2" />
        <path d="M-4 -6 H4 L8 0 L4 6 H-4 L-8 0Z" fill="#151515" stroke="#080808" stroke-width="1.5" />
      </g>
      <circle cx="160" cy="160" r="150" fill="#080808" stroke="#111" stroke-width="2" />
      <circle cx="160" cy="160" r="146" :fill="`url(#${id}-rim)`" />
      <circle cx="160" cy="160" r="135" :fill="`url(#${id}-face)`" stroke="#080808" stroke-width="2" />

      <g stroke="#fafafa">
        <line v-for="tick in ticks" :key="tick.index"
          :x1="tick.inner.x" :y1="tick.inner.y" :x2="tick.outer.x" :y2="tick.outer.y"
          :stroke-width="tick.major ? 6 : 2.6" />
      </g>
      <g class="dial-numerals" text-anchor="middle" dominant-baseline="central">
        <text v-for="numeral in numerals" :key="numeral.value"
          :x="numeral.position.x" :y="numeral.position.y">{{ numeral.value }}</text>
      </g>

      <text x="160" y="116" class="dial-title" text-anchor="middle">ALTITUDE</text>
      <text x="160" y="132" class="dial-unit" text-anchor="middle">FEET</text>
      <text x="160" y="145" class="hand-legend" text-anchor="middle">100 / 1,000 / 10,000</text>

      <g v-if="!isGnss" class="pressure-scale">
        <g stroke="#e7e7e7" stroke-width="1">
          <template v-for="tick in pressureTicks" :key="tick.index">
            <line :x1="57" :x2="57 + tick.length" :y1="tick.y" :y2="tick.y" />
            <line :x1="263 - tick.length" :x2="263" :y1="tick.y" :y2="tick.y" />
          </template>
        </g>
        <g v-for="(label, index) in pressureLabels" :key="index" class="pressure-numbers">
          <text x="71" :y="149 + index * 14">{{ label.hpa }}</text>
          <text x="249" :y="149 + index * 14" text-anchor="end">{{ label.inches }}</text>
        </g>
        <text x="100" y="189" class="pressure-unit">hPa</text>
        <text x="220" y="189" class="pressure-unit" text-anchor="end">inHg</text>
        <path d="M52 157 L57 160 L52 163 M268 157 L263 160 L268 163" fill="none" stroke="#fff" stroke-width="1.5" />
      </g>

      <rect x="117" y="211" width="86" height="23" rx="3" fill="#090909" stroke="#515151" />
      <text x="160" y="228" class="altitude-readout" text-anchor="middle">{{ formatNumber(readout) }}</text>
      <text x="160" y="206" class="baro-readout" text-anchor="middle">{{ baroValue }}</text>

      <g class="ten-thousands-hand" :transform="`rotate(${tenThousandsAngle} 160 160)`">
        <path d="M157.5 160 V58 H162.5 V160Z" fill="#929292" />
        <path d="M160 35 L151 57 H169Z" fill="#1b1b1b" stroke="#ededed" stroke-width="2" />
      </g>
      <g class="thousands-hand" :transform="`rotate(${thousandsAngle} 160 160)`">
        <path d="M156 162 L150 114 L160 79 L170 114 L164 162Z" :fill="`url(#${id}-hand)`" />
        <path d="M156 158 H164 L168 189 A8 8 0 1 1 152 189Z" fill="#080808" />
      </g>
      <g class="hundreds-hand" :transform="`rotate(${hundredsAngle} 160 160)`">
        <path d="M157 162 L156 65 L160 39 L164 65 L163 162Z" :fill="`url(#${id}-hand)`" />
        <path d="M156 158 H164 L175 188 Q179 200 169 202 H151 Q141 200 145 188Z" fill="#080808" />
      </g>
      <circle cx="160" cy="160" r="12" fill="#080808" />
      <circle cx="160" cy="160" r="7.5" fill="#303030" stroke="#191919" stroke-width="1" />
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.altimeter-dial {
  font-family: Arial, Helvetica, sans-serif;
  fill: #f5f5f5;
  font-variant-numeric: tabular-nums;
}

.dial-numerals { font-size: 27px; font-weight: 400; }
.dial-title { font-size: 18px; font-weight: 600; letter-spacing: 0.5px; }
.dial-unit { font-size: 10px; letter-spacing: 1.5px; }
.hand-legend { font-size: 6.5px; fill: #c4c4c4; }
.pressure-numbers { font-size: 8px; }
.pressure-unit { font-size: 6px; fill: #bdbdbd; }
.altitude-readout { font-family: var(--font-mono); font-size: 15px; font-weight: 600; }
.baro-readout { font-size: 7px; letter-spacing: 0.3px; fill: #d0d0d0; }
</style>
