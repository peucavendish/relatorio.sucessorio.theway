import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// Custom currency input component
const CurrencyInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}> = ({ value, onChange, className, id, placeholder }) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const numericValue = inputVal.replace(/[^0-9,.]/g, '');
    setDisplayValue(`R$ ${numericValue}`);
    const parsedValue = parseFloat(numericValue.replace(/\./g, '').replace(',', '.')) || 0;
    onChange(parsedValue);
  };

  useEffect(() => {
    setDisplayValue(new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value));
  }, [value]);

  return (
    <Input
      id={id}
      value={displayValue}
      onChange={handleInputChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

interface FinancingSimulatorProps {
  valorImovel: number;
  onSimulationChange?: (simulation: any) => void;
}

interface StrategyResult {
  nome: string;
  parcelaMensal: number;
  totalPago: number;
  custoTotal: number;
  custoReal: number;
  economia: number;
  detalhes: {
    jurosNominal: number;
    jurosReal: number;
    custoOportunidade: number;
    inflacao: number;
  };
}

// Função PMT simplificada
function PMT(taxa: number, periodos: number, vp: number) {
  if (taxa === 0) return -(vp) / periodos;
  
  const x = Math.pow(1 + taxa, periodos);
  return -(vp * x) * taxa / (x - 1);
}

// Função para calcular valor futuro
function FV(taxa: number, periodos: number, vp: number) {
  return vp * Math.pow(1 + taxa, periodos);
}

const FinancingSimulator: React.FC<FinancingSimulatorProps> = ({
  valorImovel,
  onSimulationChange
}) => {
  const [valorImovelInput, setValorImovelInput] = useState<number>(valorImovel);
  const [entrada, setEntrada] = useState<number>(valorImovel * 0.2);
  const [prazoFinanciamento, setPrazoFinanciamento] = useState<number>(35);
  // Taxas REAL e inflação (nominal será derivada)
  const [taxaRealFinanciamento, setTaxaRealFinanciamento] = useState<number>(0.075); // ~13% nominal com 5.5% inflação
  const [prazoConsorcio, setPrazoConsorcio] = useState<number>(18);
  const [taxaAdministracaoConsorcio, setTaxaAdministracaoConsorcio] = useState<number>(0.18); // 18% do valor total
  const [retornoRealInvestimento, setRetornoRealInvestimento] = useState<number>(0.03); // ~10% nominal com 5.5% inflação
  const [inflacaoAnual, setInflacaoAnual] = useState<number>(0.055); // Inflação anual (ex-INCC)

  // Converter taxa anual para mensal
  const taxaAnualParaMensal = (taxaAnual: number) => {
    return Math.pow(1 + taxaAnual, 1/12) - 1;
  };

  // Taxas NOMINAIS derivadas
  const taxaNominalFinanciamento = Math.max(0, inflacaoAnual + taxaRealFinanciamento);
  const taxaNominalInvestimento = Math.max(0, inflacaoAnual + retornoRealInvestimento);

  // Calcular financiamento SAC (Sistema de Amortização Constante) usando taxa nominal derivada
  const calcularFinanciamento = (): StrategyResult => {
    const valorFinanciado = Math.max(0, valorImovelInput - entrada);
    const taxaNominalMensal = taxaAnualParaMensal(taxaNominalFinanciamento);
    const meses = Math.max(1, prazoFinanciamento * 12);
    
    if (taxaNominalFinanciamento === 0) {
      const parcelaMensal = valorFinanciado / meses;
      const totalParcelas = parcelaMensal * meses;
      const desembolsoTotal = entrada + totalParcelas;
    
      return {
        nome: "Financiamento SAC",
        parcelaMensal,
        totalPago: desembolsoTotal,
        custoTotal: desembolsoTotal,
        custoReal: desembolsoTotal,
        economia: 0,
        detalhes: {
          jurosNominal: 0,
          jurosReal: 0,
          custoOportunidade: 0,
          inflacao: 0
        }
      };
    }
    
    // SAC: Amortização constante + juros decrescentes
    const amortizacaoMensal = valorFinanciado / meses;
    let saldoDevedor = valorFinanciado;
    let totalJuros = 0;
    
    // Calcular juros totais nominais
    for (let i = 0; i < meses; i++) {
      const jurosMes = saldoDevedor * taxaNominalMensal;
      totalJuros += jurosMes;
      saldoDevedor -= amortizacaoMensal;
    }
    
    // Parcela inicial (maior) para mostrar na tabela
    const parcelaInicial = amortizacaoMensal + (valorFinanciado * taxaNominalMensal);
    const totalParcelas = valorFinanciado + totalJuros; // soma de todas as parcelas
    const desembolsoTotal = entrada + totalParcelas; // entrada + parcelas

    return {
      nome: "Financiamento SAC",
      parcelaMensal: parcelaInicial,
      totalPago: desembolsoTotal,
      custoTotal: desembolsoTotal,
      custoReal: desembolsoTotal,
      economia: 0,
      detalhes: {
        jurosNominal: totalJuros,
        jurosReal: totalJuros,
        custoOportunidade: 0,
        inflacao: inflacaoAnual
      }
    };
  };

  // Calcular consórcio com inflação anual (antes INCC)
  const calcularConsorcio = (): StrategyResult => {
    const meses = Math.max(1, prazoConsorcio * 12);
    
    // Taxa administrativa (ex.: 18% do valor total)
    const taxaAdmTotal = taxaAdministracaoConsorcio;
    const valorTaxaAdm = valorImovelInput * taxaAdmTotal;

    // Parcela base sem reajuste (valor do imóvel + taxa adm) dividido pelos meses
    const parcelaBase = (valorImovelInput + valorTaxaAdm) / meses || 0;

    // Reajuste anual pela inflação aplicada à parcela base
    let totalParcelasAjustadas = 0;
    for (let m = 0; m < meses; m++) {
      const anoIndex = Math.floor(m / 12); // 0 para meses 1–12, 1 para 13–24, etc.
      const fatorAnual = Math.pow(1 + inflacaoAnual, anoIndex);
      const parcelaMes = parcelaBase * fatorAnual;
      totalParcelasAjustadas += parcelaMes;
    }

    const parcelaMensalExibida = parcelaBase; // parcela do mês 1 (sem reajuste)
    const desembolsoTotal = totalParcelasAjustadas; // consórcio normalmente sem entrada
    const custoNominal = desembolsoTotal;

    // Componentes de "juros": tudo que excede (valor do imóvel + taxa adm)
    const baseSemReajuste = (valorImovelInput + valorTaxaAdm);
    const custoReajuste = Math.max(0, totalParcelasAjustadas - baseSemReajuste);

    // Custo de oportunidade do dinheiro que poderia estar investido (não somar no custo total)
    const mesesHorizonteInvest = Math.max(1, prazoFinanciamento * 12);
    const custoOportunidade = valorImovelInput * (Math.pow(1 + taxaAnualParaMensal(taxaNominalInvestimento), mesesHorizonteInvest) - 1);

    return {
      nome: "Consórcio",
      parcelaMensal: parcelaMensalExibida,
      totalPago: desembolsoTotal,
      custoTotal: custoNominal,
      custoReal: custoNominal,
      economia: 0,
      detalhes: {
        jurosNominal: custoReajuste + valorTaxaAdm,
        jurosReal: custoReajuste + valorTaxaAdm,
        custoOportunidade,
        inflacao: inflacaoAnual
      }
    };
  };

  // Calcular compra à vista com custo de oportunidade
  const calcularCompraVista = (): StrategyResult => {
    const meses = Math.max(1, prazoFinanciamento * 12);
    
    // Custo de oportunidade: o que o dinheiro renderia se investido
    const valorFuturoInvestimento = valorImovelInput * Math.pow(1 + taxaAnualParaMensal(taxaNominalInvestimento), meses);
    const custoOportunidade = valorFuturoInvestimento - valorImovelInput;
    
    // Desembolso total = valor do imóvel à vista
    const desembolsoTotal = valorImovelInput;

    return {
      nome: "Compra à Vista",
      parcelaMensal: 0,
      totalPago: desembolsoTotal,
      custoTotal: desembolsoTotal + custoOportunidade,
      custoReal: desembolsoTotal + custoOportunidade,
      economia: 0,
      detalhes: {
        jurosNominal: 0,
        jurosReal: 0,
        custoOportunidade,
        inflacao: 0
      }
    };
  };

  // Calcular todas as estratégias
  const calcularEstrategias = () => {
    const financiamento = calcularFinanciamento();
    const consorcio = calcularConsorcio();
    const compraVista = calcularCompraVista();

    // Calcular economia relativa baseada no CUSTO TOTAL
    const menorCusto = Math.min(financiamento.custoTotal, consorcio.custoTotal, compraVista.custoTotal);
    
    financiamento.economia = financiamento.custoTotal - menorCusto;
    consorcio.economia = consorcio.custoTotal - menorCusto;
    compraVista.economia = compraVista.custoTotal - menorCusto;

    return { financiamento, consorcio, compraVista };
  };

  const estrategias = calcularEstrategias();

  // Notificar mudanças
  useEffect(() => {
    if (estrategias) {
      onSimulationChange?.(estrategias);
    }
  }, [estrategias, onSimulationChange]);

  return (
    <Card className="w-full h-full border-border/80 shadow-sm">
      <CardHeader className="px-6 pb-0">
                  <div className="flex flex-col w-full gap-4">
            <div>
              <CardTitle className="text-xl font-semibold"></CardTitle>
              <CardDescription className="mt-1">
                Comparação com juros nominais derivados (Inflação + Taxa Real). O prazo do financiamento também é usado como horizonte para calcular o valor futuro do investimento nas estratégias de consórcio e compra à vista.
              </CardDescription>
            </div>

          {/* Controles */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="valorImovel">Valor do Imóvel</Label>
              <CurrencyInput
                id="valorImovel"
                value={valorImovelInput}
                onChange={setValorImovelInput}
                className="h-9"
              />
            </div>

            {/* Parâmetro Global */}
            <div className="space-y-3 md:col-span-3 rounded-md border border-border/60 p-4 bg-muted/5">
              <h4 className="text-sm font-semibold">Parâmetro Global</h4>
              <div className="space-y-2">
                <Label htmlFor="inflacaoAnual">Inflação Anual</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="inflacaoAnual"
                    value={[inflacaoAnual * 100]}
                    min={0}
                    max={12}
                    step={0.1}
                    onValueChange={(value) => setInflacaoAnual(value[0] / 100)}
                    className="flex-1"
                  />
                  <div className="w-12 text-center text-sm font-medium">
                    {(inflacaoAnual * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div>Financiamento: Nominal = Inflação + Taxa Real → <span className="font-medium text-foreground">{(taxaNominalFinanciamento * 100).toFixed(1)}% a.a.</span></div>
                <div>Consórcio: Reajuste anual das parcelas</div>
                <div>Compra à Vista: Retorno nominal = Inflação + Retorno Real → <span className="font-medium text-foreground">{(taxaNominalInvestimento * 100).toFixed(1)}% a.a.</span></div>
              </div>
            </div>

            {/* Financiamento */}
            <div className="space-y-3 rounded-md border border-border/60 p-4 bg-muted/10">
              <h4 className="text-sm font-semibold">Inputs de Financiamento</h4>
              <div className="space-y-2">
                <Label htmlFor="entrada">Entrada</Label>
                <CurrencyInput
                  id="entrada"
                  value={entrada}
                  onChange={setEntrada}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazoFinanciamento">Prazo (anos)</Label>
                <Input
                  id="prazoFinanciamento"
                  type="number"
                  value={prazoFinanciamento}
                  onChange={(e) => setPrazoFinanciamento(parseInt(e.target.value) || 30)}
                  min={5}
                  max={35}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">Este prazo também define o horizonte usado para calcular o valor futuro do investimento.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxaRealFinanciamento">Taxa Real do Financiamento</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="taxaRealFinanciamento"
                    value={[taxaRealFinanciamento * 100]}
                    min={0}
                    max={20}
                    step={0.1}
                    onValueChange={(value) => setTaxaRealFinanciamento(value[0] / 100)}
                    className="flex-1"
                  />
                  <div className="w-12 text-center text-sm font-medium">
                    {(taxaRealFinanciamento * 100).toFixed(1)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Nominal = Inflação + Taxa Real → {(taxaNominalFinanciamento * 100).toFixed(1)}% a.a.</p>
              </div>
            </div>

            {/* Consórcio */}
            <div className="space-y-3 rounded-md border border-border/60 p-4 bg-muted/10">
              <h4 className="text-sm font-semibold">Inputs de Consórcio</h4>
              <div className="space-y-2">
                <Label htmlFor="prazoConsorcio">Prazo (anos)</Label>
                <Input
                  id="prazoConsorcio"
                  type="number"
                  value={prazoConsorcio}
                  onChange={(e) => setPrazoConsorcio(parseInt(e.target.value) || 15)}
                  min={5}
                  max={25}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label>Inflação Anual</Label>
                <p className="text-xs text-muted-foreground">Parâmetro global: {(inflacaoAnual * 100).toFixed(1)}% a.a. Reajusta as parcelas do consórcio.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxaAdministracaoConsorcio">Taxa Administração</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="taxaAdministracaoConsorcio"
                    value={[taxaAdministracaoConsorcio * 100]}
                    min={0}
                    max={25}
                    step={0.5}
                    onValueChange={(value) => setTaxaAdministracaoConsorcio(value[0] / 100)}
                    className="flex-1"
                  />
                  <div className="w-12 text-center text-sm font-medium">
                    {(taxaAdministracaoConsorcio * 100).toFixed(1)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">% do valor total do bem.</p>
              </div>
            </div>

            {/* Compra à Vista / Investimento */}
            <div className="space-y-3 rounded-md border border-border/60 p-4 bg-muted/10">
              <h4 className="text-sm font-semibold">Inputs de Compra à Vista</h4>
              <div className="space-y-2">
                <Label htmlFor="retornoRealInvestimento">Retorno Real do Investimento</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="retornoRealInvestimento"
                    value={[retornoRealInvestimento * 100]}
                    min={0}
                    max={20}
                    step={0.1}
                    onValueChange={(value) => setRetornoRealInvestimento(value[0] / 100)}
                    className="flex-1"
                  />
                  <div className="w-16 text-center text-sm font-medium">
                    {(retornoRealInvestimento * 100).toFixed(1)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Nominal = Inflação + Retorno Real → {(taxaNominalInvestimento * 100).toFixed(1)}% a.a. Horizonte usa o Prazo do Financiamento.</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6">
        {/* Tabela de resultados */}
        <div className="border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Estratégia</th>
                <th className="py-2 px-3 text-right font-medium">Parcela Mensal (Mês 1)</th>
                <th className="py-2 px-3 text-right font-medium">Custo Total</th>
                <th className="py-2 px-3 text-right font-medium">Melhor Opção</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  estrategia: 'Financiamento',
                  parcelaMensal: estrategias.financiamento.parcelaMensal || 0,
                  custoTotal: estrategias.financiamento.custoTotal || 0,
                  economia: estrategias.financiamento.economia || 0,
                  detalhes: estrategias.financiamento.detalhes
                },
                {
                  estrategia: 'Consórcio',
                  parcelaMensal: estrategias.consorcio.parcelaMensal || 0,
                  custoTotal: estrategias.consorcio.custoTotal || 0,
                  economia: estrategias.consorcio.economia || 0,
                  detalhes: estrategias.consorcio.detalhes
                },
                {
                  estrategia: 'Compra à Vista',
                  parcelaMensal: 0,
                  custoTotal: estrategias.compraVista.custoTotal || 0,
                  economia: estrategias.compraVista.economia || 0,
                  detalhes: estrategias.compraVista.detalhes
                }
              ].map((estrategia, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-2 px-3 font-medium">{estrategia.estrategia}</td>
                  <td className="py-2 px-3 text-right">
                    {estrategia.parcelaMensal > 0 ? formatCurrency(estrategia.parcelaMensal) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right">{formatCurrency(estrategia.custoTotal)}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={estrategia.economia === 0 ? 'text-[#21887C] font-medium' : 'text-[#E52B50]'}>
                      {estrategia.economia === 0 ? '✓ Melhor' : `+${formatCurrency(estrategia.economia)}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      
    </CardContent>
  </Card>
);
};

export default FinancingSimulator; 