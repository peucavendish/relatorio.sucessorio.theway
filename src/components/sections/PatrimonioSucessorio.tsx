import React from 'react';
import { Building2, TrendingUp, Home, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { formatCurrency } from '@/utils/formatCurrency';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface PatrimonioSucessorioProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const PatrimonioSucessorio: React.FC<PatrimonioSucessorioProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  const patrimonio = data.patrimonio;
  
  const ativos = [
    { label: 'Imóveis', valor: patrimonio.imoveis, icon: Home },
    { label: 'Participações Societárias', valor: patrimonio.participacoes_societarias, icon: Building2 },
    { label: 'Investimentos Financeiros', valor: patrimonio.investimentos_financeiros, icon: TrendingUp },
    ...(patrimonio.previdencia_privada ? [{ label: 'Previdência Privada', valor: patrimonio.previdencia_privada, icon: DollarSign }] : []),
    ...(patrimonio.bens_exterior ? [{ label: 'Bens no Exterior', valor: patrimonio.bens_exterior, icon: Building2 }] : []),
    ...(patrimonio.outros_bens ? [{ label: 'Outros Bens', valor: patrimonio.outros_bens, icon: DollarSign }] : []),
  ];

  const totalAtivos = ativos.reduce((sum, item) => sum + item.valor, 0);
  const patrimonioLiquido = totalAtivos - patrimonio.dividas;

  return (
    <section className="py-16 px-4" id="patrimonio">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <DollarSign size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Composição Patrimonial</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visão geral dos ativos e passivos para o planejamento sucessório
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="patrimonio-sucessorio"
            isVisible={isCardVisible("patrimonio-sucessorio")}
            onToggleVisibility={() => toggleCardVisibility("patrimonio-sucessorio")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <DollarSign size={20} className="text-accent" />
                Patrimônio
              </CardTitle>
              <CardDescription>
                Composição detalhada dos ativos e passivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total de Ativos</div>
                    <div className="text-2xl font-bold">{formatCurrency(totalAtivos)}</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Dívidas</div>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(patrimonio.dividas)}</div>
                  </div>
                  <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <div className="text-sm text-muted-foreground mb-1">Patrimônio Líquido</div>
                    <div className="text-2xl font-bold text-accent">{formatCurrency(patrimonioLiquido)}</div>
                  </div>
                </div>

                {/* Ativos */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ativos</h3>
                  <div className="space-y-3">
                    {ativos.map((ativo, index) => {
                      const percentual = (ativo.valor / totalAtivos) * 100;
                      const Icon = ativo.icon;
                      return (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="bg-accent/10 p-2 rounded-full">
                              <Icon size={18} className="text-accent" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{ativo.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {percentual.toFixed(1)}% do total
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(ativo.valor)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Residência Fiscal</div>
                    <div className="font-medium">{patrimonio.residencia_fiscal}</div>
                  </div>
                  {patrimonio.bens_no_exterior && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle size={16} />
                      <span className="text-sm">Bens no exterior identificados</span>
                    </div>
                  )}
                  {patrimonio.herdeiros_no_exterior && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle size={16} />
                      <span className="text-sm">Herdeiros no exterior identificados</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default PatrimonioSucessorio;



