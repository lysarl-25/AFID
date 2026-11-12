<script setup lang="ts">
import { computed } from 'vue'
import { Maximize2, Minimize2, PlaneTakeoff, RadioTower, Settings } from '@lucide/vue'
import { useFlightStore } from '@/stores/flightStore'
import { useAttitudeControlStore } from '@/stores/attitudeControlStore'
import { useLiveTrackingStore } from '@/stores/liveTrackingStore'
import { useFullscreen } from '@/composables/useFullscreen'

const emit = defineEmits<{
  (event: 'open-settings'): void
}>()

const store = useFlightStore()
const attitude = useAttitudeControlStore()
const live = useLiveTrackingStore()
const { isSupported, isFullscreen, toggleFullscreen } = useFullscreen()

const isLive = computed(() => store.mode === 'live')

const statusText = computed(() => {
  if (isLive.value) return live.statusLabel
  if (attitude.mode === 'device') return `DEVICE MOTION ${attitude.sensorStatus.toUpperCase()}`
  if (attitude.active) return `${attitude.modeLabel} ACTIVE`
  return store.running ? 'SIMULATION ACTIVE' : 'SIMULATION PAUSED'
})
</script>

<template>
  <header class="dashboard-header">
    <div class="brand">
      <span class="brand__mark" aria-hidden="true">
        <PlaneTakeoff :size="23" :stroke-width="1.8" />
      </span>
      <div class="brand__copy">
        <span class="brand__eyebrow">
          {{ isLive ? 'PFD / LIVE ADS-B' : 'PFD / FLIGHT SIMULATOR' }}
        </span>
        <h1 class="brand__title">Aircraft Flight Instruments</h1>
      </div>
    </div>

    <div class="header-status">
      <span
        class="status-pill"
        :class="{
          'status-pill--paused': !isLive && !store.running && !attitude.active,
          'status-pill--live': isLive && live.status === 'live',
          'status-pill--warning':
            isLive && (live.status === 'loading' || live.status === 'stale'),
          'status-pill--error':
            isLive && (live.status === 'lost' || live.status === 'error'),
        }"
      >
        <span class="status-pill__dot" aria-hidden="true" />
        {{ statusText }}
      </span>

      <div class="flight-mode">
        <span class="flight-mode__label">MODE</span>
        <strong class="flight-mode__value">{{ store.flightMode }}</strong>
      </div>
    </div>

    <div class="header-actions">
      <button
        type="button"
        class="header-button"
        :class="{ 'header-button--active': isLive }"
        aria-label="Open live aircraft tracking"
        title="Track live ADS-B aircraft"
        @click="live.openPicker()"
      >
        <RadioTower :size="18" />
      </button>

      <button
        type="button"
        class="header-button"
        :disabled="!isSupported"
        :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
        :title="
          isSupported
            ? isFullscreen
              ? 'Exit fullscreen'
              : 'Enter fullscreen'
            : 'Fullscreen is not supported by this browser'
        "
        @click="toggleFullscreen"
      >
        <Minimize2 v-if="isFullscreen" :size="18" />
        <Maximize2 v-else :size="18" />
      </button>

      <button
        type="button"
        class="header-button"
        aria-label="Open simulation settings"
        title="Settings"
        @click="emit('open-settings')"
      >
        <Settings :size="18" />
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as *;

.dashboard-header {
  @include panel-surface;
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 28px);
  min-height: 70px;
  padding: 11px clamp(13px, 1.6vw, 20px);
  border-radius: var(--radius-lg);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand__mark {
  display: grid;
  flex: none;
  width: 43px;
  height: 43px;
  color: var(--cyan);
  border: 1px solid rgba(60, 232, 255, 0.32);
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 50% 30%,
      rgba(60, 232, 255, 0.18),
      transparent 70%
    ),
    rgba(4, 13, 22, 0.8);
  box-shadow:
    inset 0 0 18px rgba(60, 232, 255, 0.08),
    0 0 18px rgba(60, 232, 255, 0.06);
  place-items: center;
}

.brand__copy {
  min-width: 0;
}

.brand__eyebrow {
  display: block;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.19em;
  line-height: 1.3;
}

.brand__title {
  overflow: hidden;
  color: var(--white);
  font-size: clamp(13px, 1.4vw, 17px);
  font-weight: 600;
  letter-spacing: 0.11em;
  line-height: 1.35;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.header-status {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(10px, 1.6vw, 22px);
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 26px;
  padding: 0 10px;
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.11em;
  white-space: nowrap;
  border: 1px solid rgba(61, 245, 154, 0.24);
  border-radius: 999px;
  background: rgba(61, 245, 154, 0.06);

  &--paused,
  &--warning {
    color: var(--amber);
    border-color: rgba(255, 194, 71, 0.28);
    background: rgba(255, 194, 71, 0.07);

    .status-pill__dot {
      animation: none;
      background: var(--amber);
      box-shadow: 0 0 7px rgba(255, 194, 71, 0.75);
    }
  }

  &--live {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.28);
    background: rgba(60, 232, 255, 0.06);

    .status-pill__dot {
      background: var(--cyan);
      box-shadow: 0 0 7px rgba(60, 232, 255, 0.8);
    }
  }

  &--error {
    color: var(--red);
    border-color: rgba(255, 93, 108, 0.3);
    background: rgba(255, 93, 108, 0.06);

    .status-pill__dot {
      animation: none;
      background: var(--red);
      box-shadow: 0 0 7px rgba(255, 93, 108, 0.75);
    }
  }
}

.status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 7px rgba(61, 245, 154, 0.8);
  animation: status-pulse 2.1s ease-in-out infinite;
}

.flight-mode {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  white-space: nowrap;
}

.flight-mode__label {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
}

.flight-mode__value {
  overflow: hidden;
  color: var(--cyan-soft);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  flex: none;
  gap: 7px;
}

.header-button {
  display: inline-grid;
  width: 38px;
  height: 38px;
  padding: 0;
  color: var(--muted);
  border: 1px solid rgba(141, 188, 216, 0.13);
  border-radius: 9px;
  background: rgba(5, 14, 24, 0.68);
  place-items: center;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;

  &:hover:not(:disabled) {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.35);
    background: rgba(15, 36, 54, 0.82);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &--active {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.36);
    background: rgba(60, 232, 255, 0.08);
  }

  @include focus-visible;
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
}

@media (max-width: 980px) {
  .dashboard-header {
    flex-wrap: wrap;
    row-gap: 10px;
  }

  .header-status {
    order: 3;
    flex-basis: 100%;
    justify-content: space-between;
    padding-top: 9px;
    border-top: 1px solid var(--line-soft);
  }
}

@media (max-width: 580px) {
  .dashboard-header {
    gap: 10px;
    padding: 10px 12px;
  }

  .brand__mark {
    width: 38px;
    height: 38px;
    border-radius: 10px;
  }

  .brand__title {
    font-size: 12px;
    letter-spacing: 0.07em;
  }

  .brand__eyebrow {
    font-size: 7px;
  }

  .header-button {
    width: 42px;
    height: 42px;
  }

  .status-pill {
    font-size: 7px;
  }
}
</style>
