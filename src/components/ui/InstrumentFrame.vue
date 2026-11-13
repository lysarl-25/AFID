<script setup lang="ts">
import { useFlightStore } from '@/stores/flightStore'
import { useAttitudeControlStore } from '@/stores/attitudeControlStore'

const store = useFlightStore()
const attitude = useAttitudeControlStore()

withDefaults(
  defineProps<{
    title: string
    code: string
    unit: string
    label: string
  }>(),
  {},
)
</script>

<template>
  <section class="instrument" role="img" :aria-label="label">
    <span class="instrument__corner instrument__corner--tl" aria-hidden="true" />
    <span class="instrument__corner instrument__corner--tr" aria-hidden="true" />
    <span class="instrument__corner instrument__corner--bl" aria-hidden="true" />
    <span class="instrument__corner instrument__corner--br" aria-hidden="true" />

    <header class="instrument__header">
      <div class="instrument__identity">
        <span class="instrument__code">{{ code }}</span>
        <h2 class="instrument__title">{{ title }}</h2>
      </div>
      <span class="instrument__unit">{{ unit }}</span>
    </header>

    <div class="instrument__body">
      <slot />
    </div>

    <span
      class="instrument__sim"
      :class="{ 'instrument__sim--live': store.mode === 'live' }"
      aria-hidden="true"
    >
      {{ code === 'ATT' && attitude.active ? attitude.modeLabel : store.mode === 'live' ? 'LIVE' : 'SIM' }}
    </span>
  </section>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as *;

.instrument {
  @include panel-surface;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 12px 12px;
  overflow: hidden;
  border-radius: var(--radius-lg);

  &::before {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    content: '';
    background:
      radial-gradient(
        120% 80% at 50% -20%,
        rgba(60, 232, 255, 0.08),
        transparent 58%
      ),
      linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 30%);
  }
}

.instrument__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 24px;
  padding: 0 2px 7px;
  border-bottom: 1px solid var(--line-soft);
}

.instrument__identity {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.instrument__code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 17px;
  padding: 0 5px;
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  border: 1px solid rgba(60, 232, 255, 0.24);
  border-radius: 4px;
  background: rgba(60, 232, 255, 0.06);
}

.instrument__title {
  overflow: hidden;
  color: rgba(233, 245, 255, 0.84);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.instrument__unit {
  flex: none;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.instrument__body {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  aspect-ratio: 1.14 / 1;
  padding-top: 6px;

  :deep(svg) {
    position: absolute;
    inset: 6px 0 0;
    width: 100%;
    height: calc(100% - 6px);
    overflow: hidden;
  }
}

.instrument__sim {
  position: absolute;
  right: 14px;
  bottom: 8px;
  z-index: 2;
  color: rgba(255, 194, 71, 0.32);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.1em;
  pointer-events: none;

  &--live {
    color: rgba(60, 232, 255, 0.52);
  }
}

.instrument__corner {
  position: absolute;
  z-index: 2;
  width: 13px;
  height: 13px;
  pointer-events: none;
  opacity: 0.55;

  &--tl {
    top: 7px;
    left: 7px;
    border-top: 1px solid var(--line-strong);
    border-left: 1px solid var(--line-strong);
    border-top-left-radius: 4px;
  }

  &--tr {
    top: 7px;
    right: 7px;
    border-top: 1px solid var(--line-strong);
    border-right: 1px solid var(--line-strong);
    border-top-right-radius: 4px;
  }

  &--bl {
    bottom: 7px;
    left: 7px;
    border-bottom: 1px solid var(--line);
    border-left: 1px solid var(--line);
    border-bottom-left-radius: 4px;
  }

  &--br {
    right: 7px;
    bottom: 7px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    border-bottom-right-radius: 4px;
  }
}

@media (max-width: 580px) {
  .instrument {
    padding: 9px 10px 10px;
    border-radius: 15px;
  }

  .instrument__title {
    font-size: 9px;
    letter-spacing: 0.11em;
  }
}
</style>
