import React from 'react';
import { Lightbulb, ArrowRight, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface EstrategiasRecomendadasProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const EstrategiasRecomendadas: React.FC<EstrategiasRecomendadasProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  return (
    <section className="py-16 px-4" id="estrategias">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Lightbulb size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Estratégias Recomendadas</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Soluções personalizadas para cada situação identificada no diagnóstico
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="estrategias-recomendadas"
            isVisible={isCardVisible("estrategias-recomendadas")}
            onToggleVisibility={() => toggleCardVisibility("estrategias-recomendadas")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <Target size={20} className="text-accent" />
                Estratégias por Situação
              </CardTitle>
              <CardDescription>
                Recomendações específicas para otimizar o planejamento sucessório
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.estrategias_recomendadas.map((estrategia, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-accent/10 p-3 rounded-full shrink-0">
                        <span className="text-accent font-bold text-lg">{index + 1}</span>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Situação Identificada</div>
                          <h3 className="text-lg font-semibold">{estrategia.situacao_identificada}</h3>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Estratégia Recomendada</div>
                          <p className="font-medium text-accent">{estrategia.estrategia}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <ArrowRight size={14} />
                              Como Funciona
                            </div>
                            <p className="text-sm">{estrategia.como_funciona}</p>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <Target size={14} />
                              Impacto Esperado
                            </div>
                            <p className="text-sm">{estrategia.impacto}</p>
                          </div>
                        </div>

                        {estrategia.explicacao_contextual && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm text-muted-foreground mb-1 font-medium">
                              Explicação Contextual
                            </div>
                            <p className="text-sm leading-relaxed">{estrategia.explicacao_contextual}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default EstrategiasRecomendadas;

