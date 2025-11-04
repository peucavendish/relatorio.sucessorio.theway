import React from 'react';
import { AlertTriangle, Clock, DollarSign, Info, Shield, CircleDollarSign, Umbrella } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { formatCurrency } from '@/utils/formatCurrency';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface EstimativasRiscosProps {
  data: SuccessionPlanningData;
  hideControls?: boolean;
}

const EstimativasRiscos: React.FC<EstimativasRiscosProps> = ({ data, hideControls }) => {
  const headerRef = useScrollAnimation();
  const cardRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  const totalAtivos = 
    data.patrimonio.imoveis +
    data.patrimonio.participacoes_societarias +
    data.patrimonio.investimentos_financeiros +
    (data.patrimonio.previdencia_privada || 0) +
    (data.patrimonio.bens_exterior || 0) +
    (data.patrimonio.outros_bens || 0);

  const liquidezRecomendada = (totalAtivos * data.estimativas.liquidez_recomendada_percentual) / 100;

  const riscos = [
    { key: 'litigio_familiar' as const, label: 'Risco de Litígio Familiar', icon: AlertTriangle },
    { key: 'multiplos_nucleos' as const, label: 'Múltiplos Núcleos Familiares', icon: AlertTriangle },
    { key: 'imobilizacao_patrimonial' as const, label: 'Imobilização Patrimonial', icon: AlertTriangle },
  ];

  const riscosIdentificados = riscos.filter(r => data.riscos_sucessorios[r.key]);
  
  // Card ref separado para seguro de vida
  const seguroVidaRef = useScrollAnimation();

  return (
    <section className="py-16 px-4" id="estimativas-riscos">
      <div className="section-container">
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <AlertTriangle size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Estimativas e Riscos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Projeções de custos, prazos e identificação de riscos sucessórios
            </p>
          </div>
        </div>

        <div
          ref={cardRef as React.RefObject<HTMLDivElement>}
          className="animate-on-scroll delay-1"
        >
          <HideableCard
            id="estimativas-riscos"
            isVisible={isCardVisible("estimativas-riscos")}
            onToggleVisibility={() => toggleCardVisibility("estimativas-riscos")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <Info size={20} className="text-accent" />
                Estimativas Sucessórias
              </CardTitle>
              <CardDescription>
                Projeções de custos e prazos para o processo sucessório
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Estimativas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className="text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">Custo de Transmissão</div>
                    </div>
                    <div className="text-2xl font-bold">{data.estimativas.custo_transmissao_percentual}</div>
                    <div className="text-xs text-muted-foreground mt-1">do patrimônio</div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={18} className="text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">Prazo de Inventário</div>
                    </div>
                    <div className="text-2xl font-bold">{data.estimativas.prazo_inventario}</div>
                    <div className="text-xs text-muted-foreground mt-1">estimado</div>
                  </div>

                  <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className="text-accent" />
                      <div className="text-sm text-muted-foreground">Liquidez Recomendada</div>
                    </div>
                    <div className="text-2xl font-bold text-accent">{formatCurrency(liquidezRecomendada)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {data.estimativas.liquidez_recomendada_percentual}% do patrimônio
                    </div>
                  </div>
                </div>

                {/* Necessidade de Liquidez */}
                {data.necessidade_liquidez.tem && (
                  <div className="border border-amber-200 bg-amber-50/50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-900 mb-1">Necessidade de Liquidez Identificada</div>
                        <div className="text-sm text-amber-800">{data.necessidade_liquidez.finalidade}</div>
                        {data.necessidade_liquidez.valor_estimado && (
                          <div className="text-sm font-medium text-amber-900 mt-2">
                            Valor estimado: {formatCurrency(data.necessidade_liquidez.valor_estimado)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Riscos Identificados */}
                {riscosIdentificados.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle size={20} className="text-red-600" />
                      Riscos Sucessórios Identificados
                    </h3>
                    <div className="space-y-2">
                      {riscosIdentificados.map((risco) => {
                        const Icon = risco.icon;
                        return (
                          <div
                            key={risco.key}
                            className="flex items-center gap-3 p-3 border border-red-200 bg-red-50/50 rounded-lg"
                          >
                            <Icon size={18} className="text-red-600 shrink-0" />
                            <span className="font-medium">{risco.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {data.estimativas.observacoes && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground">{data.estimativas.observacoes}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </HideableCard>
        </div>

        {/* Seguro de Vida - Sempre mostrar com dados mockados ou da API */}
        <div
          ref={seguroVidaRef as React.RefObject<HTMLDivElement>}
          className="mt-8 animate-on-scroll delay-2"
        >
          <HideableCard
            id="seguro-vida-sucessorio"
            isVisible={isCardVisible("seguro-vida-sucessorio")}
            onToggleVisibility={() => toggleCardVisibility("seguro-vida-sucessorio")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 heading-3">
                <Shield size={20} className="text-accent" />
                Seguro de Vida Sucessório
              </CardTitle>
              <CardDescription>
                Proteção para garantir liquidez imediata aos herdeiros e cobrir custos sucessórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Seguros Existentes */}
                {data.seguro_vida?.seguros_existentes && data.seguro_vida.seguros_existentes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Umbrella size={20} className="text-accent" />
                      Seguros Existentes
                    </h3>
                    <div className="space-y-3">
                      {data.seguro_vida.seguros_existentes.map((seguro, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-muted/30">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground">Tipo</div>
                              <div className="font-medium">{seguro.tipo || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Seguradora</div>
                              <div className="font-medium">{seguro.seguradora || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Valor de Cobertura</div>
                              <div className="font-medium">{formatCurrency(seguro.valor_cobertura || 0)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Custo Mensal</div>
                              <div className="font-medium">{formatCurrency(seguro.custo_mensal || 0)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cobertura Sugerida */}
                {(data.seguro_vida?.cobertura_sugerida || data.seguro_vida?.cobertura_minima) ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CircleDollarSign size={20} className="text-accent" />
                        Cobertura Recomendada
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.seguro_vida?.cobertura_sugerida && (
                          <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                            <div className="text-sm text-muted-foreground mb-1">Valor Sugerido</div>
                            <div className="text-2xl font-bold text-accent">
                              {formatCurrency(data.seguro_vida.cobertura_sugerida)}
                            </div>
                            {data.seguro_vida?.descricao && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {data.seguro_vida.descricao}
                              </div>
                            )}
                          </div>
                        )}
                        {data.seguro_vida?.cobertura_minima && (
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">Cobertura Mínima</div>
                            <div className="text-2xl font-bold">
                              {formatCurrency(data.seguro_vida.cobertura_minima)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detalhes de Cálculo */}
                      {(data.seguro_vida?.despesas_mensais || data.seguro_vida?.custo_anual || data.seguro_vida?.meses_ate_aposentadoria) && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {data.seguro_vida?.despesas_mensais && (
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <div className="text-xs text-muted-foreground">Despesas Mensais</div>
                              <div className="font-medium">{formatCurrency(data.seguro_vida.despesas_mensais)}</div>
                            </div>
                          )}
                          {data.seguro_vida?.custo_anual && (
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <div className="text-xs text-muted-foreground">Custo Anual</div>
                              <div className="font-medium">{formatCurrency(data.seguro_vida.custo_anual)}</div>
                            </div>
                          )}
                          {data.seguro_vida?.meses_ate_aposentadoria && (
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <div className="text-xs text-muted-foreground">Meses até Aposentadoria</div>
                              <div className="font-medium">{data.seguro_vida.meses_ate_aposentadoria}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Fallback: calcular valores baseados no patrimônio se não houver dados
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CircleDollarSign size={20} className="text-accent" />
                        Cobertura Recomendada
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                          <div className="text-sm text-muted-foreground mb-1">Valor Sugerido</div>
                          <div className="text-2xl font-bold text-accent">
                            {formatCurrency((totalAtivos - data.patrimonio.dividas) * 0.14)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Cobertura para garantir liquidez imediata aos herdeiros e cobrir custos sucessórios estimados (14% do patrimônio líquido).
                          </div>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Cobertura Mínima</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency((totalAtivos - data.patrimonio.dividas) * 0.10)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            10% do patrimônio líquido
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Riscos Protegidos */}
                  {data.seguro_vida?.riscos_protegidos && data.seguro_vida.riscos_protegidos.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Riscos Cobertos</h3>
                      <ul className="space-y-2">
                        {data.seguro_vida.riscos_protegidos.map((risco, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CircleDollarSign size={16} className="text-accent shrink-0" />
                            <span className="text-sm">{risco}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Riscos Cobertos</h3>
                      <ul className="space-y-2">
                        {[
                          "Manutenção do Padrão de Vida",
                          "Educação dos Filhos",
                          "Pagamento de Dívidas",
                          "Custos Sucessórios",
                          "Sonhos e Projetos"
                        ].map((risco, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CircleDollarSign size={16} className="text-accent shrink-0" />
                            <span className="text-sm">{risco}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Informação sobre liquidez */}
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                      <p>
                        O seguro de vida costuma ser pago diretamente aos beneficiários, sem necessidade de inventário, 
                        oferecendo liquidez imediata para despesas e preservação do patrimônio. O seguro pode ser calibrado 
                        para cobrir o custo sucessório estimado, reduzindo ou eliminando o consumo de patrimônio no inventário.
                      </p>
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

export default EstimativasRiscos;

