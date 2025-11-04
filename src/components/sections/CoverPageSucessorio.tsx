import React, { useRef } from 'react';
import { Card } from '../ui/card';
import { Calendar, MapPin, User, Users, Heart, Baby } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface CoverPageSucessorioProps {
  data: SuccessionPlanningData;
  clientName?: string;
}

const CoverPageSucessorio: React.FC<CoverPageSucessorioProps> = ({ data, clientName }) => {
  const headerRef = useScrollAnimation();
  const cardRef1 = useScrollAnimation();
  const cardRef2 = useScrollAnimation();

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0]?.toUpperCase())
      .join('. ')
      .concat('.');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const totalFilhos = data.cliente.filhos.reduce((sum, f) => sum + f.quantidade, 0);
  const todasIdades = data.cliente.filhos.flatMap(f => f.idades);

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
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Planejamento Sucessório</h1>
            <p className="text-muted-foreground">
              {clientName && (
                <>Preparado especialmente para <span className="font-medium text-foreground">{getInitials(clientName)}</span></>
              )}
              {!clientName && 'Relatório de Planejamento Sucessório'}
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
                  <Heart size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="heading-3">Estado Civil</h3>
                  <p className="text-lg">{data.cliente.estado_civil}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.cliente.regime_bens !== 'Não especificado' ? data.cliente.regime_bens : ''}
                    {data.cliente.data_casamento && ` • ${data.cliente.data_casamento}`}
                  </p>
                  {data.cliente.idade_conjuge && (
                    <p className="text-sm text-muted-foreground">
                      Cônjuge: {data.cliente.idade_conjuge} anos
                    </p>
                  )}
                </div>
              </div>

              {totalFilhos > 0 && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-accent/10 p-2 rounded-full">
                    <Baby size={18} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="heading-3">Filhos</h3>
                    <p className="text-lg">{totalFilhos} {totalFilhos === 1 ? 'filho' : 'filhos'}</p>
                    {todasIdades.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Idades: {todasIdades.join(', ')} anos
                      </p>
                    )}
                    {data.cliente.herdeiros_vulneraveis && (
                      <Badge variant="outline" className="mt-2 border-amber-600 text-amber-600">
                        Herdeiros vulneráveis identificados
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <MapPin size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="heading-3">Residência Fiscal</h3>
                  <p className="text-lg">{data.patrimonio.residencia_fiscal}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-accent/10 p-2 rounded-full">
                  <Calendar size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="heading-3">Data do Relatório</h3>
                  <p className="text-lg">{formatDate(data.meta.data_execucao)}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge className="bg-green-600">{data.meta.status}</Badge>
                  </p>
                </div>
              </div>
            </div>

            {/* Beneficiários Adicionais */}
            {data.cliente.beneficiarios_adicionais.tem && data.cliente.beneficiarios_adicionais.descricao && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start gap-3">
                  <Users size={18} className="text-accent mt-1" />
                  <div>
                    <h3 className="heading-3">Beneficiários Adicionais</h3>
                    <p className="text-muted-foreground">{data.cliente.beneficiarios_adicionais.descricao}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* About This Report */}
        <div
          ref={cardRef2 as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-2"
        >
          <Card className={cn("rounded-lg border bg-card text-card-foreground shadow-sm md:p-8 border-accent/50 bg-accent/5")}>
            <h2 className="card-title-standard text-lg">Sobre este relatório</h2>
            <p className="mb-4">
              Este documento apresenta um planejamento sucessório personalizado, elaborado
              especificamente para suas necessidades e situação familiar. Ele contempla análises,
              estratégias e recomendações para otimizar a transferência de patrimônio e garantir
              a segurança jurídica e financeira da sua família.
            </p>
            <p className="mb-4">
              O planejamento sucessório considera aspectos legais, tributários e familiares,
              identificando riscos e oportunidades para estruturar da melhor forma possível
              a transmissão do seu patrimônio.
            </p>
            <p>
              Navegue pelas seções usando a barra inferior ou os botões de navegação para
              explorar cada aspecto do seu planejamento sucessório.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default CoverPageSucessorio;



