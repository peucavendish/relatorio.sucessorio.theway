import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface DiagnosticoSucessorioProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const DiagnosticoSucessorio: React.FC<DiagnosticoSucessorioProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  const getClassificationColor = (classificacao: string) => {
    const lower = classificacao.toLowerCase();
    if (lower.includes('baixo') || lower.includes('bom')) {
      return 'bg-green-500/10 text-green-600 border-green-200';
    }
    if (lower.includes('moderado') || lower.includes('médio')) {
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
    }
    if (lower.includes('alto') || lower.includes('crítico')) {
      return 'bg-red-500/10 text-red-600 border-red-200';
    }
    return 'bg-blue-500/10 text-blue-600 border-blue-200';
  };

  return (
    <section className="py-16 px-4" id="diagnostico">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <AlertCircle size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Diagnóstico Sucessório</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Análise da situação atual e identificação dos principais pontos de atenção
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="diagnostico-sucessorio"
            isVisible={isCardVisible("diagnostico-sucessorio")}
            onToggleVisibility={() => toggleCardVisibility("diagnostico-sucessorio")}
            hideControls={hideControls}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 heading-3">
                    <Info size={20} className="text-accent" />
                    Classificação do Risco
                  </CardTitle>
                  <CardDescription>
                    Avaliação geral da situação sucessória
                  </CardDescription>
                </div>
                <Badge className={cn("text-lg px-4 py-2", getClassificationColor(data.diagnostico.classificacao))}>
                  {data.diagnostico.classificacao}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Resumo</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {data.diagnostico.resumo}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Principais Pontos</h3>
                  <ul className="space-y-3">
                    {data.diagnostico.principais_pontos.map((ponto, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <span className="text-muted-foreground">{ponto}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default DiagnosticoSucessorio;



