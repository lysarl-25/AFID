<script setup lang="ts">
import { ref } from 'vue'
import DashboardHeader from '@/components/DashboardHeader.vue'
import FlightControlPanel from '@/components/FlightControlPanel.vue'
import LiveFlightPicker from '@/components/LiveFlightPicker.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import InstrumentNavigation from '@/components/InstrumentNavigation.vue'
import InstrumentDisplay from '@/components/InstrumentDisplay.vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { SlidersHorizontal, RadioTower, ChevronDown } from '@lucide/vue'
import { useSimulationLoop } from '@/composables/useSimulationLoop'
import { useFlightStore } from '@/stores/flightStore'
import { useLiveTrackingStore } from '@/stores/liveTrackingStore'

const settingsOpen = ref(false)
const store = useFlightStore()
const live = useLiveTrackingStore()
const dashboard = useDashboardStore()
const controlsOpen = ref(typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 1024px)').matches)

useSimulationLoop()
</script>

<template>
  <div class="app-shell">
    <DashboardHeader @open-settings="settingsOpen = true" />
    <InstrumentNavigation />

    <div class="view-toolbar">
      <div>
        <p class="view-toolbar__eyebrow">{{ dashboard.view === 'ALL' ? 'COCKPIT OVERVIEW' : `${dashboard.view} / FOCUSED VIEW` }}</p>
        <h2 aria-live="polite">{{ dashboard.title }}</h2>
      </div>
      <div class="view-toolbar__actions">
        <button type="button" class="toolbar-button toolbar-button--live" @click="live.openPicker()">
          <RadioTower :size="16" aria-hidden="true" /><span>Live aircraft</span>
        </button>
        <button type="button" class="toolbar-button" aria-controls="flight-controls"
          :aria-expanded="controlsOpen" @click="controlsOpen = !controlsOpen">
          <SlidersHorizontal :size="16" aria-hidden="true" /><span>Controls</span>
          <ChevronDown :size="14" :class="{ 'chevron-open': controlsOpen }" aria-hidden="true" />
        </button>
      </div>
    </div>

    <main class="dashboard" :class="{ 'dashboard--expanded': !controlsOpen }">
      <InstrumentDisplay />
      <div id="flight-controls" v-show="controlsOpen" class="controls-wrapper">
        <FlightControlPanel />
      </div>
    </main>

    <footer class="app-footer">
      <span class="app-footer__warning">
        <span class="app-footer__dot" aria-hidden="true" />
        <template v-if="store.mode === 'live'">
          Live ADS-B data — delayed and incomplete. Not for navigation or flight.
        </template>
        <template v-else>
          Simulated data — educational use only. Not for navigation or flight.
        </template>
      </span>
      <span class="app-footer__meta">
        <template v-if="store.mode === 'live'">
          {{ live.selectedName || 'ADS-B' }} · {{ live.provider || 'community feed' }} ·
          {{ live.statusLabel }}
        </template>
        <template v-else>
          {{ store.profile.name }} · BARO {{ store.baro.toFixed(2) }} IN
        </template>
      </span>
    </footer>

    <SettingsPanel v-model:open="settingsOpen" />
    <LiveFlightPicker />
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 1680px;
  min-height: 100svh;
  margin: 0 auto;
  padding: clamp(10px, 1.1vw, 18px);
}

.dashboard {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 336px;
  align-items: start;
  gap: 14px;
  min-width: 0;
}

.dashboard--expanded { grid-template-columns: minmax(0, 1fr); }
.controls-wrapper { min-width: 0; }
.view-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 2px 4px;
}
.view-toolbar h2 { font-size: clamp(17px, 2vw, 23px); font-weight: 600; letter-spacing: -0.02em; }
.view-toolbar__eyebrow {
  margin-bottom: 4px; color: var(--muted); font-family: var(--font-mono);
  font-size: 9px; letter-spacing: 0.14em;
}
.view-toolbar__actions { display: flex; gap: 8px; flex: none; }
.toolbar-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 44px; padding: 8px 12px; border: 1px solid var(--line);
  border-radius: 9px; background: #0a1a28; color: var(--cyan-soft); font-size: 12px;
}
.toolbar-button:hover { border-color: var(--cyan); }
.toolbar-button--live { background: rgba(60, 232, 255, 0.07); }
.chevron-open { transform: rotate(180deg); }
@media (min-width: 1024px) {
  .controls-wrapper { position: sticky; top: 88px; max-height: calc(100svh - 104px); overflow-y: auto; scrollbar-width: thin; }
}

.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 4px 2px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.07em;
  line-height: 1.5;
  text-transform: uppercase;
}

.app-footer__warning {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 194, 71, 0.56);
}

.app-footer__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 6px rgba(255, 194, 71, 0.45);
}

.app-footer__meta {
  flex: none;
}

@media (max-width: 1023px) {
  .dashboard {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .app-shell {
    gap: 10px;
    padding: 9px;
  }

  .dashboard {
    gap: 10px;
  }

  .view-toolbar { flex-wrap: wrap; }
  .view-toolbar__actions { width: 100%; }
  .toolbar-button { flex: 1; }

  .app-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 2px 3px 6px;
  }
}

@media (min-width: 1200px) and (max-width: 1500px) {
  .dashboard {
    grid-template-columns: minmax(0, 1fr) 310px;
  }
}
</style>
