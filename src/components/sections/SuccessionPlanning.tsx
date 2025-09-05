import React from 'react';
import { Shield, Users, FileText, GanttChart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import StatusChip from '@/components/ui/StatusChip';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { formatCurrency } from '@/utils/formatCurrency';
// (Gráficos removidos desta seção)

interface SuccessionPlanningProps {
  data?: any;
  hideControls?: boolean;
}

const SuccessionPlanning: React.FC<SuccessionPlanningProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef1 = useScrollAnimation();
  const cardRef2 = useScrollAnimation();
  const cardRef3 = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  // Dados de previdência privada
  const previdenciaPrivada = {
    valor: data?.previdencia_privada?.saldo_atual || 0,
    tipo: data?.previdencia_privada?.tipo || "PGBL",
    contribuicaoMensal: data?.previdencia_privada?.contribuicao_mensal || 0,
    beneficiarios: data?.sucessao?.herdeiros?.map(h => `${h.tipo} (${h.percentual})`).join(", ") || "Não especificado",
  };

  // Projeto de vida e legado baseado em dados reais
  const projetoDeVida = [
    {
      fase: "Legado Financeiro",
      descricao: "Estruturação do patrimônio para garantir segurança financeira",
      prazo: "Contínuo"
    },
    {
      fase: "Legado de Conhecimento",
      descricao: data?.sucessao?.herdeiros?.some(h => h.tipo === "Filha") ?
        `Preparação da filha (${data?.sucessao?.herdeiros?.find(h => h.tipo === "Filha")?.idade} anos) para gestão patrimonial` :
        "Preparação dos herdeiros para gestão patrimonial",
      prazo: "A definir"
    },
    {
      fase: "Legado de Valores",
      descricao: "Transmissão de princípios e valores familiares",
      prazo: "Contínuo"
    }
  ];//

  // Valores para o impacto financeiro diretamente do JSON
  const patrimonioTotal = data?.sucessao?.situacaoAtual?.patrimonioTotal || 0;
  const patrimonioTransmissivel = patrimonioTotal * 0.9; // Assumindo que 90% do patrimônio é transmissível

  // Valores de ITCMD diretamente do JSON
  const impostoSemPlanejamento = data?.sucessao?.economiaITCMD?.semPlanejamento?.totalImpostos || 0;
  const impostoComPlanejamento = data?.sucessao?.economiaITCMD?.comPlanejamento?.totalImpostos || 0;
  const economiaEstimada = data?.sucessao?.economiaITCMD?.economia || (impostoSemPlanejamento - impostoComPlanejamento);
  const percentualEconomia = data?.sucessao?.economiaITCMD?.percentualEconomia || 0;

  // (Comparação de seguro movida para Proteção Patrimonial)

  return (
    <section className="py-16 px-4" id="succession">
      <div className="section-container">
        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Users size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">6. Planejamento Sucessório</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Estratégias para garantir a transferência eficiente de patrimônio, preservar a harmonia familiar e minimizar custos tributários no processo sucessório.
            </p>
          </div>
        </div>

        {/* Objectives */}
        <div
          ref={cardRef1 as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-1"
        >
          <div className="grid gap-6">
            {/* Objectives */}
            <HideableCard
              id="objetivos-sucessao"
              isVisible={isCardVisible("objetivos-sucessao")}
              onToggleVisibility={() => toggleCardVisibility("objetivos-sucessao")}
              hideControls={hideControls}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 heading-3">
                  <GanttChart size={20} className="text-accent" />
                  Objetivos
                </CardTitle>
                <CardDescription>
                  Principais metas do planejamento sucessório
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {data?.sucessao?.situacaoAtual?.objetivosSucessorios?.map((objetivo, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <span>{objetivo}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </HideableCard>

            {/* Financial Impact - removido */}
          </div>
        </div>

        {/* (Comparação de seguro de vida movida para Proteção Patrimonial) */}

        {/* Succession Instruments */}
        <div
          ref={cardRef2 as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-2"
        >
          <HideableCard
            id="instrumentos-sucessorios"
            isVisible={isCardVisible("instrumentos-sucessorios")}
            onToggleVisibility={() => toggleCardVisibility("instrumentos-sucessorios")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <FileText size={20} className="text-accent" />
                Instrumentos Sucessórios
              </CardTitle>
              <CardDescription>
                Ferramentas jurídicas para implementação do planejamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data?.sucessao?.instrumentos?.map((instrumento, index) => (
                  <div key={index} className="border-b last:border-0 pb-5 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium">{instrumento.tipo}</h3>
                      <StatusChip
                        status="warning"
                        label=""
                      />
                    </div>
                    <p className="text-muted-foreground mb-3">{instrumento.descricao}</p>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Vantagens:</h4>
                      <ul className="space-y-2">
                        {instrumento.vantagens && Array.isArray(instrumento.vantagens) && instrumento.vantagens.length > 0 ? (
                          instrumento.vantagens.map((vantagem, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <div className="text-accent mt-1">•</div>
                              <span>{vantagem}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-start gap-2 text-sm">
                            <div className="text-accent mt-1">•</div>
                            <span>{instrumento.descricao}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </HideableCard>
        </div>

        {/* Private Pension and Life Project */}
        <div
          ref={cardRef3 as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-3"
        >
          <div className="grid gap-6">
            {/* Private Pension */}
            <HideableCard
              id="previdencia-privada-sucessao"
              isVisible={isCardVisible("previdencia-privada-sucessao")}
              onToggleVisibility={() => toggleCardVisibility("previdencia-privada-sucessao")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 heading-3">
                  <Shield size={20} className="text-accent" />
                  Previdência Privada
                </CardTitle>
                <CardDescription>
                  Componente importante do planejamento sucessório
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo de previdência</div>
                    <div className="text-2xl font-medium">{previdenciaPrivada.tipo}</div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Beneficiários</div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      {previdenciaPrivada.beneficiarios}
                    </div>
                  </div>

                  {/* <div>
                    <div className="text-sm text-muted-foreground mb-1">Vantagens sucessórias</div>
                    <ul className="space-y-2">
                      {data?.tributario?.previdenciaVGBL?.vantagensSucessorias ? (
                        data.tributario.previdenciaVGBL.vantagensSucessorias.map((vantagem, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <div className="h-5 w-5 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
                              ✓
                            </div>
                            <span>{vantagem}</span>
                          </li>
                        ))
                      ) : (
                        []
                      )}
                    </ul>
                  </div> */}
                </div>
              </CardContent>
            </HideableCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessionPlanning;