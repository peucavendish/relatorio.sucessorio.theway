import React from 'react';
import HideableCard from '@/components/ui/HideableCard';
import StatusChip from '@/components/ui/StatusChip';
import ProgressBar from '@/components/ui/ProgressBar';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { formatCurrency } from '@/utils/formatCurrency';
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
  const incomeExpenseCardRef = useScrollAnimation();

  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  // Calculate total income from all sources
  const totalIncome = data.rendas.reduce((sum, renda) => sum + renda.valor, 0);


  // Valores derivados (mensal x anual)
  const totalIncomeAnnual = totalIncome * 12;
  const totalExpensesMonthly = data.despesasMensais;
  const totalExpensesAnnual = totalExpensesMonthly * 12;
  const surplusMonthly = data.excedenteMensal;
  const surplusAnnual = surplusMonthly * 12;

  return (
    <section className="py-16 px-4" id="summary">
      <div className="max-w-6xl mx-auto">
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
            <h2 className="text-4xl font-bold mb-3">Resumo Financeiro</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visão geral da sua situação financeira atual, incluindo patrimônio,
              renda, gastos e composição patrimonial.
            </p>
          </div>
        </div>

        {/* Financial Overview */}
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
            <div className="grid md:grid-cols-3 gap-6 p-10">
              <div className="text-center">
                <h3 className="text-muted-foreground text-sm mb-1">Investimentos Financeiros</h3>
                <div className="text-3xl font-bold mb-1">
                  {data.ativos.length > 0 && (
                    <>
                      <div>{formatCurrency(data.ativos[0].valor)}</div>
                    </>
                  )}
                </div>
                <StatusChip
                  status="success"
                  label="Sólido"
                  icon={<TrendingUp size={14} />}
                />
              </div>

              <div className="text-center">
                <h3 className="text-muted-foreground text-sm mb-1">Renda Esperada (12 meses)</h3>
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(totalIncomeAnnual)}
                </div>
                <div className="text-xs text-muted-foreground mb-2">{formatCurrency(totalIncome)} / mês</div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {data.rendas.map((renda, index) => (
                    <StatusChip
                      key={index}
                      status={renda.tributacao === 'Isento' ? 'success' : 'info'}
                      label={`${renda.descricao || renda.fonte || 'Renda'}: ${formatCurrency(renda.valor)} /mês`}
                      className="text-xs"
                    />
                  ))}
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-muted-foreground text-sm mb-1">Excedente Esperado (12 meses)</h3>
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(surplusAnnual)}
                </div>
                <div className="text-xs text-muted-foreground mb-2">{formatCurrency(surplusMonthly)} / mês</div>
                <StatusChip
                  status={surplusMonthly > 0 ? 'success' : 'danger'}
                  label={surplusMonthly > 0 ? 'Positivo' : 'Negativo'}
                  icon={surplusMonthly > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                />
              </div>
            </div>
          </HideableCard>
        </div>

        {/* Income & Expenses */}
        <div
          ref={incomeExpenseCardRef as React.RefObject<HTMLDivElement>}
          className="mb-10 animate-on-scroll delay-1"
        >
          <div className="grid md:grid-cols-1 gap-6">
            <HideableCard
              id="renda-despesas"
              isVisible={isCardVisible("renda-despesas")}
              onToggleVisibility={() => toggleCardVisibility("renda-despesas")}
              hideControls={hideControls}
            >
              <div className="p-10">
                <h3 className="text-2xl font-semibold mb-4">Renda vs. Despesas</h3>
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span>Renda Total</span>
                    <div className="flex items-center gap-6">
                      <span className="font-medium">{formatCurrency(totalIncome)} / mês</span>
                      <span className="font-medium text-muted-foreground">{formatCurrency(totalIncomeAnnual)} / ano</span>
                    </div>
                  </div>
                  <ProgressBar
                    value={totalIncome}
                    max={totalIncome}
                    size="lg"
                    color="success"
                  />
                </div>

                <div className="mb-2">
                  <div className="flex justify-between mb-2">
                    <span>Despesas</span>
                    <div className="flex items-center gap-6">
                      <span className="font-medium">{formatCurrency(totalExpensesMonthly)} / mês</span>
                      <span className="font-medium text-muted-foreground">{formatCurrency(totalExpensesAnnual)} / ano</span>
                    </div>
                  </div>
                  <ProgressBar
                    value={totalExpensesMonthly}
                    max={totalIncome}
                    size="lg"
                    color={totalExpensesMonthly > totalIncome ? 'danger' : 'warning'}
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <div>
                    <span className="text-sm text-muted-foreground">Excedente Esperado</span>
                    <div className="text-xl font-semibold">
                      {formatCurrency(surplusMonthly)} / mês
                    </div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(surplusAnnual)} / ano</div>
                  </div>
                  <StatusChip
                    status={surplusMonthly > 0 ? 'success' : 'danger'}
                    label={`${totalIncome > 0 ? Math.round((surplusMonthly / totalIncome) * 100) : 0}% da renda`}
                  />
                </div>

                {/* Detalhamento de Rendas e Despesas */}
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Detalhe das Rendas</h4>
                    <div className="space-y-2">
                      {data.rendas.map((renda, index) => (
                        <div key={index} className="flex justify-between items-start">
                          <div className="text-sm">
                            <div className="font-medium">{renda.descricao || renda.fonte || 'Renda'}</div>
                            {renda.tributacao && (
                              <div className="text-xs text-muted-foreground">{renda.tributacao}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-sm font-medium">{formatCurrency(renda.valor)} / mês</div>
                            <div className="text-sm font-medium text-muted-foreground">{formatCurrency((renda as any)?.valorAnual ?? (renda.valor * 12))} / ano</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Detalhe das Despesas</h4>
                    {data.despesas && data.despesas.length > 0 ? (
                      <div className="space-y-2">
                        {data.despesas.map((despesa, index) => (
                          <div key={index} className="flex justify-between items-start">
                            <div className="text-sm">
                              <div className="font-medium">{despesa.descricao || despesa.categoria || despesa.tipo || despesa.item || 'Despesa'}</div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-sm font-medium">{formatCurrency(despesa.valor)} / mês</div>
                              <div className="text-sm font-medium text-muted-foreground">{formatCurrency((despesa as any)?.valorAnual ?? (despesa.valor * 12))} / ano</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem detalhes cadastrados</p>
                    )}
                  </div>
                </div>
              </div>
            </HideableCard>

            {/* Composição Patrimonial movida para Gestão de Ativos */}
          </div>
        </div>

        {/* Assets & Liabilities movidos para a seção Gestão de Ativos */}

        {/* Patrimônio movido para a seção Gestão de Ativos */}
      </div>
    </section>
  );
};

export default FinancialSummary;