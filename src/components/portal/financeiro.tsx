'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CabecalhoModulo, BadgeStatusBoleto, CardStat, CarregandoLista, EstadoVazio } from '@/components/portal/ui'
import { formatarData, formatarMoeda } from '@/lib/portal/format'
import type { BoletoItem, SessaoUsuario } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { ehAdministracao } from '@/lib/portal/perfis'
import { toast } from 'sonner'
import { CheckCircle2, Copy, FileDown, Loader2, ReceiptText, TriangleAlert, Wallet } from 'lucide-react'

interface FinanceiroProps {
  usuario: SessaoUsuario
  onAtualizarDashboard: () => void
}

type Filtro = 'TODOS' | 'A_PAGAR' | 'PAGOS' | 'VENCIDOS'

export function Financeiro({ usuario, onAtualizarDashboard }: FinanceiroProps) {
  const [boletos, setBoletos] = useState<BoletoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [boleto2Via, setBoleto2Via] = useState<BoletoItem | null>(null)
  const [pagando, setPagando] = useState<string | null>(null)

  const ehAdmin = ehAdministracao(usuario.perfil)

  async function carregar() {
    try {
      const res = await fetch(`/api/boletos?userId=${usuario.id}`)
      const data = await res.json()
      setBoletos(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Não foi possível carregar os boletos.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [])

  const abertos = boletos.filter((b) => b.status !== 'PAGO')
  const vencidos = boletos.filter((b) => b.status === 'VENCIDO')
  const totalAberto = abertos.reduce((s, b) => s + b.valor, 0)
  const totalPago = boletos.filter((b) => b.status === 'PAGO').reduce((s, b) => s + b.valor, 0)

  const listaFiltrada = useMemo(() => {
    if (filtro === 'A_PAGAR') return boletos.filter((b) => b.status === 'PENDENTE')
    if (filtro === 'PAGOS') return boletos.filter((b) => b.status === 'PAGO')
    if (filtro === 'VENCIDOS') return boletos.filter((b) => b.status === 'VENCIDO')
    return boletos
  }, [boletos, filtro])

  const filtros: { id: Filtro; rotulo: string }[] = [
    { id: 'TODOS', rotulo: 'Todos' },
    { id: 'A_PAGAR', rotulo: 'A pagar' },
    { id: 'VENCIDOS', rotulo: 'Vencidos' },
    { id: 'PAGOS', rotulo: 'Pagos' },
  ]

  function copiarLinha(linha: string) {
    void navigator.clipboard?.writeText(linha)
    toast.success('Código copiado para a área de transferência.')
  }

  async function pagar(boleto: BoletoItem) {
    setPagando(boleto.id)
    try {
      const res = await fetch(`/api/boletos/${boleto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'PAGAR', userId: usuario.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível registrar o pagamento.')
        return
      }
      toast.success('Pagamento registrado! (simulação — nenhuma cobrança real foi feita)', { icon: '💸' })
      setBoleto2Via(null)
      await carregar()
      onAtualizarDashboard()
    } catch {
      toast.error('Falha de conexão.')
    } finally {
      setPagando(null)
    }
  }

  return (
    <div className="space-y-6">
      <CabecalhoModulo
        titulo="Boletos e financeiro"
        subtitulo={
          ehAdmin
            ? 'Acompanhe a situação financeira de todas as unidades do condomínio.'
            : 'Consulte seus boletos, gere a 2ª via e acompanhe seu histórico de pagamentos.'
        }
      />

      {/* Indicadores */}
      <section aria-label="Resumo financeiro" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <CardStat
          icone={<Wallet className="h-5 w-5" aria-hidden />}
          titulo="Em aberto"
          valor={formatarMoeda(totalAberto)}
          detalhe={`${abertos.length} boleto(s) a pagar`}
          destaque={totalAberto > 0 ? 'ambar' : 'verde'}
        />
        <CardStat
          icone={<TriangleAlert className="h-5 w-5" aria-hidden />}
          titulo="Vencidos"
          valor={String(vencidos.length)}
          detalhe={vencidos.length > 0 ? 'Regularize o quanto antes' : 'Nenhuma inadimplência'}
          destaque={vencidos.length > 0 ? 'vermelho' : 'verde'}
        />
        <CardStat
          icone={<CheckCircle2 className="h-5 w-5" aria-hidden />}
          titulo="Total pago (histórico)"
          valor={formatarMoeda(totalPago)}
          detalhe={`${boletos.filter((b) => b.status === 'PAGO').length} boletos quitados`}
          destaque="verde"
        />
      </section>

      {/* Lista / tabela */}
      <Card className="rounded-2xl border-stone-200 shadow-sm">
        <CardHeader className="flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-bold text-stone-900">
            {ehAdmin ? 'Boletos por unidade' : 'Seus boletos'}
          </CardTitle>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar boletos">
            {filtros.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  filtro === f.id
                    ? 'bg-[#4D403A] text-white'
                    : 'bg-stone-200 text-stone-600 hover:bg-stone-200',
                )}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <CarregandoLista linhas={3} />
          ) : listaFiltrada.length === 0 ? (
            <EstadoVazio titulo="Nenhum boleto nesta condição" descricao="Tente outro filtro ou volte mais tarde." />
          ) : ehAdmin ? (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-100/80 hover:bg-stone-100/80">
                    <TableHead className="text-xs font-semibold text-stone-500">Unidade</TableHead>
                    <TableHead className="text-xs font-semibold text-stone-500">Referência</TableHead>
                    <TableHead className="text-xs font-semibold text-stone-500">Vencimento</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-stone-500">Valor</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-stone-500">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaFiltrada.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold text-stone-800">{b.unidadeLabel}</TableCell>
                      <TableCell className="text-stone-600">{b.descricao}</TableCell>
                      <TableCell className="text-stone-600">{formatarData(b.vencimento)}</TableCell>
                      <TableCell className="text-right font-semibold text-stone-800">{formatarMoeda(b.valor)}</TableCell>
                      <TableCell className="text-center">
                        <BadgeStatusBoleto status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {listaFiltrada.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    'rounded-2xl border p-4 transition-shadow hover:shadow-md',
                    b.status === 'VENCIDO' ? 'border-red-200 bg-red-50/40' : 'border-stone-200 bg-white',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFE9E1] text-[#4D403A]">
                        <ReceiptText className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{b.descricao}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          Vencimento: {formatarData(b.vencimento)}
                          {b.pagoEm ? ` · pago em ${formatarData(b.pagoEm)}` : ''}
                        </p>
                      </div>
                    </div>
                    <BadgeStatusBoleto status={b.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-200 pt-3">
                    <p className="text-xl font-bold text-stone-900">{formatarMoeda(b.valor)}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-[#4D403A]/25 text-[#4D403A] hover:bg-[#EFE9E1]"
                        onClick={() => setBoleto2Via(b)}
                      >
                        <FileDown className="mr-1 h-3.5 w-3.5" aria-hidden />
                        2ª via
                      </Button>
                      {b.status !== 'PAGO' && (
                        <Button
                          size="sm"
                          disabled={pagando === b.id}
                          onClick={() => pagar(b)}
                          className="rounded-lg bg-emerald-600 font-semibold hover:bg-emerald-700"
                        >
                          {pagando === b.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ehAdmin && (
        <p className="rounded-xl bg-[#EFE9E1] px-4 py-3 text-xs leading-relaxed text-[#6B5B51]">
          Nesta primeira etapa o financeiro é somente consulta/simulação, sem integração bancária. A geração
          automática de cobranças e a conciliação bancária estão previstas para uma fase futura da plataforma.
        </p>
      )}

      {/* Dialog 2ª via */}
      <Dialog open={!!boleto2Via} onOpenChange={(aberto) => !aberto && setBoleto2Via(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Segunda via do boleto</DialogTitle>
            <DialogDescription>{boleto2Via?.descricao}</DialogDescription>
          </DialogHeader>
          {boleto2Via && (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-100/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-500">Valor</span>
                  <span className="text-lg font-bold text-stone-900">{formatarMoeda(boleto2Via.valor)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-stone-500">Vencimento</span>
                  <span className="text-sm font-semibold text-stone-700">{formatarData(boleto2Via.vencimento)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Linha digitável</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-700">
                    {boleto2Via.linhaDigitavel ?? '—'}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0 rounded-lg"
                    onClick={() => copiarLinha(boleto2Via.linhaDigitavel ?? '')}
                    aria-label="Copiar linha digitável"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <p className="text-xs text-stone-400">
                  Pagável em qualquer banco, app do seu banco ou lotérica até o vencimento.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBoleto2Via(null)} className="rounded-xl">
              Fechar
            </Button>
            {boleto2Via && boleto2Via.status !== 'PAGO' && (
              <Button
                onClick={() => pagar(boleto2Via)}
                disabled={pagando === boleto2Via.id}
                className="rounded-xl bg-emerald-600 font-semibold hover:bg-emerald-700"
              >
                {pagando === boleto2Via?.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />}
                Registrar pagamento (simulado)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
