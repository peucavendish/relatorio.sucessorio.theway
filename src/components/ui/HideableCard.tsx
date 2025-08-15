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
    <Card id={id} className={cn('relative', className, !isVisible && 'bg-slate-100/50')}>
      {!hideControls && (
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute top-3 right-3 z-10 flex items-center justify-center p-1 rounded-full bg-background/80 hover:bg-background border border-border/50 transition-colors"
          aria-label={isVisible ? "Ocultar informações" : "Mostrar informações"}
          title={isVisible ? "Ocultar informações" : "Mostrar informações"}
        >
          {isVisible ? (
            <Eye size={16} className="text-muted-foreground" />
          ) : (
            <EyeOff size={16} className="text-muted-foreground" />
          )}
        </button>
      )}

      <div className="p-8">
        {children}
      </div>

      {!isVisible && (
        <div className="absolute inset-0 bg-slate-100/30 flex justify-end items-end p-1">
          <div className="text-[10px] text-slate-600 font-medium">
            oculto para cliente
          </div>
        </div>
      )}
    </Card>
  );
};

export default HideableCard;
