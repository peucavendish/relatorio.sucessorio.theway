import React from 'react';
import HideableCard from '@/components/ui/HideableCard';
import StatusChip from '@/components/ui/StatusChip';
import ProgressBar from '@/components/ui/ProgressBar';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell, CartesianGrid } from 'recharts';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatCurrency';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { Card } from '@/components/ui/card';


interface FinanceSummary {
  patrimonioLiquido: number;
  excedenteMensal: number;
  rendas: Array<{ fonte?: string; descricao?: string; valor: number; tributacao?: string }>;
  despesasMensais: number;
  // Lista detalhada de despesas (quando disponível)
  despesas?: Array<{ descricao?: string; categoria?: string; tipo?: string; item?: string; valor: number }>;
  composicaoPatrimonial: Record<string, number>;
  ativos: Array<{ tipo: string; valor: number; classe?: string }>;
  passivos: Array<{ tipo: string; valor: number }>;
}

interface FinancialSummaryProps {
  data: FinanceSummary;
  hideControls?: boolean;
}


const FinancialSummary: React.FC<FinancialSummaryProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const summaryCardRef = useScrollAnimation();
  const balanceCardRef = useScrollAnimation();


  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  // Calculate total income from all sources
  const totalIncome = data.rendas.reduce((sum, renda) => sum + renda.valor, 0);


  // Valores derivados (mensal x anual)
  const totalIncomeAnnual = totalIncome * 12;
  const totalExpensesMonthly = data.despesasMensais;
  const totalExpensesAnnual = totalExpensesMonthly * 12;
  const surplusMonthly = (totalIncomeAnnual - totalExpensesAnnual) / 12;
  const surplusAnnual = totalIncomeAnnual - totalExpensesAnnual;

  // Totais de ativos e passivos para o balanço
  const totalAtivosLista = (data?.ativos || []).reduce((s, a) => s + (Number(a?.valor) || 0), 0);
  const totalPassivosLista = (data?.passivos || []).reduce((s, p) => s + (Number(p?.valor) || 0), 0);
  const patrimonioLiquidoResumo = (data?.patrimonioLiquido || (totalAtivosLista - totalPassivosLista));

  // Dados para gráfico mensal (Renda, Despesas, Excedente) + visão anual embutida
  const monthlyChartData = [
    {
      name: 'Renda',
      value: totalIncome,
      annual: totalIncomeAnnual,
      formatted: formatCurrency(totalIncome),
      formattedAnnual: formatCurrency(totalIncomeAnnual),
      fill: '#36557C',
    },
    {
      name: 'Despesas',
      value: totalExpensesMonthly,
      annual: totalExpensesAnnual,
      formatted: formatCurrency(totalExpensesMonthly),
      formattedAnnual: formatCurrency(totalExpensesAnnual),
      fill: '#E52B50',
    },
    {
      name: 'Excedente',
      value: surplusMonthly,
      annual: surplusAnnual,
      formatted: formatCurrency(surplusMonthly),
      formattedAnnual: formatCurrency(surplusAnnual),
      fill: surplusMonthly >= 0 ? '#21887C' : '#E52B50',
    },
  ];

  // Indicadores: % Endividamento e % Poupança
  const endividamentoPercent = totalAtivosLista > 0
    ? Math.round((totalPassivosLista / totalAtivosLista) * 100)
    : 0;
  const poupancaPercent = totalIncome > 0
    ? Math.round((surplusMonthly / totalIncome) * 100)
    : 0;

  return (
    <section className="py-16 px-4" id="summary">
      <div className="section-container">
        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-financial-info/10 p-3 rounded-full">
                <DollarSign size={28} className="text-financial-info" />
              </div>
            </div>
            <h2 className="heading-2 mb-3">Resumo Financeiro</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visão geral da sua situação financeira atual, incluindo patrimônio,
              renda, gastos e composição patrimonial.
            </p>
          </div>
        </div>

        {/* Financial Overview (consolidado com gráfico e detalhes) */}
        <div
          ref={summaryCardRef as React.RefObject<HTMLDivElement>}
          className="mb-10 animate-on-scroll"
        >
          <HideableCard
            id="financial-resumo"
            isVisible={isCardVisible("financial-resumo")}
            onToggleVisibility={() => toggleCardVisibility("financial-resumo")}
            hideControls={hideControls}
          >
            <div className="card-grid-3">
              <div className="card-metric">
                <h3 className="card-metric-label">Receitas Esperadas (ano)</h3>
                <div className="card-metric-value">{formatCurrency(totalIncomeAnnual)}</div>
                <div className="card-metric-subtitle">{formatCurrency(totalIncome)} / mês</div>
              </div>

              <div className="card-metric">
                <h3 className="card-metric-label">Despesas Esperadas (ano)</h3>
                <div className="card-metric-value">{formatCurrency(totalExpensesAnnual)}</div>
                <div className="card-metric-subtitle">{formatCurrency(totalExpensesMonthly)} / mês</div>
              </div>

              <div className="card-metric">
                <h3 className="card-metric-label">Excedente Esperado (ano)</h3>
                <div className="card-metric-value">{formatCurrency(surplusAnnual)}</div>
                <div className="card-metric-subtitle">{formatCurrency(surplusMonthly)} / mês</div>
              </div>
            </div>
            {/* Detalhes abaixo dos números - mesmo padrão do Balanço Patrimonial */}
            <div className="card-divider">
              <div className="card-grid-2">
                <div>
                  <h4 className="heading-3 mb-4">Rendas</h4>
                  <div className="card-list">
                    {data.rendas.map((renda, index) => {
                      const rendaMensal = Number(renda?.valor) || 0;
                      const pct = totalIncome > 0 ? Math.round((rendaMensal / totalIncome) * 100) : 0;
                      return (
                        <div key={index} className="card-list-item">
                          <span className="card-list-label">{renda.descricao || renda.fonte || 'Renda'}</span>
                          <div className="card-flex-between">
                            <span className="card-list-value">{formatCurrency(rendaMensal)}</span>
                            <span className="card-list-percentage">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="card-divider card-list-item">
                      <span className="font-semibold">Total de Rendas</span>
                      <span className="font-semibold">{formatCurrency(totalIncome)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="heading-3 mb-4">Despesas</h4>
                  {Array.isArray(data.despesas) && data.despesas.length > 0 ? (
                    <div className="card-list">
                      {(data.despesas || []).map((despesa, index) => {
                        const valor = Number(despesa?.valor) || 0;
                        const totalDespesasLista = (data.despesas || []).reduce((s, d) => s + (Number(d?.valor) || 0), 0) || totalExpensesMonthly;
                        const pct = totalDespesasLista > 0 ? Math.round((valor / totalDespesasLista) * 100) : 0;
                        return (
                          <div key={index} className="card-list-item">
                            <span className="card-list-label">{despesa.descricao || despesa.categoria || despesa.tipo || despesa.item || 'Despesa'}</span>
                            <div className="card-flex-between">
                              <span className="card-list-value">{formatCurrency(valor)}</span>
                              <span className="card-list-percentage">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="card-divider card-list-item">
                        <span className="font-semibold">Total de Despesas</span>
                        <span className="font-semibold">{formatCurrency((data.despesas || []).reduce((s, d) => s + (Number(d?.valor) || 0), 0) || totalExpensesMonthly)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem detalhes cadastrados</p>
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico mensal consolidado */}
            <div className="card-divider">
              <h3 className="card-title-standard text-lg">Renda vs. Despesas</h3>
              <div className="w-full">
                <div className="h-[300px] sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 24, right: 24, left: 8, bottom: 8 }} barCategoryGap={24} barGap={12}>
                      <XAxis 
                        dataKey="name" 
                        interval={0} 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={10}
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, (dataMax: number) => Math.max(dataMax || 0, 1) * 1.25]} 
                        tickFormatter={(v) => formatCurrencyCompact(Number(v))} 
                        tickLine={false} 
                        axisLine={false} 
                        width={72}
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      />
                      <CartesianGrid 
                        strokeDasharray="4 4" 
                        strokeOpacity={0.25}
                        stroke="hsl(var(--foreground))"
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        formatter={(value: any, _name: any, payload: any) => {
                          return [`${formatCurrency(Number(value))} / mês`, payload?.payload?.name || ''];
                        }}
                      />
                      <defs>
                        <linearGradient id="bar-income" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#36557C"/>
                          <stop offset="100%" stopColor="#36557C"/>
                        </linearGradient>
                        <linearGradient id="bar-expense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E52B50"/>
                          <stop offset="100%" stopColor="#E52B50"/>
                        </linearGradient>
                        <linearGradient id="bar-surplus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#21887C"/>
                          <stop offset="100%" stopColor="#21887C"/>
                        </linearGradient>
                        <linearGradient id="bar-surplus-negative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E52B50"/>
                          <stop offset="100%" stopColor="#E52B50"/>
                        </linearGradient>
                      </defs>
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={72}>
                        {monthlyChartData.map((entry, index) => {
                          const gradientId = entry.name === 'Renda'
                            ? 'url(#bar-income)'
                            : entry.name === 'Despesas'
                              ? 'url(#bar-expense)'
                              : (entry.value < 0 ? 'url(#bar-surplus-negative)' : 'url(#bar-surplus)');
                          return (
                            <Cell key={`cell-${index}`} fill={gradientId} />
                          );
                        })}
                        <LabelList content={(labelProps: any) => {
                          const { x, y, width, payload } = labelProps || {} as any;
                          if (x == null || y == null) return null;
                          const cx = (x as number) + ((width as number) || 0) / 2;
                          const top = (y as number) - 10;
                          const monthlyText = payload?.formatted ?? '';
                          return (
                            <text x={cx} y={top} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={12} fontWeight={700}>
                              <tspan x={cx} dy="0">{monthlyText}</tspan>
                            </text>
                          );
                        }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Indicadores: Poupança e Endividamento */}
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/10 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">% de Poupança</span>
                    <span className="text-foreground font-medium">{poupancaPercent}%</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Cálculo: Excedente Mensal / Renda Mensal</div>
                </div>
                <div className="p-4 bg-muted/10 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">% de Endividamento</span>
                    <span className="text-foreground font-medium">{endividamentoPercent}%</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Cálculo: Total de Passivos / Total de Ativos</div>
                </div>
              </div>
            </div>
          </HideableCard>
        </div>
        {/* Composição Patrimonial movida para Gestão de Ativos */}

        {/* Balanço Patrimonial removido desta seção e mantido apenas em Gestão de Ativos */}

        {/* Assets & Liabilities movidos para a seção Gestão de Ativos */}

        {/* Patrimônio movido para a seção Gestão de Ativos */}
      </div>
    </section>
  );
};

export default FinancialSummary;