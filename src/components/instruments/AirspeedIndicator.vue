<script setup lang="ts">
import { computed, useId } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { describeArc, polarToCartesian } from '@/utils/svg'

const store = useFlightStore()
const id = `asi-${useId().replace(/:/g, '')}`
const center = 160
const scaleMax = computed(() => store.profile.airspeed.max)

// Compress the low-speed region to leave the operating range around the dial.
function speedAngle(speed: number) {
  const fraction = Math.max(0, Math.min(speed / scaleMax.value, 1))
  return fraction <= 0.2 ? fraction * 180 : 36 + ((fraction - 0.2) / 0.8) * 276
}

const labelStep = computed(() => scaleMax.value <= 200 ? 20 : 50)
const ticks = computed(() => {
  const step = labelStep.value / 4
  const result = []
  for (let value = labelStep.value; value <= scaleMax.value; value += step) {
    if (value < scaleMax.value * 0.18) continue
    const major = value % labelStep.value === 0
    const medium = value % (labelStep.value / 2) === 0
    const angle = speedAngle(value)
    result.push({
      value, major,
      outer: polarToCartesian(center, center, 125, angle),
      inner: polarToCartesian(center, center, major ? 92 : medium ? 99 : 106, angle),
      label: polarToCartesian(center, center, 80, angle),
    })
  }
  return result
})

const bands = computed(() => {
  const { white, green, amber } = store.profile.airspeed.bands
  return [
    { name: 'white', range: white, radius: 112, width: 13, color: '#fafafa' },
    { name: 'green', range: green, radius: 99, width: 13, color: '#00ce00' },
    { name: 'amber', range: amber, radius: 99, width: 13, color: '#f4f000' },
  ].filter(({ range }) => range[1] > range[0]).map((band) => ({
    ...band,
    path: describeArc(center, center, band.radius, speedAngle(band.range[0]), speedAngle(band.range[1])),
  }))
})
const redline = computed(() => {
  const angle = speedAngle(store.profile.airspeed.bands.redline)
  return {
    inner: polarToCartesian(center, center, 92, angle),
    outer: polarToCartesian(center, center, 125, angle),
  }
})
const needleTransform = computed(() => `rotate(${speedAngle(store.display.airspeed)} 160 160)`)
const sourceLabel = computed(() => store.mode === 'live' ? store.liveMeta.airspeedKind : '')
const ariaLabel = computed(() => {
  const kind = store.mode === 'live'
    ? store.liveMeta.airspeedKind === 'GS' ? 'Ground speed'
      : store.liveMeta.airspeedKind === 'IAS' ? 'Indicated airspeed' : 'True airspeed'
    : 'Indicated airspeed'
  return `Airspeed indicator. ${kind} ${Math.round(store.display.airspeed)} knots${store.mode === 'live' ? ', from live ADS-B data' : ''}.`
})
</script>

<template>
  <InstrumentFrame title="Airspeed Indicator" code="ASI" unit="KTS" :label="ariaLabel">
    <svg class="airspeed-dial" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <linearGradient :id="`${id}-bezel`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#555555" />
          <stop offset="0.28" stop-color="#171717" />
          <stop offset="0.7" stop-color="#535353" />
          <stop offset="1" stop-color="#303030" />
        </linearGradient>
        <linearGradient :id="`${id}-rim`" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#101010" />
          <stop offset="0.52" stop-color="#2b2b2b" />
          <stop offset="1" stop-color="#606060" />
        </linearGradient>
        <radialGradient :id="`${id}-face`" cx="50%" cy="48%" r="55%">
          <stop offset="0" stop-color="#202020" />
          <stop offset="0.8" stop-color="#202020" />
          <stop offset="1" stop-color="#101010" />
        </radialGradient>
        <linearGradient :id="`${id}-needle`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#c9c9c9" />
          <stop offset="0.5" stop-color="#ffffff" />
          <stop offset="1" stop-color="#dedede" />
        </linearGradient>
      </defs>

      <circle cx="160" cy="160" r="151" :fill="`url(#${id}-bezel)`" stroke="#333333" stroke-width="1.5" />
      <circle cx="160" cy="160" r="145" :fill="`url(#${id}-rim)`" />
      <circle cx="160" cy="160" r="126" :fill="`url(#${id}-face)`" />

      <g v-if="store.mode === 'simulation'" fill="none">
        <path v-for="band in bands" :key="band.name" :d="band.path" :stroke="band.color" :stroke-width="band.width" />
      </g>
      <g class="dial-ticks">
        <line v-for="tick in ticks" :key="tick.value"
          :x1="tick.inner.x" :y1="tick.inner.y" :x2="tick.outer.x" :y2="tick.outer.y"
          :stroke-width="tick.major ? 2.6 : 1.25" :opacity="tick.major ? 1 : 0.8" />
      </g>
      <line v-if="store.mode === 'simulation'"
        :x1="redline.inner.x" :y1="redline.inner.y" :x2="redline.outer.x" :y2="redline.outer.y"
        stroke="#ff0808" stroke-width="2.8" />

      <g class="dial-numbers" text-anchor="middle" dominant-baseline="central">
        <template v-for="tick in ticks" :key="tick.value">
          <text v-if="tick.major" :x="tick.label.x" :y="tick.label.y">{{ tick.value }}</text>
        </template>
      </g>
      <text x="160" y="64" class="dial-title" text-anchor="middle">AIRSPEED</text>
      <text x="160" y="201" class="dial-unit" text-anchor="middle">KNOTS</text>
      <text v-if="sourceLabel" x="160" y="218" class="dial-source" text-anchor="middle">{{ sourceLabel }}</text>

      <g :transform="needleTransform">
        <path d="M156 148 L156 89 L158.5 85 L158.5 47 L160 42 L161.5 47 L161.5 85 L164 89 L164 148 Z"
          :fill="`url(#${id}-needle)`" stroke="#aaaaaa" stroke-width="0.35" />
        <path d="M156 148 H164 V197 A9.5 9.5 0 1 1 156 197 Z" fill="#202020" stroke="#343434" stroke-width="0.45" />
        <circle cx="160" cy="160" r="5.5" fill="#202020" stroke="#343434" stroke-width="0.45" />
        <path d="M156 160 V198 M164 160 V198" stroke="#343434" stroke-width="0.45" />
        <circle cx="160" cy="160" r="0.8" fill="#383838" />
      </g>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.airspeed-dial {
  font-family: Arial, Helvetica, sans-serif;
}

.dial-ticks {
  stroke: #f5f5f5;
}

.dial-numbers {
  fill: #ffffff;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dial-title,
.dial-unit {
  fill: #fafafa;
  font-size: 16px;
  font-weight: 400;
}

.dial-source {
  fill: #bdbdbd;
  font-size: 8px;
  letter-spacing: 0.12em;
}
</style>
