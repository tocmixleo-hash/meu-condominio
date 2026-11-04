// Serviço de tempo real — Meu Condomínio
// WebSocket (socket.io) na porta 3003:
// - Moradores entram na sala do seu usuarioId ("entrar")
// - A API Next.js avisa novas encomendas via POST /notificar
// - Eventos: "encomenda" (nova na portaria) e "encomenda-retirada" (retirada confirmada)
//
// O socket.io usa path '/' (exigência do gateway Caddy) e por isso captura todas as
// requisições HTTP. Capturamos as rotas próprias (/notificar, /health) ANTES e
// repassamos todo o resto ao engine.io.

import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

function responderCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function rotaNotificar(req: IncomingMessage, res: ServerResponse) {
  let corpo = ''
  req.on('data', (c) => {
    corpo += c
    if (corpo.length > 1_000_000) req.destroy() // proteção simples
  })
  req.on('end', () => {
    try {
      const payload = JSON.parse(corpo) as {
        usuarioId?: string
        evento?: string
        dados?: unknown
      }
      if (!payload.usuarioId || !payload.evento) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, erro: 'usuarioId e evento obrigatórios' }))
        return
      }
      const sala = io.sockets.adapter.rooms.get(payload.usuarioId)
      io.to(payload.usuarioId).emit(payload.evento, payload.dados ?? null)
      console.log(
        `[encomenda-socket] evento=${payload.evento} sala=${payload.usuarioId} clientes=${sala?.size ?? 0}`,
      )
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, entregues: sala?.size ?? 0 }))
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, erro: 'JSON inválido' }))
    }
  })
}

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Reordena listeners: rotas HTTP próprias primeiro, engine.io depois.
const listenersEngine = httpServer.listeners('request')
httpServer.removeAllListeners('request')
httpServer.on('request', (req, res) => {
  responderCors(res)
  const url = req.url ?? ''

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && url === '/notificar') {
    rotaNotificar(req, res)
    return
  }

  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, servico: 'encomenda-socket', clientes: io.sockets.sockets.size }))
    return
  }

  // Demais requisições pertencem ao engine.io (handshake/transport do socket.io)
  for (const listener of listenersEngine) {
    listener.call(httpServer, req, res)
    break
  }
})

io.on('connection', (socket) => {
  console.log(`[encomenda-socket] conectado: ${socket.id}`)

  socket.on('entrar', (usuarioId: string) => {
    if (typeof usuarioId === 'string' && usuarioId.trim()) {
      void socket.join(usuarioId.trim())
      console.log(`[encomenda-socket] ${socket.id} entrou na sala ${usuarioId.trim()}`)
    }
  })

  socket.on('disconnect', () => {
    console.log(`[encomenda-socket] desconectado: ${socket.id}`)
  })

  socket.on('error', (erro) => {
    console.error(`[encomenda-socket] erro (${socket.id}):`, erro)
  })
})

const PORT = Number(process.env.PORT || 3003)
httpServer.listen(PORT, () => {
  console.log(`[encomenda-socket] servidor WebSocket na porta ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
