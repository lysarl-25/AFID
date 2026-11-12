<script setup lang="ts">
import { computed } from 'vue'
import { useAttitudeControlStore, type AttitudeControlMode } from '@/stores/attitudeControlStore'
import { useFlightStore } from '@/stores/flightStore'
import { useAttitudeControls } from '@/composables/useAttitudeControls'

const attitude = useAttitudeControlStore()
const flight = useFlightStore()
const { selectMode } = useAttitudeControls()
const modes: { id: AttitudeControlMode; label: string }[] = [
  { id: 'simulation', label: 'SIMULATION' },
  { id: 'device', label: 'DEVICE MOTION' },
  { id: 'keyboard', label: 'KEYBOARD' },
]
const pitch = computed(() => attitude.active ? attitude.display.pitch : flight.display.pitch)
const roll = computed(() => attitude.active ? attitude.display.roll : flight.display.roll)

function configure(setting: 'sensitivity' | 'pitchLimit' | 'rollLimit', event: Event) {
  attitude.configure(setting, Number((event.target as HTMLInputElement).value))
}

function chooseMode(next: AttitudeControlMode) {
  const disableDevice = next === 'device' && attitude.mode === 'device' &&
    ['permission', 'waiting', 'connected'].includes(attitude.sensorStatus)
  void selectMode(disableDevice ? 'simulation' : next)
}
</script>

<template>
  <section class="attitude-controls" aria-label="Attitude control mode">
    <div class="mode-heading">
      <h3>Attitude control</h3>
      <span>{{ attitude.modeLabel }}</span>
    </div>
    <div class="mode-buttons" role="group" aria-label="Choose attitude input">
      <button v-for="mode in modes" :key="mode.id" type="button"
        :aria-pressed="attitude.mode === mode.id" @click="chooseMode(mode.id)">
        {{ mode.label }}
      </button>
    </div>
    <div class="angles">
      <span>Pitch <output>{{ pitch.toFixed(1) }}°</output></span>
      <span>Roll <output>{{ roll.toFixed(1) }}°</output></span>
    </div>
    <p class="sensor-status" role="status">Sensor: {{ attitude.sensorStatus }}. {{ attitude.message }}</p>
    <template v-if="attitude.active">
      <label class="setting" for="attitude-sensitivity">
        Sensitivity <output>{{ attitude.sensitivity.toFixed(2) }}×</output>
        <input id="attitude-sensitivity" type="range" min="0.25" max="3" step="0.05"
          :value="attitude.sensitivity" @input="configure('sensitivity', $event)" />
      </label>
      <div class="limits">
        <label for="attitude-pitch-limit">Pitch limit ±°
          <input id="attitude-pitch-limit" type="number" min="5" max="45" step="1"
            :value="attitude.pitchLimit" @change="configure('pitchLimit', $event)" />
        </label>
        <label for="attitude-roll-limit">Roll limit ±°
          <input id="attitude-roll-limit" type="number" min="5" max="80" step="1"
            :value="attitude.rollLimit" @change="configure('rollLimit', $event)" />
        </label>
      </div>
      <div class="mode-buttons">
        <button type="button" :disabled="attitude.mode !== 'device' || attitude.sensorStatus !== 'connected'"
          @click="attitude.calibrate()">Calibrate</button>
        <button type="button" @click="attitude.reset()">Reset attitude</button>
      </div>
      <p v-if="attitude.mode === 'device'" class="hint">
        First reading sets level. Screen rotation recalibrates automatically.
        Reset levels the horizon at your current position. Escape exits.
      </p>
      <p v-else class="hint">← / → bank · ↑ / ↓ pitch · Space levels · Escape exits. Click the instrument if a form field has focus.</p>
    </template>
    <p v-if="flight.mode === 'live'" class="hint">Selecting DEVICE MOTION or KEYBOARD leaves live aircraft tracking.</p>
  </section>
</template>

<style scoped lang="scss">
.attitude-controls {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(60, 232, 255, 0.2);
  border-radius: 10px;
  background: rgba(2, 8, 15, 0.45);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
}
.mode-heading, .angles, .setting { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
h3 { margin: 0; color: var(--white); font-size: 11px; }
.mode-heading span, output { color: var(--cyan); }
.mode-buttons { display: flex; gap: 5px; flex-wrap: wrap; }
button {
  flex: 1; min-height: 36px; padding: 6px; border-radius: 6px;
  border: 1px solid rgba(60, 232, 255, 0.25); background: #081824;
  color: var(--cyan-soft); font: inherit; font-size: 9px; cursor: pointer;
}
button[aria-pressed='true'] { background: #124052; border-color: var(--cyan); color: white; }
button:disabled { opacity: 0.4; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
.sensor-status, .hint { margin: 0; line-height: 1.6; }
.sensor-status { color: var(--cyan-soft); }
.setting input { flex-basis: 100%; width: 100%; accent-color: var(--cyan); }
.limits { display: flex; gap: 12px; }
.limits label { display: grid; gap: 6px; flex: 1; min-width: 0; }
.limits input { width: 100%; box-sizing: border-box; border: 1px solid #244352; border-radius: 4px; padding: 6px; color: var(--cyan); background: #06111b; font: inherit; }
</style>
