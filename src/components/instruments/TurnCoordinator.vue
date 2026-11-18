<script setup lang="ts">
import { computed, useId } from 'vue'
import InstrumentFrame from '@/components/ui/InstrumentFrame.vue'
import { useFlightStore } from '@/stores/flightStore'
import { clamp } from '@/utils/math'
import { formatSigned } from '@/utils/format'

const store = useFlightStore()
const id = `tc-${useId().replace(/:/g, '')}`
// This symbol indicates turn rate, not roll attitude or pitch. Standard rate
// (3 degrees/second, a two-minute turn) aligns with the lower reference marks.
const turnAngle = computed(() => clamp(store.display.turnRate / 3 * 20, -40, 40))
const aircraftTransform = computed(() => `rotate(${turnAngle.value} 160 160)`)
const ballPosition = computed(() => {
  const slip = clamp(store.display.slipSkid, -1, 1)
  return { x: 160 + 49 * slip, y: 209 - 7 * slip * slip }
})
const slipAvailable = computed(() => store.mode !== 'live')
const unitLabel = computed(() => slipAvailable.value ? 'TURN / SLIP' : 'TURN / N/A')
const mounts = [{ x: 43, y: 46 }, { x: 277, y: 46 }, { x: 43, y: 274 }, { x: 277, y: 274 }]
const ariaLabel = computed(() => {
  const rate = `Turn coordinator. Turn rate ${formatSigned(store.display.turnRate, 1)} degrees per second.`
  return slipAvailable.value
    ? `${rate} Slip skid ${formatSigned(store.display.slipSkid, 2)}. No pitch information.`
    : `${rate} Slip skid is unavailable from ADS-B data. No pitch information.`
})
</script>

<template>
  <InstrumentFrame title="Turn Coordinator" code="TC" :unit="unitLabel" :label="ariaLabel">
    <svg class="turn-coordinator-dial" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <linearGradient :id="`${id}-housing`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#505050" />
          <stop offset="0.55" stop-color="#414141" />
          <stop offset="1" stop-color="#303030" />
        </linearGradient>
        <radialGradient :id="`${id}-rim`" cx="50%" cy="50%" r="50%">
          <stop offset="0.72" stop-color="#333333" />
          <stop offset="0.81" stop-color="#1e1e1e" />
          <stop offset="0.87" stop-color="#3f3f3f" />
          <stop offset="0.94" stop-color="#303030" />
          <stop offset="1" stop-color="#101010" />
        </radialGradient>
        <radialGradient :id="`${id}-face`" cx="48%" cy="42%" r="65%">
          <stop offset="0" stop-color="#5b5b5b" />
          <stop offset="0.8" stop-color="#444444" />
          <stop offset="1" stop-color="#292929" />
        </radialGradient>
        <linearGradient :id="`${id}-tube`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.6" stop-color="#ececec" />
          <stop offset="1" stop-color="#bdbdbd" />
        </linearGradient>
        <radialGradient :id="`${id}-ball`" cx="35%" cy="30%" r="70%">
          <stop offset="0" stop-color="#535353" />
          <stop offset="0.55" stop-color="#252525" />
          <stop offset="1" stop-color="#070707" />
        </radialGradient>
        <radialGradient :id="`${id}-screw`" cx="35%" cy="30%" r="65%">
          <stop offset="0" stop-color="#eeeeee" />
          <stop offset="0.55" stop-color="#adadad" />
          <stop offset="1" stop-color="#555555" />
        </radialGradient>
      </defs>

      <path d="M78 4 H242 L283 25 Q295 32 301 46 L317 78 V242 L299 279 Q293 292 280 299 L242 317 H78 L40 299 Q27 292 21 279 L3 242 V78 L19 46 Q25 32 37 25Z"
        :fill="`url(#${id}-housing)`" stroke="#797979" stroke-width="1.3" />
      <path d="M3 242 L21 279 Q27 292 40 299 L78 317 H242 L280 299 Q293 292 299 279 L317 242"
        fill="none" stroke="#151515" stroke-width="1.5" />
      <g v-for="mount in mounts" :key="`${mount.x}-${mount.y}`" :transform="`translate(${mount.x} ${mount.y})`">
        <circle r="8" :fill="`url(#${id}-screw)`" stroke="#222222" stroke-width="1.4" />
        <circle r="2.2" fill="#616161" stroke="#333333" stroke-width="0.7" />
      </g>
      <circle cx="160" cy="160" r="131" :fill="`url(#${id}-rim)`" stroke="#292929" stroke-width="1.5" />
      <circle cx="160" cy="160" r="113" fill="#414141" stroke="#222222" stroke-width="2" />
      <circle cx="160" cy="160" r="82" :fill="`url(#${id}-face)`" stroke="#242424" stroke-width="2" />
      <circle cx="160" cy="160" r="80" fill="none" stroke="#666666" stroke-opacity="0.3" />

      <g class="turn-reference-marks" stroke="#ffffff" stroke-width="5.5">
        <path d="M59 160 H77 M243 160 H261" />
        <path d="M59 160 H77" transform="rotate(-20 160 160)" />
        <path d="M243 160 H261" transform="rotate(20 160 160)" />
      </g>
      <g class="turn-aircraft" :transform="aircraftTransform">
        <path d="M82 159 L148 157 Q148 151 154 148 L131 147 V144 L158 142 L159 130 H161 L162 142 L189 144 V147 L166 148 Q172 151 172 157 L238 159 V162 L172 162 Q170 172 160 172 Q150 172 148 162 L82 162Z"
          fill="#ffffff" />
      </g>
      <text x="160" y="184" class="dial-title" text-anchor="middle">TURN COORDINATOR</text>

      <path class="slip-tube" d="M81 182 Q160 208 239 182 L229 218 Q160 232 91 218Z"
        :fill="`url(#${id}-tube)`" />
      <g class="ball-center-marks" stroke="#343434" stroke-width="2">
        <path d="M147 198 V225 M173 198 V225" />
      </g>
      <ellipse v-if="slipAvailable" class="slip-ball" :cx="ballPosition.x" :cy="ballPosition.y"
        rx="10" ry="12.5" :fill="`url(#${id}-ball)`" stroke="#202020" stroke-width="0.7" />
      <text v-else x="160" y="214" class="unavailable-label" text-anchor="middle">N/A</text>

      <text x="160" y="251" class="pitch-label" text-anchor="middle">NO PITCH</text>
      <text x="160" y="261" class="pitch-label" text-anchor="middle">INFORMATION</text>
      <text x="160" y="280" class="rate-label" text-anchor="middle">2 MIN / {{ formatSigned(store.display.turnRate, 1) }}°/S</text>
    </svg>
  </InstrumentFrame>
</template>

<style scoped lang="scss">
.turn-coordinator-dial {
  font-family: 'Arial Narrow', Arial, Helvetica, sans-serif;
  font-variant-numeric: tabular-nums;
  fill: #ffffff;
}
.dial-title { font-size: 8px; font-weight: 700; }
.pitch-label { font-size: 8.5px; font-weight: 700; }
.rate-label { font-family: var(--font-mono); font-size: 6.5px; fill: #d0d0d0; }
.unavailable-label { font-family: var(--font-mono); font-size: 9px; font-weight: 700; fill: #303030; }
</style>
