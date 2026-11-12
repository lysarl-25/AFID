import { shortestAngleDiff } from './math'

export interface DeviceTilt { beta: number; gamma: number }

// Orientation events use the device's natural axes, even in landscape.
export function relativeDeviceAttitude(sample: DeviceTilt, neutral: DeviceTilt, angle: number) {
  const radians = angle * Math.PI / 180
  const beta = shortestAngleDiff(neutral.beta, sample.beta)
  const gamma = shortestAngleDiff(neutral.gamma, sample.gamma)
  return {
    pitch: beta * Math.cos(radians) + gamma * Math.sin(radians),
    roll: gamma * Math.cos(radians) - beta * Math.sin(radians),
  }
}
