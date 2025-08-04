import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { BarChart } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface TotalAssetAllocationProps {
  data?: any;
  hideControls?: boolean;
}

const TotalAssetAllocation: React.FC<TotalAssetAllocationProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const estrategiaRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  return (
    <section className="min-h-screen py-16 px-4" id="total-asset-allocation">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-financial-info/30 p-3 rounded-full">
                <BarChart size={28} className="text-financial-info" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Gestão de Ativos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Total Asset Allocation - Avaliar a alocação patrimonial completa do cliente (ativos financeiros e reais), identificando concentração, liquidez, coerência com os objetivos e perfil de risco.
            </p>
          </div>
        </div>

        {/* Estratégia Recomendada */}
        <div
          ref={estrategiaRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-1"
        >
          <HideableCard
            id="estrategia-recomendada"
            isVisible={isCardVisible("estrategia-recomendada")}
            onToggleVisibility={() => toggleCardVisibility("estrategia-recomendada")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="text-xl">Estratégia Recomendada</CardTitle>
              <CardDescription>
                Análise técnica e recomendações para otimização patrimonial
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {/* Resumo Executivo */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Total de Ativos</h3>
                  <div className="text-3xl font-bold mb-1">R$ 6.000.000</div>
                  <div className="text-sm text-muted-foreground">Patrimônio Total</div>
                </div>

                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">% Imobilizado</h3>
                  <div className="text-3xl font-bold mb-1 text-destructive">65%</div>
                  <div className="text-sm text-muted-foreground">Alta concentração</div>
                </div>

                <div className="text-center">
                  <h3 className="text-muted-foreground text-sm mb-1">Diversificação</h3>
                  <div className="text-3xl font-bold mb-1 text-accent">4</div>
                  <div className="text-sm text-muted-foreground">Classes de ativos</div>
                </div>
              </div>

              {/* Diagnóstico Consolidado */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Indicadores Financeiros */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">📊 Indicadores Financeiros</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% de Endividamento</span>
                      <span className="text-accent font-semibold">18%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% de Poupança</span>
                      <span className="text-accent font-semibold">32%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Horizonte de Cobertura</span>
                      <span className="text-accent font-semibold">6 meses</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Liquidez dos Ativos</span>
                      <span className="text-destructive font-semibold">Baixa</span>
                    </div>
                  </div>
                </div>

                {/* Indicadores Patrimoniais */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">🏠 Indicadores Patrimoniais</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% Imobilizado</span>
                      <span className="text-accent font-semibold">65%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% Financeiro Líquido</span>
                      <span className="text-accent font-semibold">25%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">% Concentrado</span>
                      <span className="text-destructive font-semibold">70%</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Diversificação</span>
                      <span className="text-accent font-semibold">4 classes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alocação Patrimonial */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">📈 Alocação Patrimonial Total</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Ativos Financeiros</span>
                      <div className="text-right">
                        <div className="text-accent font-semibold">R$ 2.100.000</div>
                        <div className="text-sm text-muted-foreground">35%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Imóveis</span>
                      <div className="text-right">
                        <div className="text-accent font-semibold">R$ 3.000.000</div>
                        <div className="text-sm text-muted-foreground">50%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Participações Empresariais</span>
                      <div className="text-right">
                        <div className="text-accent font-semibold">R$ 600.000</div>
                        <div className="text-sm text-muted-foreground">10%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg border border-border/50">
                      <span className="font-medium">Veículos e Outros</span>
                      <div className="text-right">
                        <div className="text-accent font-semibold">R$ 300.000</div>
                        <div className="text-sm text-muted-foreground">5%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-muted/10 rounded-lg border border-border/50">
                      <h4 className="font-semibold mb-4 text-lg">🎯 Principais Observações</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="text-accent mt-1">•</span>
                          <span>Alta concentração em imóveis (50%)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-accent mt-1">•</span>
                          <span>Baixa liquidez dos ativos</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-accent mt-1">•</span>
                          <span>Diversificação limitada</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="p-6 bg-muted/10 rounded-lg border border-border/50">
                      <h4 className="font-semibold mb-4 text-lg">💡 Recomendações</h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="text-accent mt-1">•</span>
                          <span>Reduzir concentração imobiliária</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-accent mt-1">•</span>
                          <span>Aumentar liquidez</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-accent mt-1">•</span>
                          <span>Diversificar ativos</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>
      </div>
    </section>
  );
};

export default TotalAssetAllocation; 