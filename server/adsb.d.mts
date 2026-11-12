import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleAdsbRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean>

export function createAdsbMiddleware(): (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void
