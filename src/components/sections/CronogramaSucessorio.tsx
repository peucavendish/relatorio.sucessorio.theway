import React from 'react';
import { Calendar, User, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface CronogramaSucessorioProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const CronogramaSucessorio: React.FC<CronogramaSucessorioProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  const getStatusIcon = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('concluído') || lower.includes('concluido')) {
      return <CheckCircle2 size={18} className="text-green-600" />;
    }
    if (lower.includes('em progresso') || lower.includes('em andamento')) {
      return <Clock size={18} className="text-blue-600" />;
    }
    return <Circle size={18} className="text-muted-foreground" />;
  };

  const getStatusBadge = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('concluído') || lower.includes('concluido')) {
      return <Badge className="bg-green-600">Concluído</Badge>;
    }
    if (lower.includes('em progresso') || lower.includes('em andamento')) {
      return <Badge className="bg-blue-600">Em Progresso</Badge>;
    }
    return <Badge variant="outline">A fazer</Badge>;
  };

  return (
    <section className="py-16 px-4" id="cronograma">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Calendar size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Cronograma de Execução</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Timeline das ações e atividades do planejamento sucessório
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="cronograma-sucessorio"
            isVisible={isCardVisible("cronograma-sucessorio")}
            onToggleVisibility={() => toggleCardVisibility("cronograma-sucessorio")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <Calendar size={20} className="text-accent" />
                Timeline de Implementação
              </CardTitle>
              <CardDescription>
                Prazo estimado: {data.encerramento.prazo_execucao_dias} dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.cronograma.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "relative pl-8 pb-6",
                      index !== data.cronograma.length - 1 && "border-l-2 border-muted"
                    )}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 transform -translate-x-1/2">
                      <div className="bg-accent rounded-full p-1.5">
                        {getStatusIcon(item.status)}
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 ml-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Semana {item.semana}
                          </span>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      <h3 className="font-semibold mb-2">{item.acao}</h3>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User size={14} />
                        <span>Responsável: {item.responsavel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ações Críticas */}
              {data.encerramento.acoes_criticas.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Ações Críticas</h3>
                  <ul className="space-y-2">
                    {data.encerramento.acoes_criticas.map((acao, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-red-500/15 flex items-center justify-center text-red-600 shrink-0 mt-0.5 font-semibold">
                          !
                        </div>
                        <span className="text-muted-foreground">{acao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default CronogramaSucessorio;



