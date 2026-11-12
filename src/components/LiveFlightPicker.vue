<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  Crosshair,
  LocateFixed,
  Plane,
  RefreshCw,
  RadioTower,
  X,
} from '@lucide/vue'
import { useLiveTrackingStore } from '@/stores/liveTrackingStore'
import type { LiveAircraft } from '@/types/live'
import { formatNumber, formatSigned } from '@/utils/format'

const live = useLiveTrackingStore()
const closeButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const latInput = ref('')
const lonInput = ref('')
const manualError = ref('')
let previousBodyOverflow = ''
let previouslyFocused: HTMLElement | null = null

function syncInputs(): void {
  latInput.value = live.position?.lat.toFixed(5) ?? ''
  lonInput.value = live.position?.lon.toFixed(5) ?? ''
}

const nearbyCount = computed(() => live.nearby.length)
const hasSelection = computed(() => Boolean(live.selected))
const selectedIcao = computed(() => live.selected?.icao24 ?? '')

function close(): void {
  live.closePicker()
}

function handleSelect(aircraft: LiveAircraft): void {
  live.selectAircraft(aircraft)
}

function applyManualLocation(): void {
  const lat = Number.parseFloat(latInput.value)
  const lon = Number.parseFloat(lonInput.value)

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    manualError.value = 'Enter a latitude between -90 and 90 and longitude between -180 and 180.'
    return
  }

  manualError.value = ''
  live.setPosition({ lat, lon })
}

function handleRadiusChange(event: Event): void {
  const value = Number.parseFloat((event.target as HTMLSelectElement).value)
  if (Number.isFinite(value)) {
    live.setRadius(value)
    void live.searchNearby()
  }
}

function aircraftName(aircraft: LiveAircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase()
}

function aircraftDetails(aircraft: LiveAircraft): string {
  return [aircraft.typeCode, aircraft.registration, aircraft.icao24.toUpperCase()]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
}

function distanceText(aircraft: LiveAircraft): string {
  if (aircraft.distanceNm == null) return 'DIST —'
  return `${aircraft.distanceNm.toFixed(1)} NM`
}

function bearingText(aircraft: LiveAircraft): string {
  if (aircraft.bearingDeg == null) return ''
  return ` · ${Math.round(aircraft.bearingDeg).toString().padStart(3, '0')}°`
}

function altitudeText(aircraft: LiveAircraft): string {
  if (aircraft.onGround) return 'GROUND'
  const altitude = aircraft.altitudeBaroFt ?? aircraft.altitudeGeomFt
  return altitude == null ? 'ALT —' : `${formatNumber(Math.round(altitude))} FT`
}

function speedText(aircraft: LiveAircraft): string {
  if (aircraft.groundSpeedKt == null) return 'GS —'
  return `${formatNumber(Math.round(aircraft.groundSpeedKt))} KT`
}

function verticalRateText(aircraft: LiveAircraft): string {
  if (aircraft.onGround) return 'GND'
  if (aircraft.verticalRateFpm == null) return 'V/S —'
  return `${formatSigned(Math.round(aircraft.verticalRateFpm))} FPM`
}

function dataAgeText(aircraft: LiveAircraft): string {
  if (!aircraft.seenSeconds) return 'NOW'
  if (aircraft.seenSeconds < 60) return `${Math.round(aircraft.seenSeconds)}S`
  return `${Math.round(aircraft.seenSeconds / 60)}M`
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return

  const focusable = [
    ...panel.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ]
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (!panel.value.contains(active)) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => live.pickerOpen,
  async (open) => {
    if (open) {
      syncInputs()
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeydown)
      await nextTick()
      closeButton.value?.focus()
    } else {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleKeydown)
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

watch(
  () => live.position,
  () => {
    if (live.pickerOpen) syncInputs()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="live-fade">
      <div
        v-if="live.pickerOpen"
        class="live-overlay"
        @mousedown.self="close"
      >
        <section
          ref="panel"
          class="live-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-picker-title"
        >
          <header class="live-panel__header">
            <div class="live-panel__title-group">
              <span class="live-panel__icon" aria-hidden="true">
                <RadioTower :size="18" />
              </span>
              <div>
                <span class="live-panel__eyebrow">COMMUNITY ADS-B · DELAYED</span>
                <h2 id="live-picker-title" class="live-panel__title">
                  Track Nearby Aircraft
                </h2>
              </div>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="live-close"
              aria-label="Close live aircraft picker"
              @click="close"
            >
              <X :size="18" />
            </button>
          </header>

          <div class="live-panel__scroll">
            <section class="live-section">
              <h3 class="live-section__title">Receive Location</h3>
              <div class="location-bar">
                <span class="location-bar__text">
                  <Crosshair :size="13" aria-hidden="true" />
                  {{ live.positionLabel }}
                </span>
                <button
                  type="button"
                  class="live-action live-action--compact"
                  :disabled="live.locating"
                  @click="live.locate()"
                >
                  <LocateFixed :size="14" aria-hidden="true" />
                  {{ live.locating ? 'Locating…' : 'Use my location' }}
                </button>
              </div>

              <div class="coordinate-grid">
                <label class="coordinate-field">
                  <span>Latitude</span>
                  <input
                    v-model="latInput"
                    class="coordinate-input"
                    type="number"
                    inputmode="decimal"
                    min="-90"
                    max="90"
                    step="0.0001"
                    placeholder="e.g. 51.4700"
                  />
                </label>
                <label class="coordinate-field">
                  <span>Longitude</span>
                  <input
                    v-model="lonInput"
                    class="coordinate-input"
                    type="number"
                    inputmode="decimal"
                    min="-180"
                    max="180"
                    step="0.0001"
                    placeholder="e.g. -0.4543"
                  />
                </label>
                <label class="coordinate-field">
                  <span>Radius</span>
                  <select
                    class="coordinate-input"
                    :value="live.radiusNm"
                    @change="handleRadiusChange"
                  >
                    <option :value="10">10 NM</option>
                    <option :value="25">25 NM</option>
                    <option :value="50">50 NM</option>
                    <option :value="100">100 NM</option>
                    <option :value="150">150 NM</option>
                    <option :value="250">250 NM</option>
                  </select>
                </label>
                <button
                  type="button"
                  class="live-action coordinate-apply"
                  @click="applyManualLocation"
                >
                  <Plane :size="14" aria-hidden="true" />
                  Find aircraft
                </button>
              </div>

              <p v-if="manualError" class="live-error">{{ manualError }}</p>
              <p v-if="live.locationError" class="live-error">
                {{ live.locationError }}
              </p>
            </section>

            <section class="live-section">
              <div class="nearby-heading">
                <div>
                  <h3 class="live-section__title">Nearby Aircraft</h3>
                  <p class="nearby-count">
                    {{ nearbyCount }} within {{ live.radiusNm }} NM
                    <span v-if="live.provider"> · {{ live.provider }}</span>
                  </p>
                </div>
                <button
                  type="button"
                  class="live-action live-action--compact"
                  :disabled="!live.position || live.nearbyStatus === 'loading'"
                  @click="live.searchNearby()"
                >
                  <RefreshCw
                    :size="14"
                    :class="{ 'is-spinning': live.nearbyStatus === 'loading' }"
                    aria-hidden="true"
                  />
                  Refresh
                </button>
              </div>

              <p v-if="live.nearbyError" class="live-error">{{ live.nearbyError }}</p>

              <div v-if="live.nearbyStatus === 'loading' && !nearbyCount" class="live-empty">
                <RefreshCw :size="20" class="is-spinning" aria-hidden="true" />
                <span>Scanning for ADS-B targets…</span>
              </div>

              <div v-else-if="!live.position" class="live-empty">
                <LocateFixed :size="22" aria-hidden="true" />
                <span>Choose a receive location to search for aircraft.</span>
              </div>

              <div v-else-if="nearbyCount === 0" class="live-empty">
                <RadioTower :size="22" aria-hidden="true" />
                <span>No aircraft reported nearby. Try a larger radius.</span>
              </div>

              <div v-else class="aircraft-list">
                <button
                  v-for="aircraft in live.nearby"
                  :key="aircraft.icao24"
                  type="button"
                  class="aircraft-row"
                  :class="{ 'aircraft-row--selected': aircraft.icao24 === selectedIcao }"
                  @click="handleSelect(aircraft)"
                >
                  <span class="aircraft-row__main">
                    <span class="aircraft-row__call">
                      {{ aircraftName(aircraft) }}
                      <span
                        v-if="aircraft.icao24 === selectedIcao"
                        class="aircraft-row__tracking"
                      >
                        TRACKING
                      </span>
                    </span>
                    <span class="aircraft-row__details">{{ aircraftDetails(aircraft) }}</span>
                  </span>
                  <span class="aircraft-row__metrics">
                    <span class="aircraft-metric">
                      {{ distanceText(aircraft) }}{{ bearingText(aircraft) }}
                    </span>
                    <span class="aircraft-metric">{{ altitudeText(aircraft) }}</span>
                    <span class="aircraft-metric">{{ speedText(aircraft) }}</span>
                    <span class="aircraft-metric aircraft-metric--muted">
                      {{ verticalRateText(aircraft) }} · {{ dataAgeText(aircraft) }}
                    </span>
                  </span>
                </button>
              </div>

              <p class="live-attribution">
                {{ live.attribution || 'Community ADS-B data' }}. Coverage and field
                availability vary by aircraft and receiver.
              </p>
            </section>

            <p class="live-disclaimer">
              Live values are informational and may be delayed or incomplete. Attitude is
              estimated from flight path and is not actual aircraft attitude. Indicated
              airspeed is used only when broadcast; slip/skid is unavailable. Never use for
              navigation or flight.
            </p>
          </div>

          <footer class="live-panel__footer">
            <button
              v-if="hasSelection"
              type="button"
              class="live-action live-action--danger"
              @click="live.stopTracking()"
            >
              Return to simulation
            </button>
            <button
              type="button"
              class="live-action live-action--primary"
              @click="close"
            >
              Done
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as *;

.live-overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  padding: 20px;
  overflow-y: auto;
  background: rgba(1, 5, 10, 0.76);
  backdrop-filter: blur(8px);
  place-items: center;
}

.live-panel {
  @include panel-surface;
  display: flex;
  flex-direction: column;
  width: min(700px, 100%);
  max-height: min(90svh, 860px);
  overflow: hidden;
  border-radius: 20px;
}

.live-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line-soft);
}

.live-panel__title-group {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.live-panel__icon {
  display: grid;
  flex: none;
  width: 38px;
  height: 38px;
  color: var(--cyan);
  border: 1px solid rgba(60, 232, 255, 0.25);
  border-radius: 10px;
  background: rgba(60, 232, 255, 0.06);
  place-items: center;
}

.live-panel__eyebrow {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.16em;
}

.live-panel__title {
  margin-top: 2px;
  color: var(--white);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.live-close {
  display: inline-grid;
  flex: none;
  width: 38px;
  height: 38px;
  padding: 0;
  color: var(--muted);
  border: 1px solid rgba(141, 188, 216, 0.14);
  border-radius: 9px;
  background: rgba(5, 14, 24, 0.7);
  place-items: center;
  transition:
    color 150ms ease,
    border-color 150ms ease;

  &:hover {
    color: var(--red);
    border-color: rgba(255, 93, 108, 0.32);
  }

  @include focus-visible;
}

.live-panel__scroll {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 18px 20px;
  overflow-y: auto;
  scrollbar-color: rgba(60, 232, 255, 0.22) transparent;
  scrollbar-width: thin;
}

.live-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.live-section__title {
  color: var(--cyan-soft);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.location-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px;
  border: 1px solid rgba(141, 188, 216, 0.1);
  border-radius: 8px;
  background: rgba(3, 10, 18, 0.5);
}

.location-bar__text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coordinate-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr auto;
  align-items: end;
  gap: 8px;
}

.coordinate-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  > span {
    color: var(--muted-2);
    font-family: var(--font-mono);
    font-size: 7px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
}

.coordinate-input {
  width: 100%;
  height: 36px;
  padding: 0 9px;
  color: var(--cyan-soft);
  font-family: var(--font-mono);
  font-size: 11px;
  border: 1px solid rgba(60, 232, 255, 0.18);
  border-radius: 7px;
  background: rgba(2, 9, 16, 0.85);
  outline: none;

  &:focus {
    border-color: rgba(60, 232, 255, 0.56);
    box-shadow: 0 0 0 2px rgba(60, 232, 255, 0.08);
  }
}

.coordinate-apply {
  height: 36px;
}

.live-action {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 13px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border: 1px solid rgba(141, 188, 216, 0.14);
  border-radius: 8px;
  background: rgba(8, 20, 33, 0.72);
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background 150ms ease;

  &:hover:not(:disabled) {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.3);
    background: rgba(15, 36, 54, 0.82);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &--compact {
    min-height: 30px;
    padding: 0 10px;
    font-size: 7px;
  }

  &--primary {
    color: #031017;
    border-color: rgba(60, 232, 255, 0.6);
    background: var(--cyan);

    &:hover:not(:disabled) {
      color: #031017;
      background: var(--cyan-soft);
    }
  }

  &--danger {
    color: var(--amber);
    border-color: rgba(255, 194, 71, 0.22);

    &:hover:not(:disabled) {
      color: var(--amber);
      border-color: rgba(255, 194, 71, 0.42);
      background: rgba(255, 194, 71, 0.06);
    }
  }

  @include focus-visible;
}

.nearby-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.nearby-count {
  margin-top: 2px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.04em;
}

.live-error {
  padding: 8px 10px;
  color: rgba(255, 93, 108, 0.9);
  font-family: var(--font-mono);
  font-size: 8px;
  line-height: 1.5;
  border: 1px solid rgba(255, 93, 108, 0.18);
  border-radius: 7px;
  background: rgba(255, 93, 108, 0.045);
}

.live-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 150px;
  padding: 20px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
  text-align: center;
  border: 1px dashed rgba(141, 188, 216, 0.14);
  border-radius: 10px;
  background: rgba(3, 10, 18, 0.3);
}

.aircraft-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 360px;
  overflow-y: auto;
  scrollbar-color: rgba(60, 232, 255, 0.18) transparent;
  scrollbar-width: thin;
}

.aircraft-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 9px 11px;
  color: var(--white);
  text-align: left;
  border: 1px solid rgba(141, 188, 216, 0.1);
  border-radius: 8px;
  background: rgba(5, 14, 24, 0.58);
  transition:
    border-color 140ms ease,
    background 140ms ease,
    transform 140ms ease;

  &:hover {
    border-color: rgba(60, 232, 255, 0.3);
    background: rgba(15, 36, 54, 0.7);
  }

  &:active {
    transform: translateY(1px);
  }

  &--selected {
    border-color: rgba(60, 232, 255, 0.46);
    background: rgba(60, 232, 255, 0.07);
  }

  @include focus-visible;
}

.aircraft-row__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.aircraft-row__call {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  color: var(--white);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aircraft-row__tracking {
  flex: none;
  padding: 1px 5px;
  color: var(--cyan);
  font-size: 6px;
  letter-spacing: 0.08em;
  border: 1px solid rgba(60, 232, 255, 0.28);
  border-radius: 4px;
  background: rgba(60, 232, 255, 0.06);
}

.aircraft-row__details {
  overflow: hidden;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aircraft-row__metrics {
  display: grid;
  flex: none;
  grid-template-columns: repeat(2, minmax(78px, auto));
  gap: 2px 10px;
  color: var(--cyan-soft);
  font-family: var(--font-mono);
  font-size: 7.5px;
  text-align: right;
}

.aircraft-metric--muted {
  color: var(--muted-2);
}

.live-attribution {
  color: rgba(125, 149, 171, 0.6);
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.03em;
  line-height: 1.5;
}

.live-disclaimer {
  padding: 10px 11px;
  color: rgba(255, 194, 71, 0.72);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.04em;
  line-height: 1.55;
  border: 1px solid rgba(255, 194, 71, 0.16);
  border-radius: 7px;
  background: rgba(255, 194, 71, 0.035);
}

.live-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 13px 20px 16px;
  border-top: 1px solid var(--line-soft);
}

.is-spinning {
  animation: live-spin 1s linear infinite;
}

@keyframes live-spin {
  to {
    transform: rotate(360deg);
  }
}

.live-fade-enter-active,
.live-fade-leave-active {
  transition: opacity 180ms ease;
}

.live-fade-enter-active .live-panel,
.live-fade-leave-active .live-panel {
  transition: transform 180ms ease;
}

.live-fade-enter-from,
.live-fade-leave-to {
  opacity: 0;
}

.live-fade-enter-from .live-panel,
.live-fade-leave-to .live-panel {
  transform: translateY(8px) scale(0.985);
}

@media (max-width: 720px) {
  .live-overlay {
    padding: 0;
    place-items: end stretch;
  }

  .live-panel {
    width: 100%;
    max-height: 92svh;
    border-radius: 20px 20px 0 0;
  }

  .coordinate-grid {
    grid-template-columns: 1fr 1fr;
  }

  .coordinate-apply {
    grid-column: span 2;
  }
}

@media (max-width: 540px) {
  .live-panel__header {
    padding: 16px 16px 12px;
  }

  .live-panel__scroll {
    padding: 16px;
  }

  .live-panel__footer {
    padding: 12px 16px max(16px, env(safe-area-inset-bottom));
  }

  .live-panel__footer .live-action {
    flex: 1;
    min-height: 44px;
  }

  .location-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .aircraft-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }

  .aircraft-row__metrics {
    width: 100%;
    text-align: left;
  }
}
</style>
