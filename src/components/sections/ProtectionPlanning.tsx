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
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

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
  const idadeAtual = Number(data?.aposentadoria?.idadeAtual || 0);
  const idadeAposentadoria = Number(data?.aposentadoria?.idadeAposentadoria || 0);
  const anosAteAposentadoria = Math.max(0, Number((data?.aposentadoria?.anosRestantes ?? (idadeAposentadoria - idadeAtual)) || 0));
  const despesasMensais = Number(data?.financas?.despesasMensais || 0);
  const custoAnual = Math.max(0, despesasMensais * 12);
  // Capar a no máximo 200 meses
  const mesesAteAposentadoria = Math.round(anosAteAposentadoria * 12);
  const mesesConsiderados = Math.min(200, Math.max(0, mesesAteAposentadoria));
  const coberturaGarantiaRenda = Math.max(0, despesasMensais * mesesConsiderados);
  // Coberturas adicionais em vida
  const coberturaDoencasGravesMin = Math.max(0, despesasMensais * 24); // 2 anos de custo mensal
  const coberturaDoencasGravesMax = Math.max(0, despesasMensais * 60); // 5 anos de custo mensal
  const coberturaInvalidez = Math.max(0, despesasMensais * 60); // 5 anos de custo mensal
  const coberturaRendaProtegidaMin = Math.max(0, despesasMensais * 12); // 1 ano de custo mensal
  const coberturaRendaProtegidaMax = Math.max(0, despesasMensais * 24); // 2 anos de custo mensal
  const coberturaInvalidezPermanente = Math.max(0, custoAnual * 2); // 2 anos de custo anual

  return (
    <section className="py-16 px-4" id="protection">
      <div className="section-container">
        <div className="mb-12 text-center">
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Shield size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="heading-2 mb-3">5. Proteção Patrimonial</h2>
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

        {/* Grupo: Proteções em Caso de Falecimento */}
        <div className="mt-2 mb-6">
          <h3 className="card-title-standard text-lg">Proteções em Caso de Falecimento</h3>
          <p className="text-sm text-muted-foreground">Inclui planejamento sucessório e garantia de renda aos beneficiários.</p>
        </div>

        {/* Módulo Unificado: Liquidez + Seguro Sucessório */}
        <HideableCard
          id="liquidez-seguro-unificado"
          isVisible={isCardVisible("liquidez-seguro-unificado")}
          onToggleVisibility={() => toggleCardVisibility("liquidez-seguro-unificado")}
          hideControls={hideControls}
          className="mb-8"
        >
          <CardHeader>
            <div className="card-flex-start">
              <Shield className="card-icon h-8 w-8" />
              <div>
                <CardTitle className="card-title-standard">Liquidez e Seguro Sucessório</CardTitle>
                <CardDescription className="card-description-standard">
                  Comparativo de liquidez para inventário e impacto do seguro de vida no consumo do patrimônio.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bloco 1: Liquidez para Inventário */}
            {(() => {
              const totalPatrimonio =
                Number(data?.financas?.patrimonioLiquido) ||
                Number(data?.sucessao?.situacaoAtual?.patrimonioTotal) ||
                Number(data?.protecao?.analiseNecessidades?.patrimonioTotal) ||
                0;

              const ativos = Array.isArray(data?.financas?.ativos) ? data.financas.ativos : [];
              const normalize = (s: string) =>
                String(s || "")
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase();

              const previdenciaEmAtivos = ativos
                .filter((a: any) => {
                  const texto = normalize(`${a?.tipo ?? ''} ${a?.classe ?? ''}`);
                  return texto.includes('previd') || texto.includes('previdencia');
                })
                .reduce((acc: number, a: any) => acc + (Number(a?.valor) || 0), 0);

              const vgblSaldo = Number(
                data?.tributario?.previdenciaVGBL?.saldoAtual ||
                data?.tributario?.previdenciaVGBL?.saldo ||
                data?.tributario?.previdenciaVGBL?.valorAtual ||
                0
              );
              
              // Calculate total from previdencia_privada array (PGBL + VGBL)
              const previdenciaPrivadaSaldo = Array.isArray(data?.previdencia_privada) 
                ? data.previdencia_privada.reduce((acc: number, item: any) => acc + (Number(item?.saldo_atual) || 0), 0)
                : 0;

              const totalPrevidencia = previdenciaEmAtivos > 0 ? previdenciaEmAtivos : (vgblSaldo + previdenciaPrivadaSaldo);

              const baseInventario = Math.max(0, totalPatrimonio - totalPrevidencia);
              const taxaSucessao = 0.14; // 14%
              const custoSucessorio = Math.max(0, baseInventario * taxaSucessao);
              const transmissivelAosHerdeiros = Math.max(0, baseInventario - custoSucessorio);

              const chartData = [
                { name: 'Inventário', Total: Math.round(totalPatrimonio), Custo: Math.round(custoSucessorio), Transmissivel: Math.round(transmissivelAosHerdeiros) }
              ];

              return (
                <div className="grid md:grid-cols-2 gap-6 items-stretch mb-8">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground">Total do Patrimônio</div>
                        <div className="text-xl font-semibold">{formatCurrency(totalPatrimonio)}</div>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm text-muted-foreground">Previdência (fora do inventário)</div>
                        <div className="text-xl font-semibold">{formatCurrency(totalPrevidencia)}</div>
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
                    <div className="text-sm text-muted-foreground">
                      Previdência VGBL/PGBL e Seguro de Vida costumam ficar fora do inventário e oferecem liquidez imediata.
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">Como calculamos o custo sucessório estimado</div>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Correspondente a 14% do patrimônio líquido do cliente</li>
                        <li>Inclui ITCMD (alíquota estimada entre 4% e 8%)</li>
                        <li>Inclui custos do inventário (taxas e despesas cartorárias/judiciais)</li>
                        <li>Inclui honorários jurídicos</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="w-full">
                    <ChartContainer
                      config={{
                        Total: { label: 'Patrimônio total', color: '#36557C' },
                        Custo: { label: 'Custo de transmissão', color: '#E52B50' },
                        Transmissivel: { label: 'Patrimônio transmissível', color: '#21887C' },
                      }}
                      className="w-full h-[240px] sm:h-[320px] md:h-80"
                    >
                      <ResponsiveContainer>
                        <ReBarChart data={chartData} margin={{ left: 6, right: 8, top: 8, bottom: 8 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis width={40} tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1_000_000).toFixed(1)}Mi`} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="Total" fill="#36557C" />
                          <Bar dataKey="Custo" fill="#E52B50" />
                          <Bar dataKey="Transmissivel" fill="#21887C" />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bloco 2: Seguro de Vida Sucessório (removido a pedido) */}
            {false && (() => {
              const patrimonioTotal = data?.protecao?.analiseNecessidades?.patrimonioTotal || data?.financas?.patrimonioLiquido || 0;
              const patrimonioLiquido = data?.financas?.patrimonioLiquido || patrimonioTotal * 0.9;
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

              return null;
            })()}
          </CardContent>
        </HideableCard>

        {/* Texto explicativo sobre liquidez e inventário */}
        <div className="mb-8 text-sm text-muted-foreground">
          <p>
            Tanto a previdência privada (VGBL/PGBL) quanto o seguro de vida costumam ser pagos diretamente aos beneficiários, sem necessidade de inventário, oferecendo liquidez imediata para despesas e preservação do patrimônio. O seguro pode ser calibrado para cobrir o custo sucessório estimado, reduzindo ou eliminando o consumo de patrimônio no inventário.
          </p>
        </div>

        {false && (
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
            <CardContent></CardContent>
          </HideableCard>
        )}

        {/* Seguro de Vida (Garantia de Renda) - grupo de Falecimento */}
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
                  <div className="card-title-standard text-lg font-bold text-accent">{formatCurrency(coberturaGarantiaRenda)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Custo mensal × meses até aposentadoria (limitado a 200 meses).
                  </p>
                </div>

                <div className="mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground">Despesas mensais</div>
                      <div className="font-medium">{formatCurrency(despesasMensais)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground">Custo anual</div>
                      <div className="font-medium">{formatCurrency(custoAnual)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground">Meses até aposentadoria (máx. 200)</div>
                      <div className="font-medium">{mesesConsiderados}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground">Cobertura estimada</div>
                      <div className="font-medium">{formatCurrency(coberturaGarantiaRenda)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium mb-3">Riscos Cobertos (Morte natural ou acidental)</h4>
                <ul className="space-y-2">
                  {(protectionData.seguroVida.riscosProtegidos || [
                    'Manuntenção do Padrão de Vida',
                    'Educação dos Filhos',
                    'Pagamento de Dívidas',
                    'Sonhos e Projetos',
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

        {/* Grupo: Proteções em Vida */}
        <div className="mt-2 mb-6">
          <h3 className="card-title-standard text-lg">Proteções em Vida</h3>
          <p className="text-sm text-muted-foreground">Coberturas para proteção do patrimônio e responsabilidade enquanto em vida.</p>
        </div>

        {/* Proteções Adicionais em Vida */}
        <HideableCard
          id="protecao-vida-adicionais"
          isVisible={isCardVisible("protecao-vida-adicionais")}
          onToggleVisibility={() => toggleCardVisibility("protecao-vida-adicionais")}
          className="mb-8"
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Proteções Adicionais</CardTitle>
                <CardDescription>Valores sugeridos com base nas suas despesas atuais.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                <div className="text-sm font-medium">Doenças Graves</div>
                <div className="text-xs text-muted-foreground mb-1">2 a 5 anos de custo mensal</div>
                <div className="text-lg font-semibold">{formatCurrency(coberturaDoencasGravesMin)} — {formatCurrency(coberturaDoencasGravesMax)}</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                <div className="text-sm font-medium">Invalidez por Acidente</div>
                <div className="text-xs text-muted-foreground mb-1">5 anos de custo mensal</div>
                <div className="text-lg font-semibold">{formatCurrency(coberturaInvalidez)}</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                <div className="text-sm font-medium">Renda Protegida</div>
                <div className="text-xs text-muted-foreground mb-1">1 a 2 anos de custo mensal</div>
                <div className="text-lg font-semibold">{formatCurrency(coberturaRendaProtegidaMin)} — {formatCurrency(coberturaRendaProtegidaMax)}</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                <div className="text-sm font-medium">Invalidez por Doença</div>
                <div className="text-xs text-muted-foreground mb-1">2 anos de custo anual</div>
                <div className="text-lg font-semibold">{formatCurrency(coberturaInvalidezPermanente)}</div>
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
                  <div className="card-title-standard text-lg font-bold text-accent">
                    {formatCurrency(data?.financas?.composicaoPatrimonial?.Imóveis || 0)}
                  </div>
                  {/* <p className="text-sm text-muted-foreground mt-1">
                    {`Bens imóveis: ${formatCurrency(data?.financas?.composicaoPatrimonial?.Imóveis || 0)}`}
                  </p> */}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium mb-3">Riscos Cobertos</h4>
                <ul className="space-y-2">
                  {((Array.isArray(protectionData?.seguroPatrimonial?.riscosProtegidos) && protectionData.seguroPatrimonial.riscosProtegidos.length > 0)
                    ? protectionData.seguroPatrimonial.riscosProtegidos
                    : [
                      'Incêndio e queda de raio',
                      'Roubo e furto qualificado',
                      'Danos elétricos',
                      'Vendaval, granizo e impacto de veículos',
                      'Responsabilidade civil familiar',
                      'Danos por água e quebra de vidros',
                    ]
                  ).map((risco: string, index: number) => (
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
                    <div className="card-title-standard text-lg font-bold text-accent">
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
                        <Umbrella className="h-4 w-4 text-accent flex-shrink-0" />
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
                    <div className="card-title-standard text-lg font-bold text-accent">
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
                        <Plane className="h-4 w-4 text-accent flex-shrink-0" />
                        <span>{risco}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>


      </div>
    </section>
  );
};

export default ProtectionPlanning;
