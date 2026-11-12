<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RotateCcw, X } from '@lucide/vue'
import { AIRCRAFT_PROFILE_LIST } from '@/data/aircraftProfiles'
import { useFlightStore } from '@/stores/flightStore'
import type { AircraftProfileId } from '@/types/flight'
import { formatNumber } from '@/utils/format'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const store = useFlightStore()
const isLive = computed(() => store.mode === 'live')
const closeButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
let previousBodyOverflow = ''
let previouslyFocused: HTMLElement | null = null

const thresholds = computed(() => {
  const profile = store.profile
  const airspeed = profile.airspeed.bands
  const vsi = profile.verticalSpeed.bands

  return [
    {
      tone: 'white',
      label: 'Airspeed white',
      value: `${formatNumber(airspeed.white[0])}–${formatNumber(airspeed.white[1])} KTS`,
    },
    {
      tone: 'green',
      label: 'Airspeed normal',
      value: `${formatNumber(airspeed.green[0])}–${formatNumber(airspeed.green[1])} KTS`,
    },
    {
      tone: 'amber',
      label: 'Airspeed caution',
      value: `${formatNumber(airspeed.amber[0])}–${formatNumber(airspeed.amber[1])} KTS`,
    },
    {
      tone: 'red',
      label: 'Airspeed redline',
      value: `${formatNumber(airspeed.redline)} KTS`,
    },
    {
      tone: 'green',
      label: 'VSI safe range',
      value: `±${formatNumber(vsi.safe)} FT/MIN`,
    },
    {
      tone: 'amber',
      label: 'VSI caution',
      value: `±${formatNumber(vsi.caution)} FT/MIN`,
    },
    {
      tone: 'red',
      label: 'VSI limit',
      value: `±${formatNumber(vsi.limit)} FT/MIN`,
    },
    {
      tone: 'cyan',
      label: 'Attitude limits',
      value: `PITCH ±${profile.pitch.max}° / ROLL ±${profile.roll.max}°`,
    },
  ]
})

function close(): void {
  emit('update:open', false)
}

function handleProfileChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as AircraftProfileId
  store.setProfile(value)
}

function handleBaroChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const value = Number.parseFloat(input.value)
  if (Number.isFinite(value)) {
    store.setBaro(value)
  } else {
    input.value = store.baro.toFixed(2)
  }
}

function handleTurbulenceChange(event: Event): void {
  store.turbulence = (event.target as HTMLInputElement).checked
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
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
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

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="settings-fade">
      <div
        v-if="open"
        class="settings-overlay"
        @mousedown.self="close"
      >
        <section
          ref="panel"
          class="settings-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <header class="settings-panel__header">
            <div>
              <span class="settings-panel__eyebrow">SIMULATOR CONFIG</span>
              <h2 id="settings-title" class="settings-panel__title">Settings</h2>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="settings-close"
              aria-label="Close settings"
              @click="close"
            >
              <X :size="18" />
            </button>
          </header>

          <div class="settings-panel__scroll">
            <section class="settings-section">
              <h3 class="settings-section__title">Aircraft Profile</h3>
              <label class="settings-label" for="aircraft-profile">
                Selected aircraft
              </label>
              <select
                id="aircraft-profile"
                class="settings-select"
                :value="store.activeProfileId"
                :disabled="isLive"
                @change="handleProfileChange"
              >
                <option
                  v-for="profile in AIRCRAFT_PROFILE_LIST"
                  :key="profile.id"
                  :value="profile.id"
                >
                  {{ profile.name }}
                </option>
              </select>
              <p class="settings-note">{{ store.profile.description }}</p>
            </section>

            <section class="settings-section">
              <h3 class="settings-section__title">Instrument Options</h3>

              <div class="settings-field">
                <div>
                  <label class="settings-label" for="baro-setting">
                    Barometric pressure
                  </label>
                  <p class="settings-field__hint">Inches of mercury (inHg)</p>
                </div>
                <div class="settings-field__control">
                  <input
                    id="baro-setting"
                    class="settings-number"
                    type="number"
                    inputmode="decimal"
                    min="28"
                    max="31"
                    step="0.01"
                    :value="store.baro.toFixed(2)"
                    :disabled="isLive"
                    @change="handleBaroChange"
                  />
                  <span class="settings-field__unit">IN</span>
                </div>
              </div>

              <label class="settings-toggle">
                <span>
                  <span class="settings-label">Ambient turbulence</span>
                  <span class="settings-field__hint">
                    Adds subtle simulated airframe motion
                  </span>
                </span>
                <span class="toggle-track">
                  <input
                    type="checkbox"
                    class="toggle-input"
                    :checked="store.turbulence"
                    :disabled="isLive"
                    @change="handleTurbulenceChange"
                  />
                  <span class="toggle-thumb" aria-hidden="true" />
                </span>
              </label>
            </section>

            <section v-if="!isLive" class="settings-section">
              <h3 class="settings-section__title">Configured Thresholds</h3>
              <div class="threshold-grid">
                <div
                  v-for="threshold in thresholds"
                  :key="threshold.label"
                  class="threshold-row"
                >
                  <span
                    class="threshold-dot"
                    :class="`threshold-dot--${threshold.tone}`"
                    aria-hidden="true"
                  />
                  <span class="threshold-row__label">{{ threshold.label }}</span>
                  <strong class="threshold-row__value">
                    {{ threshold.value }}
                  </strong>
                </div>
              </div>
            </section>

            <p v-else class="settings-note">
              Live ADS-B mode uses generic display scales. Aircraft-specific warning
              thresholds are unavailable, so profile and barometric inputs are disabled.
            </p>

            <p class="settings-disclaimer">
              <template v-if="isLive">
                Live attitude is estimated from flight path and is not a real attitude
                source. IAS, pitch, and slip/skid may be unavailable.
              </template>
              <template v-else>
                Ranges and warning thresholds change with the selected aircraft
                profile. This simulator is for education and demonstration only.
              </template>
            </p>
          </div>

          <footer class="settings-panel__footer">
            <button
              type="button"
              class="settings-action"
              :disabled="isLive"
              @click="store.reset()"
            >
              <RotateCcw :size="15" aria-hidden="true" />
              Reset Flight Data
            </button>
            <button
              type="button"
              class="settings-action settings-action--primary"
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

.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  padding: 20px;
  overflow-y: auto;
  background: rgba(1, 5, 10, 0.72);
  backdrop-filter: blur(8px);
  place-items: center;
}

.settings-panel {
  @include panel-surface;
  display: flex;
  flex-direction: column;
  width: min(580px, 100%);
  max-height: min(88svh, 800px);
  overflow: hidden;
  border-radius: 20px;
}

.settings-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line-soft);
}

.settings-panel__eyebrow {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.18em;
}

.settings-panel__title {
  margin-top: 2px;
  color: var(--white);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.settings-close {
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
}

.settings-panel__scroll {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 18px 20px;
  overflow-y: auto;
  scrollbar-color: rgba(60, 232, 255, 0.22) transparent;
  scrollbar-width: thin;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-section__title {
  color: var(--cyan-soft);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.settings-label {
  color: var(--white);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.settings-note {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}

.settings-select,
.settings-number {
  color: var(--cyan-soft);
  font-family: var(--font-mono);
  font-size: 12px;
  border: 1px solid rgba(60, 232, 255, 0.2);
  border-radius: 7px;
  background: rgba(2, 9, 16, 0.85);
}

.settings-select {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:focus {
    border-color: rgba(60, 232, 255, 0.6);
    outline: none;
    box-shadow: 0 0 0 2px rgba(60, 232, 255, 0.1);
  }
}

.settings-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(141, 188, 216, 0.08);
}

.settings-field__hint {
  display: block;
  margin-top: 2px;
  color: var(--muted-2);
  font-size: 10px;
}

.settings-field__control {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
}

.settings-number {
  width: 82px;
  height: 36px;
  padding: 0 8px;
  text-align: right;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:focus {
    border-color: rgba(60, 232, 255, 0.6);
    outline: none;
    box-shadow: 0 0 0 2px rgba(60, 232, 255, 0.1);
  }
}

.settings-field__unit {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 8px;
}

.settings-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0 2px;
  cursor: pointer;
}

.toggle-track {
  position: relative;
  flex: none;
  width: 44px;
  height: 24px;
  border: 1px solid rgba(141, 188, 216, 0.18);
  border-radius: 999px;
  background: rgba(6, 17, 28, 0.9);
  transition:
    border-color 160ms ease,
    background 160ms ease;
}

.toggle-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;

  &:checked + .toggle-thumb {
    transform: translateX(20px);
    background: var(--cyan);
    box-shadow: 0 0 10px rgba(60, 232, 255, 0.55);
  }

  &:checked ~ .toggle-thumb {
    background: var(--cyan);
  }

  &:focus-visible + .toggle-thumb {
    box-shadow: var(--focus-ring);
  }
}

.toggle-input:checked + .toggle-thumb {
  background: var(--cyan);
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #62788a;
  transition:
    transform 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.threshold-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 18px;
}

.threshold-row {
  display: grid;
  grid-template-columns: 7px minmax(70px, 1fr) auto;
  align-items: center;
  gap: 7px;
  min-height: 25px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(141, 188, 216, 0.06);
}

.threshold-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;

  &--white {
    background: #dceeff;
  }

  &--green {
    background: var(--green);
    box-shadow: 0 0 6px rgba(61, 245, 154, 0.4);
  }

  &--amber {
    background: var(--amber);
    box-shadow: 0 0 6px rgba(255, 194, 71, 0.35);
  }

  &--red {
    background: var(--red);
    box-shadow: 0 0 6px rgba(255, 93, 108, 0.35);
  }

  &--cyan {
    background: var(--cyan);
    box-shadow: 0 0 6px rgba(60, 232, 255, 0.35);
  }
}

.threshold-row__label {
  color: var(--muted);
  font-size: 9px;
}

.threshold-row__value {
  color: var(--white);
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 500;
  text-align: right;
}

.settings-disclaimer {
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

.settings-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 13px 20px 16px;
  border-top: 1px solid var(--line-soft);
}

.settings-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
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
    border-color 150ms ease;

  &:hover:not(:disabled) {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.3);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &--primary {
    color: #031017;
    border-color: rgba(60, 232, 255, 0.6);
    background: var(--cyan);

    &:hover {
      color: #031017;
      background: var(--cyan-soft);
    }
  }
}

.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: opacity 180ms ease;
}

.settings-fade-enter-active .settings-panel,
.settings-fade-leave-active .settings-panel {
  transition: transform 180ms ease;
}

.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
}

.settings-fade-enter-from .settings-panel,
.settings-fade-leave-to .settings-panel {
  transform: translateY(8px) scale(0.985);
}

@media (max-width: 640px) {
  .settings-overlay {
    padding: 0;
    place-items: end stretch;
  }

  .settings-panel {
    width: 100%;
    max-height: 92svh;
    border-radius: 20px 20px 0 0;
  }

  .threshold-grid {
    grid-template-columns: 1fr;
  }

  .settings-panel__footer {
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }

  .settings-action {
    flex: 1;
    min-height: 44px;
  }
}
</style>
