'use client'

import { useState, useEffect, useCallback } from 'react'
import { PieChart, TrendingUp, TrendingDown, Printer, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CategoriaGrupo } from '@/types/database'

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const GRUPO_LABELS: Record<CategoriaGrupo, string> = {
  receita_servico:      'Receita de Serviços',
  receita_produto:      'Receita de Produtos',
  receita_outros:       'Outras Receitas',
  despesa_pessoal:      'Despesas com Pessoal',
  despesa_fixo:         'Despesas Fixas',
  despesa_variavel:     'Despesas Variáveis',
  despesa_fiscal:       'Despesas Fiscais / Tributos',
  despesa_investimento: 'Investimentos',
}

const RECEITA_GRUPOS: CategoriaGrupo[] = ['receita_servico', 'receita_produto', 'receita_outros']
const DESPESA_GRUPOS: CategoriaGrupo[] = [
  'despesa_pessoal', 'despesa_fixo', 'despesa_variavel', 'despesa_fiscal', 'despesa_investimento',
]

const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface GrupoLine {
  grupo: CategoriaGrupo
  label: string
  items: { nome: string; total: number }[]
  total: number
}

interface DREData {
  receitas: GrupoLine[]
  despesas: GrupoLine[]
  totalReceita: number
  totalDespesa: number
  resultado: number
}

interface MonthData {
  mes: number
  receita: number
  despesa: number
  saldo: number
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function buildDRE(rows: { amount: number; type: string; category_nome: string | null; category_grupo: CategoriaGrupo | null }[]): DREData {
  const map = new Map<CategoriaGrupo, Map<string, number>>()

  for (const row of rows) {
    if (row.type === 'transferencia') continue
    const grupo = row.category_grupo ?? (row.type === 'receita' ? 'receita_outros' : 'despesa_variavel')
    const nome = row.category_nome ?? 'Sem categoria'
    if (!map.has(grupo)) map.set(grupo, new Map())
    const inner = map.get(grupo)!
    inner.set(nome, (inner.get(nome) ?? 0) + row.amount)
  }

  function buildLines(grupos: CategoriaGrupo[]): GrupoLine[] {
    return grupos
      .map(grupo => {
        const inner = map.get(grupo)
        if (!inner || inner.size === 0) return null
        const items = Array.from(inner.entries()).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total)
        return { grupo, label: GRUPO_LABELS[grupo], items, total: items.reduce((s, i) => s + i.total, 0) }
      })
      .filter(Boolean) as GrupoLine[]
  }

  const receitas = buildLines(RECEITA_GRUPOS)
  const despesas = buildLines(DESPESA_GRUPOS)
  const totalReceita = receitas.reduce((s, g) => s + g.total, 0)
  const totalDespesa = despesas.reduce((s, g) => s + g.total, 0)

  return { receitas, despesas, totalReceita, totalDespesa, resultado: totalReceita - totalDespesa }
}

function buildFluxo(rows: { amount: number; type: string; competencia_mes: number | null; paid_at: string | null }[]): MonthData[] {
  const byMonth: Record<number, { receita: number; despesa: number }> = {}
  for (let m = 1; m <= 12; m++) byMonth[m] = { receita: 0, despesa: 0 }

  for (const row of rows) {
    if (row.type === 'transferencia') continue
    const mes = row.competencia_mes ?? (row.paid_at ? new Date(row.paid_at).getMonth() + 1 : null)
    if (!mes || mes < 1 || mes > 12) continue
    if (row.type === 'receita') byMonth[mes].receita += row.amount
    else byMonth[mes].despesa += row.amount
  }

  let acumulado = 0
  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    const { receita, despesa } = byMonth[mes]
    acumulado += receita - despesa
    return { mes, receita, despesa, saldo: acumulado }
  })
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function GrupoSection({ line, color }: { line: GrupoLine; color: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between py-2 px-0 hover:bg-gray-50 rounded-lg px-1 transition-colors"
      >
        <span className={`text-sm font-medium ${color}`}>{line.label}</span>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold tabular-nums ${color}`}>{BRL.format(line.total)}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="pl-4 pb-1 space-y-1">
          {line.items.map(item => (
            <div key={item.nome} className="flex items-center justify-between py-0.5">
              <span className="text-xs text-gray-500">{item.nome}</span>
              <span className="text-xs text-gray-700 tabular-nums">{BRL.format(item.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FluxoBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [tab, setTab] = useState<'dre' | 'fluxo'>('dre')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dre, setDre] = useState<DREData | null>(null)
  const [fluxo, setFluxo] = useState<MonthData[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('transactions')
      .select('amount, type, competencia_mes, paid_at, category:categorias_financeiras(nome, grupo)')
      .eq('competencia_ano', year)
      .eq('status', 'pago')

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    type CategoryJoin = { nome: string; grupo: CategoriaGrupo } | null
    const rows = (data ?? []).map(r => {
      const cat = (r.category as unknown as CategoryJoin)
      return {
        amount: r.amount as number,
        type: r.type as string,
        competencia_mes: r.competencia_mes as number | null,
        paid_at: r.paid_at as string | null,
        category_nome: cat?.nome ?? null,
        category_grupo: cat?.grupo ?? null,
      }
    })

    setDre(buildDRE(rows))
    setFluxo(buildFluxo(rows))
    setLoading(false)
  }, [supabase, year])

  useEffect(() => { load() }, [load])

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const maxFluxoBar = fluxo.length > 0 ? Math.max(...fluxo.flatMap(m => [m.receita, m.despesa])) : 1

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 print:p-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-gray-600" />
            Relatórios
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">DRE e Fluxo de Caixa</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Selecionar ano"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Print header (visible only in print) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          {tab === 'dre' ? 'Demonstração de Resultado' : 'Fluxo de Caixa'} — {year}
        </h1>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
        <button
          type="button"
          onClick={() => setTab('dre')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === 'dre' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          DRE
        </button>
        <button
          type="button"
          onClick={() => setTab('fluxo')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === 'fluxo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Fluxo de Caixa
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── DRE ── */}
          {tab === 'dre' && dre && (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <p className="text-xs text-green-600 font-medium mb-1">Receita Bruta</p>
                  <p className="text-xl font-bold text-green-700">{BRL.format(dre.totalReceita)}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <p className="text-xs text-red-600 font-medium mb-1">Total Despesas</p>
                  <p className="text-xl font-bold text-red-700">{BRL.format(dre.totalDespesa)}</p>
                </div>
                <div className={`border rounded-2xl p-4 ${dre.resultado >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${dre.resultado >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {dre.resultado >= 0 ? 'Lucro' : 'Prejuízo'}
                  </p>
                  <p className={`text-xl font-bold flex items-center gap-1 ${dre.resultado >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {dre.resultado >= 0
                      ? <TrendingUp className="w-5 h-5" />
                      : <TrendingDown className="w-5 h-5" />
                    }
                    {BRL.format(Math.abs(dre.resultado))}
                  </p>
                  {dre.totalReceita > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Margem: {Math.round((dre.resultado / dre.totalReceita) * 100)}%
                    </p>
                  )}
                </div>
              </div>

              {/* DRE Table */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {/* Receitas */}
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Receitas</p>
                  <div className="space-y-1">
                    {dre.receitas.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhuma receita lançada no período</p>
                    ) : (
                      dre.receitas.map(line => (
                        <GrupoSection key={line.grupo} line={line} color="text-green-700" />
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-700">Total Receitas</span>
                    <span className="text-sm font-bold text-green-700 tabular-nums">{BRL.format(dre.totalReceita)}</span>
                  </div>
                </div>

                {/* Despesas */}
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Despesas</p>
                  <div className="space-y-1">
                    {dre.despesas.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhuma despesa lançada no período</p>
                    ) : (
                      dre.despesas.map(line => (
                        <GrupoSection key={line.grupo} line={line} color="text-red-600" />
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-700">Total Despesas</span>
                    <span className="text-sm font-bold text-red-600 tabular-nums">{BRL.format(dre.totalDespesa)}</span>
                  </div>
                </div>

                {/* Resultado */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">
                      {dre.resultado >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                    </span>
                    <span className={`text-base font-bold tabular-nums ${dre.resultado >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                      {dre.resultado >= 0 ? '' : '− '}{BRL.format(Math.abs(dre.resultado))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FLUXO DE CAIXA ── */}
          {tab === 'fluxo' && (
            <div className="space-y-4">
              {/* Monthly bars */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-700">Fluxo Mensal — {year}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {fluxo.map(m => (
                    <div key={m.mes} className="px-5 py-3 grid grid-cols-[60px_1fr_1fr_100px] gap-4 items-center">
                      <span className="text-sm font-medium text-gray-700">{MESES_SHORT[m.mes - 1]}</span>
                      <div className="space-y-1">
                        <FluxoBar value={m.receita} max={maxFluxoBar} color="bg-green-400" />
                        <p className="text-xs text-green-600 tabular-nums">{BRL.format(m.receita)}</p>
                      </div>
                      <div className="space-y-1">
                        <FluxoBar value={m.despesa} max={maxFluxoBar} color="bg-red-400" />
                        <p className="text-xs text-red-500 tabular-nums">{BRL.format(m.despesa)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Acumulado</p>
                        <p className={`text-sm font-semibold tabular-nums ${m.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {BRL.format(m.saldo)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-full bg-green-400 inline-block" />
                  Receitas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-full bg-red-400 inline-block" />
                  Despesas
                </span>
              </div>

              {/* Annual summary */}
              {dre && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Total Entradas</p>
                    <p className="text-lg font-bold text-green-700">{BRL.format(dre.totalReceita)}</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Total Saídas</p>
                    <p className="text-lg font-bold text-red-600">{BRL.format(dre.totalDespesa)}</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Saldo do Ano</p>
                    <p className={`text-lg font-bold ${dre.resultado >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                      {BRL.format(dre.resultado)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state (no transactions at all) */}
          {tab === 'dre' && dre && dre.totalReceita === 0 && dre.totalDespesa === 0 && (
            <div className="text-center py-12 text-gray-400">
              <PieChart className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Nenhuma transação paga em {year}</p>
              <p className="text-xs mt-1">Lance transações em Financeiro e marque-as como pagas para ver o DRE</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
