<script setup lang="ts">
import type { Component } from 'vue'
import { INSTRUMENTS, type InstrumentCode } from '@/data/instruments'
import { useDashboardStore } from '@/stores/dashboardStore'
import AirspeedIndicator from './instruments/AirspeedIndicator.vue'
import AttitudeIndicator from './instruments/AttitudeIndicator.vue'
import Altimeter from './instruments/Altimeter.vue'
import TurnCoordinator from './instruments/TurnCoordinator.vue'
import HeadingIndicator from './instruments/HeadingIndicator.vue'
import VerticalSpeedIndicator from './instruments/VerticalSpeedIndicator.vue'

const dashboard = useDashboardStore()
const components: Record<InstrumentCode, Component> = {
  ASI: AirspeedIndicator, ATT: AttitudeIndicator, ALT: Altimeter,
  TC: TurnCoordinator, HDG: HeadingIndicator, VSI: VerticalSpeedIndicator,
}
</script>

<template>
  <div id="instrument-display" class="instrument-grid"
    :class="{ 'instrument-grid--single': dashboard.view !== 'ALL' }"
    :aria-label="dashboard.title">
    <template v-for="instrument in INSTRUMENTS" :key="instrument.code">
      <component v-if="dashboard.view === 'ALL' || dashboard.view === instrument.code"
        :is="components[instrument.code]" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.instrument-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px; min-width: 0; align-items: start;
}
.instrument-grid--single {
  grid-template-columns: minmax(0, 1fr);
  width: 100%; max-width: 740px; margin-inline: auto;
}
@media (min-width: 1024px) {
  .instrument-grid--single { max-width: min(740px, max(320px, calc((100svh - 260px) * 1.14))); }
  .instrument-grid:not(.instrument-grid--single) :deep(.instrument__body) {
    aspect-ratio: auto;
    height: clamp(180px, calc((100svh - 330px) / 2), 330px);
  }
}
@media (max-width: 1100px) {
  .instrument-grid:not(.instrument-grid--single) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 580px) {
  .instrument-grid { gap: 10px; }
  .instrument-grid:not(.instrument-grid--single) { grid-template-columns: minmax(0, 1fr); }
}
</style>
