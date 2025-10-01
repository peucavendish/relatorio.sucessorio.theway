import React, { useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import PlanningMap from './PlanningMap';
import { Calendar, MapPin, User, Users, Target, PiggyBank } from 'lucide-react';
import { Badge } from '../ui/badge';
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
  projectsSummary?: Array<{ titulo: string; descricao?: string }>;
  retirementSummary?: { rendaMensalDesejada?: number; idadeAposentadoria?: number };
}

// Componente customizado que estende o Card básico
const CardWithHighlight = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { highlight?: boolean }
>(({ className, highlight, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm md:p-8",
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
  children,
  projectsSummary = [],
  retirementSummary
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
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Planejamento Patrimonial</h1>
            <p className="text-muted-foreground">
              Preparado especialmente para <span className="font-medium text-foreground">{clientData.nome}</span>
            </p>
          </div>
        </div>

        {/* Client Info Card */}
        <div
          ref={cardRef1 as React.RefObject<HTMLDivElement>}
          className="mb-6 animate-on-scroll"
        >
          <Card className="md:p-8">
            <h2 className="card-title-standard text-lg">Informações do Cliente</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <User size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="heading-3">Nome</h3>
                  <p className="text-lg">{clientData.nome}</p>
                  <p className="text-sm text-muted-foreground">{clientData.idade} anos</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <Users size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="heading-3">Estado Civil</h3>
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
                  <h3 className="heading-3">Residência</h3>
                  <p className="text-lg">{clientData.residencia}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <Calendar size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="heading-3">Data do relatório</h3>
                  <p className="text-lg">{date}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Planning Map */}
        <div className="mb-6">
          <PlanningMap />
        </div>

        {/* About This Report */}
        <div
          ref={cardRef2 as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-2"
        >
          <CardWithHighlight highlight>
            <h2 className="card-title-standard text-lg">Sobre este relatório</h2>
            <p className="mb-4">
              Este documento apresenta um planejamento patrimonial personalizado, elaborado
              especificamente para suas necessidades e objetivos. Ele contempla análises,
              projeções e recomendações para otimizar sua jornada patrimonial e financeira.
            </p>
            <p className="mb-4">
              Os projetos de vida informados pelo cliente orientam as prioridades deste plano. Abaixo, um resumo dos principais objetivos considerados:
            </p>
            {retirementSummary && (retirementSummary.rendaMensalDesejada || retirementSummary.idadeAposentadoria) && (
              <div className="mb-4 rounded-md border border-accent/40 bg-accent/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-accent" />
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/50">Aposentadoria — objetivo principal</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {retirementSummary.rendaMensalDesejada != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <PiggyBank size={16} className="text-accent" />
                      <span>Renda passiva pretendida: <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(retirementSummary.rendaMensalDesejada || 0)}</span> / mês</span>
                    </div>
                  )}
                  {retirementSummary.idadeAposentadoria != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-accent" />
                      <span>Idade de aposentadoria pretendida: <span className="font-medium">{retirementSummary.idadeAposentadoria}</span> anos</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {projectsSummary.length > 0 ? (
              <ul className="mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectsSummary.slice(0, 6).map((p, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/5">
                    <div className="shrink-0 mt-0.5">
                      <Target size={16} className="text-accent" />
                    </div>
                    <div className="text-sm leading-snug">
                      <div className="font-medium text-foreground">{p.titulo}</div>
                      {p.descricao && (
                        <div className="text-muted-foreground mt-0.5">{p.descricao}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">Sem projetos de vida cadastrados até o momento.</p>
            )}


            <p>
              Navegue pelas seções usando a barra inferior ou os botões de navegação para
              explorar cada aspecto do seu planejamento patrimonial.
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
