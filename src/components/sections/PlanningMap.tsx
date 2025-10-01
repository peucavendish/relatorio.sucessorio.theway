import React from 'react';
import { cn } from '@/lib/utils';
import { useSectionVisibility } from '@/context/SectionVisibilityContext';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface PlanningMapProps {
  className?: string;
}

const steps: Step[] = [
  { id: 'summary', title: 'Resumo Financeiro', description: 'Panorama inicial' },
  { id: 'total-asset-allocation', title: 'Gestão de Ativos', description: 'Balanço e alocação' },
  { id: 'retirement', title: 'Aposentadoria', description: 'Projeções e metas' },
  { id: 'beach-house', title: 'Aquisição de Bens', description: 'Planejamento de aquisição' },
  { id: 'protection', title: 'Proteção', description: 'Seguros e blindagem' },
  { id: 'succession', title: 'Sucessão', description: 'Estrutura patrimonial' },
  { id: 'tax', title: 'Tributação', description: 'Eficiência fiscal' },
  { id: 'action-plan', title: 'Plano de Ação', description: 'Próximos passos' },
  { id: 'implementation-monitoring', title: 'Acompanhamento', description: 'Execução e monitoramento' },
];

const PlanningMap: React.FC<PlanningMapProps> = ({ className }) => {
  const { isSectionVisible } = useSectionVisibility();
  const visibleSteps = steps.filter(s => isSectionVisible(s.id));
  return (
    <div className={cn('rounded-lg border border-border/50 bg-muted/5 p-4 md:p-6', className)}>
      <h2 className="card-title-standard text-lg mb-3">Mapa do Planejamento</h2>
      <p className="text-sm text-muted-foreground mb-4">Como conduziremos a apresentação do relatório:</p>
      <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSteps.map((s, idx) => (
          <li key={s.id} className="flex items-start gap-3 rounded-md border border-border/40 bg-card/60 p-3">
            <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-medium">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <a href={`#${s.id}`} className="font-medium text-foreground hover:underline break-words">
                {s.title}
              </a>
              {s.description && (
                <div className="text-xs text-muted-foreground mt-0.5 break-words">{s.description}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default PlanningMap;


