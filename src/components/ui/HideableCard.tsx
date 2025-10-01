import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';

interface HideableCardProps {
  id: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  children: React.ReactNode;
  className?: string;
  hideControls?: boolean;
}

const HideableCard: React.FC<HideableCardProps> = ({
  id,
  isVisible,
  onToggleVisibility,
  children,
  className,
  hideControls = false,
}) => {
  if (hideControls && !isVisible) {
    return null;
  }

  return (
    <Card id={id} className={cn('relative', !isVisible && 'print-hidden-card', className)}>
      {!hideControls && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(); }}
          className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-full bg-background/80 hover:bg-background border border-border/50 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 no-print"
          aria-label={isVisible ? "Ocultar informações" : "Mostrar informações"}
          title={isVisible ? "Ocultar informações" : "Mostrar informações"}
        >
          {isVisible ? (
            <Eye size={18} className="text-muted-foreground" />
          ) : (
            <EyeOff size={18} className="text-muted-foreground" />
          )}
        </button>
      )}

      <div className="p-8">
        {children}
      </div>

      {!isVisible && (
        <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/60 flex items-center justify-center no-print">
          <div className="text-center space-y-2">
            <EyeOff size={18} className="mx-auto text-muted-foreground" />
            <div className="text-[10px] text-slate-600 font-medium">oculto para cliente</div>
            {!hideControls && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(); }}
                className="mt-1 inline-flex items-center rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-medium shadow-sm hover:bg-background/90"
              >
                Mostrar
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default HideableCard;
