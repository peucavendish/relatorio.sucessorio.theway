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
  const [prazoFinanciamento, setPrazoFinanciamento] = useState<number>(30);
  const [taxaJurosReal, setTaxaJurosReal] = useState<number>(0.096); // 9.6% ao ano nominal
  const [prazoConsorcio, setPrazoConsorcio] = useState<number>(15);
  const [taxaAdministracaoConsorcio, setTaxaAdministracaoConsorcio] = useState<number>(0.18); // 18% do valor total
  const [taxaRetornoReal, setTaxaRetornoReal] = useState<number>(0.072); // 7.2% ao ano nominal
  const [inccAnual, setInccAnual] = useState<number>(0.055); // INCC anual (5.5%)

  // Converter taxa anual para mensal
  const taxaAnualParaMensal = (taxaAnual: number) => {
    return Math.pow(1 + taxaAnual, 1/12) - 1;
  };

    // Calcular financiamento SAC (Sistema de Amortização Constante) usando taxas nominais
  const calcularFinanciamento = (): StrategyResult => {
    const valorFinanciado = Math.max(0, valorImovelInput - entrada);
    const taxaNominalMensal = taxaAnualParaMensal(taxaJurosReal);
    const meses = Math.max(1, prazoFinanciamento * 12);
    
    if (taxaJurosReal === 0) {
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
        inflacao: 0
      }
    };
  };

  // Calcular consórcio com taxas nominais + INCC
  const calcularConsorcio = (): StrategyResult => {
    const meses = Math.max(1, prazoConsorcio * 12);
    
    // Taxa administrativa (ex.: 18% do valor total)
    const taxaAdmTotal = taxaAdministracaoConsorcio;
    const valorTaxaAdm = valorImovelInput * taxaAdmTotal;

    // INCC anual aplicado ao valor do imóvel (usuário escolhe 5% a 6% ou outro)
    const inccFator = Math.pow(1 + inccAnual, prazoConsorcio) - 1; // crescimento acumulado
    const custoINCC = valorImovelInput * inccFator;

    // Parcela mensal nominal = (valor do imóvel + taxa adm + INCC acumulado) / meses
    const parcelaMensal = (valorImovelInput + valorTaxaAdm + custoINCC) / meses || 0;
    const totalParcelas = parcelaMensal * meses;
    const desembolsoTotal = totalParcelas; // consórcio normalmente sem entrada
    const custoNominal = desembolsoTotal;
    // Custo de oportunidade do dinheiro que poderia estar investido (não somar no custo total)
    const custoOportunidade = valorImovelInput * (Math.pow(1 + taxaAnualParaMensal(taxaRetornoReal), meses) - 1);

    return {
      nome: "Consórcio",
      parcelaMensal,
      totalPago: desembolsoTotal,
      custoTotal: custoNominal,
      custoReal: custoNominal,
      economia: 0,
      detalhes: {
        jurosNominal: custoINCC + valorTaxaAdm,
        jurosReal: custoINCC + valorTaxaAdm,
        custoOportunidade,
        inflacao: inccAnual
      }
    };
  };

  // Calcular compra à vista com custo de oportunidade
  const calcularCompraVista = (): StrategyResult => {
    const meses = Math.max(1, prazoFinanciamento * 12);
    
    // Custo de oportunidade: o que o dinheiro renderia se investido
    const valorFuturoInvestimento = valorImovelInput * Math.pow(1 + taxaAnualParaMensal(taxaRetornoReal), meses);
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
              <CardTitle className="text-xl font-semibold">Simulador de Estratégias (Taxas Nominais)</CardTitle>
              <CardDescription className="mt-1">
                Comparação com juros nominais; no consórcio, INCC ajustável incluído
              </CardDescription>
            </div>

          {/* Controles */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="valorImovel">Valor do Imóvel</Label>
              <CurrencyInput
                id="valorImovel"
                value={valorImovelInput}
                onChange={setValorImovelInput}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entrada">Entrada (Financiamento)</Label>
              <CurrencyInput
                id="entrada"
                value={entrada}
                onChange={setEntrada}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazoFinanciamento">Prazo Financiamento (anos)</Label>
              <Input
                id="prazoFinanciamento"
                type="number"
                value={prazoFinanciamento}
                onChange={(e) => setPrazoFinanciamento(parseInt(e.target.value) || 30)}
                min={5}
                max={35}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="prazoConsorcio">Prazo Consórcio (anos)</Label>
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
            <div className="space-y-2">
              <Label htmlFor="inccAnual">INCC Anual</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="inccAnual"
                  value={[inccAnual * 100]}
                  min={0}
                  max={12}
                  step={0.1}
                  onValueChange={(value) => setInccAnual(value[0] / 100)}
                  className="flex-1"
                />
                <div className="w-12 text-center text-sm font-medium">
                  {(inccAnual * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Histórico ~5%–6% a.a. (ajustável)</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="space-y-2">
              <Label htmlFor="taxaRetornoReal">Taxa Nominal de Investimentos</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="taxaRetornoReal"
                  value={[taxaRetornoReal * 100]}
                  min={0}
                  max={20}
                  step={0.1}
                  onValueChange={(value) => setTaxaRetornoReal(value[0] / 100)}
                  className="flex-1"
                />
                <div className="w-16 text-center text-sm font-medium">
                  {(taxaRetornoReal * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Retorno nominal anual</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxaJurosReal">Taxa Nominal do Financiamento</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="taxaJurosReal"
                  value={[taxaJurosReal * 100]}
                  min={0}
                  max={20}
                  step={0.1}
                  onValueChange={(value) => setTaxaJurosReal(value[0] / 100)}
                  className="flex-1"
                />
                <div className="w-12 text-center text-sm font-medium">
                  {(taxaJurosReal * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Juros nominais anuais</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxaAdministracaoConsorcio">Taxa Administração Consórcio</Label>
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
              <p className="text-xs text-muted-foreground">% do valor total</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6">
        {/* Tabela de resultados */}
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Estratégia</th>
                <th className="py-2 px-3 text-right font-medium">Parcela Mensal</th>
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
                    <span className={estrategia.economia === 0 ? 'text-green-600 font-medium' : 'text-red-600'}>
                      {estrategia.economia === 0 ? '✓ Melhor' : `+${formatCurrency(estrategia.economia)}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalhes da análise */}
        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                        <h3 className="font-medium mb-3">Detalhes da Análise</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Taxa Nominal Financiamento:</strong> {(taxaJurosReal * 100).toFixed(1)}% a.a.</p>
                  <p><strong>Taxa Adm. Consórcio:</strong> {(taxaAdministracaoConsorcio * 100).toFixed(1)}% do valor total</p>
                  <p><strong>INCC (consórcio):</strong> {(inccAnual * 100).toFixed(1)}% a.a.</p>
                </div>
                <div>
                  <p><strong>Retorno Nominal (oportunidade):</strong> {(taxaRetornoReal * 100).toFixed(1)}% a.a.</p>
                  <p><strong>Período de Análise:</strong> {prazoFinanciamento} anos</p>
                  <p><strong>Valor do Imóvel:</strong> {formatCurrency(valorImovelInput)}</p>
                  <p><strong>Entrada:</strong> {formatCurrency(entrada)}</p>
                </div>
              </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancingSimulator; 