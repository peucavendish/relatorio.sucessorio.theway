import React, { useState, useEffect } from 'react';
import { BarChart, Wallet, PiggyBank, LineChart, Calculator, Calendar, ArrowRight, AlertCircle, TrendingUp, Shield, Globe, Target, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { formatCurrency } from '@/utils/formatCurrency';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import RetirementProjectionChart, { calculateRetirementProjection, LiquidityEvent } from '@/components/charts/RetirementProjectionChart';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { getLiquidityEvents, LiquidityEventApi } from '@/services/liquidityEventsService';


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
  rendas?: Array<{ fonte?: string; descricao?: string; valor: number; tributacao?: string; renda_passiva?: boolean }>; 
  objetivos?: Array<{ tipo?: string; valor?: number; prazo?: string | number; prioridade?: any; nao_aposentadoria?: boolean }>;
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
  
  // Verifica se o cliente já está aposentado
  const isAlreadyRetired = (data?.idadeAtual || 0) >= (data?.idadeAposentadoria || 65);

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

  // Estado para armazenar eventos de liquidez
  const [liquidityEvents, setLiquidityEvents] = useState<Array<{
    id: string;
    name: string;
    value: number;
    isPositive: boolean;
    recurrence?: 'once' | 'annual' | 'monthly';
    startAge: number;
    endAge?: number | null;
    enabled?: boolean;
  }>>([]);
  const [eventsVersion, setEventsVersion] = useState(0); // Adicionar versão para forçar atualização
  const [taxaRetornoReal, setTaxaRetornoReal] = useState<number>(data?.taxaJurosReal || 0.03); // Estado para taxa de retorno real editável
  const isUpdatingFromChartRef = React.useRef(false); // Ref para evitar reload da API quando já recebemos atualização via callback

  // Sincronizar taxa quando data mudar (ex: quando componente é recarregado com novos dados)
  useEffect(() => {
    if (data?.taxaJurosReal !== undefined) {
      setTaxaRetornoReal(data.taxaJurosReal);
    }
  }, [data?.taxaJurosReal]);

  // Handler para receber eventos diretamente do gráfico (sincronização imediata)
  const handleLiquidityEventsChangeFromChart = React.useCallback((events: LiquidityEvent[]) => {
    // Marcar que estamos atualizando via callback para evitar reload da API
    isUpdatingFromChartRef.current = true;
    
    // Converter para o formato esperado
    const formattedEvents = events.map(e => ({
      id: e.id,
      name: e.name,
      value: e.value,
      isPositive: e.isPositive,
      recurrence: e.recurrence || 'once',
      startAge: e.startAge ?? e.age ?? 0,
      endAge: e.endAge ?? null,
      enabled: e.enabled !== false // Garantir que enabled seja sempre booleano explícito (true ou false)
    }));
    
    // Usar função de atualização funcional para garantir que não há race conditions
    setLiquidityEvents(() => formattedEvents);
    
    setEventsVersion(v => v + 1);
    
    // Resetar o flag após um delay maior para evitar reload da API
    // O delay deve ser maior que o delay usado no syncEventsToApi para disparar o evento
    // Aumentar para 3 segundos para garantir que a API terminou de salvar antes de permitir reload
    setTimeout(() => {
      isUpdatingFromChartRef.current = false;
    }, 3000); // 3 segundos de delay para garantir que a API terminou de salvar
  }, []);

  // Função para obter o session_id da URL
  const getSessionId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId');
  };

  // Carregar eventos de liquidez da API
  useEffect(() => {
    const loadLiquidityEvents = async (skipIfUpdating = false) => {
      const sessionId = getSessionId();
      if (!sessionId) return;

      // Se estamos atualizando via callback, não recarregar da API
      if (skipIfUpdating && isUpdatingFromChartRef.current) {
        return;
      }

      try {
        const apiEvents = await getLiquidityEvents(sessionId);
        const events = apiEvents.map((event, index) => ({
          id: `event-${index}`,
          name: event.nome || '',
          startAge: Number(event.idade || 0),
          value: Number(event.valor || 0),
          isPositive: event.tipo === 'entrada',
          recurrence: (event.recorrencia === 'anual' ? 'annual' :
            event.recorrencia === 'mensal' ? 'monthly' : 'once') as 'once' | 'annual' | 'monthly',
          endAge: event.termino ? Number(event.termino) : null,
          enabled: (event.status ?? 1) !== 0 // Preservar o estado enabled/disabled da API
        }));
        
        // Só atualizar se realmente mudou E se não estamos atualizando via callback
        setLiquidityEvents(prevEvents => {
          // Se estamos atualizando via callback, não sobrescrever
          if (isUpdatingFromChartRef.current) {
            return prevEvents;
          }
          
          // Comparar se os eventos realmente mudaram (comparar valores, não IDs)
          // Normalizar enabled para boolean explícito antes de comparar
          const normalizeEnabled = (e: any) => e.enabled === true ? true : false;
          const prevEventsSerialized = JSON.stringify(prevEvents.map(e => ({
            name: e.name,
            startAge: e.startAge,
            value: e.value,
            isPositive: e.isPositive,
            recurrence: e.recurrence,
            endAge: e.endAge,
            enabled: normalizeEnabled(e)
          })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
          
          const newEventsSerialized = JSON.stringify(events.map(e => ({
            name: e.name,
            startAge: e.startAge,
            value: e.value,
            isPositive: e.isPositive,
            recurrence: e.recurrence,
            endAge: e.endAge,
            enabled: normalizeEnabled(e)
          })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
          
          if (prevEventsSerialized === newEventsSerialized && prevEvents.length > 0) {
            return prevEvents; // Manter estado local
          }
          
          return events; // Atualizar apenas se realmente mudou
        });
        setEventsVersion(v => v + 1); // Incrementar versão para forçar atualização
      } catch (error) {
        console.error('Error loading liquidity events:', error);
      }
    };

    loadLiquidityEvents();
    
    // OBSERVACAO: Não usar mais o listener 'liquidityEventsUpdated' porque causa conflito
    // com o callback direto onLiquidityEventsChange. O callback já garante atualização imediata.
    // Se precisarmos de sincronização entre abas, podemos usar isso novamente com melhor lógica.
    
    // Recarregar eventos quando a janela receber foco (para pegar atualizações feitas em outra aba/componente)
    const handleFocus = () => {
      // Não recarregar se estamos atualizando via callback
      if (!isUpdatingFromChartRef.current) {
        loadLiquidityEvents();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Recarregar eventos periodicamente (a cada 8 segundos) para pegar atualizações de outras abas
    // Aumentar intervalo para evitar conflito com salvamento local
    const interval = setInterval(() => {
      // Não recarregar se estamos atualizando via callback
      if (!isUpdatingFromChartRef.current) {
        loadLiquidityEvents(false); // Não skip reload se não estamos atualizando
      } else {
        console.log('Pulando reload periódico - atualização via callback em andamento');
      }
    }, 8000); // Aumentar para 8 segundos para evitar race conditions
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Combinar eventos de liquidez da API com eventos externos (rendas passivas sugeridas)
  const allLiquidityEvents = React.useMemo(() => {
    const idadeAtual = data?.idadeAtual || 0;
    const idadeAposentadoria = data?.idadeAposentadoria || idadeAtual;
    
    const externalEvents: LiquidityEvent[] = (Array.isArray(data?.rendas) ? data.rendas : [])
      .filter((r: any) => r && r.renda_passiva === true && Number(r.valor) > 0)
      .map((r: any, idx: number) => ({
        id: `suggest-passive-${idx}`,
        name: `${r.descricao || r.fonte || 'Renda passiva'}`,
        value: Number(r.valor) || 0,
        isPositive: true,
        recurrence: 'monthly' as const,
        startAge: idadeAposentadoria,
        endAge: null,
        enabled: true
      }));
    
    // Retornar novo array para garantir que useMemo detecte mudanças
    // Usar JSON.stringify para criar uma chave única que muda quando o conteúdo muda
    const combined = [...liquidityEvents, ...externalEvents];
    
    return combined;
  }, [liquidityEvents, data?.rendas, data?.idadeAposentadoria, eventsVersion]);

  // Calcula a renda mensal sustentável para clientes aposentados (zera exatamente aos 100 anos)
  // Usa busca binária sobre a renda, simulando o fluxo com eventos, para alinhar gráfico e tabela
  const calcularRendaSustentavel = React.useMemo(() => {
    if (!isAlreadyRetired) return 0;
    
    const capital = data?.totalInvestido || 0;
    const taxaRetorno = taxaRetornoReal; // Usar o estado editável em vez de data
    const idadeAtual = data?.idadeAtual || 0;
    const idadeAposentadoria = data?.idadeAposentadoria || idadeAtual;
    const expectativaVida = 100; // horizonte fixo para aposentados
    const excedenteMensal = data?.excedenteMensal || 0;
    
    // Criar uma string serializada dos eventos para garantir detecção de mudanças
    // Filtrar apenas eventos ativos para o cálculo
    const activeEvents = allLiquidityEvents.filter(e => e.enabled !== false);
    const eventosSerializados = JSON.stringify(activeEvents.map(e => ({
      id: e.id,
      value: e.value,
      isPositive: e.isPositive,
      recurrence: e.recurrence,
      startAge: e.startAge,
      endAge: e.endAge,
      enabled: e.enabled
    })));
    
    console.log('Recalculando renda sustentável', {
      capital,
      taxaRetorno,
      idadeAtual,
      idadeAposentadoria,
      expectativaVida,
      eventosCount: allLiquidityEvents.length,
      eventosAtivos: activeEvents.length,
      eventosInativos: allLiquidityEvents.filter(e => e.enabled === false).length,
      eventos: allLiquidityEvents.map(e => ({ id: e.id, name: e.name, enabled: e.enabled, value: e.value })),
      eventsVersion,
      eventosSerializadosHash: eventosSerializados.substring(0, 50) // Primeiros 50 chars para debug
    });
    
    // Encontrar renda que esgota exatamente aos 100 anos usando bisseção
    const targetAge = 100;
    const testIncome = (income: number): number | null => {
      const res = calculateRetirementProjection(
        idadeAtual,
        idadeAposentadoria,
        expectativaVida,
        capital,
        excedenteMensal,
        income,
        taxaRetorno,
        taxaRetorno,
        allLiquidityEvents,
        false,        // isPerpetuity
        0,            // overrideAporteMensal: aposentado não aporta
        true,         // lockWithdrawalToTarget: travar saques na renda testada
        false,        // forceFinalZeroAtEnd: NÃO forçar zerar no último ano durante a busca
        100           // overrideEndAge: buscar renda que esgota aos 100 anos
      );
      return res.idadeEsgotamento; // null => não esgota até targetAge; número => idade do esgotamento
    };

    // Se com renda 0 já esgota antes de 100, renda sustentável é 0
    const minAge = testIncome(0);
    if (minAge != null && minAge < targetAge) {
      console.log('Com renda 0 esgota antes da idade alvo. Renda sustentável = 0');
      return 0;
    }

    // Buscar limite superior que faça esgotar antes do alvo
    let low = 0;
    let high = Math.max(100, (data?.rendaMensalDesejada || 0));
    let ageHigh = testIncome(high);
    let guard = 0;
    while ((ageHigh == null || ageHigh >= targetAge) && guard < 24) {
      high *= 1.6;
      ageHigh = testIncome(high);
      guard++;
    }

    // Bisseção
    for (let i = 0; i < 28; i++) {
      const mid = (low + high) / 2;
      const age = testIncome(mid);
      if (age == null || age > targetAge) {
        low = mid; // ainda sobra após o alvo
      } else if (age < targetAge) {
        high = mid; // esgota antes do alvo
      } else {
        console.log('Renda sustentável encontrada (exato):', mid);
        return mid;
      }
    }
    const renda = (low + high) / 2;
    console.log('Renda sustentável encontrada (aprox):', renda);
    return renda;
  }, [
    isAlreadyRetired, 
    data?.totalInvestido, 
    taxaRetornoReal, // Usar estado editável em vez de data?.taxaJurosReal
    data?.idadeAtual, 
    data?.idadeAposentadoria, 
    data?.expectativaVida, 
    data?.excedenteMensal, 
    allLiquidityEvents, // Array de eventos
    eventsVersion, // Versão para forçar atualização
    // Adicionar serialização dos eventos como dependência adicional para garantir recálculo
    // quando o conteúdo dos eventos mudar (mesmo que a referência do array não mude)
    // Usar apenas eventos ativos na serialização
    JSON.stringify(allLiquidityEvents.filter(e => e.enabled !== false).map(e => ({
      id: e.id,
      value: e.value,
      isPositive: e.isPositive,
      recurrence: e.recurrence,
      startAge: e.startAge,
      endAge: e.endAge,
      enabled: e.enabled
    })))
  ]);

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
            <h2 className="heading-2 mb-3">
              {isAlreadyRetired ? 'Gestão de Patrimônio na Aposentadoria' : 'Planejamento de Aposentadoria'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isAlreadyRetired 
                ? 'Análise do seu patrimônio atual e sustentabilidade da sua renda mensal ao longo do tempo.'
                : 'Estratégias e projeções para garantir sua independência financeira e qualidade de vida na aposentadoria.'
              }
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
              <CardTitle className="card-title-standard text-lg">
                {isAlreadyRetired ? 'Situação Atual da Aposentadoria' : 'Objetivo de Aposentadoria'}
              </CardTitle>
              <CardDescription>
                {isAlreadyRetired 
                  ? 'Sua renda mensal e sustentabilidade do patrimônio'
                  : 'Baseado nas suas preferências e estilo de vida'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Registro fixo do objetivo informado (apresentação simplificada) */}
              {!isAlreadyRetired && (
                <div className="p-3 rounded-md border border-border/70 bg-muted/20 text-sm">
                  <div className="font-medium">Objetivo registrado</div>
                  <div className="text-muted-foreground mt-0.5">Renda na aposentadoria: <span className="font-semibold">{formatCurrency(declaredGoal.rendaMensalPretendida)}</span></div>
                  <div className="text-muted-foreground">Idade de aposentadoria: <span className="font-semibold">{declaredGoal.idadeAposentadoriaPretendida} anos</span></div>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-6">
                {!isAlreadyRetired && (
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
                )}

                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                  <Calculator size={28} className="text-financial-success mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {isAlreadyRetired ? 'Renda Mensal Desejada' : 'Renda Mensal Desejada'}
                  </div>
                  <div className="text-xl font-semibold mt-1">
                    {formatCurrency(projectionData.rendaMensal)}
                  </div>
                </div>

                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                  <PiggyBank size={28} className="text-financial-highlight mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {isAlreadyRetired ? 'Patrimônio Atual' : 'Investimentos Financeiros Alvo'}
                  </div>
                  <div className="text-xl font-semibold mt-1">
                    {formatCurrency(Math.round(isAlreadyRetired ? (data?.totalInvestido || 0) : projectionData.capitalNecessario))}
                  </div>
                </div>
                
                {isAlreadyRetired && (
                  <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                    <Calendar size={28} className="text-financial-info mb-2" />
                    <div className="text-sm text-muted-foreground">Idade Atual</div>
                    <div className="text-xl font-semibold mt-1">
                      {data?.idadeAtual || 0} anos
                    </div>
                  </div>
                )}
              </div>

              {/* Card de renda sustentável para clientes aposentados */}
              {isAlreadyRetired && (
                <div className="mt-6 p-4 rounded-lg border-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30" style={{ borderColor: '#21887C' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
                      <TrendingUp size={24} className="text-green-700 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 dark:text-green-100">Renda Mensal Sustentável</h4>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Calculada para durar até {data?.expectativaVida || 100} anos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold" style={{ color: '#21887C' }}>
                      {formatCurrency(calcularRendaSustentavel)}
                    </div>
                    <div className="text-sm text-muted-foreground">/mês</div>
                  </div>
                  <div className="mt-3 text-xs text-green-700 dark:text-green-300">
                    {calcularRendaSustentavel >= (projectionData.rendaMensal || 0) ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-600" />
                        Seu patrimônio suporta a renda desejada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={14} className="text-amber-600" />
                        Renda desejada ({formatCurrency(projectionData.rendaMensal)}) excede a sustentável
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                onTaxaRetornoChange={setTaxaRetornoReal} // Callback para atualizar taxa quando mudar no gráfico
                onLiquidityEventsChange={handleLiquidityEventsChangeFromChart} // Callback para atualizar eventos quando mudarem no gráfico
                hideControls={hideControls}
                externalLiquidityEvents={(() => {
                  const idadeAtual = Number(data?.idadeAtual) || 0;
                  const aposentadoria = Number(data?.idadeAposentadoria) || 65;

                  // Somente sugestões de rendas passivas (para inclusão manual próxima ao gráfico)
                  const passiveIncomeSuggestions = (Array.isArray(data?.rendas) ? data.rendas : [])
                    .filter((r: any) => r && r.renda_passiva === true && Number(r.valor) > 0)
                    .map((r: any, idx: number) => ({
                      id: `suggest-passive-${idx}`,
                      name: `${r.descricao || r.fonte || 'Renda passiva'}`,
                      value: Number(r.valor) || 0,
                      isPositive: true,
                      recurrence: 'monthly' as const,
                      startAge: aposentadoria,
                      endAge: null,
                      enabled: true
                    }));

                  return passiveIncomeSuggestions;
                })()}
              />
            </CardContent>
          </HideableCard>
        </div>


      </div>
    </section >
  );
};

export default RetirementPlanning;