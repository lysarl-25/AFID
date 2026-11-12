<script setup lang="ts">
import { computed } from 'vue'
import {
  LogOut,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  SlidersHorizontal,
  Wind,
} from '@lucide/vue'
import ControlField from '@/components/ui/ControlField.vue'
import AttitudeControls from '@/components/AttitudeControls.vue'
import { useFlightStore } from '@/stores/flightStore'
import { useLiveTrackingStore } from '@/stores/liveTrackingStore'
import type { FlightKey, FlightPreset } from '@/types/flight'

const store = useFlightStore()
const live = useLiveTrackingStore()
const isLive = computed(() => store.mode === 'live')

const presets: Array<{ id: FlightPreset; label: string }> = [
  { id: 'level', label: 'Level' },
  { id: 'climb', label: 'Climb' },
  { id: 'descent', label: 'Descent' },
]

const liveStatusClass = computed(() => ({
  'panel-status--paused': live.status === 'loading' || live.status === 'stale',
  'panel-status--live': live.status === 'live',
  'panel-status--error': live.status === 'lost' || live.status === 'error',
}))

const liveDistance = computed(() => {
  const distance = live.selected?.distanceNm
  return distance == null ? '—' : `${distance.toFixed(1)} NM`
})

const liveAge = computed(() => {
  const age = live.dataAgeSeconds
  return age == null ? '—' : `${Math.round(age)} S`
})

function updateControl(key: FlightKey, value: number): void {
  store.setField(key, value)
}

function applyPreset(preset: FlightPreset): void {
  store.applyPreset(preset)
}
</script>

<template>
  <aside
    class="control-panel"
    :aria-label="isLive ? 'Live aircraft tracking' : 'Flight simulation controls'"
  >
    <header class="control-panel__header">
      <div class="control-panel__title-group">
        <span class="control-panel__icon" aria-hidden="true">
          <RadioTower v-if="isLive" :size="17" />
          <SlidersHorizontal v-else :size="17" />
        </span>
        <div>
          <h2 class="control-panel__title">
            {{ isLive ? 'Live Tracking' : 'Flight Controls' }}
          </h2>
          <p class="control-panel__subtitle">
            {{ isLive ? 'Community ADS-B feed' : 'Manual simulation input' }}
          </p>
        </div>
      </div>

      <span
        v-if="isLive"
        class="panel-status"
        :class="liveStatusClass"
      >
        <span class="panel-status__dot" aria-hidden="true" />
        {{ live.statusLabel }}
      </span>
      <span
        v-else
        class="panel-status"
        :class="{ 'panel-status--paused': !store.running }"
      >
        <span class="panel-status__dot" aria-hidden="true" />
        {{ store.running ? 'ACTIVE' : 'PAUSED' }}
      </span>
    </header>

    <AttitudeControls />

    <template v-if="isLive">
      <div class="live-target">
        <span class="live-target__eyebrow">Tracked aircraft</span>
        <strong class="live-target__callsign">{{ live.selectedName || '—' }}</strong>
        <span class="live-target__details">
          {{ live.selectedSubtitle || 'Waiting for aircraft identity' }}
        </span>

        <dl class="live-metrics">
          <div>
            <dt>Source</dt>
            <dd>{{ live.provider || 'ADS-B' }}</dd>
          </div>
          <div>
            <dt>Data age</dt>
            <dd>{{ liveAge }}</dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>{{ liveDistance }}</dd>
          </div>
          <div>
            <dt>Altitude src</dt>
            <dd>
              {{ store.liveMeta.onGround ? 'GND' : (store.liveMeta.altitudeKind ?? '—') }}
            </dd>
          </div>
        </dl>

        <p class="live-target__note">
          Attitude is estimated from flight path. IAS is used only when broadcast;
          slip/skid is unavailable.
        </p>
        <p v-if="live.errorMessage" class="control-panel__error">
          {{ live.errorMessage }}
        </p>
      </div>

      <div class="control-panel__actions">
        <button
          type="button"
          class="panel-action panel-action--primary"
          @click="live.openPicker()"
        >
          <RadioTower :size="15" aria-hidden="true" />
          Change
        </button>
        <button
          type="button"
          class="panel-action"
          @click="live.stopTracking()"
        >
          <LogOut :size="15" aria-hidden="true" />
          Return
        </button>
      </div>

      <p class="control-panel__footnote">
        Live ADS-B data is delayed and may be incomplete. Not for navigation or flight.
      </p>
    </template>

    <template v-else>
      <div class="control-panel__meta">
        <span class="control-panel__profile">
          <Wind :size="12" aria-hidden="true" />
          {{ store.profile.name }}
        </span>
        <span class="control-panel__baro">BARO {{ store.baro.toFixed(2) }}</span>
      </div>

      <div class="control-panel__actions">
        <button
          type="button"
          class="panel-action panel-action--primary"
          @click="store.toggleRunning()"
        >
          <Play v-if="!store.running" :size="15" aria-hidden="true" />
          <Pause v-else :size="15" aria-hidden="true" />
          {{ store.running ? 'Pause' : 'Resume' }}
        </button>
        <button type="button" class="panel-action" @click="store.reset()">
          <RotateCcw :size="15" aria-hidden="true" />
          Reset
        </button>
      </div>

      <div class="control-panel__presets">
        <span class="control-panel__section-label">Presets</span>
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="preset-chip"
          @click="applyPreset(preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="control-panel__fields">
        <ControlField
          v-for="control in store.controls"
          :key="control.key"
          :control="control"
          :model-value="store.target[control.key]"
          @update:model-value="(value) => updateControl(control.key, value)"
        />
      </div>

      <p class="control-panel__footnote">
        SIMULATION VALUES ONLY — ADJUST ANY PARAMETER TO DRIVE ALL INSTRUMENTS.
      </p>
    </template>
  </aside>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as *;

.control-panel {
  @include panel-surface;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  scrollbar-color: rgba(60, 232, 255, 0.22) transparent;
  scrollbar-width: thin;
}

.control-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.control-panel__title-group {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.control-panel__icon {
  display: grid;
  flex: none;
  width: 32px;
  height: 32px;
  color: var(--cyan);
  border: 1px solid rgba(60, 232, 255, 0.24);
  border-radius: 8px;
  background: rgba(60, 232, 255, 0.05);
  place-items: center;
}

.control-panel__title {
  color: var(--white);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.control-panel__subtitle {
  margin-top: 1px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel-status {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: 1px solid rgba(61, 245, 154, 0.2);
  border-radius: 999px;
  background: rgba(61, 245, 154, 0.05);

  &--paused {
    color: var(--amber);
    border-color: rgba(255, 194, 71, 0.24);
    background: rgba(255, 194, 71, 0.06);

    .panel-status__dot {
      background: var(--amber);
      animation: none;
    }
  }

  &--live {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.24);
    background: rgba(60, 232, 255, 0.05);

    .panel-status__dot {
      background: var(--cyan);
      box-shadow: 0 0 6px rgba(60, 232, 255, 0.8);
    }
  }

  &--error {
    color: var(--red);
    border-color: rgba(255, 93, 108, 0.26);
    background: rgba(255, 93, 108, 0.055);

    .panel-status__dot {
      background: var(--red);
      box-shadow: 0 0 6px rgba(255, 93, 108, 0.75);
      animation: none;
    }
  }
}

.panel-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px rgba(61, 245, 154, 0.8);
  animation: panel-status-pulse 2.1s ease-in-out infinite;
}

.live-target {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px;
  border: 1px solid rgba(60, 232, 255, 0.16);
  border-radius: 9px;
  background:
    linear-gradient(180deg, rgba(60, 232, 255, 0.045), transparent 65%),
    rgba(3, 10, 18, 0.5);
}

.live-target__eyebrow {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.live-target__callsign {
  overflow: hidden;
  color: var(--white);
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-target__details {
  overflow: hidden;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 7.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 10px;
  margin: 8px 0 2px;
  padding-top: 8px;
  border-top: 1px solid rgba(141, 188, 216, 0.09);

  > div {
    min-width: 0;
  }

  dt {
    color: var(--muted-2);
    font-family: var(--font-mono);
    font-size: 6.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  dd {
    overflow: hidden;
    margin-top: 1px;
    color: var(--cyan-soft);
    font-family: var(--font-mono);
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.live-target__note {
  margin-top: 5px;
  color: rgba(255, 194, 71, 0.62);
  font-family: var(--font-mono);
  font-size: 6.5px;
  line-height: 1.5;
}

.control-panel__error {
  margin-top: 5px;
  padding: 6px 7px;
  color: rgba(255, 93, 108, 0.9);
  font-family: var(--font-mono);
  font-size: 7px;
  line-height: 1.45;
  border: 1px solid rgba(255, 93, 108, 0.16);
  border-radius: 6px;
  background: rgba(255, 93, 108, 0.04);
}

.control-panel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.05em;
  border: 1px solid rgba(141, 188, 216, 0.08);
  border-radius: 7px;
  background: rgba(3, 10, 18, 0.45);
}

.control-panel__profile {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-panel__baro {
  flex: none;
  color: var(--cyan-soft);
}

.control-panel__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.panel-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 12px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid rgba(141, 188, 216, 0.14);
  border-radius: 8px;
  background: rgba(8, 20, 33, 0.72);
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background 150ms ease;

  &:hover {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.3);
    background: rgba(15, 36, 54, 0.82);
  }

  &--primary {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.24);
    background: rgba(60, 232, 255, 0.05);

    &:hover {
      background: rgba(60, 232, 255, 0.1);
    }
  }
}

.control-panel__presets {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.control-panel__section-label {
  margin-right: 2px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.preset-chip {
  height: 24px;
  padding: 0 9px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.05em;
  border: 1px solid rgba(141, 188, 216, 0.12);
  border-radius: 999px;
  background: rgba(5, 14, 24, 0.62);
  transition:
    color 150ms ease,
    border-color 150ms ease;

  &:hover {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.3);
  }
}

.control-panel__fields {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.control-panel__footnote {
  padding-top: 2px;
  color: rgba(125, 149, 171, 0.48);
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.08em;
  line-height: 1.5;
  text-align: center;
}

@keyframes panel-status-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@media (min-width: 1200px) {
  .control-panel {
    position: sticky;
    top: 16px;
    max-height: calc(100svh - 132px);
    overflow-y: auto;
  }
}

@media (min-width: 700px) and (max-width: 1199px) {
  .control-panel__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 580px) {
  .control-panel {
    padding: 12px;
  }

  .panel-action {
    min-height: 44px;
  }

  .preset-chip {
    height: 32px;
    padding: 0 12px;
  }
}
</style>
