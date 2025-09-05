
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home, PiggyBank, Home as House, Wallet, FileText, Shield, Users, ListChecks, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define our navigation sections
const sections = [
  { id: 'cover', label: 'Capa', icon: Home },
  { id: 'summary', label: 'Resumo Financeiro', icon: Wallet },
  { id: 'total-asset-allocation', label: 'Gestão de Ativos', icon: PieChart },
  { id: 'retirement', label: 'Planejamento de Aposentadoria', icon: PiggyBank },
  { id: 'beach-house', label: 'Aquisição de Bens', icon: House },
  { id: 'protection', label: 'Proteção Patrimonial', icon: Shield },
  { id: 'succession', label: 'Planejamento Sucessório', icon: Users },
  { id: 'tax', label: 'Planejamento Tributário', icon: FileText },
  { id: 'action-plan', label: 'Plano de Ação', icon: ListChecks }
];

interface GammaNavigationProps {
  activeSection: string;
  onChange: (sectionId: string) => void;
}

const GammaNavigation: React.FC<GammaNavigationProps> = ({ 
  activeSection, 
  onChange 
}) => {
  const [showFullNav, setShowFullNav] = useState(false);
  const [navScrollPosition, setNavScrollPosition] = useState(0);
  
  const activeIndex = sections.findIndex(section => section.id === activeSection);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        const nextIndex = Math.min(activeIndex + 1, sections.length - 1);
        onChange(sections[nextIndex].id);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = Math.max(activeIndex - 1, 0);
        onChange(sections[prevIndex].id);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, onChange]);
  
  // Scroll handling for the nav
  const scrollNav = (direction: 'left' | 'right') => {
    const container = document.getElementById('gamma-nav-container');
    if (!container) return;
    
    const scrollDistance = container.clientWidth * 0.8;
    const newPosition = direction === 'left' 
      ? Math.max(navScrollPosition - scrollDistance, 0)
      : navScrollPosition + scrollDistance;
      
    setNavScrollPosition(newPosition);
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
  };
  
  return (
    <div 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 blur-backdrop',
        showFullNav ? 'h-24' : 'h-16'
      )}
    >
      <div className="container mx-auto h-full">
        {/* Navigation controls */}
        <div className="flex items-center justify-between h-16 px-2">
          <button
            onClick={() => {
              const prevIndex = Math.max(activeIndex - 1, 0);
              onChange(sections[prevIndex].id);
            }}
            disabled={activeIndex === 0}
            className="p-2 rounded-full disabled:opacity-50"
            aria-label="Previous section"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex-1 mx-4 flex">
            <button
              onClick={() => scrollNav('left')}
              className="p-1 mr-2 hidden md:block"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div 
              id="gamma-nav-container"
              className="flex-1 overflow-x-auto no-scrollbar"
            >
              <div className="flex space-x-4 p-1">
                {sections.map((section) => {
                  const isActive = section.id === activeSection;
                  const Icon = section.icon;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => onChange(section.id)}
                      className={cn(
                        'flex items-center px-3 py-2 rounded-lg transition-all whitespace-nowrap',
                        isActive 
                          ? 'bg-accent text-white' 
                          : 'hover:bg-secondary'
                      )}
                    >
                      <Icon size={16} className="mr-2" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => scrollNav('right')}
              className="p-1 ml-2 hidden md:block"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <button
            onClick={() => {
              const nextIndex = Math.min(activeIndex + 1, sections.length - 1);
              onChange(sections[nextIndex].id);
            }}
            disabled={activeIndex === sections.length - 1}
            className="p-2 rounded-full disabled:opacity-50"
            aria-label="Next section"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        {/* Thumbnails (shown when expanded) */}
        {showFullNav && (
          <div className="flex justify-center gap-2 overflow-x-auto pb-3 px-4 animate-fade-in">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onChange(section.id)}
                className={cn(
                  'flex-shrink-0 w-12 h-12 rounded-md border-2 flex items-center justify-center',
                  section.id === activeSection 
                    ? 'border-accent' 
                    : 'border-transparent hover:border-border'
                )}
              >
                <section.icon size={20} />
              </button>
            ))}
          </div>
        )}
        
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setShowFullNav(!showFullNav)}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 w-10 h-5 rounded-b-xl bg-background border border-border flex items-center justify-center"
          aria-label={showFullNav ? "Collapse navigation" : "Expand navigation"}
        >
          <div className={cn(
            'w-4 h-0.5 bg-foreground/70 rounded transition-transform',
            showFullNav ? 'rotate-180' : ''
          )}>
            <span className="sr-only">
              {showFullNav ? "Collapse" : "Expand"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default GammaNavigation;
