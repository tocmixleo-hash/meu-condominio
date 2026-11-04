'use client'

// Notificações em tempo real do módulo Encomendas.
// - Morador: entra na sala do seu usuarioId e recebe avisos de encomendas
//   recebidas na portaria e de retiradas confirmadas.
// - Administrador/portaria: entra na sala do condomínio e recebe sinal para
//   recarregar a lista quando outra tela registra movimento.
// Fallback resiliente: se o serviço WebSocket estiver offline, as listas
// continuam atualizando por polling periódico.

import { useCallback, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import type { EncomendaItem, SessaoUsuario } from '@/lib/portal/types'

interface AvisoSocket {
  tipo: string
  encomenda?: EncomendaItem
}

export function useAvisosEncomendas(usuario: SessaoUsuario | null) {
  const [encomendasPendentes, setEncomendasPendentes] = useState<EncomendaItem[]>([])
  const [versao, setVersao] = useState(0) // incrementa a cada evento — módulos recarregam
  const [conectado, setConectado] = useState(false)

  const carregarPendentes = useCallback(async () => {
    if (!usuario) return
    try {
      const r = await fetch(`/api/encomendas?userId=${usuario.id}`)
      if (!r.ok) return
      const dados: EncomendaItem[] = await r.json()
      if (Array.isArray(dados)) {
        setEncomendasPendentes(dados.filter((e) => e.status === 'RECEBIDA'))
      }
    } catch {
      // silencioso — o polling tentará de novo
    }
  }, [usuario])

  // Carga inicial + polling de segurança a cada 25s
  useEffect(() => {
    if (!usuario) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarPendentes()
    const t = setInterval(() => void carregarPendentes(), 25000)
    return () => clearInterval(t)
  }, [usuario, carregarPendentes])

  // Conexão WebSocket (gateway: /?XTransformPort=3003, path '/')
  useEffect(() => {
    if (!usuario) return

    const ehAdmin = usuario.perfil === 'ADMIN'
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    })

    socket.on('connect', () => {
      setConectado(true)
      socket.emit('entrar', ehAdmin ? `cond:${usuario.condominioId}` : usuario.id)
    })
    socket.on('disconnect', () => setConectado(false))
    socket.on('connect_error', () => setConectado(false))

    // ---- Morador: nova encomenda na portaria ----
    socket.on('encomenda', (aviso: AvisoSocket) => {
      if (aviso?.tipo !== 'nova' || !aviso.encomenda) return
      setVersao((v) => v + 1)
      setEncomendasPendentes((atual) =>
        atual.some((e) => e.id === aviso.encomenda!.id) ? atual : [aviso.encomenda!, ...atual],
      )
      const detalhe = [
        aviso.encomenda.descricao,
        aviso.encomenda.origem,
        aviso.encomenda.unidadeLabel,
      ]
        .filter(Boolean)
        .join(' · ')
      toast('Encomenda recebida na portaria', {
        description: `${detalhe} — abra o módulo para gerar o QR de retirada.`,
        duration: 6000,
      })
    })

    // ---- Morador: retirada confirmada pela portaria ----
    socket.on('encomenda-retirada', (aviso: AvisoSocket) => {
      if (aviso?.tipo !== 'retirada' || !aviso.encomenda) return
      setVersao((v) => v + 1)
      setEncomendasPendentes((atual) => atual.filter((e) => e.id !== aviso.encomenda!.id))
      toast('Retirada confirmada', {
        description: `${aviso.encomenda.descricao} — retirada por ${aviso.encomenda.retiradaPor ?? 'morador'}.`,
        duration: 5000,
      })
    })

    // ---- Morador: portaria deu baixa / cancelou uma autorização de entrega ----
    socket.on('autorizacao', (aviso: { tipo?: string; nomeAutorizado?: string }) => {
      if (aviso?.tipo === 'utilizada') {
        toast('Autorização utilizada', {
          description: `A entrega para ${aviso.nomeAutorizado ?? 'a pessoa autorizada'} foi liberada pela portaria.`,
          duration: 5000,
        })
      } else if (aviso?.tipo === 'cancelada') {
        toast('Autorização cancelada pela portaria', {
          description: `A liberação de ${aviso.nomeAutorizado ?? 'a pessoa autorizada'} foi encerrada.`,
          duration: 5000,
        })
      }
      setVersao((v) => v + 1)
    })

    // ---- Portaria/administração: lista mudou ----
    socket.on('portaria-atualizou', () => {
      setVersao((v) => v + 1)
    })

    return () => {
      socket.disconnect()
      setConectado(false)
    }
  }, [usuario])

  return { encomendasPendentes, carregarPendentes, versao, conectado }
}
