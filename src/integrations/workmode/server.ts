import { createServer, type Server } from 'node:http'
import { mapWorkEvent } from './event-mapper'
import type { WorkEventPayload } from './types'

export async function startWorkModeServer(
  onEvent: (event: WorkEventPayload) => void,
  onStateRequest: () => unknown
): Promise<{ server: Server; port: number }> {
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/state') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify(onStateRequest()))
      return
    }

    if (request.method === 'POST' && request.url === '/state') {
      let body = ''

      request.on('data', (chunk) => {
        body += chunk.toString()
      })

      request.on('end', () => {
        try {
          const parsed = JSON.parse(body) as WorkEventPayload
          onEvent(mapWorkEvent(parsed))
          response.writeHead(200, { 'content-type': 'application/json' })
          response.end(JSON.stringify({ ok: true }))
        } catch {
          response.writeHead(400, { 'content-type': 'application/json' })
          response.end(JSON.stringify({ ok: false }))
        }
      })

      return
    }

    response.writeHead(404)
    response.end()
  })

  const port = await bindServer(server)
  return { server, port }
}

async function bindServer(server: Server): Promise<number> {
  for (const port of [23333, 23334, 23335, 23336, 23337]) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => {
          server.removeListener('error', reject)
          resolve()
        })
      })
      return port
    } catch {
      continue
    }
  }

  throw new Error('No available port for work mode server')
}
