import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAdsbRequest } from './adsb.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distDir = resolve(projectRoot, 'dist')
const port = Number(process.env.PORT) || 8787

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/' || pathname === '') pathname = '/index.html'

  const filePath = resolve(distDir, `.${pathname}`)
  const insideDist = filePath === distDir || filePath.startsWith(`${distDir}${sep}`)

  if (!insideDist) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('Not a file')
    const body = await readFile(filePath)
    res.statusCode = 200
    res.setHeader('content-type', MIME_TYPES[extname(filePath)] ?? 'application/octet-stream')
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch {
    if (extname(pathname)) {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    try {
      const body = await readFile(resolve(distDir, 'index.html'))
      res.statusCode = 200
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch {
      res.statusCode = 404
      res.end('Build output not found. Run "npm run build" first.')
    }
  }
}

const server = createServer(async (req, res) => {
  try {
    if (await handleAdsbRequest(req, res)) return
    await serveStatic(req, res)
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(error instanceof Error ? error.message : 'Internal server error')
    } else if (!res.writableEnded) {
      res.end()
    }
  }
})

server.listen(port, () => {
  console.log(`AFID server listening on http://localhost:${port}`)
})
