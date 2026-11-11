import type { TapeTick } from '@/types/flight'

export interface Point {
  x: number
  y: number
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
): Point {
  const radians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  }
}

export function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(centerX, centerY, radius, startAngle)
  const end = polarToCartesian(centerX, centerY, radius, endAngle)
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  const sweepFlag = endAngle >= startAngle ? 1 : 0

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`
}

export function buildTapeTicks(
  min: number,
  max: number,
  step: number,
  labelStep: number,
  centerY: number,
  scale: number,
): TapeTick[] {
  const ticks: TapeTick[] = []
  const first = Math.ceil(min / step) * step

  for (let value = first; value <= max + step / 1000; value += step) {
    const rounded = Number(value.toFixed(4))
    ticks.push({
      value: rounded,
      major: Math.abs(rounded % labelStep) < step / 1000,
      y: centerY - rounded * scale,
    })
  }

  return ticks
}
