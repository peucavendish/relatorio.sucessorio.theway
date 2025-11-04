import React from 'react';
import { CheckCircle2, XCircle, Building2, FileText, Gift, Shield, Clipboard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface EstruturasExistentesProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const EstruturasExistentes: React.FC<EstruturasExistentesProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  const estruturas = [
    { key: 'holding' as const, label: 'Holding Patrimonial', icon: Building2 },
    { key: 'acordo_socios' as const, label: 'Acordo de Sócios', icon: FileText },
    { key: 'testamento' as const, label: 'Testamento', icon: FileText },
    { key: 'doacoes_em_vida' as const, label: 'Doações em Vida', icon: Gift },
    { key: 'clausulas_restritivas' as const, label: 'Cláusulas Restritivas', icon: Shield },
    { key: 'mandato_preventivo' as const, label: 'Mandato Preventivo', icon: Clipboard },
  ];

  const estruturasExistentes = estruturas.filter(e => data.estruturas_existentes[e.key]);
  const estruturasAusentes = estruturas.filter(e => !data.estruturas_existentes[e.key]);

  return (
    <section className="py-16 px-4" id="estruturas">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Building2 size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Estruturas Existentes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verificação dos instrumentos jurídicos e estruturas já implementadas
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="estruturas-existentes"
            isVisible={isCardVisible("estruturas-existentes")}
            onToggleVisibility={() => toggleCardVisibility("estruturas-existentes")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <Building2 size={20} className="text-accent" />
                Checklist de Estruturas
              </CardTitle>
              <CardDescription>
                Status das estruturas e instrumentos sucessórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Estruturas Existentes */}
                {estruturasExistentes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-green-600" />
                      Estruturas Implementadas ({estruturasExistentes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {estruturasExistentes.map((estrutura) => {
                        const Icon = estrutura.icon;
                        return (
                          <div
                            key={estrutura.key}
                            className="flex items-center gap-3 p-4 border border-green-200 bg-green-50/50 rounded-lg"
                          >
                            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                            <Icon size={18} className="text-muted-foreground shrink-0" />
                            <span className="font-medium">{estrutura.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Estruturas Ausentes */}
                {estruturasAusentes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <XCircle size={20} className="text-amber-600" />
                      Estruturas Não Implementadas ({estruturasAusentes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {estruturasAusentes.map((estrutura) => {
                        const Icon = estrutura.icon;
                        return (
                          <div
                            key={estrutura.key}
                            className="flex items-center gap-3 p-4 border border-amber-200 bg-amber-50/50 rounded-lg"
                          >
                            <XCircle size={20} className="text-amber-600 shrink-0" />
                            <Icon size={18} className="text-muted-foreground shrink-0" />
                            <span className="font-medium">{estrutura.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default EstruturasExistentes;

