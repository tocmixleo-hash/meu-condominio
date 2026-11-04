import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ehAdministracao } from '@/lib/portal/perfis'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId } = await req.json()

    const reserva = await db.reserva.findUnique({ where: { id } })
    if (!reserva) return NextResponse.json({ erro: 'Reserva não encontrada.' }, { status: 404 })

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })

    if (acao === 'APROVAR' || acao === 'REJEITAR') {
      if (!ehAdministracao(usuario.perfil)) {
        return NextResponse.json({ erro: 'Apenas a administração pode aprovar ou recusar reservas.' }, { status: 403 })
      }
      const novoStatus = acao === 'APROVAR' ? 'APROVADA' : 'REJEITADA'
      const atualizada = await db.reserva.update({ where: { id }, data: { status: novoStatus } })
      return NextResponse.json({ id: atualizada.id, status: atualizada.status })
    }

    if (acao === 'CANCELAR') {
      const ehDono = reserva.usuarioId === usuario.id
      if (!ehDono && !ehAdministracao(usuario.perfil)) {
        return NextResponse.json({ erro: 'Você só pode cancelar suas próprias reservas.' }, { status: 403 })
      }
      const atualizada = await db.reserva.update({ where: { id }, data: { status: 'CANCELADA' } })
      return NextResponse.json({ id: atualizada.id, status: atualizada.status })
    }

    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('reservas PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao atualizar reserva.' }, { status: 500 })
  }
}
