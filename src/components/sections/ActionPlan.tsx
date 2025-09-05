import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Calendar,
  Clock,
  ListChecks,
  User,
  Building2,
  Check
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import StatusChip from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { actionPlanService } from '@/services/actionPlanService';

interface ActionPlanProps {
  data: any;
  hideControls?: boolean;
  sessionId?: string;
}

// Componente customizado que estende o Card básico
const CardWithHighlight = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { highlight?: boolean }
>(({ className, highlight, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      highlight && "border-accent/50 bg-accent/5",
      className
    )}
    {...props}
  />
));
CardWithHighlight.displayName = "CardWithHighlight";

// Mapear próximos passos usando os dados do JSON - movido para fora do componente
const CRONOGRAMA_INICIAL = [
  {
    id: "sucessorio-tributario",
    titulo: "Sucessório e Tributário",
    descricao: "Planejamento sucessório e otimização tributária",
    icone: "⚖️",
    cor: "bg-orange-500/10 text-orange-600 border-orange-200",
    acoes: [
      "Elaboração de testamento",
      "Estruturação de doações em vida",
      "Otimização tributária",
      "Proteção sucessória"
    ]
  },
  {
    id: "diagnostico-alocacao",
    titulo: "Diagnóstico de Alocação",
    descricao: "Análise e reestruturação da alocação de investimentos",
    icone: "📊",
    cor: "bg-purple-500/10 text-purple-600 border-purple-200",
    acoes: [
      "Análise da carteira atual",
      "Definição de nova alocação estratégica",
      "Implementação das mudanças",
      "Monitoramento contínuo"
    ]
  },
  {
    id: "projetos-imobilizados",
    titulo: "Projetos Imobilizados",
    descricao: "Estruturação e otimização de investimentos em imóveis",
    icone: "🏠",
    cor: "bg-blue-500/10 text-blue-600 border-blue-200",
    acoes: [
      "Análise da carteira imobiliária atual",
      "Identificação de oportunidades de otimização",
      "Estruturação de novos investimentos",
      "Monitoramento de performance"
    ]
  },
  {
    id: "internacional",
    titulo: "Internacional",
    descricao: "Planejamento e estruturação para atuação e proteção internacional",
    icone: "🌍",
    cor: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    acoes: [
      "Abertura de conta internacional",
      "Planejamento cambial e remessas",
      "Investimentos e estrutura patrimonial no exterior",
      "Seguro viagem e cobertura de saúde internacional"
    ]
  },
  {
    id: "protecao-patrimonial",
    titulo: "Proteção Patrimonial",
    descricao: "Implementação de estratégias para proteção do patrimônio",
    icone: "🛡️",
    cor: "bg-green-500/10 text-green-600 border-green-200",
    acoes: [
      "Constituição de holding patrimonial",
      "Estruturação de proteções jurídicas",
      "Implementação de seguros adequados",
      "Revisão de estruturas societárias"
    ]
  },
  {
    id: "corporate-solucoes-pj",
    titulo: "Corporate (Soluções PJ)",
    descricao: "Soluções para PJ: estrutura, caixa, investimentos e proteção",
    icone: "🏢",
    cor: "bg-amber-500/10 text-amber-600 border-amber-200",
    acoes: [
      "Diagnóstico societário e fiscal",
      "Gestão de caixa e aplicações da PJ",
      "Benefícios, previdência e planos para colaboradores",
      "Proteções corporativas (D&O, riscos e compliance)"
    ]
  }
];

const ActionPlan: React.FC<ActionPlanProps> = ({ data, hideControls, sessionId }) => {
  const titleRef = useScrollAnimation<HTMLDivElement>();
  const timelineRef = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  const priorityRef = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  const nextStepsRef = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta':
        return 'bg-financial-danger/20 text-financial-danger';
      case 'Média':
        return 'bg-financial-warning/20 text-financial-warning';
      case 'Baixa':
        return 'bg-financial-success/20 text-financial-success';
      default:
        return 'bg-financial-info/20 text-financial-info';
    }
  };

  if (!data || !data.planoAcao) {
    console.error('Dados do plano de ação não disponíveis:', data);
    return <div className="py-12 px-4 text-center">Dados do plano de ação não disponíveis</div>;
  }

  // Estado local para permitir reordenação de cards
  const [cronograma, setCronograma] = useState(CRONOGRAMA_INICIAL);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activatedCards, setActivatedCards] = useState<Set<string>>(new Set());
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Carregar ordem salva quando o componente montar
  useEffect(() => {
    const loadSavedOrder = async () => {
      if (!sessionId) return;

      try {
        setIsLoading(true);
        const response = await actionPlanService.getActionPlanOrder(sessionId);

        if (response.success && response.data?.card_order) {
          // Reordenar o cronograma baseado na ordem salva
          let savedOrder = response.data.card_order;

          // Verificar se card_order é uma string JSON e fazer parse
          if (typeof savedOrder === 'string') {
            try {
              savedOrder = JSON.parse(savedOrder);
            } catch (parseError) {
              console.error('Erro ao fazer parse do card_order:', parseError);
              return;
            }
          }

          if (Array.isArray(savedOrder)) {
            const reorderedCronograma = savedOrder.map(index => CRONOGRAMA_INICIAL[index]);
            setCronograma(reorderedCronograma);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar ordem salva:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedOrder();
  }, [sessionId, hideControls]);

  // Função para salvar a ordem dos cards
  const saveCardOrder = async (newCronograma: typeof CRONOGRAMA_INICIAL) => {
    if (!sessionId || hideControls) return;

    try {
      // Criar array com os índices da ordem atual
      const cardOrder = newCronograma.map((item, index) =>
        CRONOGRAMA_INICIAL.findIndex(originalItem => originalItem.titulo === item.titulo)
      );

      await actionPlanService.saveActionPlanOrder({
        session_id: sessionId,
        card_order: cardOrder,
        card_data: newCronograma
      });
    } catch (error) {
      console.error('Erro ao salvar ordem dos cards:', error);
    }
  };

  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (toIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(fromIndex) || fromIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    setCronograma(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Salvar a nova ordem
      saveCardOrder(updated);

      return updated;
    });
    setDragIndex(null);
  };

  // Verifica se o cliente precisa de uma holding familiar
  const precisaHolding = () => {
    // Verifica se a estruturação patrimonial inclui "Holding Familiar"
    return data.tributario?.estruturacaoPatrimonial?.includes("Holding Familiar") || false;
  };

  // Ações prioritárias dinâmicas
  const getAcoesPrioritarias = () => {
    const acoes = [];

    // Adiciona a ação de Holding Familiar apenas se necessário
    if (precisaHolding()) {
      acoes.push({
        titulo: "Holding Familiar",
        descricao: "Constituição de holding patrimonial para proteção de bens e otimização fiscal",
        prioridade: "Alta",
        prazo: data.planoAcao.cronograma[2]?.prazo || "90 dias",
        responsavel: "Advogado societário",
        passos: [
          "Análise da estrutura patrimonial atual",
          "Definição do tipo societário",
          "Elaboração de contrato/estatuto social",
          "Integralização dos bens imóveis"
        ],
        impacto: "Redução de até 50% em impostos sucessórios",
        status: "Não iniciado"
      });
    }

    // Adiciona as outras ações prioritárias
    acoes.push({
      titulo: "Planejamento Sucessório",
      descricao: "Estruturação de instrumentos jurídicos para proteção sucessória",
      prioridade: "Alta",
      prazo: data.planoAcao.cronograma[2]?.prazo || "120 dias",
      responsavel: "Advogado especialista",
      passos: [
        "Elaboração de testamento",
        "Estruturação de doações em vida",
        "Definição de beneficiários de previdência",
        "Criação de mandato duradouro"
      ],
      impacto: "Segurança jurídica e financeira para a família",
      status: "Não iniciado"
    });

    acoes.push({
      titulo: "Consórcio do Imóvel Desejado",
      descricao: data.imovelDesejado?.estrategiaRecomendada === "Consórcio" ?
        `Contratação de consórcio para aquisição da casa de praia no valor de ${data.imovelDesejado?.objetivo?.valorImovel ?
          'R$ ' + data.imovelDesejado.objetivo.valorImovel.toLocaleString('pt-BR') : 'R$ 1.000.000'}` :
        "Contratação de consórcio para aquisição da casa de praia",
      prioridade: "Média",
      prazo: data.planoAcao.cronograma[3]?.prazo || "30 dias",
      responsavel: "Assessor de Investimentos",
      passos: [
        "Pesquisa das melhores administradoras",
        "Análise das condições contratuais",
        "Definição do valor da carta",
        "Contratação e início dos pagamentos"
      ],
      impacto: `Aquisição do imóvel em até ${data.imovelDesejado?.objetivo?.prazoDesejado || "5 anos"}`,
      status: "Em progresso"
    });

    acoes.push({
      titulo: "Diversificação de Investimentos",
      descricao: "Reestruturação da carteira para maior diversificação e proteção",
      prioridade: "Média",
      prazo: data.planoAcao.cronograma[1]?.prazo || "60 dias",
      responsavel: "Assessor de Investimentos",
      passos: [
        "Análise da carteira atual",
        "Definição de nova alocação estratégica",
        "Implementação das mudanças",
        "Monitoramento de resultados"
      ],
      impacto: "Redução de volatilidade e potencial aumento de retorno",
      status: "Não iniciado"
    });

    return acoes;
  };

  // Obter as ações prioritárias dinâmicas
  const acoesPrioritarias = getAcoesPrioritarias();

  const specialistUrl = 'https://outlook.office.com/bookwithme/user/431917f0f5654e55bb2fa25f5b91cc7c@altavistainvest.com.br?anonymous&ismsaljsauthenabled&ep=pcard';

  const consultores = [
    'Alexandre Faustino',
    'Daniel Aveiro', 
    'Fabio Hassui',
    'Moisés Santos'
  ];

  const handleSpecialistClick = (cardId: string) => {
    // Apenas o card de "Proteção Patrimonial" abre o modal
    if (cardId === "protecao-patrimonial") {
      setOpenModal(cardId);
    } else {
      // Para outros cards, comportamento original
      setActivatedCards(prev => new Set([...prev, cardId]));
      window.open(specialistUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAgendaClick = (consultor: string) => {
    if (openModal) {
      setActivatedCards(prev => new Set([...prev, openModal]));
      setOpenModal(null);
      window.open(specialistUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="py-16 px-4" id="action-plan">
      <div className="section-container">
        <div
          ref={titleRef}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="card-flex-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <ListChecks size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="heading-2 mb-3">8. Plano de Ação</h2>
            <p className="card-description-standard max-w-2xl mx-auto">
              Conjunto de ações estratégicas para alcançar seus objetivos financeiros e patrimoniais
            </p>
          </div>
        </div>

        <div
          ref={timelineRef}
          className="section-container mb-8 animate-on-scroll"
        >
          <h3 className="card-title-standard text-lg">Próximos Passos</h3>
          {!hideControls && (
            <div className="text-xs text-muted-foreground mb-2">
              Arraste os cards para reordenar conforme a prioridade do cliente
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cronograma.map((fase, index) => (
              <Card
                key={index}
                className={cn(
                  "group hover:shadow-lg transition-all duration-300 border-2 hover:border-accent/50 h-full flex flex-col relative",
                  dragIndex === index && "border-accent/70 bg-accent/5"
                )}
                draggable={!hideControls}
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(index)}
              >
                {activatedCards.has(fase.id) && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="absolute top-8 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                      Área acionada
                    </div>
                  </div>
                )}
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${fase.cor} border-2 flex-shrink-0`}>
                      <span className="text-2xl">{fase.icone}</span>
                    </div>
                    <div className="flex-1 min-h-[80px] flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">
                          Passo {index + 1}
                        </span>
                        {!hideControls && (
                          <span className="text-[10px] text-muted-foreground">(arraste para mover)</span>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold">{fase.titulo}</CardTitle>
                      <CardDescription className="mt-1">{fase.descricao}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex flex-col h-full">
                  <ul className="space-y-2 flex-grow">
                    {fase.acoes.map((acao, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground">{acao}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Button 
                      size="sm" 
                      className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors"
                      onClick={() => handleSpecialistClick(fase.id)}
                    >
                      Acionamento do Especialista
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div
          ref={priorityRef}
          className="section-container mb-6 animate-on-scroll"
        >
          {false && (
            <>
              <h3 className="heading-3 mb-6">Ações Prioritárias</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {acoesPrioritarias.map((acao, index) => (
                  <Card key={index} className={acao.prioridade === 'Alta' ? 'border-financial-danger/50' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{acao.titulo}</CardTitle>
                        <Badge className={getPriorityColor(acao.prioridade)}>
                          {acao.prioridade}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">{acao.descricao}</CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Prazo: <span className="font-medium">{acao.prazo}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Responsável: <span className="font-medium">{acao.responsavel}</span></span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2">Passos principais:</h5>
                        <ol className="text-sm space-y-1">
                          {acao.passos.map((passo, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-xs inline-flex items-center justify-center size-5 rounded-full bg-accent/10 text-accent font-medium">{i + 1}</span>
                              {passo}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <span className="text-sm text-muted-foreground">Impacto: {acao.impacto}</span>
                      <StatusChip
                        status={acao.status === 'Concluído' ? 'success' : acao.status === 'Em progresso' ? 'info' : 'warning'}
                        label={acao.status}
                      />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Consultores */}
      <Dialog open={openModal !== null} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha um Consultor</DialogTitle>
            <DialogDescription>
              Selecione um dos nossos especialistas para agendar uma reunião
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {consultores.map((consultor, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                <span className="font-medium">{consultor}</span>
                <Button 
                  size="sm" 
                  onClick={() => handleAgendaClick(consultor)}
                  className="bg-accent hover:bg-accent/90"
                >
                  Agenda
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ActionPlan;