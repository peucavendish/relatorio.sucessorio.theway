import React from 'react';
import { useSectionVisibility } from '@/context/SectionVisibilityContext';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface HideableSectionProps {
  sectionId: string;
  children: React.ReactNode;
  className?: string;
  hideControls?: boolean;
}

const HideableSection: React.FC<HideableSectionProps> = ({
  sectionId,
  children,
  className,
  hideControls = false,
}) => {
  const { isSectionVisible, toggleSectionVisibility } = useSectionVisibility();
  const isVisible = isSectionVisible(sectionId);

  // TEMPORÁRIO: Forçar visibilidade da seção total-asset-allocation para garantir que funcione
  if (sectionId === 'total-asset-allocation') {
    return (
      <div id={sectionId} className={cn("min-h-screen relative print-section", className)}>
        {!hideControls && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSectionVisibility(sectionId); }}
              className={cn(
                "no-print inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm transition-colors",
                "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20"
              )}
              aria-label={isVisible ? "Ocultar seção inteira" : "Mostrar seção"}
              title={isVisible ? "Ocultar seção inteira" : "Mostrar seção"}
            >
              <Eye size={16} className="" />
              <span>Seção</span>
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Se a seção não está visível, não renderiza nada (remodela o relatório como se a seção não existisse)
  // Na impressão, sempre renderiza a seção visível ao consultor (mesmo sem controles),
  // mas respeitando o estado de visibilidade salvo. Se estiver oculta, não renderiza.
  if (!isVisible) {
    return null;
  }

  // Se a seção está visível, renderiza normalmente com botão de alternância (quando permitido)
  return (
    <div id={sectionId} className={cn("min-h-screen relative print-section", className)}>
      {!hideControls && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSectionVisibility(sectionId); }}
            className={cn(
              "no-print inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm transition-colors",
              "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20"
            )}
            aria-label={isVisible ? "Ocultar seção inteira" : "Mostrar seção"}
            title={isVisible ? "Ocultar seção inteira" : "Mostrar seção"}
          >
            {isVisible ? (
              <Eye size={16} className="" />
            ) : (
              <EyeOff size={16} className="" />
            )}
            <span>Seção</span>
          </button>
        </div>
      )}
      {children}
    </div>
  );
};

export default HideableSection; 