import React from 'react';
import { BarChart, Wallet, PiggyBank, LineChart, Calculator, Calendar, ArrowRight, AlertCircle, TrendingUp, Shield, Globe, Target, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { formatCurrency } from '@/utils/formatCurrency';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import RetirementProjectionChart from '@/components/charts/RetirementProjectionChart';
import { useCardVisibility } from '@/context/CardVisibilityContext';

interface RetirementData {
  ativos: Array<{ tipo: string; valor: number }>;
  passivos: Array<{ tipo: string; valor: number }>;
  patrimonioLiquido: number;
  excedenteMensal: number;
  totalInvestido: number;
  rendaMensalDesejada: number;
  idadeAposentadoria: number;
  patrimonioAlvo: number;
  idadeAtual: number;
  expectativaVida: number;
  cenarios: any[];
  perfilInvestidor: string;
  alocacaoAtivos: any[];
  anosRestantes: number;
  aporteMensalRecomendado: number;
  possuiPGBL: boolean;
  valorPGBL: number;
  taxaRetiradaSegura: number;
  taxaInflacao: number;
  taxaJurosReal: number;
}

interface RetirementPlanningProps {
  data: RetirementData;
  hideControls?: boolean;
}

const RetirementPlanning: React.FC<RetirementPlanningProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const currentSituationRef = useScrollAnimation();
  const objetivoRef = useScrollAnimation();
  const projecaoRef = useScrollAnimation();

  const { isCardVisible, toggleCardVisibility } = useCardVisibility();
  const [projectionData, setProjectionData] = React.useState<{
    capitalNecessario: number;
    aporteMensal: number;
    idadeEsgotamento: number | null;
    rendaMensal: number;
    idadeAposentadoria: number;
  }>({
    capitalNecessario: 0,
    aporteMensal: 0,
    idadeEsgotamento: null,
    rendaMensal: data?.rendaMensalDesejada || 0,
    idadeAposentadoria: data?.idadeAposentadoria || 65
  });

  // Valores declarados pelo cliente (não mudam com a simulação)
  const [declaredGoal, setDeclaredGoal] = React.useState<{ rendaMensalPretendida: number; idadeAposentadoriaPretendida: number }>({
    rendaMensalPretendida: data?.rendaMensalDesejada || 0,
    idadeAposentadoriaPretendida: data?.idadeAposentadoria || 65,
  });

  // Calculate percentage of income that should be invested (aligned with spreadsheet)
  const percentualInvestir = () => {
    if (!data?.excedenteMensal || !projectionData.aporteMensal) return 0;
    return Math.round((projectionData.aporteMensal / data.excedenteMensal) * 100);
  };

  // Calculate percentage increase needed
  const percentualAumento = () => {
    if (!data?.excedenteMensal || !projectionData.aporteMensal) return 0;
    if (projectionData.aporteMensal <= data.excedenteMensal) return 0;
    return Math.round(((projectionData.aporteMensal - data.excedenteMensal) / data.excedenteMensal) * 100);
  };

  // Calculate if contribution needs to be increased
  const calcularAumentoAporte = () => {
    if (!data?.excedenteMensal || !projectionData.aporteMensal) return 0;
    return Math.max(0, projectionData.aporteMensal - data.excedenteMensal);
  };

  // Check if contribution needs to be increased
  const precisaAumentarAporte = () => {
    return calcularAumentoAporte() > 0;
  };

  // Get recommended monthly investment (aligned with spreadsheet)
  const getAporteRecomendado = () => {
    return data?.aporteMensalRecomendado || 0;
  };

  // Check if client fits the scenarios (aligned with spreadsheet)
  const adequaAosCenarios = () => {
    return data?.aporteMensalRecomendado <= (data?.excedenteMensal || 0);
  };

  // Calculate missing percentage (aligned with spreadsheet)
  const calcularPorcentagemFaltante = () => {
    if (!data?.aporteMensalRecomendado || !data.excedenteMensal) return 0;
    if (data.aporteMensalRecomendado <= data.excedenteMensal) return 0;

    const faltante = data.aporteMensalRecomendado - data.excedenteMensal;
    return Math.round((faltante / data.excedenteMensal) * 100);
  };

  // Calculate necessary income reduction (aligned with spreadsheet)
  const calcularReducaoRendaNecessaria = () => {
    if (!data?.rendaMensalDesejada || !data.excedenteMensal || !data?.aporteMensalRecomendado) return 0;

    if (data.aporteMensalRecomendado <= data.excedenteMensal) return 0;

    const porcentagemReducao = Math.round(
      (1 - (data.excedenteMensal / data.aporteMensalRecomendado)) * 100
    );
    return porcentagemReducao > 0 ? porcentagemReducao : 0;
  };

  return (
    <section className="min-h-screen py-16 px-4" id="retirement">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="card-flex-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <PiggyBank size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="heading-2 mb-3">3. Planejamento de Aposentadoria</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Estratégias e projeções para garantir sua independência financeira e
              qualidade de vida na aposentadoria.
            </p>
          </div>
        </div>

        <div
          ref={currentSituationRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-1"
        >
          <HideableCard
            id="situacao-financeira"
            isVisible={isCardVisible("situacao-financeira")}
            onToggleVisibility={() => toggleCardVisibility("situacao-financeira")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="card-title-standard text-lg">Situação Financeira Atual</CardTitle>
              <CardDescription>
                Análise do seu patrimônio e fluxo financeiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="card-grid-3">
                <div className="card-metric">
                  <h3 className="card-metric-label">Investimentos Financeiros Atuais</h3>
                  <div className="card-metric-value">
                    {formatCurrency(
                      (data?.totalInvestido ??
                        (data?.ativos
                          ?.filter(asset => asset.tipo === 'Investimentos')
                          .reduce((sum, asset) => sum + asset.valor, 0))) || 0
                    )}
                  </div>
                </div>
                <div className="card-metric">
                  <h3 className="card-metric-label">Excedente Mensal</h3>
                  <div className="card-metric-value">
                    {formatCurrency(data?.excedenteMensal || 0)}
                  </div>
                </div>
                <div className="card-metric">
                  <h3 className="card-metric-label">Patrimônio Líquido</h3>
                  <div className="card-metric-value">
                    {formatCurrency(data.ativos.reduce((sum, asset) => sum + asset.valor, 0) - data.passivos.reduce((sum, liability) => sum + liability.valor, 0))}
                  </div>
                </div>
              </div>

        


            </CardContent>
          </HideableCard>
        </div>

        <div
          ref={objetivoRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-2"
        >
          <HideableCard
            id="objetivo-aposentadoria"
            isVisible={isCardVisible("objetivo-aposentadoria")}
            onToggleVisibility={() => toggleCardVisibility("objetivo-aposentadoria")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="card-title-standard text-lg">Objetivo de Aposentadoria</CardTitle>
              <CardDescription>
                Baseado nas suas preferências e estilo de vida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Registro fixo do objetivo informado (apresentação simplificada) */}
              <div className="p-3 rounded-md border border-border/70 bg-muted/20 text-sm">
                <div className="font-medium">Objetivo registrado</div>
                <div className="text-muted-foreground mt-0.5">Renda passiva pretendida: <span className="font-semibold">{formatCurrency(declaredGoal.rendaMensalPretendida)}</span></div>
                <div className="text-muted-foreground">Idade de aposentadoria: <span className="font-semibold">{declaredGoal.idadeAposentadoriaPretendida} anos</span></div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                  <Calendar size={28} className="text-financial-info mb-2" />
                  <div className="text-sm text-muted-foreground">Idade Planejada</div>
                  <div className="text-xl font-semibold mt-1">
                    {projectionData.idadeAposentadoria} anos
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ({projectionData.idadeAposentadoria - (data?.idadeAtual || 0)} anos restantes)
                  </div>
                </div>

                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                  <Calculator size={28} className="text-financial-success mb-2" />
                  <div className="text-sm text-muted-foreground">Renda Mensal Desejada</div>
                  <div className="text-xl font-semibold mt-1">
                    {formatCurrency(projectionData.rendaMensal)}
                  </div>
                </div>

                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                  <PiggyBank size={28} className="text-financial-highlight mb-2" />
                  <div className="text-sm text-muted-foreground">Investimentos Financeiros Alvo</div>
                  <div className="text-xl font-semibold mt-1">
                    {formatCurrency(Math.round(projectionData.capitalNecessario))}
                  </div>
                </div>
              </div>

              <div className="bg-muted/10 border border-border/80 rounded-lg p-4">
                <h4 className="font-medium mb-2">Premissas Utilizadas (alinhadas com a planilha)</h4>
                <ul className="grid md:grid-cols-2 gap-2">
                  <li className="flex items-start text-sm">
                    <ArrowRight size={16} className="mt-1 mr-2 text-accent" />
                    <span>Taxa de juros real de {(data?.taxaJurosReal || 0.03) * 100}% a.a. (acumulação e consumo)</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <ArrowRight size={16} className="mt-1 mr-2 text-accent" />
                    <span>Expectativa de vida até {data?.expectativaVida || 100} anos</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <ArrowRight size={16} className="mt-1 mr-2 text-accent" />
                    <span>Cálculo do capital necessário usando Valor Presente (PV) de saques mensais</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </HideableCard>
        </div>

        <div
          ref={projecaoRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-2"
        >
          <HideableCard
            id="projecao-patrimonial"
            isVisible={isCardVisible("projecao-patrimonial")}
            onToggleVisibility={() => toggleCardVisibility("projecao-patrimonial")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="card-title-standard text-lg">Projeção Financeira</CardTitle>
              <CardDescription>
                Análise da evolução do seu patrimônio ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RetirementProjectionChart
                currentAge={data?.idadeAtual || 0}
                retirementAge={data?.idadeAposentadoria || 65}
                lifeExpectancy={data?.expectativaVida || 100}
                currentPortfolio={data?.totalInvestido || 0}
                monthlyContribution={data?.excedenteMensal || 0}
                rendaMensalDesejada={data?.rendaMensalDesejada || 0}
                safeWithdrawalRate={data?.taxaRetiradaSegura || 0.03}
                inflationRate={data?.taxaInflacao || 0.0345}
                scenarios={data?.cenarios || []}
                onProjectionChange={setProjectionData}
                hideControls={hideControls}
              />
            </CardContent>
          </HideableCard>
        </div>


      </div>
    </section >
  );
};

export default RetirementPlanning;