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
import { BarChart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import DonutChart from '@/components/charts/DonutChart';
import { formatCurrency } from '@/utils/formatCurrency';
import ProgressBar from '@/components/ui/ProgressBar';
import { useSectionNumbering } from '@/hooks/useSectionNumbering';

interface TotalAssetAllocationProps {
  data?: any;
  hideControls?: boolean;
}

const TotalAssetAllocation: React.FC<TotalAssetAllocationProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const estrategiaRef = useScrollAnimation();
  const balancoRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();
  const sectionNumber = useSectionNumbering('total-asset-allocation');

  // Normaliza a origem dos dados: pode vir como array, com wrapper `output`,
  // com `financas` dentro de `output`, ou diretamente o objeto de finanças
  const source = Array.isArray(data)
    ? ((data[0] as any)?.output ?? data[0])
    : ((data as any)?.output ?? data);
  const fin = ((source as any)?.financas ?? source ?? {}) as any;

  // Cores padronizadas por tipo de ativo - apenas as 4 tonalidades especificadas
  const assetColors: Record<string, string> = {
    'Imóveis': '#21887C',           // Verde
    'Investimentos': '#36557C',     // Azul
    'Investimentos - Financeiros': '#36557C',     // Azul (residual financeiro)
    'Participação em empresa': '#21887C',  // Verde
    'Outros': '#21887C',            // Verde
    'Veículos': '#E52B50',          // Vermelho
    'Obras de arte': '#21887C',     // Verde
    'Joias': '#21887C',             // Verde
    'Colecionáveis': '#21887C',     // Verde
    'Reserva de Emergência': '#21887C',  // Verde
  };

  const getColorForAssetType = (assetType: string): string => {
    if (assetType in assetColors) return assetColors[assetType];
    const hash = assetType.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const composition = (fin?.composicao_patrimonial || (source as any)?.composicao_patrimonial || {}) as Record<string, number>;

  // Lógica: Investimentos - Financeiros = Investimentos total - Previdência - Internacional
  // Removemos subgrupos da exibição e inserimos o residual financeiro sob novo rótulo
  const rawInvestimentos = Number((composition as any)['Investimentos'] || 0);
  const rawPrevidencia = Number((composition as any)['Previdência'] || 0);
  const rawInternacional = Number((composition as any)['Internacional'] || 0);
  const investimentosFinanceirosResidual = Math.max(0, rawInvestimentos - rawPrevidencia - rawInternacional);

  const compositionAdjusted = { ...composition } as Record<string, number>;
  delete (compositionAdjusted as any)['Curto Prazo'];
  // Substitui "Investimentos" por "Investimentos - Financeiros" com o residual calculado
  delete (compositionAdjusted as any)['Investimentos'];
  (compositionAdjusted as any)['Investimentos - Financeiros'] = investimentosFinanceirosResidual;

  const totalComposition: number = Object.values(compositionAdjusted as Record<string, any>).reduce(
    (sum: number, value: any) => sum + (Number(value) || 0),
    0
  );
  const compositionChartData = Object.entries(compositionAdjusted)
    .map(([key, value]: [string, any]) => {
      const raw: number = typeof value === 'number' ? value : 0;
      return {
        name: key,
        value: totalComposition > 0 ? Math.round((raw / totalComposition) * 100) : 0,
        color: getColorForAssetType(key),
        rawValue: formatCurrency(raw),
        raw,
      } as { name: string; value: number; color: string; rawValue: string; raw: number };
    })
    .filter((i: { raw: number }) => i.raw > 0)
    .sort((a: { value: number }, b: { value: number }) => b.value - a.value);

  // KPIs dinâmicos
  const totalAtivos: number = Number(totalComposition);
  const percentualImoveis: number = totalAtivos > 0 ? Math.round(((Number(composition?.['Imóveis']) || 0) / totalAtivos) * 100) : 0;
  const percentualFinanceiroLiquido: number = totalAtivos > 0 ? Math.round(((Number((compositionAdjusted as any)['Investimentos - Financeiros']) || 0) / totalAtivos) * 100) : 0;
  const diversificacao = compositionChartData.length;
  const maiorClasse = compositionChartData[0]?.name || '-';
  const maiorPercentual = compositionChartData[0]?.value || 0;
  const baixaLiquidez = percentualImoveis >= 50;

  // Passivos e patrimônio líquido a partir dos dados consolidados
  const passivos = Array.isArray(fin?.passivos)
    ? fin.passivos
    : (Array.isArray((source as any)?.passivos) ? (source as any).passivos : []);
  const totalPassivos: number = passivos.reduce((sum: number, p: any) => sum + (Number(p?.valor) || 0), 0);
  const patrimonioLiquido: number = totalAtivos - totalPassivos;

  // Lista de ativos para o Balanço: não detalhar subitens de investimentos
  const ativos = Array.isArray(fin?.ativos)
    ? fin.ativos
    : (Array.isArray((source as any)?.ativos) ? (source as any).ativos : []);
  // Captura o ativo de Investimentos (Financeiros) para extrair subitens apenas para exibição
  const investimentosParent = Array.isArray(ativos)
    ? ativos.find((a: any) => {
        const tipo = String(a?.tipo || '').toLowerCase();
        const classe = String(a?.classe || '').toLowerCase();
        return tipo.includes('invest') && classe.includes('financeir');
      })
    : undefined;
  const investimentosSubitens: any[] = Array.isArray((investimentosParent as any)?.subitens)
    ? (investimentosParent as any).subitens
    : [];
  // Monta subitens para exibição, adicionando "Demais Investimentos" como a diferença
  const somaSubitensParent: number = investimentosSubitens.reduce(
    (sum: number, si: any) => sum + (Number(si?.valor) || 0),
    0
  );
  const demaisInvestimentosFromTotal: number = Math.max(0, rawInvestimentos - somaSubitensParent);
  const displayInvestmentSubitems: any[] = (() => {
    if (Array.isArray(investimentosSubitens) && investimentosSubitens.length > 0) {
      const base = [...investimentosSubitens];
      if (demaisInvestimentosFromTotal > 0) base.push({ classe: 'Demais Investimentos', valor: demaisInvestimentosFromTotal });
      return base;
    }
    return investimentosFinanceirosResidual > 0
      ? [{ classe: 'Demais Investimentos', valor: investimentosFinanceirosResidual }]
      : [];
  })();
  const isInvestmentSubitem = (asset: any): boolean => {
    const tipo = String(asset?.tipo || '').toLowerCase();
    const classe = String(asset?.classe || '').toLowerCase();
    const descricao = String(asset?.descricao || '').toLowerCase();
    const haystack = `${tipo} ${classe} ${descricao}`;
    return (
      haystack.includes('invest') ||
      haystack.includes('internacional') ||
      haystack.includes('previd') ||
      haystack.includes('curto prazo')
    );
  };
  const nonInvestmentAssets = ativos.filter((a: any) => !isInvestmentSubitem(a));
  // Regra: mostrar Investimentos - Financeiros sempre por último
  const ativosBalanco = [
    ...nonInvestmentAssets,
    ...(investimentosFinanceirosResidual > 0
      ? [{ tipo: 'Investimentos - Financeiros', valor: investimentosFinanceirosResidual, subitens: displayInvestmentSubitems }] as any[]
      : []),
  ];
  const totalAtivosLista: number = ativosBalanco.reduce((sum: number, a: any) => sum + (Number(a?.valor) || 0), 0);
  const endividamento: number = totalAtivos > 0 ? Number(((totalPassivos / totalAtivos) * 100).toFixed(2)) : 0;
  const rendaTotal: number = Array.isArray(fin?.rendas)
    ? fin.rendas.reduce((sum: number, renda: any) => sum + (Number(renda?.valor) || 0), 0)
    : 0;
  const excedenteMensal: number = ((Array.isArray(fin?.rendas)
    ? fin.rendas.reduce((sum: number, renda: any) => sum + (Number(renda?.valor) || 0), 0)
    : 0) - (Number(fin?.resumo?.despesas_mensais) || 0)) || 0;
  const poupanca: number = rendaTotal > 0 ? Number(((excedenteMensal / rendaTotal) * 100).toFixed(2)) : 0;
  // Corrige despesasMensais: usa resumo.despesas_mensais se existir, senão soma todas as rendas
  const despesasMensais =
    Number(fin?.resumo?.despesas_mensais) ||
    (Array.isArray(fin?.rendas)
      ? fin.rendas.reduce((sum: number, renda: any) => sum + (Number(renda?.valor) || 0), 0)
      : 0);

  // Ativos de curto prazo / alta liquidez (usar mapeamento explícito do JSON)
  const shortTermAssetsExplicit = Array.isArray(fin?.ativos)
    ? fin.ativos.filter((a: any) => {
        const tipo = String(a?.tipo || '').toLowerCase();
        const classe = String(a?.classe || '').toLowerCase();
        return tipo.includes('curto prazo') && classe.includes('alta liquidez');
      })
    : [];

  // Fallback heurístico caso o JSON não traga o par exato (mantém robustez)
  const shortTermKeywords = [
    'selic', 'cdi', 'di', 'poupança', 'poupanca', 'caixa', 'cash', 'reserva', 'emergência', 'emergencia',
    'lci', 'lca', 'cdb', 'renda fixa', 'rf curto', 'curto prazo', 'money market', 'fundo di',
    'conta remunerada', 'tesouro selic', 'pix', 'corrente remunerada'
  ];
  const isShortTerm = (asset: any) => {
    const haystack = `${asset?.classe || ''} ${asset?.descricao || ''} ${asset?.ticker || ''} ${asset?.nome || ''} ${asset?.tipo || ''}`.toLowerCase();
    return shortTermKeywords.some(k => haystack.includes(k));
  };

  const shortTermAssets = shortTermAssetsExplicit.length > 0
    ? shortTermAssetsExplicit
    : (Array.isArray(fin?.ativos) ? fin.ativos.filter((a: any) => isShortTerm(a)) : []);

  // Preferir indicador explícito de curto prazo, se fornecido
  // Complemento: considerar "Reserva de Emergência" vinda dos subitens de Investimentos como curto prazo
  const reservaShortTermFromSubitems: any[] = Array.isArray(investimentosSubitens)
    ? investimentosSubitens.filter((si: any) => {
        const nome = `${si?.classe || ''} ${si?.tipo || ''}`.toLowerCase();
        return nome.includes('reserva') || nome.includes('emerg');
      })
    : [];
  const reservaShortTermValor: number = reservaShortTermFromSubitems.reduce((sum: number, si: any) => sum + (Number(si?.valor) || 0), 0);

  const totalCurtoPrazoIndicador = Number(
    fin?.indicadores?.investimentos_de_curto_prazo?.valor || 0
  );
  const totalCurtoPrazoInferido =
    shortTermAssets.reduce((sum: number, a: any) => sum + (Number(a?.valor) || 0), 0) +
    reservaShortTermValor;
  const totalCurtoPrazo = totalCurtoPrazoIndicador > 0 ? totalCurtoPrazoIndicador : totalCurtoPrazoInferido;
  const numeroAtivosCurtoPrazo = shortTermAssets.length + reservaShortTermFromSubitems.length;
  // Horizonte de cobertura: ativos de curto prazo / custo de vida mensal
  const coberturaMeses = despesasMensais > 0 ? Number((totalCurtoPrazo / despesasMensais).toFixed(1)) : 0;
  const horizonteCobertura = coberturaMeses;
  const metaCoberturaMeses = 12;
  const progressoCoberturaPct = Math.min(100, Math.round((coberturaMeses / metaCoberturaMeses) * 100));
  const progressoCor: 'success' | 'warning' | 'danger' | 'gold' =
    coberturaMeses >= 12 ? 'gold' : coberturaMeses >= 6 ? 'warning' : 'danger';

  // Exposição Geográfica dos Investimentos (Brasil vs Exterior)
  // Denominador: valor total de "Investimentos" informado em composicao_patrimonial
  const totalInvestimentosComposicao: number = Number(((fin?.composicao_patrimonial || (source as any)?.composicao_patrimonial || {}) as any)['Investimentos'] || 0);

  // Numerador (Exterior): Preferir indicador explícito quando existir; senão, inferir pelos ativos
  const valorExteriorIndicadores: number = Number(
    fin?.indicadores?.investimento_internacional?.valor ||
    (data as any)?.indicadores?.investimento_internacional?.valor ||
    0
  );
  const exteriorInvestimentos = Array.isArray(ativos)
    ? ativos.filter((a: any) => {
        const tipo = String(a?.tipo || '').toLowerCase();
        const classe = String(a?.classe || '').toLowerCase();
        return tipo === 'internacional' || (tipo.includes('invest') && classe.includes('internacional'));
      })
    : [];
  const valorExteriorInferido = exteriorInvestimentos.reduce((sum: number, a: any) => sum + (Number(a?.valor) || 0), 0);
  const valorExterior = valorExteriorIndicadores > 0 ? valorExteriorIndicadores : valorExteriorInferido;
  const valorBrasil = Math.max(0, totalInvestimentosComposicao - valorExterior);
  const pctExterior = totalInvestimentosComposicao > 0 ? Math.round((valorExterior / totalInvestimentosComposicao) * 100) : 0;
  const pctBrasil = totalInvestimentosComposicao > 0 ? 100 - pctExterior : 0;
  const recomendacaoExteriorPct = 18;
  const deltaExteriorPct = recomendacaoExteriorPct - pctExterior;

  const geoExposureData = [
    { name: 'Brasil', value: pctBrasil, color: '#36557C', rawValue: formatCurrency(valorBrasil), raw: valorBrasil },
    { name: 'Exterior', value: pctExterior, color: '#B8860B', rawValue: formatCurrency(valorExterior), raw: valorExterior }
  ].filter(i => i.raw > 0);

  // Alerta: somente avisar quando abaixo da recomendação. Se estiver igual ou acima, considerar ok.
  const alertClass = deltaExteriorPct > 0
    ? 'bg-[#E52B50]/10 text-[#E52B50]'
    : 'bg-[#21887C]/10 text-[#21887C]';


  return (
    <section className="min-h-screen py-16 px-4" id="total-asset-allocation">
      <div className="section-container">
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
            <h2 className="heading-2 mb-3">{sectionNumber}. Gestão de Ativos</h2>
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
              <CardTitle className="card-title-standard text-lg">Balanço Patrimonial</CardTitle>
              <CardDescription>Consolidação de ativos, passivos e patrimônio líquido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="card-grid-3">
                <div className="card-metric">
                  <h3 className="card-metric-label">Total de Ativos</h3>
                  <div className="card-metric-value">{formatCurrency(totalAtivos)}</div>
                </div>
                <div className="card-metric">
                  <h3 className="card-metric-label">Total de Passivos</h3>
                  <div className="card-metric-value">{formatCurrency(totalPassivos)}</div>
                </div>
                <div className="card-metric">
                  <h3 className="card-metric-label">Patrimônio Líquido</h3>
                  <div className="card-metric-value">{formatCurrency(patrimonioLiquido)}</div>
                </div>
              </div>
              <div className="card-divider">
                <div className="card-grid-2">
                  <div>
                    <h4 className="heading-3 mb-4">Ativos</h4>
                    <div className="card-list">
                      {ativosBalanco.map((asset: any, index: number) => {
                        const valorExibido = Number(asset?.valor) || 0;

                        // Layout especial quando há subitens (Investimentos - Financeiros)
                        if (asset?.tipo === 'Investimentos - Financeiros' && Array.isArray(asset?.subitens) && asset.subitens.length > 0) {
                          const nested = asset.subitens as any[];

                          return (
                            <>
                              <div key={`asset-${index}`} className="card-list-item">
                                <span className="card-list-label">{asset?.tipo}</span>
                                <div className="card-flex-between">
                                  <span className="card-list-value">{formatCurrency(valorExibido)}</span>
                                  <span className="card-list-percentage">({totalAtivosLista > 0 ? Math.round((valorExibido / totalAtivosLista) * 100) : 0}%)</span>
                                </div>
                              </div>
                              {nested.map((si: any, i: number) => (
                                <div key={`si-${index}-${i}`} className="pl-5 ml-1 border-l border-border/30 py-1 flex items-center justify-between text-sm text-muted-foreground">
                                  <span>{si?.classe || si?.tipo || 'Subitem'}</span>
                                  <span className="font-medium">{formatCurrency(Number(si?.valor) || 0)}</span>
                                </div>
                              ))}
                            </>
                          );
                        }

                        // Layout padrão para demais ativos
                        return (
                          <div key={index} className="card-list-item">
                            <span className="card-list-label">{asset?.tipo}{asset?.classe ? ` - ${asset.classe}` : ''}</span>
                            <div className="card-flex-between">
                              <span className="card-list-value">{formatCurrency(valorExibido)}</span>
                              <span className="card-list-percentage">({totalAtivosLista > 0 ? Math.round((valorExibido / totalAtivosLista) * 100) : 0}%)</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="card-divider card-list-item">
                        <span className="font-semibold">Total de Ativos</span>
                        <span className="font-semibold">{formatCurrency(totalAtivosLista)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="heading-3 mb-4">Passivos</h4>
                    {passivos && passivos.length > 0 ? (
                      <div className="card-list">
                        {passivos.map((liability: any, index: number) => (
                          <div key={index} className="card-list-item">
                            <span className="card-list-label">{liability?.tipo}</span>
                            <div className="card-flex-between">
                              <span className="card-list-value">{formatCurrency(Number(liability?.valor) || 0)}</span>
                              <span className="card-list-percentage">({totalPassivos > 0 ? Math.round(((Number(liability?.valor) || 0) / totalPassivos) * 100) : 0}%)</span>
                            </div>
                          </div>
                        ))}
                        <div className="card-divider card-list-item">
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
              <CardTitle className="card-title-standard text-lg">Visão do Patrimônio</CardTitle>
              <CardDescription>
                Análise técnica e recomendações para otimização patrimonial
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Composição Patrimonial */}
              {compositionChartData && compositionChartData.length > 0 && (
                <div className="mb-8">
                  <h3 className="heading-3 mb-4">Composição Patrimonial</h3>
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

              {/* Exposição Geográfica dos Investimentos Financeiros */}
              <div className="mb-8">
                <h3 className="heading-3 mb-4">Exposição Geográfica dos Investimentos Financeiros</h3>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <DonutChart
                    data={geoExposureData}
                    height={240}
                    innerRadius={60}
                    outerRadius={90}
                    legendPosition="side"
                  />
                  <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border/50 bg-muted/10 text-center min-w-0">
                  <div className="text-xs text-muted-foreground whitespace-normal break-words">Exterior</div>
                  <div className="text-base sm:text-lg font-semibold">{formatCurrency(valorExterior)}</div>
                  <div className="text-sm text-muted-foreground">({pctExterior}%)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/50 bg-muted/10 text-center min-w-0">
                  <div className="text-xs text-muted-foreground whitespace-normal break-words">Brasil</div>
                  <div className="text-base sm:text-lg font-semibold">{formatCurrency(valorBrasil)}</div>
                  <div className="text-sm text-muted-foreground">({pctBrasil}%)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border/50 bg-muted/10 text-center min-w-0">
                  <div className="text-xs text-muted-foreground whitespace-normal break-words">Recomendação Exterior</div>
                  <div className="text-base sm:text-lg font-semibold">18%</div>
                  </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                  <div className={`p-2 rounded-md ${alertClass}`}>
                    {deltaExteriorPct > 0 ? (
                      <span>Exposição ao exterior abaixo do recomendado em {Math.abs(deltaExteriorPct)} p.p.</span>
                    ) : (
                      <span>Exposição ao exterior alinhada à recomendação.</span>
                    )}
                  </div>
                  </div>

                  <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Comparação vs. Meta (18% no exterior)</div>
                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  <div className="absolute inset-y-0 left-0" style={{ width: `${pctExterior}%`, backgroundColor: '#B8860B' }} />
                  <div className="absolute inset-y-0" style={{ left: `${pctExterior}%`, width: `${pctBrasil}%`, backgroundColor: '#36557C' }} />
                    <div className="absolute -top-1 bottom-0" style={{ left: `${recomendacaoExteriorPct}%` }}>
                        <div className="w-0.5 h-4" style={{ backgroundColor: pctExterior >= recomendacaoExteriorPct ? '#21887C' : '#B8860B' }}></div>
                          </div>
                    </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>Exterior {pctExterior}%</span>
                  <span>Meta Exterior 18%</span>
                  <span>Brasil {pctBrasil}%</span>
                  </div>
                  </div>
                  </div>
                </div>
              </div>

              {/* Resumo Executivo (dinâmico) */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <h3 className="card-metric-label">Total de Ativos</h3>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(totalAtivos)}</div>
                  <div className="text-sm text-muted-foreground">Patrimônio Total</div>
                </div>

                <div className="text-center">
                  <h3 className="card-metric-label">% Imobilizado</h3>
                  <div className="text-3xl font-bold mb-1 {percentualImoveis>=50?'text-destructive':''}">{percentualImoveis}%</div>
                  {/* <div className="text-sm text-muted-foreground">{baixaLiquidez ? 'Alta concentração' : 'Equilíbrio'}</div> */}
                </div>

                <div className="text-center">
                  <h3 className="card-metric-label">Diversificação</h3>
                  <div className="text-3xl font-medium mb-1 text-foreground">{diversificacao}</div>
                  <div className="text-sm text-muted-foreground">Classes de ativos</div>
                </div>
              </div>

              {/* Diagnóstico Consolidado */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Indicadores de Liquidez (mantidos aqui) */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="heading-3 mb-4">Indicador de Liquidez</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/10 rounded-lg border border-border/50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Horizonte de Cobertura</span>
                        <span className="text-foreground font-medium">{horizonteCobertura} meses</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                       
                        <span>Valor total de Ativos de Curto Prazo: {formatCurrency(totalCurtoPrazo)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                        <span></span>
                        <span className="text-foreground font-medium">Recomendação Alta Vista: {metaCoberturaMeses} meses</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">Cálculo: "Curto Prazo - Alta Liquidez" / Despesas mensais</div>
                      <div className="mt-3">
                        <ProgressBar
                          value={coberturaMeses}
                          max={metaCoberturaMeses}
                          size="sm"
                          color={progressoCor}
                        />
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                          <span>0</span>
                          <span>Meta: {metaCoberturaMeses} meses</span>
                          <span>{progressoCoberturaPct}%</span>
                        </div>
                      </div>
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
