import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ehAdministracao } from '@/lib/portal/perfis'

// Pagamento é SIMULADO — nenhuma integração financeira real nesta etapa.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId } = await req.json()

    const boleto = await db.boleto.findUnique({ where: { id } })
    if (!boleto) return NextResponse.json({ erro: 'Boleto não encontrado.' }, { status: 404 })

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })

    if (acao === 'PAGAR') {
      const podePagar = ehAdministracao(usuario.perfil) || boleto.unidadeId === usuario.unidadeId
      if (!podePagar) {
        return NextResponse.json({ erro: 'Você não pode pagar boletos de outra unidade.' }, { status: 403 })
      }
      if (boleto.status === 'PAGO') {
        return NextResponse.json({ erro: 'Este boleto já está pago.' }, { status: 400 })
      }
      const atualizado = await db.boleto.update({
        where: { id },
        data: { status: 'PAGO', pagoEm: new Date() },
      })
      return NextResponse.json({ id: atualizado.id, status: 'PAGO' })
    }

    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('boletos PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao atualizar boleto.' }, { status: 500 })
  }
}
