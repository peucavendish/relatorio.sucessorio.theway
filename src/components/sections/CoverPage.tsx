import React, { useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Calendar, MapPin, User, Users } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ClientData {
  nome: string;
  idade: number;
  estadoCivil: string;
  regimeCasamento: string;
  residencia: string;
}

interface CoverPageProps {
  clientData: ClientData;
  date?: string;
  children?: React.ReactNode;
}

// Componente customizado que estende o Card básico
const CardWithHighlight = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { highlight?: boolean }
>(({ className, highlight, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm p-6",
      highlight && "border-accent/50 bg-accent/5",
      className
    )}
    {...props}
  />
));
CardWithHighlight.displayName = "CardWithHighlight";

const CoverPage: React.FC<CoverPageProps> = ({
  clientData,
  date = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  children
}) => {
  const headerRef = useScrollAnimation();
  const cardRef1 = useScrollAnimation();
  const cardRef2 = useScrollAnimation();

  return (
    <section id="cover" className="min-h-screen flex flex-col items-center justify-center py-8 px-4">
      <div className="section-container">
        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-8 animate-on-scroll"
        >
          <div className="mb-2 inline-block">
            <div className="text-sm font-medium text-accent mb-2 tracking-wider">
              ALTA VISTA INVESTIMENTOS
            </div>
            <h1 className="text-5xl font-bold mb-2">Planejamento Financeiro</h1>
            <p className="text-muted-foreground">
              Preparado especialmente para <span className="font-medium text-foreground">{clientData.nome}</span>
            </p>
          </div>
        </div>

        {/* Client Info Card */}
        <div
          ref={cardRef1 as React.RefObject<HTMLDivElement>}
          className="mb-6 animate-on-scroll delay-1"
        >
          <Card className="md:p-8">
            <h2 className="text-2xl font-semibold mb-4">Informações do Cliente</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <User size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">Cliente</h3>
                  <p className="text-lg">{clientData.nome}</p>
                  <p className="text-sm text-muted-foreground">{clientData.idade} anos</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <Users size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">Estado Civil</h3>
                  <p className="text-lg">{clientData.estadoCivil}</p>
                  <p className="text-sm text-muted-foreground">
                    {clientData.regimeCasamento}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <MapPin size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">Residência</h3>
                  <p className="text-lg">{clientData.residencia}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <Calendar size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">Data do relatório</h3>
                  <p className="text-lg">{date}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* About This Report */}
        <div
          ref={cardRef2 as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-2"
        >
          <CardWithHighlight highlight>
            <h2 className="text-2xl font-semibold mb-4">Sobre este relatório</h2>
            <p className="mb-4">
              Este documento apresenta um planejamento financeiro personalizado, elaborado
              especificamente para suas necessidades e objetivos. Ele contempla análises,
              projeções e recomendações para otimizar sua jornada financeira.
            </p>
            <p>
              Navegue pelas seções usando a barra inferior ou os botões de navegação para
              explorar cada aspecto do seu planejamento financeiro.
            </p>
          </CardWithHighlight>
        </div>

        {/* Inline children (e.g., Security Indicator) */}
        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoverPage;
