import React from 'react';
import { CircleDollarSign, Shield, Briefcase, Umbrella, Plane } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Slider } from '@/components/ui/slider';

interface ProtectionPlanningProps {
  data: any;
  hideControls?: boolean;
}

const ProtectionPlanning: React.FC<ProtectionPlanningProps> = ({ data, hideControls }) => {
  const protectionData = data?.protecao;
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  if (!protectionData) {
    return <div>Dados de proteção patrimonial não disponíveis</div>;
  }
  console.log(data);
  console.log('ok');

  // Descrições amigáveis para cada seguro
  const descricaoVida = protectionData?.seguroVida?.descricao || 'Protege a renda da família e viabiliza custos sucessórios, garantindo liquidez imediata.';
  const descricaoComposicaoPatrimonial = 'Protege os bens imobiliários e móveis contra riscos como incêndio, roubo e danos elétricos.';
  const descricaoDO = protectionData?.seguroDO?.descricao || 'Proteção para diretores e administradores contra reclamações decorrentes de atos de gestão.';
  const descricaoViagem = protectionData?.seguroInternacional?.descricao || 'Cobre despesas médicas, extravio de bagagem e imprevistos durante viagens internacionais.';

  // Referência de renda mensal para simulação de garantia (aposentadoria desejada ou renda atual)
  // Soma todas as rendas mensais do cliente
  const minhasRendasMensais = Array.isArray(data?.financas?.rendas)
    ? data.financas.rendas.reduce((acc: number, r: any) => acc + (Number(r?.valor) || 0), 0)
    : 0;

  const coberturaMinimaSugerida = Number(protectionData?.seguroVida?.coberturaMinima || 0);
  const defaultGarantiaYears = (() => {
    if (minhasRendasMensais > 0 && coberturaMinimaSugerida > 0) {
      const anos = Math.round(coberturaMinimaSugerida / (minhasRendasMensais * 12));
      return Math.min(30, Math.max(1, anos));
    }
    return 5;
  })();

  const [anosGarantia, setAnosGarantia] = React.useState<number>(defaultGarantiaYears);
  const coberturaSimulada = Math.max(0, minhasRendasMensais * 12 * anosGarantia);

  return (
    <section className="py-16 px-4" id="protection">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Shield size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Proteção Patrimonial e Sucessória</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              {protectionData.resumo}
            </p>
          </div>
        </div>

        {/* Insurance Needs Analysis (hidden) */}
        {false && (
          <HideableCard
            id="analise-necessidades"
            isVisible={isCardVisible("analise-necessidades")}
            onToggleVisibility={() => toggleCardVisibility("analise-necessidades")}
            hideControls={hideControls}
            className="mb-10"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-accent" />
                <div>
                  <CardTitle>Análise de Necessidades</CardTitle>
                  <CardDescription>Avaliação de riscos e necessidades de proteção</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* conteúdo oculto */}
            </CardContent>
          </HideableCard>
        )}

        {/* Liquidez para Inventário */}
        <HideableCard
          id="liquidez-inventario"
          isVisible={isCardVisible("liquidez-inventario")}
          onToggleVisibility={() => toggleCardVisibility("liquidez-inventario")}
          hideControls={hideControls}
          className="mb-8"
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Liquidez para Inventário</CardTitle>
                <CardDescription>
                  Comparativo entre previdência privada (VGBL/PGBL) e seguro de vida para garantir liquidez imediata e reduzir o impacto do inventário.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const totalPatrimonio =
                Number(data?.financas?.patrimonioLiquido) ||
                Number(data?.sucessao?.situacaoAtual?.patrimonioTotal) ||
                Number(data?.protecao?.analiseNecessidades?.patrimonioTotal) ||
                0;

              const ativos = Array.isArray(data?.financas?.ativos) ? data.financas.ativos : [];
              const previdenciaEmAtivos = ativos
                .filter((a: any) => /previd/i.test(String(a?.tipo || "") + String(a?.classe || "")))
                .reduce((acc: number, a: any) => acc + (Number(a?.valor) || 0), 0);

              const vgblSaldo = Number(data?.tributario?.previdenciaVGBL?.saldoAtual || data?.tributario?.previdenciaVGBL?.saldo || 0);
              const previdenciaPrivadaSaldo = Number(data?.previdencia_privada?.saldo_atual || 0);

              // Evitar dupla contagem: prioriza ativos; se inexistente, usa saldos declarados
              const totalPrevidencia = previdenciaEmAtivos > 0 ? previdenciaEmAtivos : (vgblSaldo + previdenciaPrivadaSaldo);

              const baseInventario = Math.max(0, totalPatrimonio - totalPrevidencia);
              const taxaSucessao = 0.14; // 14%
              const custoSucessorio = Math.max(0, baseInventario * taxaSucessao);

              const transmissivelAosHerdeiros = Math.max(0, baseInventario - custoSucessorio);

              const chartData = [
                { name: 'Inventário', Total: Math.round(totalPatrimonio), Custo: Math.round(custoSucessorio), Transmissivel: Math.round(transmissivelAosHerdeiros) }
              ];

              const coberturaSeguroSugerida = Number(data?.protecao?.seguroVida?.coberturaMinima || 0);
              const saldoPrevidencia = totalPrevidencia;

              return (
                <div className="grid md:grid-cols-2 gap-6 items-stretch">
                  {/* Left: metrics and comparison */}
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground">Total do Patrimônio</div>
                        <div className="text-xl font-semibold">{formatCurrency(totalPatrimonio)}</div>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground">Previdência (fora do inventário)</div>
                        <div className="text-xl font-semibold">{formatCurrency(saldoPrevidencia)}</div>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground">Base do Inventário</div>
                        <div className="text-xl font-semibold">{formatCurrency(baseInventario)}</div>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground">Custo Sucessório Estimado</div>
                        <div className="text-xl font-semibold text-financial-danger">{formatCurrency(custoSucessorio)}</div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <h4 className="text-md font-medium mb-2">Previdência vs. Seguro (Liquidez para Inventário)</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex gap-2"><span className="text-accent">•</span> Previdência VGBL/PGBL: recursos direcionados aos beneficiários, tipicamente fora do inventário, com liquidez direta.</li>
                        <li className="flex gap-2"><span className="text-accent">•</span> Seguro de Vida: pagamento direto aos beneficiários, fora do inventário; pode complementar o custo sucessório.</li>
                        {/* <li className="flex gap-2"><span className="text-accent">•</span> Cobertura de seguro sugerida: <span className="font-medium text-foreground">{formatCurrency(coberturaSeguroSugerida)}</span></li> */}
                      </ul>
                    </div>
                  </div>

                  {/* Right: tall, narrow chart */}
                  <div className="p-4 border rounded-lg">
                    <ChartContainer
                      config={{
                        Total: { label: 'Patrimônio total', color: '#3B82F6' },
                        Custo: { label: 'Custo de transmissão', color: '#EF4444' },
                        Transmissivel: { label: 'Patrimônio transmissível', color: '#10B981' },
                      }}
                      className="h-80 w-full"
                    >
                      <ResponsiveContainer>
                        <ReBarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => `R$ ${(v/1_000_000).toFixed(1)}Mi`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="Total" fill="#3B82F6" />
                          <Bar dataKey="Custo" fill="#EF4444" />
                          <Bar dataKey="Transmissivel" fill="#10B981" />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </HideableCard>

        {/* Texto explicativo sobre liquidez e inventário */}
        <div className="mb-8 text-sm text-muted-foreground">
          <p>
            Tanto a previdência privada (VGBL/PGBL) quanto o seguro de vida costumam ser pagos diretamente aos beneficiários, sem necessidade de inventário, oferecendo liquidez imediata para despesas e preservação do patrimônio. O seguro pode ser calibrado para cobrir o custo sucessório estimado, reduzindo ou eliminando o consumo de patrimônio no inventário.
          </p>
        </div>

        {/* Life Insurance - Patrimony Consumption Comparison */}
        <HideableCard
          id="seguro-vida-consumo-patrimonio"
          isVisible={isCardVisible("seguro-vida-consumo-patrimonio")}
          onToggleVisibility={() => toggleCardVisibility("seguro-vida-consumo-patrimonio")}
          hideControls={hideControls}
          className="mb-8"
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <CircleDollarSign className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Seguro de Vida Sucessório</CardTitle>
                <CardDescription>
                  Consumo de patrimônio: comparação com e sem cobertura de seguro de vida. Considera custo sucessório de 14% sobre o patrimônio líquido (impostos e custos jurídicos).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const patrimonioTotal = data?.protecao?.analiseNecessidades?.patrimonioTotal || 0;
              const patrimonioLiquido = data?.financas?.patrimonioLiquido || 0;
              const basePatrimonio = patrimonioLiquido > 0 ? patrimonioLiquido : (patrimonioTotal * 0.9);
              const taxaSucessao = 0.14; // 14%
              const custoSucessao = Math.max(0, basePatrimonio * taxaSucessao);
              const coberturaSeguroVida = basePatrimonio * 0.14; // 14% do patrimônio líquido
              const consumoSemSeguro = custoSucessao;
              const consumoComSeguro = Math.max(0, custoSucessao - coberturaSeguroVida);
              const disponivelSemSeguro = Math.max(0, basePatrimonio - consumoSemSeguro);
              const disponivelComSeguro = Math.max(0, basePatrimonio - consumoComSeguro);
              const consumoPatrimonioData = [
                { name: 'Sem Seguro', Consumido: Math.round(consumoSemSeguro), Disponivel: Math.round(disponivelSemSeguro) },
                { name: 'Com Seguro', Consumido: Math.round(consumoComSeguro), Disponivel: Math.round(disponivelComSeguro) },
              ];
              return (
                <>
                  <div className="grid md:grid-cols-3 gap-4 py-2">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Valor Sugerido</div>
                      <div className="text-xl font-semibold">{formatCurrency(coberturaSeguroVida)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Consumo Sem Seguro</div>
                      <div className="text-xl font-semibold text-financial-danger">{formatCurrency(consumoSemSeguro)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Consumo Com Seguro</div>
                      <div className="text-xl font-semibold text-financial-success">{formatCurrency(consumoComSeguro)}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="text-md font-medium mb-2">Riscos Cobertos</h4>
                    <ul className="space-y-2">
                      {(protectionData?.seguroVida?.riscosProtegidosSucessao || [
                        'Impostos sucessórios (ITCMD)',
                        'Custos jurídicos e cartorários',
                        'Liquidez para inventário'
                      ]).map((risco: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <CircleDollarSign className="h-4 w-4 text-accent" />
                          <span>{risco}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg mt-4">
                    <ChartContainer
                      config={{
                        Disponivel: { label: 'Disponível aos herdeiros', color: '#34D399' },
                        Consumido: { label: 'Impostos e custos jurídicos', color: '#EF4444' },
                      }}
                      className="h-64 w-full"
                    >
                      <ResponsiveContainer>
                        <ReBarChart data={consumoPatrimonioData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => `R$ ${(v/1_000_000).toFixed(1)}Mi`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="Consumido" stackId="a" fill="#EF4444" />
                          <Bar dataKey="Disponivel" stackId="a" fill="#34D399" />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {coberturaSeguroVida >= custoSucessao ? (
                      <p>Com a cobertura proposta, não há consumo de patrimônio para impostos sucessórios.</p>
                    ) : (
                      <p>
                        A cobertura atual reduz o consumo para {formatCurrency(consumoComSeguro)}. Cobertura adicional de {formatCurrency(Math.max(0, custoSucessao - coberturaSeguroVida))} eliminaria o consumo.
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </HideableCard>

        {/* Grupo: Outras Proteções */}
        <div className="mt-2 mb-6">
          <h3 className="text-xl font-semibold">Outras Proteções</h3>
          <p className="text-sm text-muted-foreground">Coberturas complementares ao seguro de vida de garantia de renda.</p>
        </div>

        {/* Life Insurance */}
        <HideableCard
          id="seguro-vida"
          isVisible={isCardVisible("seguro-vida")}
          onToggleVisibility={() => toggleCardVisibility("seguro-vida")}
          className="mb-8"
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <CircleDollarSign className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Seguro de Vida (Garantia de Renda)</CardTitle>
                <CardDescription>{descricaoVida}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Valor Sugerido</div>
                  <div className="text-xl font-bold text-accent">{formatCurrency(protectionData.seguroVida.coberturaMinima)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {protectionData.seguroVida.metodologiaCalculo}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Anos de garantia de renda</div>
                    <div className="text-sm text-muted-foreground">{anosGarantia} {anosGarantia === 1 ? 'ano' : 'anos'}</div>
                  </div>
                  <Slider
                    value={[anosGarantia]}
                    min={1}
                    max={30}
                    step={1}
                    onValueChange={(v) => setAnosGarantia(Number(v?.[0] || anosGarantia))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground">Minhas rendas mensais</div>
                      <div className="font-medium">{formatCurrency(minhasRendasMensais)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground">Cobertura simulada</div>
                      <div className="font-medium">{formatCurrency(coberturaSimulada)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium mb-3">Riscos Cobertos</h4>
                <ul className="space-y-2">
                  {(protectionData.seguroVida.riscosProtegidos || [
                    'Morte natural ou acidental',
                    'Cobertura para ITCMD (herança)',
                    'Proteção do padrão de vida dos herdeiros'
                  ]).map((risco: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-accent" />
                      <span>{risco}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </HideableCard>

        {/* Property Insurance */}
        <HideableCard
          id="seguro-patrimonial"
          isVisible={isCardVisible("seguro-patrimonial")}
          onToggleVisibility={() => toggleCardVisibility("seguro-patrimonial")}
          className="mb-8"
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Seguro Patrimonial</CardTitle>
                <CardDescription>{descricaoComposicaoPatrimonial}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Valor Sugerido</div>
                  <div className="text-xl font-bold text-accent">
                    {formatCurrency(data?.financas?.composicaoPatrimonial?.Imóveis || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {`Bens imóveis: ${formatCurrency(data?.financas?.composicaoPatrimonial?.Imóveis || 0)}`}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium mb-3">Riscos Cobertos</h4>
                <ul className="space-y-2">
                  {(protectionData.seguroPatrimonial.riscosProtegidos || []).map((risco: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-accent" />
                      <span>{risco}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </HideableCard>

        {/* D&O Insurance and Travel Insurance (Two Column Layout) */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* D&O Insurance */}
          <HideableCard
            id="seguro-do"
            isVisible={isCardVisible("seguro-do")}
            onToggleVisibility={() => toggleCardVisibility("seguro-do")}
            className="h-full"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Umbrella className="h-8 w-8 text-accent" />
                <div>
                  <CardTitle>Seguro D&O</CardTitle>
                  <CardDescription>{descricaoDO}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground mb-1">Valor Sugerido</div>
                    <div className="text-xl font-bold text-accent">
                      {typeof protectionData?.seguroDO?.limiteRecomendado === 'number'
                        ? formatCurrency(protectionData.seguroDO.limiteRecomendado)
                        : (typeof protectionData?.seguroDO?.limiteRecomendado === 'string'
                          ? protectionData.seguroDO.limiteRecomendado
                          : 'A definir')}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium mb-3">Riscos Cobertos</h4>
                  <ul className="space-y-2">
                    {(protectionData.seguroDO.riscosProtegidos || [
                      'Reclamações de terceiros por atos de gestão',
                      'Custos de defesa e acordos',
                      'Responsabilidade civil de administradores'
                    ]).map((risco: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <Umbrella className="h-4 w-4 text-accent" />
                        <span>{risco}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </HideableCard>

          {/* Travel Insurance */}
          <HideableCard
            id="seguro-viagem"
            isVisible={isCardVisible("seguro-viagem")}
            onToggleVisibility={() => toggleCardVisibility("seguro-viagem")}
            className="h-full"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Plane className="h-8 w-8 text-accent" />
                <div>
                  <CardTitle>Seguro Viagem Internacional</CardTitle>
                  <CardDescription>{descricaoViagem}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground mb-1">Valor Sugerido</div>
                    <div className="text-xl font-bold text-accent">
                      {typeof protectionData?.seguroInternacional?.limiteRecomendado === 'number'
                        ? formatCurrency(protectionData.seguroInternacional.limiteRecomendado)
                        : (typeof protectionData?.seguroInternacional?.limiteRecomendado === 'string'
                          ? protectionData.seguroInternacional.limiteRecomendado
                          : 'A definir')}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium mb-3">Riscos Cobertos</h4>
                  <ul className="space-y-2">
                    {(protectionData.seguroInternacional.riscosProtegidos || [
                      'Despesas médicas em viagem',
                      'Extravio de bagagem',
                      'Assistência jurídica/repasse emergencial'
                    ]).map((risco: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-accent" />
                        <span>{risco}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>

        {/* Additional Recommendations */}
        <HideableCard
          id="recomendacoes-adicionais"
          isVisible={isCardVisible("recomendacoes-adicionais")}
          onToggleVisibility={() => toggleCardVisibility("recomendacoes-adicionais")}
          className={cn("bg-accent/5 border-accent/20")}
        >
          <CardHeader>
            <CardTitle>{protectionData.recomendacoesAdicionais?.titulo || 'Recomendações Adicionais'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(protectionData.recomendacoesAdicionais?.itens || []).map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </HideableCard>
      </div>
    </section>
  );
};

export default ProtectionPlanning;
