import React, { useState, useEffect } from 'react';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import {
  AreaChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';
import { ChartContainer } from '@/components/ui/chart';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getLiquidityEvents, saveLiquidityEvents, LiquidityEventApi } from '@/services/liquidityEventsService';

// Custom currency input component
const CurrencyInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}> = ({ value, onChange, className, id, disabled }) => {
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
      disabled={disabled}
      readOnly={disabled}
      aria-readonly={disabled ? true : undefined}
    />
  );
};

interface RetirementProjectionChartProps {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentPortfolio: number;
  monthlyContribution: number;
  rendaMensalDesejada: number;
  safeWithdrawalRate: number;
  inflationRate: number;
  scenarios?: Array<{
    idade: number;
    aporteMensal: number;
    capitalNecessario: number;
  }>;
  onProjectionChange?: (projection: {
    capitalNecessario: number;
    aporteMensal: number;
    idadeEsgotamento: number | null;
    rendaMensal: number;
    idadeAposentadoria: number;
  }) => void;
  hideControls?: boolean;
  externalLiquidityEvents?: Array<{
    id: string;
    name: string;
    value: number;
    isPositive?: boolean;
    recurrence?: 'once' | 'annual' | 'monthly';
    startAge: number;
    endAge?: number | null;
    enabled?: boolean;
    isDerived?: boolean;
  }>;
}

interface LiquidityEvent {
  id: string;
  name: string;
  value: number;
  isPositive: boolean;
  // Backwards compatibility: some legacy events may have only a single age
  age?: number;
  // New recurrence fields
  recurrence?: 'once' | 'annual' | 'monthly';
  startAge: number;
  endAge?: number | null;
  // Enable/disable support
  enabled?: boolean;
  // Flag to mark events derived from external data (not persisted to API)
  isDerived?: boolean;
}

interface DuracaoCapital {
  idadeFinal: number;
  duracaoAnos: number;
}

// Função PMT idêntica à usada na planilha
function PMT(taxa: number, periodos: number, vp: number, vf: number = 0, tipo: number = 0) {
  if (taxa === 0) return -(vp + vf) / periodos;
  const x = Math.pow(1 + taxa, periodos);
  return -(vp * x + vf) * taxa / ((x - 1) * (1 + taxa * tipo));
}

// Função para calcular o aporte mensal necessário para perpetuidade
const calculatePerpetuityContribution = (
  idade_atual: number,
  idade_para_aposentar: number,
  capitalDisponivelHoje: number,
  saque_mensal_desejado: number,
  rentabilidade_real_liquida_acumulacao: number = 0.03,
  eventosLiquidez: LiquidityEvent[] = []
) => {
  const taxa_mensal_real = Math.pow(1 + rentabilidade_real_liquida_acumulacao, 1 / 12) - 1;
  const meses_acumulacao = (idade_para_aposentar - idade_atual) * 12;

  if (meses_acumulacao <= 0) return 0;

  // Para perpetuidade, o capital necessário é: saque_mensal / taxa_mensal
  let capitalNecessarioPerpetuidade = saque_mensal_desejado / taxa_mensal_real;

  // Calculamos o valor futuro do capital disponível hoje
  const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);

  // Considere apenas eventos ativos
  const effectiveEvents = (eventosLiquidez || []).filter(e => e.enabled !== false);

  // Ajuste do capital necessário por eventos pós-aposentadoria (valor presente na data de aposentadoria)
  // Eventos positivos reduzem o capital necessário, negativos aumentam
  if (effectiveEvents.length > 0) {
    let pvEventosPosApos = 0;
    const taxa_mensal_real_consumo = taxa_mensal_real; // em perpetuidade, usamos a mesma taxa real
    const idadeMaxima = 100;
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;

      if (recurrence === 'once') {
        if (start >= idade_para_aposentar) {
          const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
          const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      } else {
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
          const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      }
    });
    capitalNecessarioPerpetuidade = Math.max(0, capitalNecessarioPerpetuidade - pvEventosPosApos);
  }

  // Calculamos o valor futuro dos eventos de liquidez (suportando recorrência)
  let valorFuturoEventos = 0;
  effectiveEvents.forEach(evento => {
    const recurrence = evento.recurrence || 'once';
    const start = evento.startAge ?? evento.age ?? idade_atual;
    const last = Math.min(evento.endAge ?? (idade_para_aposentar - 1), idade_para_aposentar - 1);
    const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;

    if (recurrence === 'once') {
      if (start < idade_para_aposentar) {
        const mesesAteAposentadoria = (idade_para_aposentar - start) * 12;
        const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
        valorFuturoEventos += evento.isPositive ? valorFuturo : -valorFuturo;
      }
    } else {
      for (let a = start; a <= last; a++) {
        if (a < idade_para_aposentar) {
          const mesesAteAposentadoria = (idade_para_aposentar - a) * 12;
          const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
          valorFuturoEventos += evento.isPositive ? valorFuturo : -valorFuturo;
        }
      }
    }
  });

  // Capital total disponível no momento da aposentadoria
  const capitalTotalDisponivel = capitalFuturo + valorFuturoEventos;

  // Se já temos capital suficiente, retornamos 0
  if (capitalTotalDisponivel >= capitalNecessarioPerpetuidade) return 0;

  // Calculamos o aporte mensal necessário para complementar
  const pmt = PMT(
    taxa_mensal_real,
    meses_acumulacao,
    -capitalDisponivelHoje,
    capitalNecessarioPerpetuidade - valorFuturoEventos
  );

  return Math.max(0, Math.abs(pmt));
};

// Função principal de cálculo alinhada com a planilha
const calculateRetirementProjection = (
  idade_atual: number,
  idade_para_aposentar: number,
  expectativa_de_vida: number,
  capitalDisponivelHoje: number,
  capital_disponivel_mensal: number,
  saque_mensal_desejado: number,
  rentabilidade_real_liquida_acumulacao: number = 0.03,
  rentabilidade_real_liquida_consumo: number = 0.03,
  eventosLiquidez: LiquidityEvent[] = [],
  isPerpetuity: boolean = false,
  overrideAporteMensal: number | null = null
) => {

  // Taxa mensal equivalente (igual à planilha)
  const taxa_mensal_real = Math.pow(1 + rentabilidade_real_liquida_acumulacao, 1 / 12) - 1;

  // Cálculo do capital necessário (usando a mesma abordagem da planilha)
  const calculaCapitalNecessario = (rendaTarget: number) => {
    const taxa_mensal_real_consumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
    // Base do capital necessário (sem considerar eventos pós-aposentadoria)
    let baseCapitalNecessario = 0;
    if (isPerpetuity) {
      // Para perpetuidade, o capital necessário é: saque_mensal / taxa_mensal (consumo)
      baseCapitalNecessario = rendaTarget / taxa_mensal_real_consumo;
    } else {
      const consumoEndAge = 99;
      const meses_consumo = (consumoEndAge - idade_para_aposentar) * 12;
      // Fórmula idêntica à usada na planilha (célula C9 em Apos(2)) com taxa de consumo
      baseCapitalNecessario = (rendaTarget * (1 - Math.pow(1 + taxa_mensal_real_consumo, -meses_consumo)) / taxa_mensal_real_consumo);
    }

    // Ajuste por eventos pós-aposentadoria: traz a valor presente na data de aposentadoria
    const effectiveEvents = (eventosLiquidez || []).filter(e => e.enabled !== false);
    if (effectiveEvents.length === 0) return baseCapitalNecessario;

    let pvEventosPosApos = 0;
    const idadeMaxima = isPerpetuity ? 100 : 99;
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;

      if (recurrence === 'once') {
        if (start >= idade_para_aposentar) {
          const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
          const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      } else {
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
          const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      }
    });

    // Eventos positivos reduzem a necessidade de capital, negativos aumentam
    const ajustado = Math.max(0, baseCapitalNecessario - pvEventosPosApos);
    return ajustado;
  };

  // Meses de acumulação
  const meses_acumulacao = (idade_para_aposentar - idade_atual) * 12;

  // Determinar aporte mensal usado (permite override)
  const aporteMensalCalculado = (() => {
    const meses = meses_acumulacao;
    if (meses <= 0) return 0;
    // Primeiro, calculamos o capital necessário total usando a renda original apenas para o caso padrão
    const capitalNecessarioPadrao = calculaCapitalNecessario(saque_mensal_desejado);

    // Valor futuro do capital disponível hoje
    const capitalFuturoPadrao = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses);

    // Eventos pré-aposentadoria para FV
    const effectiveEventsPadrao = (eventosLiquidez || []).filter(e => e.enabled !== false);
    let valorFuturoEventosPadrao = 0;
    effectiveEventsPadrao.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? (idade_para_aposentar - 1), idade_para_aposentar - 1);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;

      if (recurrence === 'once') {
        if (start < idade_para_aposentar) {
          const mesesAteAposentadoria = (idade_para_aposentar - start) * 12;
          const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
          valorFuturoEventosPadrao += evento.isPositive ? valorFuturo : -valorFuturo;
        }
      } else {
        for (let a = start; a <= last; a++) {
          if (a < idade_para_aposentar) {
            const mesesAteAposentadoria = (idade_para_aposentar - a) * 12;
            const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
            valorFuturoEventosPadrao += evento.isPositive ? valorFuturo : -valorFuturo;
          }
        }
      }
    });

    // Se houver override, usaremos o override diretamente
    if (overrideAporteMensal != null) return overrideAporteMensal;

    // Sem override: calculamos o aporte necessário como antes
    const meses_ac = meses;
    if (meses_ac <= 0) return 0;
    const capitalNecessarioTotal = capitalNecessarioPadrao;
    const capitalTotalDisponivelNaAposentadoria = capitalFuturoPadrao + valorFuturoEventosPadrao;
    if (capitalTotalDisponivelNaAposentadoria >= capitalNecessarioTotal) return 0;
    const pmt = PMT(
      taxa_mensal_real,
      meses_ac,
      -capitalDisponivelHoje,
      capitalNecessarioTotal - valorFuturoEventosPadrao
    );
    return Math.max(0, Math.abs(pmt));
  })();

  // Se estamos resolvendo a renda a partir de um aporte específico, calcular renda correspondente
  const rendaMensalCalculada = (() => {
    // Em perpetuidade, a renda mensal é a que mantém patrimônio constante: rendimento sobre o capital + efeito PV dos eventos pós-aposentadoria
    if (isPerpetuity) {
      if (meses_acumulacao <= 0) return 0;
      const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);
      const fvAportes = taxa_mensal_real === 0
        ? aporteMensalCalculado * meses_acumulacao
        : aporteMensalCalculado * ((Math.pow(1 + taxa_mensal_real, meses_acumulacao) - 1) / taxa_mensal_real);

      // Eventos pré-aposentadoria
      const effectiveEvents = (eventosLiquidez || []).filter(e => e.enabled !== false);
      let valorFuturoEventosPre = 0;
      effectiveEvents.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const last = Math.min(evento.endAge ?? (idade_para_aposentar - 1), idade_para_aposentar - 1);
        const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;
        if (recurrence === 'once') {
          if (start < idade_para_aposentar) {
            const mesesAteAposentadoria = (idade_para_aposentar - start) * 12;
            const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
            valorFuturoEventosPre += evento.isPositive ? valorFuturo : -valorFuturo;
          }
        } else {
          for (let a = start; a <= last; a++) {
            if (a < idade_para_aposentar) {
              const mesesAteAposentadoria = (idade_para_aposentar - a) * 12;
              const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
              valorFuturoEventosPre += evento.isPositive ? valorFuturo : -valorFuturo;
            }
          }
        }
      });

      const capitalNaAposentadoria = capitalFuturo + valorFuturoEventosPre + fvAportes;

      // PV dos eventos pós-aposentadoria (consumo)
      const taxa_mensal_real_consumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
      let pvEventosPosApos = 0;
      const idadeMaxima = 100;
      effectiveEvents.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
        const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;
        if (recurrence === 'once') {
          if (start >= idade_para_aposentar) {
            const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
            const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
            pvEventosPosApos += evento.isPositive ? pv : -pv;
          }
        } else {
          for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
            const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
            const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
            pvEventosPosApos += evento.isPositive ? pv : -pv;
          }
        }
      });

      return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) * taxa_mensal_real_consumo);
    }

    if (overrideAporteMensal == null) return saque_mensal_desejado;
    if (meses_acumulacao <= 0) return 0;

    // Capital na data de aposentadoria com o aporte escolhido
    const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);
    const fvAportes = taxa_mensal_real === 0
      ? aporteMensalCalculado * meses_acumulacao
      : aporteMensalCalculado * ((Math.pow(1 + taxa_mensal_real, meses_acumulacao) - 1) / taxa_mensal_real);

    // Eventos pré-aposentadoria
    const effectiveEvents = (eventosLiquidez || []).filter(e => e.enabled !== false);
    let valorFuturoEventosPre = 0;
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? (idade_para_aposentar - 1), idade_para_aposentar - 1);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;
      if (recurrence === 'once') {
        if (start < idade_para_aposentar) {
          const mesesAteAposentadoria = (idade_para_aposentar - start) * 12;
          const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
          valorFuturoEventosPre += evento.isPositive ? valorFuturo : -valorFuturo;
        }
      } else {
        for (let a = start; a <= last; a++) {
          if (a < idade_para_aposentar) {
            const mesesAteAposentadoria = (idade_para_aposentar - a) * 12;
            const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
            valorFuturoEventosPre += evento.isPositive ? valorFuturo : -valorFuturo;
          }
        }
      }
    });

    const capitalNaAposentadoria = capitalFuturo + valorFuturoEventosPre + fvAportes;

    // PV dos eventos pós-aposentadoria (consumo)
    const taxa_mensal_real_consumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
    let pvEventosPosApos = 0;
    const idadeMaxima = isPerpetuity ? 100 : expectativa_de_vida;
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;
      if (recurrence === 'once') {
        if (start >= idade_para_aposentar) {
          const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
          const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      } else {
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
          const pv = annualAmount / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      }
    });

    if (isPerpetuity) {
      return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) * taxa_mensal_real_consumo);
    } else {
      const consumoEndAge = 99;
      const meses_consumo = (consumoEndAge - idade_para_aposentar) * 12;
      if (meses_consumo <= 0) return 0;
      const coef = (1 - Math.pow(1 + taxa_mensal_real_consumo, -meses_consumo)) / taxa_mensal_real_consumo;
      return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) / coef);
    }
  })();

  // Capital necessário com base na renda efetivamente usada
  const capitalNecessario = calculaCapitalNecessario(rendaMensalCalculada);

  // Cálculo do aporte mensal necessário (igual à planilha - célula C14 em Apos(2))
  const calculaAporteMensal = () => {
    const meses_acumulacao = (idade_para_aposentar - idade_atual) * 12;
    if (meses_acumulacao <= 0) return 0;

    // Primeiro, calculamos o capital necessário total
    const capitalNecessarioTotal = capitalNecessario;

    // Calculamos o valor futuro do capital disponível hoje
    const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);

    // Considere apenas eventos ativos
    const effectiveEvents = (eventosLiquidez || []).filter(e => e.enabled !== false);

    // Calculamos o valor futuro dos eventos de liquidez (suportando recorrência)
    let valorFuturoEventos = 0;
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? (idade_para_aposentar - 1), idade_para_aposentar - 1);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;

      if (recurrence === 'once') {
        if (start < idade_para_aposentar) {
          const mesesAteAposentadoria = (idade_para_aposentar - start) * 12;
          const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
          valorFuturoEventos += evento.isPositive ? valorFuturo : -valorFuturo;
        }
      } else {
        for (let a = start; a <= last; a++) {
          if (a < idade_para_aposentar) {
            const mesesAteAposentadoria = (idade_para_aposentar - a) * 12;
            const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
            valorFuturoEventos += evento.isPositive ? valorFuturo : -valorFuturo;
          }
        }
      }
    });

    // Capital total disponível no momento da aposentadoria
    const capitalTotalDisponivel = capitalFuturo + valorFuturoEventos;

    // Se já temos capital suficiente, retornamos 0
    if (capitalTotalDisponivel >= capitalNecessarioTotal) return 0;

    // Calculamos o aporte mensal necessário para complementar
    const pmt = PMT(
      taxa_mensal_real,
      meses_acumulacao,
      -capitalDisponivelHoje,
      capitalNecessarioTotal - valorFuturoEventos
    );

    return Math.max(0, Math.abs(pmt));
  };

  let aporteMensal = aporteMensalCalculado;

  // Simulação do fluxo de capital (ajustado para a lógica da planilha)
  const simularFluxoCapital = () => {
    const fluxo = [];
    const fluxoCaixaAnual: Array<{
      idade: number;
      fase: 'Acumulação' | 'Consumo';
      capitalInicial: number;
      eventos: number;
      aporte: number;
      rendimento: number;
      saque: number;
      capitalFinal: number;
    }> = [];
    let capital = capitalDisponivelHoje;
    let idade = idade_atual;

    // Considere apenas eventos ativos
    const effectiveEvents = (eventosLiquidez || []).filter(e => e.enabled !== false);

    // Pré-processa eventos por idade considerando recorrência
    const eventsByAge = new Map<number, number>();
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const maxAge = isPerpetuity ? 100 : expectativa_de_vida;
      const last = Math.min(evento.endAge ?? maxAge, maxAge);
      const annualAmount = recurrence === 'monthly' ? (evento.value * 12) : evento.value;

      if (recurrence === 'once') {
        const delta = (evento.isPositive ? 1 : -1) * annualAmount;
        eventsByAge.set(start, (eventsByAge.get(start) || 0) + delta);
      } else {
        for (let a = start; a <= last; a++) {
          const delta = (evento.isPositive ? 1 : -1) * annualAmount;
          eventsByAge.set(a, (eventsByAge.get(a) || 0) + delta);
        }
      }
    });

    // Fase de acumulação
    while (idade < idade_para_aposentar) {
      const capitalInicial = capital;

      // Aplica eventos de liquidez no ano atual (já agregados por idade)
      const delta = eventsByAge.get(idade) || 0;
      capital += delta;

      // Registra o capital após os eventos (para o gráfico)
      fluxo.push({ idade, capital });

      // Capitalização mensal equivalente para 12 meses
      const taxaMensalReal = Math.pow(1 + rentabilidade_real_liquida_acumulacao, 1 / 12) - 1;
      const fatorAnual = Math.pow(1 + taxaMensalReal, 12);

      // Aportes mensais ao longo do ano (valor futuro no fim dos 12 meses)
      const aporteAnual = aporteMensal * 12;
      const fvAportes = taxaMensalReal === 0
        ? aporteAnual
        : aporteMensal * ((fatorAnual - 1) / taxaMensalReal);

      // Rendimento separando capital inicial e crescimento sobre os aportes do ano
      const rendimentoCapital = capital * (fatorAnual - 1);
      const rendimentoAportes = fvAportes - aporteAnual;
      const rendimentoTotal = rendimentoCapital + rendimentoAportes;

      // Atualiza o capital com rendimento total e o aporte efetivado no ano
      const capitalFinal = capital + aporteAnual + rendimentoTotal;

      // Registra no fluxo de caixa
      fluxoCaixaAnual.push({
        idade,
        fase: 'Acumulação',
        capitalInicial,
        eventos: delta,
        aporte: aporteAnual,
        rendimento: rendimentoTotal,
        saque: 0,
        capitalFinal
      });

      capital = capitalFinal;
      idade++;
    }

    // Fase de consumo
    const saqueAnual = rendaMensalCalculada * 12;
    let idadeEsgotamento = null;

    if (isPerpetuity) {
      // Para perpetuidade, simulamos até 100 anos, aplicamos eventos, e consumimos rendimento + eventos positivos (patrimônio travado)
      const idadeMaxima = 100;
      while (idade <= idadeMaxima) {
        const capitalInicial = capital;

        // Aplica eventos de liquidez no ano atual (agregados)
        const deltaRaw = eventsByAge.get(idade) || 0;
        const isLastYear = idade === idadeMaxima;
        const delta = isLastYear ? 0 : deltaRaw; // não aplica eventos no último ano para fechar exatamente em 0
        capital += delta;

        // Para o último ano, registraremos após calcular capitalFinal para refletir estabilidade

        // Capitalização mensal equivalente na fase de consumo
        const taxaMensalConsumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
        const fatorAnualConsumo = Math.pow(1 + taxaMensalConsumo, 12);
        const rendimentoCapital = capital * (fatorAnualConsumo - 1);
        // Em perpetuidade, consome o rendimento + eventos positivos para manter capital estável
        let saqueEfetivo = Math.max(0, rendimentoCapital + Math.max(0, delta));
        let capitalFinal = capital + rendimentoCapital - saqueEfetivo;

        // Se o capital ficaria negativo, limitamos o saque mantendo saldo até o último ano
        if (capitalFinal < 0) {
          if (idade < idadeMaxima) {
            const saldoMinimoParaUltimoAno = 1; // unidade monetária mínima
            const maxSaque = Math.max(0, capital + rendimentoCapital - saldoMinimoParaUltimoAno);
            saqueEfetivo = Math.min(saqueEfetivo, maxSaque);
            capitalFinal = Math.max(0, capital + rendimentoCapital - saqueEfetivo);
          } else {
            saqueEfetivo = Math.max(0, capital + rendimentoCapital);
            capitalFinal = 0;
            if (idadeEsgotamento === null) idadeEsgotamento = idade;
          }
        }

        fluxoCaixaAnual.push({
          idade,
          fase: 'Consumo',
          capitalInicial,
          eventos: delta,
          aporte: 0,
          rendimento: rendimentoCapital,
          saque: saqueEfetivo,
          capitalFinal
        });

        // Registra o capital para o gráfico (usa capitalFinal no último ano)
        if (idade === idadeMaxima) {
          fluxo.push({ idade, capital: capitalFinal > 0 ? capitalFinal : 0 });
        } else {
          fluxo.push({ idade, capital: capital > 0 ? capital : 0 });
        }

        capital = capitalFinal;
        idade++;
      }
    } else {
      // Cenário finito: simular sempre até 99 e zerar no último ano
      const consumoEndAge = 99;
      let patrimonioEsgotado = false;
      while (idade <= consumoEndAge) {
        const capitalInicial = capital;

        // Se o patrimônio já foi esgotado em ano anterior, ignoramos eventos e mantemos tudo zerado
        if (patrimonioEsgotado) {
          if (idadeEsgotamento === null) idadeEsgotamento = Math.min(idadeEsgotamento ?? idade, idade);
          fluxoCaixaAnual.push({
            idade,
            fase: 'Consumo',
            capitalInicial,
            eventos: 0,
            aporte: 0,
            rendimento: 0,
            saque: 0,
            capitalFinal: 0
          });
          fluxo.push({ idade, capital: 0 });
          capital = 0;
          patrimonioEsgotado = true;
          idade++;
          continue;
        }

        // Aplica eventos de liquidez no ano atual (agregados)
        const delta = eventsByAge.get(idade) || 0;
        capital += delta;

        // Capitalização mensal equivalente na fase de consumo
        const taxaMensalConsumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
        const fatorAnualConsumo = Math.pow(1 + taxaMensalConsumo, 12);
        const saqueMensal = rendaMensalCalculada;
        const fvSaques = taxaMensalConsumo === 0
          ? saqueMensal * 12
          : saqueMensal * ((fatorAnualConsumo - 1) / taxaMensalConsumo);

        const rendimentoCapital = capital * (fatorAnualConsumo - 1);
        let saqueEfetivo = fvSaques; // valor futuro dos 12 saques mensais
        let capitalFinal = capital + rendimentoCapital - saqueEfetivo;

        // Se o capital ficaria negativo, limitamos o saque do último ano para zerar
        if (capitalFinal < 0) {
          if (idade < consumoEndAge) {
            const saldoMinimoParaUltimoAno = 1;
            const maxSaque = Math.max(0, (capital + rendimentoCapital) - saldoMinimoParaUltimoAno);
            saqueEfetivo = Math.min(saqueEfetivo, maxSaque);
            capitalFinal = Math.max(saldoMinimoParaUltimoAno, capital + rendimentoCapital - saqueEfetivo);
          } else {
            saqueEfetivo = Math.max(0, capital + rendimentoCapital);
            capitalFinal = 0;
            if (idadeEsgotamento === null) idadeEsgotamento = idade;
          }
        }

        // Zerar no último ano do horizonte (99) apenas se houver necessidade de aporte
        if (idade === consumoEndAge && capitalFinal > 0 && aporteMensal > 0) {
          saqueEfetivo = capital + rendimentoCapital;
          capitalFinal = 0;
        }

        // (comportamento original restaurado; sem forçar zerar no último ano)

        fluxoCaixaAnual.push({
          idade,
          fase: 'Consumo',
          capitalInicial,
          eventos: delta,
          aporte: 0,
          rendimento: rendimentoCapital,
          saque: saqueEfetivo,
          capitalFinal
        });

        // Registra o capital para o gráfico (usa capitalFinal no último ano)
        if (idade === consumoEndAge) {
          fluxo.push({ idade, capital: capitalFinal > 0 ? capitalFinal : 0 });
        } else {
          fluxo.push({ idade, capital: capital > 0 ? capital : 0 });
        }

        capital = capitalFinal;
        if (capital === 0) {
          patrimonioEsgotado = true;
        }
        idade++;
      }
    }

    return { fluxo, fluxoCaixaAnual, idadeEsgotamento };
  };

  const resultado = simularFluxoCapital();
  const fluxoCapital = resultado.fluxo;
  const idadeEsgotamento = resultado.idadeEsgotamento;
  const fluxoCaixaAnual = resultado.fluxoCaixaAnual;

  return {
    capitalNecessario,
    aporteMensal,
    rendaMensal: rendaMensalCalculada,
    fluxoCapital,
    fluxoCaixaAnual,
    idadeEsgotamento
  };
};

const chartConfig = {
  capital: {
    label: "Patrimônio acumulado",
    theme: {
      light: "#B8860B",
      dark: "#B8860B",
    }
  },
};

const RetirementProjectionChart: React.FC<RetirementProjectionChartProps> = ({
  currentAge,
  retirementAge,
  lifeExpectancy,
  currentPortfolio,
  monthlyContribution,
  rendaMensalDesejada,
  safeWithdrawalRate,
  inflationRate,
  onProjectionChange,
  scenarios,
  hideControls,
  externalLiquidityEvents
}) => {
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();
  // Removed selectedView state since we only show the complete scenario
  const [taxaRetorno, setTaxaRetorno] = useState<number>(0.03); // 3% real ao ano como na planilha
  const [rendaMensal, setRendaMensal] = useState<number>(rendaMensalDesejada);
  const [idadeAposentadoria, setIdadeAposentadoria] = useState<number>(retirementAge);
  const [isPerpetuity, setIsPerpetuity] = useState<boolean>(false);
  const [aporteMensal, setAporteMensal] = useState<number>(() => {
    const result = calculateRetirementProjection(
      currentAge,
      retirementAge,
      lifeExpectancy,
      currentPortfolio,
      monthlyContribution,
      rendaMensalDesejada,
      0.03,
      0.03,
      [],
      false
    );
    return result.aporteMensal;
  });
  const [overrideAporte, setOverrideAporte] = useState<number | null>(null);
  const [liquidityEvents, setLiquidityEvents] = useState<LiquidityEvent[]>([]);
  const [removedDerivedIds, setRemovedDerivedIds] = useState<string[]>([]);
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventValue, setNewEventValue] = useState<number>(0);
  const [newEventType, setNewEventType] = useState<'positive' | 'negative'>('positive');

  // Função para obter o session_id da URL
  const getSessionId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId');
  };

  // Carregar eventos de liquidez da API ao montar o componente
  useEffect(() => {
    const loadLiquidityEvents = async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;

      try {
        const apiEvents = await getLiquidityEvents(sessionId);
        const events: LiquidityEvent[] = apiEvents.map((event, index) => ({
          id: `event-${index}`,
          name: event.nome,
          age: Number(event.idade),
          startAge: Number(event.idade),
          value: Number(event.valor),
          isPositive: event.tipo === 'entrada',
          recurrence: 'once',
          endAge: null,
          enabled: true
        }));
        setLiquidityEvents(prev => {
          // Preserve any existing derived events already injected
          const derived = (prev || []).filter(e => e.isDerived);
          return [...derived, ...events];
        });
      } catch (error) {
        console.error('Error loading liquidity events:', error);
      }
    };

    loadLiquidityEvents();
  }, []);

  // Persistir/remontar remoções de eventos derivados por sessão (localStorage)
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    try {
      const saved = localStorage.getItem(`removedDerivedLiquidity:${sessionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setRemovedDerivedIds(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    try {
      localStorage.setItem(`removedDerivedLiquidity:${sessionId}`, JSON.stringify(removedDerivedIds));
    } catch {}
  }, [removedDerivedIds]);

  // Inject/refresh derived passive-income events from externalLiquidityEvents prop, preserving user edits
  useEffect(() => {
    if (!externalLiquidityEvents) return;
    setLiquidityEvents(prev => {
      const prevMap = new Map((prev || []).map(ev => [ev.id, ev]));
      const blocked = new Set(removedDerivedIds);
      const nonDerived = (prev || []).filter(ev => !ev.isDerived);
      const mergedDerived: LiquidityEvent[] = externalLiquidityEvents
        .filter((e) => !blocked.has(e.id))
        .filter((e) => {
          const recurrence = e.recurrence || 'annual';
          const shouldAnchorToRetirement = (e as any).isDerived === true && recurrence !== 'once';
          const startAge = shouldAnchorToRetirement ? idadeAposentadoria : (e.startAge ?? idadeAposentadoria);
          // Evita duplicar se já existe um evento de usuário equivalente
          return !nonDerived.some(nd => (
            nd.name === e.name &&
            (nd.startAge ?? nd.age) === startAge &&
            Math.abs((nd.value ?? 0) - Number(e.value || 0)) < 1e-6 &&
            (nd.recurrence || 'annual') === recurrence &&
            nd.isPositive !== false === (e.isPositive !== false)
          ));
        })
        .map((e) => {
          const existing = prevMap.get(e.id);
          const recurrence = e.recurrence || 'annual';
          const shouldAnchorToRetirement = (e as any).isDerived === true && recurrence !== 'once';
          return {
            id: e.id,
            name: e.name,
            value: Number(e.value) || 0,
            isPositive: e.isPositive !== false,
            recurrence,
            startAge: shouldAnchorToRetirement ? idadeAposentadoria : (e.startAge ?? idadeAposentadoria),
            endAge: e.endAge ?? null,
            enabled: existing?.enabled ?? (e.enabled !== false),
            isDerived: true
          };
        });
      return [...mergedDerived, ...nonDerived];
    });
  }, [externalLiquidityEvents, idadeAposentadoria, removedDerivedIds]);

  // Recalcular projeção sempre que inputs mudarem
  useEffect(() => {
    const result = calculateRetirementProjection(
      currentAge,
      idadeAposentadoria,
      lifeExpectancy,
      currentPortfolio,
      aporteMensal,
      rendaMensal,
      taxaRetorno,
      taxaRetorno,
      liquidityEvents,
      isPerpetuity,
      overrideAporte
    );

    // Atualiza saídas conforme a origem da edição
    if (overrideAporte != null) {
      setAporteMensal(overrideAporte);
      setRendaMensal(result.rendaMensal);
    } else {
      setAporteMensal(result.aporteMensal);
    }
    setProjection({
      ...result,
      fluxoCapital: result.fluxoCapital.map(item => ({
        age: item.idade,
        capital: Math.round(item.capital)
      }))
    });
  }, [liquidityEvents, currentAge, idadeAposentadoria, lifeExpectancy, currentPortfolio, aporteMensal, rendaMensal, taxaRetorno, isPerpetuity, overrideAporte]);

  const [newEventRecurrence, setNewEventRecurrence] = useState<'once' | 'annual' | 'monthly'>('once');
  const [newEventStartAge, setNewEventStartAge] = useState<number>(currentAge + 5);
  const [newEventEndAge, setNewEventEndAge] = useState<number | ''>('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editValue, setEditValue] = useState<number>(0);
  const [editType, setEditType] = useState<'positive' | 'negative'>('positive');
  const [editRecurrence, setEditRecurrence] = useState<'once' | 'annual' | 'monthly'>('once');
  const [editStartAge, setEditStartAge] = useState<number>(currentAge + 1);
  const [editEndAge, setEditEndAge] = useState<number | ''>('');
  const [projection, setProjection] = useState(() => {
    const result = calculateRetirementProjection(
      currentAge,
      retirementAge,
      lifeExpectancy,
      currentPortfolio,
      monthlyContribution,
      rendaMensalDesejada,
      0.03,
      0.03,
      [],
      false
    );
    return {
      ...result,
      fluxoCapital: result.fluxoCapital.map(item => ({
        age: item.idade,
        capital: Math.round(item.capital)
      }))
    };
  });

  // Controle de expansão/colapso da tabela de fluxo de caixa anual
  const [isFlowTableExpanded, setIsFlowTableExpanded] = useState<boolean>(false);

  // Atualizar API ao adicionar/remover evento
  const syncEventsToApi = async (events: LiquidityEvent[]) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    try {
      let apiEvents: LiquidityEventApi[];
      const userOnly = (events || []).filter(e => !e.isDerived);
      if (userOnly.length === 0) {
        // Se não houver eventos, envie apenas o session_id
        apiEvents = [{ session_id: sessionId } as LiquidityEventApi];
      } else {
        apiEvents = userOnly.map(e => ({
          session_id: sessionId,
          nome: e.name,
          idade: e.startAge ?? e.age ?? currentAge + 1,
          tipo: e.isPositive ? 'entrada' : 'saida',
          valor: e.value,
        }));
      }
      await saveLiquidityEvents(apiEvents);
    } catch (error) {
      console.error('Error syncing liquidity events:', error);
    }
  };

  const handleAddLiquidityEvent = async () => {
    const startAge = newEventStartAge;
    const endAge = newEventRecurrence === 'once' ? undefined : (newEventEndAge === '' ? undefined : Number(newEventEndAge));
    if (!newEventName || startAge < currentAge || newEventValue <= 0) return;
    if (endAge !== undefined && endAge < startAge) return;

    const newEvent: LiquidityEvent = {
      id: Date.now().toString(),
      name: newEventName,
      value: newEventValue,
      isPositive: newEventType === 'positive',
      recurrence: newEventRecurrence,
      startAge: startAge,
      endAge: endAge ?? null,
      enabled: true
    };

    const updatedEvents = [...liquidityEvents, newEvent];
    setLiquidityEvents(updatedEvents);
    setNewEventName('');
    setNewEventStartAge(currentAge + 5);
    setNewEventEndAge('');
    setNewEventValue(0);
    setNewEventType('positive');
    setNewEventRecurrence('once');

    // Sincroniza com a API
    await syncEventsToApi(updatedEvents);
  };

  const handleRemoveLiquidityEvent = async (id: string) => {
    const target = liquidityEvents.find(e => e.id === id);
    if (target?.isDerived) {
      setRemovedDerivedIds(prev => prev.includes(id) ? prev : [...prev, id]);
    }
    const updatedEvents = liquidityEvents.filter(event => event.id !== id);
    setLiquidityEvents(updatedEvents);

    // Sincroniza com a API
    await syncEventsToApi(updatedEvents);
  };

  const handleToggleLiquidityEvent = async (id: string, enabled: boolean) => {
    const updatedEvents = liquidityEvents.map(ev => ev.id === id ? { ...ev, enabled } : ev);
    setLiquidityEvents(updatedEvents);

    const result = calculateRetirementProjection(
      currentAge,
      idadeAposentadoria,
      lifeExpectancy,
      currentPortfolio,
      aporteMensal,
      rendaMensal,
      taxaRetorno,
      taxaRetorno,
      updatedEvents,
      isPerpetuity
    );
    setAporteMensal(result.aporteMensal);
    setProjection({
      ...result,
      fluxoCapital: result.fluxoCapital.map(item => ({
        age: item.idade,
        capital: Math.round(item.capital)
      }))
    });

    // Sincroniza com a API
    await syncEventsToApi(updatedEvents);
  };

  const startEditLiquidityEvent = (ev: LiquidityEvent) => {
    setEditingEventId(ev.id);
    setEditName(ev.name);
    setEditValue(ev.value);
    setEditType(ev.isPositive ? 'positive' : 'negative');
    setEditRecurrence(ev.recurrence || 'once');
    setEditStartAge(ev.startAge ?? ev.age ?? currentAge + 1);
    setEditEndAge(ev.endAge == null ? '' : ev.endAge);
  };

  const saveEditLiquidityEvent = async () => {
    if (!editingEventId) return;
    const startAge = editStartAge;
    const endAge = editRecurrence === 'once' ? undefined : (editEndAge === '' ? undefined : Number(editEndAge));
    if (!editName || startAge < currentAge || editValue <= 0) return;
    if (endAge !== undefined && endAge < startAge) return;

    const original = liquidityEvents.find(e => e.id === editingEventId);
    if (original?.isDerived) {
      setRemovedDerivedIds(prev => prev.includes(original.id) ? prev : [...prev, original.id]);
    }

    const updatedEvents = liquidityEvents.map(ev => {
      if (ev.id !== editingEventId) return ev;
      return {
        ...ev,
        name: editName,
        value: editValue,
        isPositive: editType === 'positive',
        recurrence: editRecurrence,
        startAge: startAge,
        endAge: endAge ?? null,
        isDerived: false
      };
    });

    setLiquidityEvents(updatedEvents);
    setEditingEventId(null);

    const result = calculateRetirementProjection(
      currentAge,
      idadeAposentadoria,
      lifeExpectancy,
      currentPortfolio,
      aporteMensal,
      rendaMensal,
      taxaRetorno,
      taxaRetorno,
      updatedEvents,
      isPerpetuity
    );
    setAporteMensal(result.aporteMensal);
    setProjection({
      ...result,
      fluxoCapital: result.fluxoCapital.map(item => ({
        age: item.idade,
        capital: Math.round(item.capital)
      }))
    });

    // Sincroniza com a API
    await syncEventsToApi(updatedEvents);
  };

  const cancelEditLiquidityEvent = () => {
    setEditingEventId(null);
  };

  useEffect(() => {
    if (idadeAposentadoria < currentAge + 1) {
      setIdadeAposentadoria(currentAge + 1);
    }
  }, [currentAge, idadeAposentadoria]);

  // Add effect to notify parent of projection changes
  useEffect(() => {
    onProjectionChange?.({
      capitalNecessario: projection.capitalNecessario,
      aporteMensal: projection.aporteMensal,
      idadeEsgotamento: projection.idadeEsgotamento,
      rendaMensal: rendaMensal,
      idadeAposentadoria: idadeAposentadoria
    });
  }, [projection, rendaMensal, idadeAposentadoria, onProjectionChange]);

  const xDomain = React.useMemo(() => {
    const end = isPerpetuity ? 100 : lifeExpectancy;
    return [currentAge, end];
  }, [currentAge, lifeExpectancy, isPerpetuity]);

  const filteredData = React.useMemo(() => {
    // Always show complete scenario
    return projection.fluxoCapital;
  }, [projection.fluxoCapital]);

  const eventsByAge = React.useMemo(() => {
    const map = new Map<number, any[]>();
    (liquidityEvents || [])
      .filter((e: any) => e && e.enabled !== false)
      .forEach((e: any) => {
        const age = (e.startAge ?? e.age) as number;
        if (!map.has(age)) map.set(age, []);
        map.get(age)!.push(e);
      });
    return map;
  }, [liquidityEvents]);

  const isEventActiveAtAge = React.useCallback((e: any, age: number) => {
    const start = e.startAge ?? e.age;
    const end = e.endAge ?? start;
    const recurrence = e.recurrence || 'once';
    if (recurrence === 'once') return age === start;
    // Para anual/mensal consideramos ativo em qualquer ano dentro do intervalo
    return age >= start && age <= end;
  }, []);

  const formatYAxis = (value: number) => {
    if (value === 0) return 'R$ 0';
    if (value >= 1000000) return `R$ ${Math.floor(value / 1000000)}M`;
    return formatCurrency(value);
  };

  return (
    <Card className="w-full h-full border-border/80 shadow-sm">
      <CardHeader className="px-6 pb-0">
        <div className="flex flex-col w-full gap-4">
          <div className="w-full">
            <CardTitle className="text-xl font-semibold">
              Cenário de Aposentadoria {isPerpetuity && "(Perpetuidade)"}
            </CardTitle>
            <CardDescription className="mt-1">
              {isPerpetuity ?
                "Patrimônio perpétuo - apenas os rendimentos são consumidos" :
                "Evolução do patrimônio no prazo desejado (alinhado com a planilha)"
              }
            </CardDescription>
          </div>

          {/* Toggle de Perpetuidade */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Modo Perpetuidade</Label>
              <p className="text-xs text-muted-foreground">
                {isPerpetuity ?
                  "Patrimônio nunca se esgota - apenas os rendimentos são consumidos" :
                  "Patrimônio finito - pode se esgotar durante a aposentadoria"
                }
              </p>
            </div>
            <Switch
              checked={isPerpetuity}
              onCheckedChange={(checked) => {
                setIsPerpetuity(checked);

                // Recalcula a projeção com o novo modo
                const result = calculateRetirementProjection(
                  currentAge,
                  idadeAposentadoria,
                  lifeExpectancy,
                  currentPortfolio,
                  aporteMensal,
                  rendaMensal,
                  taxaRetorno,
                  taxaRetorno,
                  liquidityEvents,
                  checked
                );

                // Atualiza o aporte mensal com o valor calculado
                setAporteMensal(result.aporteMensal);

                // Atualiza o gráfico com os novos dados
                setProjection({
                  ...result,
                  fluxoCapital: result.fluxoCapital.map(item => ({
                    age: item.idade,
                    capital: Math.round(item.capital)
                  }))
                });
              }}
            />
          </div>

          {/* Campo de edição direta do aporte: quando editado, usamos override para calcular renda alcançável */}

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="taxaRetorno">Taxa de Retorno Real</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="taxaRetorno"
                  value={[taxaRetorno * 100]}
                  min={1}
                  max={5}
                  step={0.1}
                  onValueChange={(value) => {
                    const newTaxaRetorno = value[0] / 100;
                    setTaxaRetorno(newTaxaRetorno);

                    // Recalcula a projeção com os novos valores
                    const result = calculateRetirementProjection(
                      currentAge,
                      idadeAposentadoria,
                      lifeExpectancy,
                      currentPortfolio,
                      aporteMensal,
                      rendaMensal,
                      newTaxaRetorno,
                      newTaxaRetorno,
                      liquidityEvents,
                      isPerpetuity
                    );

                    // Atualiza o aporte mensal com o valor calculado
                    setAporteMensal(result.aporteMensal);

                    // Atualiza o gráfico com os novos dados
                    setProjection({
                      ...result,
                      fluxoCapital: result.fluxoCapital.map(item => ({
                        age: item.idade,
                        capital: Math.round(item.capital)
                      }))
                    });
                  }}
                  className="flex-1"
                />
                <div className="w-12 text-center text-sm font-medium">{(taxaRetorno * 100).toFixed(1)}%</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa real líquida % a.a (igual para acumulação e consumo)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aporteMensal">Aporte Mensal (editável)</Label>
              <CurrencyInput
                id="aporteMensal"
                value={aporteMensal}
                onChange={(value) => {
                  setAporteMensal(value);
                  setOverrideAporte(value);
                }}
                className="h-9"
                disabled={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rendaMensal">Renda Mensal (editável)</Label>
              <CurrencyInput
                id="rendaMensal"
                value={rendaMensal}
                onChange={(value) => {
                  setRendaMensal(value);
                  // Se o usuário modificou a renda manualmente, cancelamos o override do aporte para voltar ao modo "calcular aporte"
                  setOverrideAporte(null);
                }}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">Objetivo registrado: {formatCurrency(rendaMensalDesejada)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idadeAposentadoria">Idade de Aposentadoria</Label>
              <Input
                id="idadeAposentadoria"
                type="number"
                value={idadeAposentadoria}
                onChange={(e) => {
                  const newAge = parseInt(e.target.value) || retirementAge;
                  setIdadeAposentadoria(newAge);

                  // Recalcula a projeção com os novos valores
                  const result = calculateRetirementProjection(
                    currentAge,
                    newAge,
                    lifeExpectancy,
                    currentPortfolio,
                    aporteMensal,
                    rendaMensal,
                    taxaRetorno,
                    taxaRetorno,
                    liquidityEvents,
                    isPerpetuity
                  );

                  // Atualiza o aporte mensal com o valor calculado
                  setAporteMensal(result.aporteMensal);

                  // Atualiza o gráfico com os novos dados
                  setProjection({
                    ...result,
                    fluxoCapital: result.fluxoCapital.map(item => ({
                      age: item.idade,
                      capital: Math.round(item.capital)
                    }))
                  });
                }}
                min={currentAge + 1}
                max={90}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">Objetivo registrado: {retirementAge} anos</p>
            </div>
          </div>

          {/* Seção de Eventos de Liquidez */}
          <div className="flex items-center justify-between mb-0.5">
            <Label>Planejamento de Fluxos</Label>
            <div className="text-xs text-muted-foreground">
              Eventos que afetam seu patrimônio em momentos específicos
            </div>
          </div>

          <div className="border border-border rounded-md overflow-hidden mb-6">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="py-2 px-3 text-left font-medium">Fluxo</th>
                  <th className="py-2 px-3 text-center font-medium">Início</th>
                  <th className="py-2 px-3 text-center font-medium">Término</th>
                  <th className="py-2 px-3 text-center font-medium">Recorrência</th>
                  <th className="py-2 px-3 text-center font-medium">Tipo</th>
                  <th className="py-2 px-3 text-right font-medium">Valor</th>
                  <th className="py-2 px-3 text-center font-medium">Ativo</th>
                  <th className="py-2 px-3 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {liquidityEvents.map(event => (
                  editingEventId === event.id ? (
                    <tr key={event.id} className="bg-accent/10">
                      <td className="py-2 px-3">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          value={editStartAge}
                          onChange={(e) => setEditStartAge(parseInt(e.target.value) || currentAge + 1)}
                          min={currentAge}
                          max={90}
                          className="h-8 text-xs w-20 mx-auto text-center"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          value={editRecurrence === 'once' ? '' : editEndAge}
                          onChange={(e) => setEditEndAge(e.target.value === '' ? '' : (parseInt(e.target.value) || currentAge + 1))}
                          min={currentAge}
                          max={90}
                          className="h-8 text-xs w-20 mx-auto text-center"
                          disabled={editRecurrence === 'once'}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={editRecurrence}
                          onChange={(e) => setEditRecurrence(e.target.value as 'once' | 'annual' | 'monthly')}
                          className="h-8 text-xs rounded-md border border-input bg-background px-2"
                        >
                          <option value="once">Única</option>
                          <option value="annual">Anual</option>
                          <option value="monthly">Mensal</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as 'positive' | 'negative')}
                          className="h-8 text-xs rounded-md border border-input bg-background px-2"
                        >
                          <option value="positive">Entrada</option>
                          <option value="negative">Saída</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <CurrencyInput
                          value={editValue}
                          onChange={(value) => setEditValue(value)}
                          className="h-8 text-xs w-28 ml-auto"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">-</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={saveEditLiquidityEvent}
                            className="text-[#21887C] hover:text-[#1a6b5f] text-xs font-medium"
                          >Salvar</button>
                          <button
                            onClick={cancelEditLiquidityEvent}
                            className="text-muted-foreground hover:text-foreground text-xs"
                          >Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={event.id}>
                      <td className="py-2 px-3">{event.name}</td>
                      <td className="py-2 px-3 text-center">{event.startAge ?? event.age} anos</td>
                      <td className="py-2 px-3 text-center">{event.endAge != null ? `${event.endAge} anos` : '-'}</td>
                      <td className="py-2 px-3 text-center">{(event.recurrence || 'once') === 'once' ? 'Única' : (event.recurrence === 'annual' ? 'Anual' : 'Mensal')}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${event.isPositive ? 'text-[#21887C]' : 'text-[#E52B50]'}`} style={{ backgroundColor: event.isPositive ? '#21887C20' : '#E52B5020' }}>
                          {event.isPositive ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(event.value)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Switch
                          checked={event.enabled !== false}
                          onCheckedChange={(checked) => handleToggleLiquidityEvent(event.id, checked)}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <>
                            <button
                              onClick={() => startEditLiquidityEvent(event)}
                              className="text-[#36557C] hover:text-[#2a4260]"
                              title="Editar"
                            >✎</button>
                            <button
                              onClick={() => handleRemoveLiquidityEvent(event.id)}
                              className="text-[#E52B50] hover:text-[#c41e3a]"
                              title="Remover evento"
                            >
                              ×
                            </button>
                          </>
                        </div>
                      </td>
                    </tr>
                  )
                ))}

                {/* Formulário para adicionar novo evento */}
                <tr className="bg-accent/5">
                  <td className="py-2 px-3">
                    <Input
                      placeholder="Nome do fluxo"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Input
                      type="number"
                      value={newEventStartAge}
                      onChange={(e) => setNewEventStartAge(parseInt(e.target.value) || currentAge + 1)}
                      min={currentAge}
                      max={90}
                      className="h-8 text-xs w-20 mx-auto text-center"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Input
                      type="number"
                      value={newEventRecurrence === 'once' ? '' : newEventEndAge}
                      onChange={(e) => setNewEventEndAge(e.target.value === '' ? '' : (parseInt(e.target.value) || currentAge + 1))}
                      min={currentAge}
                      max={90}
                      className="h-8 text-xs w-20 mx-auto text-center"
                      disabled={newEventRecurrence === 'once'}
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={newEventRecurrence}
                      onChange={(e) => setNewEventRecurrence(e.target.value as 'once' | 'annual' | 'monthly')}
                      className="h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="once">Única</option>
                      <option value="annual">Anual</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={newEventType}
                      onChange={(e) => setNewEventType(e.target.value as 'positive' | 'negative')}
                      className="h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="positive">Entrada</option>
                      <option value="negative">Saída</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <CurrencyInput
                      value={newEventValue}
                      onChange={(value) => setNewEventValue(value)}
                      className="h-8 text-xs w-28 ml-auto"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={handleAddLiquidityEvent}
                      className="bg-primary text-white h-8 w-8 rounded-full flex items-center justify-center text-lg font-bold"
                      title="Adicionar evento"
                      disabled={!newEventName || newEventStartAge < currentAge || newEventValue <= 0 || (newEventRecurrence !== 'once' && newEventEndAge !== '' && Number(newEventEndAge) < newEventStartAge)}
                    >
                      +
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-4">
        <div className="h-[320px] mb-6">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredData}
                margin={{ top: 25, right: 30, left: 20, bottom: 40 }}
              >
                <XAxis
                  dataKey="age"
                  label={{ value: 'Idade', position: 'insideBottom', offset: -15, fill: '#6b7280', fontSize: 12 }}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  padding={{ left: 10, right: 10 }}
                  domain={xDomain}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  domain={[0, 'auto']}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  label={{
                    value: 'Patrimônio',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -5,
                    fill: '#6b7280',
                    fontSize: 12
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const age = payload[0]?.payload.age;
                      const activeEvents = (liquidityEvents || []).filter((e) => e && e.enabled !== false && isEventActiveAtAge(e, age));
                      return (
                        <div className="bg-card/95 backdrop-blur-sm border border-border/80 px-3 py-2 rounded-md shadow-lg">
                          <p className="font-medium text-xs mb-1">{`Idade: ${age} anos`}</p>
                          <div className="space-y-1">
                            {payload.map((entry) => (
                              <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2.5 h-2.5 rounded-[2px]"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-muted-foreground">{entry.name}:</span>
                                </div>
                                <span className="font-medium tabular-nums">
                                  {formatCurrency(entry.value as number)}
                                </span>
                              </div>
                            ))}
                            {activeEvents.length > 0 && (
                              <div className="pt-2 mt-1 border-t border-border/60">
                                <div className="text-[10px] mb-1 text-muted-foreground">Eventos de liquidez</div>
                                {activeEvents.map((e) => (
                                  <div key={e.id} className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: e.isPositive ? '#21887C' : '#E52B50' }} />
                                      <span className="text-muted-foreground">{e.name}</span>
                                    </div>
                                    <span className="font-medium tabular-nums">{formatCurrency(e.value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  wrapperStyle={{ outline: 'none' }}
                />

                {/* Linha de referência para a idade de aposentadoria */}
                <ReferenceLine
                  x={idadeAposentadoria}
                  stroke="#B8860B"
                  strokeDasharray="3 3"
                  label={({ viewBox }: any) => {
                    const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) - 6;
                    const y = (viewBox?.y ?? 0) + 12;
                    return (
                      <text x={x} y={y} fill="#B8860B" fontSize={11} textAnchor="end">
                        {`Aposentadoria (${idadeAposentadoria} anos)`}
                      </text>
                    );
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="capital"
                  name="Patrimônio acumulado"
                  stroke="#B8860B"
                  fill="#B8860B"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 1 }}
                />

                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: 15,
                    fontSize: 11,
                    lineHeight: '1.2em'
                  }}
                  iconType="plainline"
                  iconSize={10}
                />

                {liquidityEvents.map((event) => {
                  if (event.enabled === false) return null;
                  const age = event.startAge ?? event.age;
                  const siblings = eventsByAge.get(age) || [];
                  const localIndex = siblings.findIndex((e) => e.id === event.id);
                  return (
                    <ReferenceLine
                      key={event.id}
                      x={age}
                      stroke={event.isPositive ? "#21887C" : "#E52B50"}
                      strokeDasharray="3 3"
                      label={null}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Lista compacta de eventos de liquidez */}
        {liquidityEvents && liquidityEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {liquidityEvents
              .filter((e) => e && e.enabled !== false)
              .sort((a, b) => (a.startAge ?? a.age) - (b.startAge ?? b.age))
              .map((e) => (
                <div
                  key={e.id}
                  className={`px-2 py-1 rounded-full border text-xs flex items-center gap-2`}
                  style={{ 
                    borderColor: e.isPositive ? '#21887C' : '#E52B50',
                    color: e.isPositive ? '#21887C' : '#E52B50',
                    backgroundColor: e.isPositive ? '#21887C20' : '#E52B5020'
                  }}
                  title={`${e.name} • ${e.recurrence && e.recurrence !== 'once' ? 'Recorrente' : 'Único'}`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full`} style={{ backgroundColor: e.isPositive ? '#21887C' : '#E52B50' }}></span>
                  <span className="font-medium">{e.name}</span>
                  <span className="mx-1">—</span>
                  <span>{formatCurrency(e.value)}</span>
                  <span className="mx-1">•</span>
                  <span>{(e.startAge ?? e.age)} anos{e.endAge ? ` até ${e.endAge}` : ''}</span>
                  {e.recurrence && e.recurrence !== 'once' && (
                    <span className="ml-1 text-muted-foreground">(recorrente)</span>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Tabela de informações sobre o cenário */}
        <div className="mt-6 border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Detalhe</th>
                <th className="py-2 px-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3">Aporte Mensal Necessário</td>
                <td className="py-2 px-3 text-right">{formatCurrency(projection.aporteMensal)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3">Investimentos Financeiros Alvo</td>
                <td className="py-2 px-3 text-right">{formatCurrency(Math.round(projection.capitalNecessario))}</td>
              </tr>
              <tr>
                <td className="py-2 px-3">Retirada Mensal Planejada</td>
                <td className="py-2 px-3 text-right">{formatCurrency(rendaMensal)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3">Duração do Patrimônio</td>
                <td className="py-2 px-3 text-right">
                  {isPerpetuity ?
                    "Perpétuo (nunca se esgota)" :
                    projection.idadeEsgotamento ?
                      `Até os ${projection.idadeEsgotamento} anos (${projection.idadeEsgotamento - idadeAposentadoria} anos)` :
                      `Até os ${lifeExpectancy} anos`
                  }
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* Tabela de Fluxo de Caixa Anual com ocultar */}
        <HideableCard
          id="tabela-fluxo-caixa-aposentadoria"
          isVisible={isCardVisible('tabela-fluxo-caixa-aposentadoria')}
          onToggleVisibility={() => toggleCardVisibility('tabela-fluxo-caixa-aposentadoria')}
          hideControls={Boolean(hideControls)}
          className="mt-6"
        >
          <div className="border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/60">
              <div className="text-xs text-muted-foreground">
                {isFlowTableExpanded ? 'Exibindo todos os anos' : 'Exibindo próximos 10 anos'}
              </div>
              <button
                className="text-xs font-medium px-2 py-1 rounded-md border border-border hover:bg-muted/50"
                onClick={() => setIsFlowTableExpanded(v => !v)}
              >
                {isFlowTableExpanded ? 'Colapsar' : 'Expandir'}
              </button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="py-2 px-3 text-left font-medium">Idade</th>
                  <th className="py-2 px-3 text-left font-medium">Fase</th>
                  <th className="py-2 px-3 text-right font-medium">Capital Inicial</th>
                  <th className="py-2 px-3 text-right font-medium">Eventos</th>
                  <th className="py-2 px-3 text-right font-medium">Aporte</th>
                  <th className="py-2 px-3 text-right font-medium">Rendimento</th>
                  <th className="py-2 px-3 text-right font-medium">Saque</th>
                  <th className="py-2 px-3 text-right font-medium">Capital Final</th>
                </tr>
              </thead>
              <tbody>
                {((projection.fluxoCaixaAnual || []).slice(0, isFlowTableExpanded ? undefined : 10)).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-2 px-3">{row.idade}</td>
                    <td className="py-2 px-3">{row.fase}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(Math.round(row.capitalInicial))}</td>
                    <td className="py-2 px-3 text-right">{row.eventos === 0 ? '-' : formatCurrency(Math.round(row.eventos))}</td>
                    <td className="py-2 px-3 text-right">{row.aporte === 0 ? '-' : formatCurrency(Math.round(row.aporte))}</td>
                    <td className="py-2 px-3 text-right">{row.rendimento === 0 ? '-' : formatCurrency(Math.round(row.rendimento))}</td>
                    <td className="py-2 px-3 text-right">{row.saque === 0 ? '-' : formatCurrency(Math.round(row.saque))}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(Math.round(row.capitalFinal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </HideableCard>
      </CardContent>
    </Card>
  );
};

export default RetirementProjectionChart;