import React from 'react';
import { FileCheck, FileX, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface ChecagemDocumentalProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const ChecagemDocumental: React.FC<ChecagemDocumentalProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  const documentosExistentes = data.checagem_documental.filter(doc => doc.existe);
  const documentosAusentes = data.checagem_documental.filter(doc => !doc.existe);

  return (
    <section className="py-16 px-4" id="checagem-documental">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <FileCheck size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Checagem Documental</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verificação dos documentos necessários para o planejamento sucessório
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="checagem-documental"
            isVisible={isCardVisible("checagem-documental")}
            onToggleVisibility={() => toggleCardVisibility("checagem-documental")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <FileCheck size={20} className="text-accent" />
                Status dos Documentos
              </CardTitle>
              <CardDescription>
                Checklist de documentos e próximos passos para cada item
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Documentos Existentes */}
                {documentosExistentes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileCheck size={20} className="text-green-600" />
                      Documentos Existentes ({documentosExistentes.length})
                    </h3>
                    <div className="space-y-3">
                      {documentosExistentes.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 border border-green-200 bg-green-50/50 rounded-lg"
                        >
                          <FileCheck size={20} className="text-green-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium mb-1">{doc.documento}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <ArrowRight size={14} />
                              {doc.proximo_passo}
                            </div>
                          </div>
                          <Badge className="bg-green-600">Concluído</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documentos Ausentes */}
                {documentosAusentes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileX size={20} className="text-amber-600" />
                      Documentos Pendentes ({documentosAusentes.length})
                    </h3>
                    <div className="space-y-3">
                      {documentosAusentes.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 border border-amber-200 bg-amber-50/50 rounded-lg"
                        >
                          <FileX size={20} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium mb-1">{doc.documento}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <ArrowRight size={14} />
                              {doc.proximo_passo}
                            </div>
                          </div>
                          <Badge variant="outline" className="border-amber-600 text-amber-600">
                            Pendente
                          </Badge>
                        </div>
                      ))}
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

export default ChecagemDocumental;



