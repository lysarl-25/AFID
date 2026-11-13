<script setup lang="ts">
import { INSTRUMENTS } from '@/data/instruments'
import { useDashboardStore } from '@/stores/dashboardStore'

const dashboard = useDashboardStore()
</script>

<template>
  <nav class="instrument-nav" aria-label="Instrument navigation">
    <button type="button" :aria-pressed="dashboard.view === 'ALL'"
      aria-controls="instrument-display" @click="dashboard.selectView('ALL')">
      <span class="nav-code">ALL</span><span class="nav-title">Overview</span>
    </button>
    <button v-for="instrument in INSTRUMENTS" :key="instrument.code" type="button"
      :aria-label="`Show ${instrument.title}`" :title="instrument.title"
      :aria-pressed="dashboard.view === instrument.code" aria-controls="instrument-display"
      @click="dashboard.selectView(instrument.code)">
      <span class="nav-code">{{ instrument.code }}</span>
      <span class="nav-title">{{ instrument.shortTitle }}</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
.instrument-nav {
  position: sticky; top: 8px; z-index: 10;
  display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px; padding: 7px; border: 1px solid var(--line);
  border-radius: 14px; background: rgba(5, 16, 26, 0.96);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); backdrop-filter: blur(16px);
}
button {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  min-width: 0; min-height: 48px; padding: 8px;
  border: 1px solid transparent; border-radius: 8px; background: transparent;
  color: var(--muted); transition: background 140ms, color 140ms, border-color 140ms;
}
button:hover { background: rgba(60, 232, 255, 0.06); color: var(--white); }
button[aria-pressed='true'] {
  border-color: rgba(60, 232, 255, 0.45); color: var(--cyan);
  background: rgba(60, 232, 255, 0.12); box-shadow: inset 0 -2px var(--cyan);
}
button:focus-visible { outline: 2px solid var(--cyan); outline-offset: -2px; }
.nav-code { font-family: var(--font-mono); font-weight: 700; font-size: 12px; letter-spacing: 0.05em; }
.nav-title { font-size: 11px; white-space: nowrap; }
@media (max-width: 1100px) {
  button { flex-direction: column; gap: 3px; }
  .nav-title { font-size: 10px; }
}
@media (max-width: 580px) {
  .instrument-nav { gap: 2px; padding: 4px; top: 4px; border-radius: 10px; }
  button { padding: 6px 2px; min-height: 48px; border-radius: 6px; }
  .nav-code { font-size: 11px; }
  .nav-title { display: none; }
}
</style>
