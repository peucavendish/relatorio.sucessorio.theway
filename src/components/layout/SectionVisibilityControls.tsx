import React, { useState } from 'react';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { useSectionVisibility } from '@/context/SectionVisibilityContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Configuração das seções com ícones e descrições
const SECTIONS_CONFIG = [
  {
    id: "summary",
    label: "Resumo Financeiro",
    description: "Visão geral da situação financeira atual",
    icon: "📊"
  },
  {
    id: "total-asset-allocation",
    label: "Gestão de Ativos",
    description: "Composição patrimonial consolidada",
    icon: "📈"
  },
  {
    id: "retirement",
    label: "Aposentadoria",
    description: "Planejamento para aposentadoria",
    icon: "🏖️"
  },
  {
    id: "beach-house",
    label: "Aquisição de Imóveis",
    description: "Planejamento para aquisição de imóveis",
    icon: "🏠"
  },
  {
    id: "protection",
    label: "Proteção Patrimonial",
    description: "Proteção do patrimônio e seguros",
    icon: "🛡️"
  },
  {
    id: "succession",
    label: "Planejamento Sucessório",
    description: "Transferência de patrimônio",
    icon: "👥"
  },
  {
    id: "tax",
    label: "Planejamento Tributário",
    description: "Estratégias de otimização fiscal",
    icon: "💰"
  },
  {
    id: "financial-security-indicator",
    label: "Indicador de Segurança Financeira",
    description: "Avaliação por pilares de segurança",
    icon: "🔒"
  },
  {
    id: "action-plan",
    label: "Plano de Ação",
    description: "Ações prioritárias e cronograma",
    icon: "📋"
  },
  {
    id: "life-projects",
    label: "Projetos de Vida",
    description: "Iniciativas e objetivos pessoais",
    icon: "🎯"
  },
  {
    id: "implementation-monitoring",
    label: "Implementação e Monitoramento",
    description: "Acompanhamento de aportes e patrimônio vs metas",
    icon: "📷"
  }
];

interface SectionVisibilityControlsProps {
  className?: string;
}

const SectionVisibilityControls: React.FC<SectionVisibilityControlsProps> = ({ className }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { hiddenSections, toggleSectionVisibility, isSectionVisible } = useSectionVisibility();

  const visibleSectionsCount = SECTIONS_CONFIG.filter(section => isSectionVisible(section.id)).length;
  const hiddenSectionsCount = SECTIONS_CONFIG.length - visibleSectionsCount;

  return (
    <>
      <div
        className={cn(
          'fixed bottom-36 right-6 z-50 flex flex-col gap-3',
          className
        )}
      >
        <button
          onClick={() => setIsDialogOpen(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-accent text-white shadow-lg hover:bg-accent/90 transition-colors relative"
          aria-label="Controle de visibilidade das seções"
          title="Controle de visibilidade das seções"
        >
          <Settings size={18} />
          {hiddenSectionsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {hiddenSectionsCount}
            </Badge>
          )}
        </button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Seções do relatório</DialogTitle>
            <DialogDescription>
              Mostre ou oculte seções para personalizar este relatório.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-sm text-muted-foreground">
                {visibleSectionsCount} visíveis • {hiddenSectionsCount} ocultas
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {SECTIONS_CONFIG.map((section) => {
                const isVisible = isSectionVisible(section.id);
                return (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      isVisible
                        ? "bg-background border-border"
                        : "bg-muted/30 border-muted"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-xl flex-shrink-0">{section.icon}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base truncate">{section.label}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSectionVisibility(section.id)}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      {isVisible ? (
                        <>
                          <Eye size={14} />
                          <span className="hidden sm:inline text-xs">Visível</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} />
                          <span className="hidden sm:inline text-xs">Oculta</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="bg-accent/10 p-3 rounded-lg border border-accent/20 mt-4 flex-shrink-0">
              <p className="text-xs sm:text-sm text-muted-foreground">
                As preferências de visibilidade são salvas automaticamente no seu navegador.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SectionVisibilityControls; 