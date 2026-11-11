<script setup lang="ts">
import { ref } from 'vue'
import DashboardHeader from '@/components/DashboardHeader.vue'
import FlightControlPanel from '@/components/FlightControlPanel.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import AirspeedIndicator from '@/components/instruments/AirspeedIndicator.vue'
import AttitudeIndicator from '@/components/instruments/AttitudeIndicator.vue'
import Altimeter from '@/components/instruments/Altimeter.vue'
import VerticalSpeedIndicator from '@/components/instruments/VerticalSpeedIndicator.vue'
import HeadingIndicator from '@/components/instruments/HeadingIndicator.vue'
import TurnCoordinator from '@/components/instruments/TurnCoordinator.vue'
import { useSimulationLoop } from '@/composables/useSimulationLoop'
import { useFlightStore } from '@/stores/flightStore'

const settingsOpen = ref(false)
const store = useFlightStore()

useSimulationLoop()
</script>

<template>
  <div class="app-shell">
    <DashboardHeader @open-settings="settingsOpen = true" />

    <main class="dashboard">
      <div class="instrument-grid" aria-label="Flight instruments">
        <AirspeedIndicator />
        <AttitudeIndicator />
        <Altimeter />
        <TurnCoordinator />
        <HeadingIndicator />
        <VerticalSpeedIndicator />
      </div>

      <FlightControlPanel />
    </main>

    <footer class="app-footer">
      <span class="app-footer__warning">
        <span class="app-footer__dot" aria-hidden="true" />
        Simulated data — educational use only. Not for navigation or flight.
      </span>
      <span class="app-footer__meta">
        {{ store.profile.name }} · BARO {{ store.baro.toFixed(2) }} IN
      </span>
    </footer>

    <SettingsPanel v-model:open="settingsOpen" />
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

.instrument-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  min-width: 0;
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

@media (max-width: 1199px) {
  .dashboard {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .instrument-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .instrument-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

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
