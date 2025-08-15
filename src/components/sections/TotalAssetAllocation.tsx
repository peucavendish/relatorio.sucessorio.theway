import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { BarChart } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import DonutChart from '@/components/charts/DonutChart';
import { formatCurrency } from '@/utils/formatCurrency';

interface TotalAssetAllocationProps {
  data?: any;
  hideControls?: boolean;
}

const TotalAssetAllocation: React.FC<TotalAssetAllocationProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const estrategiaRef = useScrollAnimation();
  const balancoRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  // Cores padronizadas por tipo de ativo
  const assetColors: Record<string, string> = {
    'Imóveis': '#60A5FA',
    'Investimentos': '#34D399',
    'Participação em empresa': '#A78BFA',
    'Outros': '#F59E0B',
    'Veículos': '#EF4444',
    'Obras de arte': '#EC4899',
    'Joias': '#8B5CF6',
    'Colecionáveis': '#F97316',
  };

  const getColorForAssetType = (assetType: string): string => {
    if (assetType in assetColors) return assetColors[assetType];
    const hash = assetType.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const composition = data?.financas?.composicao_patrimonial || {};
  const totalComposition = Object.values(composition).reduce((sum: number, value: any) => sum + (typeof value === 'number' ? value : 0), 0);
  const compositionChartData = Object.entries(composition)
    .map(([key, value]: [string, any]) => {
      const raw = typeof value === 'number' ? value : 0;
      return {
        name: key,
        value: totalComposition > 0 ? Math.round((raw / totalComposition) * 100) : 0,
        color: getColorForAssetType(key),
        rawValue: formatCurrency(raw),
        raw,
      } as { name: string; value: number; color: string; rawValue: string; raw: number };
    })
    .filter((i) => i.raw > 0)
    .sort((a, b) => b.value - a.value);

  // KPIs dinâmicos
  const totalAtivos = totalComposition;
  const percentualImoveis = totalAtivos > 0 ? Math.round(((composition?.['Imóveis'] || 0) / totalAtivos) * 100) : 0;
  const percentualFinanceiroLiquido = totalAtivos > 0 ? Math.round(((composition?.['Investimentos'] || 0) / totalAtivos) * 100) : 0;
  const diversificacao = compositionChartData.length;
  const maiorClasse = compositionChartData[0]?.name || '-';
  const maiorPercentual = compositionChartData[0]?.value || 0;
  const baixaLiquidez = percentualImoveis >= 50;

  // Passivos e patrimônio líquido a partir dos dados consolidados
  const passivos = Array.isArray(data?.financas?.passivos) ? data.financas.passivos : [];
  const totalPassivos = passivos.reduce((sum: number, p: any) => sum + (Number(p?.valor) || 0), 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;

  // Listas detalhadas de ativos para exibição
  const ativos = Array.isArray(data?.financas?.ativos) ? data.financas.ativos : [];
  const totalAtivosLista = ativos.reduce((sum: number, a: any) => sum + (Number(a?.valor) || 0), 0);
  const endividamento = totalAtivos > 0 ? Number(((totalPassivos / totalAtivos) * 100).toFixed(2)) : 0;
  const rendaTotal = Array.isArray(data?.financas?.rendas)
    ? data.financas.rendas.reduce((sum: number, renda: any) => sum + (Number(renda?.valor) || 0), 0)
    : 0;
  const excedenteMensal = Number(data?.financas?.resumo?.excedente_mensal) || 0;
  const poupanca = rendaTotal > 0 ? Number(((excedenteMensal / rendaTotal) * 100).toFixed(2)) : 0;
  const despesasMensais = Number(data?.financas?.resumo?.despesas_mensais) || 0;
  const investimentos = Array.isArray(data?.financas?.ativos)
    ? data.financas.ativos.filter((a: any) => a?.tipo === 'Investimentos').reduce((sum: number, a: any) => sum + (Number(a?.valor) || 0), 0)
    : 0;
  const horizonteCobertura = despesasMensais > 0 ? Number((investimentos / (12 * despesasMensais)).toFixed(2)) : 0;

   

  return (
    <section className="min-h-screen py-16 px-4" id="total-asset-allocation">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-financial-info/30 p-3 rounded-full">
                <BarChart size={28} className="text-financial-info" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Gestão de Ativos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Total Asset Allocation - Avaliar a alocação patrimonial completa do cliente (ativos financeiros e reais), identificando concentração, liquidez, coerência com os objetivos e perfil de risco.
            </p>
          </div>
        </div>

        {/* Balanço Patrimonial (Ativos, Passivos e PL em um único bloco) */}
        <div
          ref={balancoRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll"
        >
          <HideableCard
            id="balanco-patrimonial"
            isVisible={isCardVisible("balanco-patrimonial")}
            onToggleVisibility={() => toggleCardVisibility("balanco-patrimonial")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="text-xl">Balanço Patrimonial</CardTitle>
              <CardDescription>Consolidação de ativos, passivos e patrimônio líquido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 p-6">
                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Total de Ativos</h3>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(totalAtivos)}</div>
                </div>
                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Total de Passivos</h3>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(totalPassivos)}</div>
                </div>
                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Patrimônio Líquido</h3>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(patrimonioLiquido)}</div>
                </div>
              </div>
              <div className="mt-4 pt-6 border-t border-border/70">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium mb-3">Ativos</h4>
                    <div className="space-y-3">
                      {ativos.map((asset: any, index: number) => (
                        <div key={index} className="flex justify-between items-start">
                          <span className="text-sm">{asset?.tipo}{asset?.classe ? ` - ${asset.classe}` : ''}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{formatCurrency(Number(asset?.valor) || 0)}</span>
                            <span className="text-xs text-muted-foreground">({totalAtivosLista > 0 ? Math.round(((Number(asset?.valor) || 0) / totalAtivosLista) * 100) : 0}%)</span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-border flex justify-between items-center">
                        <span className="font-semibold">Total de Ativos</span>
                        <span className="font-semibold">{formatCurrency(totalAtivosLista)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Passivos</h4>
                    {passivos && passivos.length > 0 ? (
                      <div className="space-y-3">
                        {passivos.map((liability: any, index: number) => (
                          <div key={index} className="flex justify-between items-start">
                            <span className="text-sm">{liability?.tipo}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{formatCurrency(Number(liability?.valor) || 0)}</span>
                              <span className="text-xs text-muted-foreground">({totalPassivos > 0 ? Math.round(((Number(liability?.valor) || 0) / totalPassivos) * 100) : 0}%)</span>
                            </div>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-border flex justify-between items-center">
                          <span className="font-semibold">Total de Passivos</span>
                          <span className="font-semibold">{formatCurrency(totalPassivos)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum passivo registrado</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>

        {/* Estratégia Recomendada */}
        <div
          ref={estrategiaRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-1"
        >
          <HideableCard
            id="estrategia-recomendada"
            isVisible={isCardVisible("estrategia-recomendada")}
            onToggleVisibility={() => toggleCardVisibility("estrategia-recomendada")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="text-xl">Estratégia Recomendada</CardTitle>
              <CardDescription>
                Análise técnica e recomendações para otimização patrimonial
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {/* Composição Patrimonial */}
              {compositionChartData && compositionChartData.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Composição Patrimonial</h3>
                  <div className="grid md:grid-cols-2 gap-6 items-center">
                    <DonutChart
                      data={compositionChartData}
                      height={240}
                      innerRadius={60}
                      outerRadius={90}
                      legendPosition="side"
                    />
                    <div className="space-y-2">
                      {compositionChartData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between border border-border/50 rounded-md px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{item.value}%</div>
                            <div className="text-xs text-muted-foreground">{item.rawValue}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo Executivo (dinâmico) */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Total de Ativos</h3>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(totalAtivos)}</div>
                  <div className="text-sm text-muted-foreground">Patrimônio Total</div>
                </div>

                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">% Imobilizado</h3>
                  <div className="text-3xl font-bold mb-1 {percentualImoveis>=50?'text-destructive':''}">{percentualImoveis}%</div>
                  <div className="text-sm text-muted-foreground">{baixaLiquidez ? 'Alta concentração' : 'Equilíbrio'}</div>
                </div>

                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Diversificação</h3>
                  <div className="text-3xl font-bold mb-1 text-accent">{diversificacao}</div>
                  <div className="text-sm text-muted-foreground">Classes de ativos</div>
                </div>
              </div>

              {/* Diagnóstico Consolidado */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Indicadores Financeiros */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">📊 Indicadores Financeiros</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% de Endividamento</span>
                      <span className="text-accent font-semibold">{endividamento}%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% de Poupança</span>
                      <span className="text-accent font-semibold">{poupanca}%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Horizonte de Cobertura</span>
                      <span className="text-accent font-semibold">{horizonteCobertura} meses</span>
                    </div>
                  </div>
                </div>

                {/* Indicadores Patrimoniais (sem duplicar o Resumo Executivo) */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">🏠 Indicadores Patrimoniais</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% Financeiro Líquido</span>
                      <span className="text-accent font-semibold">{percentualFinanceiroLiquido}%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Maior Classe</span>
                      <span className="text-accent font-semibold">{maiorClasse} ({maiorPercentual}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights e Recomendações */}
              {/* <div className="space-y-6">
                <div className="p-6 bg-muted/10 rounded-lg border border-border/50">
                  <h4 className="font-semibold mb-4 text-lg">🎯 Principais Observações</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="text-accent mt-1">•</span>
                      <span>Concentração em {maiorClasse} ({maiorPercentual}%)</span>
                    </li>
                    {baixaLiquidez && (
                      <li className="flex items-start gap-3">
                        <span className="text-accent mt-1">•</span>
                        <span>Baixa liquidez devido ao % imobilizado elevado ({percentualImoveis}%)</span>
                      </li>
                    )}
                    {percentualFinanceiroLiquido < 30 && (
                      <li className="flex items-start gap-3">
                        <span className="text-accent mt-1">•</span>
                        <span>Exposição financeira líquida abaixo do ideal ({percentualFinanceiroLiquido}%)</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-6 bg-muted/10 rounded-lg border border-border/50">
                  <h4 className="font-semibold mb-4 text-lg">💡 Recomendações</h4>
                  <ul className="space-y-3 text-sm">
                    {baixaLiquidez && (
                      <li className="flex items-start gap-3">
                        <span className="text-accent mt-1">•</span>
                        <span>Reduzir imobilizado alocando parte para ativos líquidos</span>
                      </li>
                    )}
                    <li className="flex items-start gap-3">
                      <span className="text-accent mt-1">•</span>
                      <span>Incrementar diversificação entre classes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent mt-1">•</span>
                      <span>Rebalancear periodicamente conforme objetivos</span>
                    </li>
                  </ul>
                </div>
              </div> */}
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default TotalAssetAllocation; 
