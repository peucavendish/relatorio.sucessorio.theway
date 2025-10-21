import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { CardVisibilityProvider } from '@/context/CardVisibilityContext';
import { SectionVisibilityProvider } from '@/context/SectionVisibilityContext';
import Header from '@/components/layout/Header';
import CoverPage from '@/components/sections/CoverPage';
import FinancialSummary from '@/components/sections/FinancialSummary';
import RetirementPlanning from '@/components/sections/RetirementPlanning';
import TotalAssetAllocation from '@/components/sections/TotalAssetAllocation';
import BeachHouse from '@/components/sections/BeachHouse';
import TaxPlanning from '@/components/sections/TaxPlanning';
import ProtectionPlanning from '@/components/sections/ProtectionPlanning';
import SuccessionPlanning from '@/components/sections/SuccessionPlanning';
import ActionPlan from '@/components/sections/ActionPlan';
import ImplementationMonitoring from '@/components/sections/ImplementationMonitoring';
import FloatingActions from '@/components/layout/FloatingActions';
import { DotNavigation, MobileDotNavigation } from '@/components/layout/DotNavigation';
import { useSectionObserver } from '@/hooks/useSectionObserver';
import { Loader2 } from 'lucide-react';
import PrintExportButton from '@/components/ui/PrintExportButton';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { formatCurrency } from '@/utils/formatCurrency';
import SectionVisibilityControls from '@/components/layout/SectionVisibilityControls';
import { useSectionVisibility } from '@/context/SectionVisibilityContext';
import HideableSection from '@/components/ui/HideableSection';
import SecurityIndicator from '@/components/sections/SecurityIndicator';
import LifeProjects from '@/components/sections/LifeProjects';

interface IndexPageProps {
  accessor?: boolean;
  clientPropect?: boolean;
}

const IndexPage: React.FC<IndexPageProps> = ({ accessor, clientPropect }) => {
  const { activeSection, navigateToSection } = useSectionObserver();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userReports, setUserReports] = useState(null);
  const [sessionId, setSessionId] = useState<string | null>(null);


  const getClientData = () => ({
    cliente: {
      nome: userReports?.cliente?.nome || "",
      idade: userReports?.cliente?.idade || 0,
      estadoCivil: userReports?.cliente?.estadoCivil || "",
      regimeCasamento: userReports?.cliente?.regimeCasamento || "",
      residencia: userReports?.cliente?.residencia || "",
      xpCode:
        userReports?.cliente?.codigoXP ||
        userReports?.cliente?.codigo_xp ||
        userReports?.cliente?.xpCode ||
        userReports?.cliente?.xp_code ||
        userReports?.codigoXP ||
        userReports?.codigo_xp ||
        userReports?.xpCode ||
        userReports?.xp_code ||
        "",
      email: userReports?.cliente?.email || user?.email || "",
      isProspect: clientPropect || false
    },
    financas: {
      patrimonioLiquido: userReports?.financas?.resumo?.patrimonio_liquido || 0,
      excedenteMensal: ((Array.isArray(userReports?.financas?.rendas)
        ? userReports.financas.rendas.reduce((sum: number, renda: any) => sum + (Number(renda?.valor) || 0), 0)
        : 0) - userReports.financas.resumo.despesas_mensais) || 0,
      rendas: userReports?.financas?.rendas || [],
      despesasMensais: userReports?.financas?.resumo?.despesas_mensais || 0,
      indicadores: userReports?.financas?.indicadores || {},
      // incluir despesas detalhadas se existirem em userReports
      despesas: userReports?.financas?.despesas || userReports?.financas?.despesas_detalhadas || [],
      // Utilizar diretamente a composição patrimonial do JSON, sem transformação
      composicaoPatrimonial: userReports?.financas?.composicao_patrimonial || userReports?.financas?.composicaoPatrimonial || {},
      // Processar os ativos de forma dinâmica, independente do tipo
      ativos: userReports?.financas?.ativos?.map(a => ({
        tipo: a.tipo,
        valor: a.valor,
        classe: a.classe
      })) || [],
      passivos: userReports?.financas?.passivos || []
    },
    aposentadoria: {
      patrimonioLiquido: userReports?.financas?.resumo?.patrimonio_liquido || 0,
      excedenteMensal: ((Array.isArray(userReports?.financas?.rendas)
        ? userReports.financas.rendas.reduce((sum: number, renda: any) => sum + (Number(renda?.valor) || 0), 0)
        : 0) - userReports.financas.resumo.despesas_mensais) || 0,
      rendas: userReports?.financas?.rendas || [],
      totalInvestido: (userReports?.financas?.composicao_patrimonial?.Investimentos
        || userReports?.financas?.composicaoPatrimonial?.Investimentos
        || userReports?.composicao_patrimonial?.Investimentos
        || userReports?.composicaoPatrimonial?.Investimentos
        || 0),
      ativos: (userReports?.financas?.ativos || userReports?.ativos || []).map((a: any) => ({
        tipo: a?.tipo,
        valor: a?.valor,
        classe: a?.classe
      })),
      passivos: userReports?.financas?.passivos || userReports?.passivos || [],

      rendaMensalDesejada:
        (userReports?.planoAposentadoria?.renda_desejada != null && Number(userReports.planoAposentadoria.renda_desejada) > 0
          ? Number(userReports.planoAposentadoria.renda_desejada)
          : (Number(userReports?.financas?.resumo?.despesas_mensais) || 0)),
      idadeAposentadoria: userReports?.planoAposentadoria?.idade_aposentadoria || 0,
      patrimonioAlvo: userReports?.planoAposentadoria?.capital_necessario || 0,

      idadeAtual: userReports?.planoAposentadoria?.idade_atual || 0,
      expectativaVida: userReports?.planoAposentadoria?.expectativa_vida || 0,

      cenarios: userReports?.planoAposentadoria?.cenarios?.map(c => ({
        idade: c.idade_aposentadoria,
        aporteMensal: c.aporte_mensal,
        capitalNecessario: c.capital_necessario
      })) || [],

      perfilInvestidor: userReports?.perfil_investidor || "",
      alocacaoAtivos: userReports?.alocacao_ativos?.composicao?.map(a => ({
        ativo: a.ativo,
        percentual: a.percentual
      })) || [],

      anosRestantes: (userReports?.planoAposentadoria?.idade_aposentadoria || 0) -
        (userReports?.planoAposentadoria?.idade_atual || 0),
      aporteMensalRecomendado: userReports?.planoAposentadoria?.cenarios?.[0]?.aporte_mensal || 0,

      possuiPGBL: userReports?.tributario?.deducoes?.some(d => d.tipo === "PGBL") || false,
      valorPGBL: userReports?.tributario?.deducoes?.find(d => d.tipo === "PGBL")?.valor || 0,

      taxaRetiradaSegura: 0.04,
      taxaInflacao: 0.03,
      taxaJurosReal: 0.03
      ,
      // Inclui objetivos do cliente para derivar fluxos (ex.: compra de casa)
      objetivos: userReports?.objetivos || []
    },
    objetivos: userReports?.objetivos || [],
    tributario: {
      resumo: userReports?.tributario?.resumo || {},
      estruturacaoPatrimonial: userReports?.tributario?.estruturacaoPatrimonial || [],
      investimentosIsentos: userReports?.tributario?.investimentosIsentos || [],
      deducoes: userReports?.tributario?.deducoes || [],
      holdingFamiliar: userReports?.tributario?.holdingFamiliar || {},
      previdenciaVGBL: userReports?.tributario?.previdenciaVGBL || {},
      economiaTributaria: userReports?.tributario?.economiaTributaria || {}
    },
    protecao: {
      titulo: userReports?.protecao?.titulo || "Proteção Patrimonial",
      resumo: userReports?.protecao?.resumo || "Proteção do patrimônio",
      analiseNecessidades: userReports?.protecao?.analiseNecessidades || {},
      seguroVida: userReports?.protecao?.seguroVida || {},
      seguroPatrimonial: userReports?.protecao?.seguroPatrimonial || {},
      seguroDO: userReports?.protecao?.seguroDO || {},
      seguroInternacional: userReports?.protecao?.seguroInternacional || {},
      protecaoJuridica: userReports?.protecao?.protecaoJuridica || {},
      recomendacoesAdicionais: userReports?.protecao?.recomendacoesAdicionais || {},
      seguros_existentes: userReports?.protecao?.seguros_existentes || []
    },
    sucessao: userReports?.sucessao || {},
    previdencia_privada: userReports?.previdencia_privada || [],
    planoAcao: {
      titulo: userReports?.planoAcao?.titulo || "Plano de Ação Financeira",
      resumo: userReports?.planoAcao?.resumo || "Plano de ação financeira",
      indicadorSegurancaFinanceira: userReports?.planoAcao?.indicadorSegurancaFinanceira || {},
      cronograma: userReports?.planoAcao?.cronograma || [],
      acoesPrioritarias: userReports?.planoAcao?.acoesPrioritarias || [],
      metasCurtoPrazo: userReports?.planoAcao?.metasCurtoPrazo || [],
      acompanhamentoProgresso: userReports?.planoAcao?.acompanhamentoProgresso || {},
      conclusao: userReports?.planoAcao?.conclusao || {}
    },
    imovelDesejado: userReports?.imovelDesejado || {}
  });

  const lifeProjectsSummary = () => {
    const raw = getClientData().objetivos || [];
    return (Array.isArray(raw) ? raw : []).map((item: any) => {
      if (typeof item === 'string') return { titulo: item };
      return {
        titulo: item?.tipo || 'Objetivo',
        descricao: `${(item?.valor != null && Number(item.valor) > 0) ? `${formatCurrency(Number(item.valor))} | ` : ''}${item?.prazo || ''}${item?.prioridade ? ` | Prioridade ${item.prioridade}` : ''}`
      };
    });
  };


  useEffect(() => {
    const fetchUserReportsData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdFromUrl = urlParams.get('sessionId');

        if (sessionIdFromUrl) {
          setSessionId(sessionIdFromUrl); // ← Definir o sessionId no estado
          const apiUrl = import.meta.env.VITE_API_THE_WAY;
          const response = await axios.get(`${apiUrl}/client-reports/${sessionIdFromUrl}`);

          const reportData = JSON.parse(response.data[0].report_data);
          const normalizeReport = (raw: any) => {
            const base = Array.isArray(raw) ? raw[0] : raw;
            const output = base?.output ?? base;
            return output ?? {};
          };
          setUserReports(normalizeReport(reportData));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserReportsData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Componente interno que aplica a regra de auto-ocultar dentro do provider
  const AutoHideSections: React.FC<{ userReports: any }> = ({ userReports }) => {
    const { isSectionVisible, toggleSectionVisibility, isLoading: visibilityLoading } = useSectionVisibility();
    const [applied, setApplied] = React.useState(false);

    useEffect(() => {
      if (visibilityLoading || applied || !userReports) return;

      try {
        const shouldHide: Record<string, boolean> = {
          // Removido: 'beach-house': !(userReports?.imovelDesejado?.objetivo?.valorImovel),
          // A seção beach-house agora é controlada apenas pelo usuário, não automaticamente
          'succession': !(
            (userReports?.sucessao?.situacaoAtual?.objetivosSucessorios?.length ?? 0) > 0 ||
            (userReports?.sucessao?.instrumentos?.length ?? 0) > 0
          )
        };

        Object.entries(shouldHide).forEach(([sectionId, hide]) => {
          if (hide && isSectionVisible(sectionId)) {
            toggleSectionVisibility(sectionId);
          }
        });

        setApplied(true);
      } catch (e) {
        setApplied(true);
      }
    }, [visibilityLoading, applied, userReports, isSectionVisible, toggleSectionVisibility]);

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <CardVisibilityProvider>
        <SectionVisibilityProvider>
          <AutoHideSections userReports={userReports} />
          <div className="relative h-screen overflow-hidden">
            <Header showLogout={!!clientPropect} showSummaryToggle={!clientPropect} />
            <main className="h-[calc(100vh-64px)] overflow-y-auto">
              <div className="min-h-screen">
                <CoverPage
                  clientData={getClientData().cliente}
                  date={(userReports?.created_at || userReports?.meta?.created_at) ? new Date(userReports?.created_at || userReports?.meta?.created_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : undefined}
                  projectsSummary={lifeProjectsSummary()}
                  retirementSummary={{
                    rendaMensalDesejada: getClientData().aposentadoria.rendaMensalDesejada,
                    idadeAposentadoria: getClientData().aposentadoria.idadeAposentadoria,
                  }}
                >
                  <SecurityIndicator
                    scoreFinanceiro={{
                      pilar: 'Total Geral',
                      notaPonderada: userReports?.scoreFinanceiro?.find?.(s => s.Pilar === 'Total Geral')?.['Nota Ponderada'] ?? 0,
                      elementosAvaliados: (userReports?.scoreFinanceiro || [])
                        .filter((s: any) => s.Pilar && s.Pilar !== 'Total Geral')
                        .sort((a: any, b: any) => {
                          const order = [
                            'Gestão de Ativos',
                            'Aposentadoria',
                            'Gestão de Riscos',
                            'Planejamento Sucessório',
                            'Gestão Tributária',
                            'Organização Patrimonial'
                          ];
                          const ia = order.indexOf(a.Pilar);
                          const ib = order.indexOf(b.Pilar);
                          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                        })
                        .map((s: any) => ({ nome: s.Pilar, nota: s['Nota'] }))
                    }}
                    hideControls={clientPropect}
                  />
                </CoverPage>
              </div>

              <HideableSection sectionId="summary" hideControls={clientPropect}>
                <FinancialSummary data={getClientData().financas} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="total-asset-allocation" hideControls={clientPropect}>
                <TotalAssetAllocation data={userReports} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="retirement" hideControls={clientPropect}>
                <RetirementPlanning data={getClientData().aposentadoria} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="beach-house" hideControls={clientPropect}>
                <BeachHouse data={userReports} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="protection" hideControls={clientPropect}>
                <ProtectionPlanning data={getClientData()} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="succession" hideControls={clientPropect}>
                <SuccessionPlanning data={getClientData()} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="tax" hideControls={clientPropect}>
                <TaxPlanning data={getClientData()} hideControls={clientPropect} />
              </HideableSection>

              {false && (
                <HideableSection sectionId="life-projects" hideControls={clientPropect}>
                  <LifeProjects data={getClientData()} hideControls={clientPropect} />
                </HideableSection>
              )}

              {!clientPropect && (
                <>
                  <HideableSection sectionId="action-plan" hideControls={clientPropect}>
                    <ActionPlan data={getClientData()} hideControls={clientPropect} sessionId={sessionId} />
                  </HideableSection>
                  <HideableSection sectionId="implementation-monitoring" hideControls={clientPropect}>
                    <ImplementationMonitoring data={getClientData()} hideControls={clientPropect} sessionId={sessionId} />
                  </HideableSection>
                </>
              )}


            </main>
            <DotNavigation clientMode={!!clientPropect} />
            <MobileDotNavigation clientMode={!!clientPropect} />
            {!clientPropect && <FloatingActions userReports={userReports} />}
            {!clientPropect && <SectionVisibilityControls />}
            {!clientPropect && <PrintExportButton />}
          </div>
        </SectionVisibilityProvider>
      </CardVisibilityProvider>
    </ThemeProvider>
  );
};

export default IndexPage;