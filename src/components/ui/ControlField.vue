<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import type { ControlDefinition } from '@/types/flight'
import { normalizeHeading } from '@/utils/math'

const props = defineProps<{
  control: ControlDefinition
  modelValue: number
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const inputId = computed(() => `control-${props.control.key}`)

const inputValue = computed(() => {
  if (props.control.key === 'heading') {
    return Math.round(normalizeHeading(props.modelValue)) % 360
  }
  return Number(props.modelValue.toFixed(props.control.decimals))
})

function emitValue(value: number): void {
  emit('update:modelValue', value)
}

function handleRange(event: Event): void {
  emitValue(Number((event.target as HTMLInputElement).value))
}

function handleNumber(event: Event): void {
  const input = event.target as HTMLInputElement
  const value = Number.parseFloat(input.value)
  if (Number.isFinite(value)) {
    emitValue(value)
  } else {
    input.value = String(inputValue.value)
  }
}

function nudge(direction: number): void {
  const next = Number(
    (props.modelValue + props.control.step * direction).toFixed(
      props.control.decimals,
    ),
  )
  emitValue(next)
}
</script>

<template>
  <div class="control-field">
    <div class="control-field__top">
      <label class="control-field__label" :for="inputId">
        {{ control.label }}
      </label>

      <div class="control-field__value-group">
        <input
          :id="inputId"
          class="control-field__number"
          type="number"
          inputmode="decimal"
          :min="control.min"
          :max="control.max"
          :step="control.step"
          :value="inputValue"
          :aria-label="`${control.label} in ${control.unit}`"
          @change="handleNumber"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <span class="control-field__unit">{{ control.unit }}</span>
      </div>
    </div>

    <div class="control-field__slider-row">
      <button
        type="button"
        class="control-field__step"
        :aria-label="`Decrease ${control.label}`"
        @click="nudge(-1)"
      >
        <Minus :size="14" :stroke-width="2.4" />
      </button>

      <input
        class="control-field__range"
        type="range"
        :min="control.min"
        :max="control.max"
        :step="control.step"
        :value="modelValue"
        :aria-label="`${control.label} slider`"
        @input="handleRange"
      />

      <button
        type="button"
        class="control-field__step"
        :aria-label="`Increase ${control.label}`"
        @click="nudge(1)"
      >
        <Plus :size="14" :stroke-width="2.4" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as *;

.control-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 9px 10px 8px;
  border: 1px solid rgba(141, 188, 216, 0.09);
  border-radius: 10px;
  background: rgba(4, 11, 20, 0.46);
}

.control-field__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.control-field__label {
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.control-field__value-group {
  display: flex;
  flex: none;
  align-items: center;
  gap: 5px;
}

.control-field__number {
  width: 74px;
  padding: 3px 6px;
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  border: 1px solid rgba(60, 232, 255, 0.18);
  border-radius: 5px;
  background: rgba(2, 9, 16, 0.8);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &:focus {
    border-color: rgba(60, 232, 255, 0.65);
    outline: none;
    box-shadow: 0 0 0 2px rgba(60, 232, 255, 0.11);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    margin: 0;
    opacity: 0.42;
    appearance: none;
  }

  appearance: textfield;
  -moz-appearance: textfield;
}

.control-field__unit {
  min-width: 28px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.05em;
}

.control-field__slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-field__step {
  display: inline-grid;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--muted);
  border: 1px solid rgba(141, 188, 216, 0.12);
  border-radius: 6px;
  background: rgba(12, 27, 43, 0.8);
  place-items: center;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background 150ms ease;

  &:hover {
    color: var(--cyan);
    border-color: rgba(60, 232, 255, 0.35);
    background: rgba(17, 42, 62, 0.9);
  }

  &:active {
    transform: translateY(1px);
  }
}

.control-field__range {
  width: 100%;
  height: 20px;
  margin: 0;
  cursor: pointer;
  background: transparent;
  appearance: none;

  &::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 999px;
    background:
      linear-gradient(90deg, rgba(60, 232, 255, 0.4), rgba(60, 232, 255, 0.12)),
      rgba(60, 232, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(60, 232, 255, 0.1);
  }

  &::-webkit-slider-thumb {
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border: 2px solid #07131f;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 9px rgba(60, 232, 255, 0.55);
    appearance: none;
    transition: transform 120ms ease;
  }

  &:active::-webkit-slider-thumb {
    transform: scale(1.18);
  }

  &::-moz-range-track {
    height: 4px;
    border-radius: 999px;
    background: rgba(60, 232, 255, 0.17);
  }

  &::-moz-range-progress {
    height: 4px;
    border-radius: 999px;
    background: rgba(60, 232, 255, 0.42);
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 2px solid #07131f;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 9px rgba(60, 232, 255, 0.55);
  }

  @include focus-visible;
}

@media (max-width: 580px) {
  .control-field {
    padding: 10px;
  }

  .control-field__step {
    width: 42px;
    height: 42px;
  }

  .control-field__number {
    width: 82px;
    min-height: 40px;
    padding: 5px 7px;
    font-size: 13px;
  }

  .control-field__range {
    height: 30px;
  }

  .control-field__range::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
    margin-top: -7px;
  }
}
</style>
