import React, { useState, useEffect, useRef } from 'react';
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
  ReferenceLine,
  Area,
  LabelList
} from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';
import { ChartContainer } from '@/components/ui/chart';
import { PiggyBank } from 'lucide-react';

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
  onTaxaRetornoChange?: (taxa: number) => void; // Callback para propagar mudanças na taxa de retorno real
  onLiquidityEventsChange?: (events: LiquidityEvent[]) => void; // Callback para propagar mudanças nos eventos de liquidez
}

export interface LiquidityEvent {
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
// Função auxiliar para garantir que apenas eventos ativos sejam considerados
const getActiveEvents = (events: LiquidityEvent[]) => {
  return (events || []).filter(e => {
    // Considerar ativo se enabled for true, undefined ou null (para compatibilidade retroativa)
    // Considerar inativo apenas se enabled for explicitamente false
    return e.enabled !== false;
  });
};

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
  // Proteção contra divisão por zero: se taxa for zero ou muito pequena, usar valor muito grande
  let capitalNecessarioPerpetuidade = Math.abs(taxa_mensal_real) < 1e-10 
    ? (saque_mensal_desejado > 0 ? Infinity : 0)
    : saque_mensal_desejado / taxa_mensal_real;
  
  // Se o capital necessário é infinito, não é possível atingir com nenhum aporte
  if (!isFinite(capitalNecessarioPerpetuidade)) {
    return Infinity;
  }

  // Calculamos o valor futuro do capital disponível hoje
  const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);

  // Considere apenas eventos ativos
  const effectiveEvents = getActiveEvents(eventosLiquidez);

  // Ajuste do capital necessário por eventos pós-aposentadoria (valor presente na data de aposentadoria)
  // Eventos positivos reduzem o capital necessário, negativos aumentam
  // IMPORTANTE: Eventos recorrentes (mensais/anuais) pós-aposentadoria são tratados como anuidades contínuas
  if (effectiveEvents.length > 0) {
    let pvEventosPosApos = 0;
    const taxa_mensal_real_consumo = taxa_mensal_real; // em perpetuidade, usamos a mesma taxa real
    const idadeMaxima = 100;
    
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
      
      if (recurrence === 'once') {
        // Evento único: só considerar se ocorrer após a aposentadoria
        // Eventos únicos antes da aposentadoria já são tratados na seção de eventos pré-aposentadoria
        if (start >= idade_para_aposentar) {
          const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
          const fatorDesconto = Math.abs(taxa_mensal_real_consumo) < 1e-10 
            ? 1 
            : Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          const pv = evento.value / fatorDesconto;
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      } else {
        // Eventos recorrentes (mensais ou anuais): considerar apenas a parte pós-aposentadoria
        // Mesmo que comecem antes, só importa o que ocorre depois da aposentadoria
        const startApos = Math.max(start, idade_para_aposentar);
        const endApos = Math.min(last, idadeMaxima);
        
        if (startApos <= endApos) {
          const mesesInicio = (startApos - idade_para_aposentar) * 12;
          const mesesFim = (endApos - idade_para_aposentar + 1) * 12; // +1 para incluir o último ano
          const mesesTotais = mesesFim - mesesInicio;
          
          if (recurrence === 'monthly') {
            // Anuidade mensal: calcular PV de fluxo mensal pós-aposentadoria
            // Para perpetuidade: eventos mensais recorrentes equivalem a um capital de valor_mensal / taxa_mensal
            // Isso reduz diretamente o capital necessário, pois esse capital equivalente já gera a renda necessária
            if (Math.abs(taxa_mensal_real_consumo) < 1e-10) {
              // Taxa zero: não podemos calcular perpetuidade, usar anuidade finita
              const pv = evento.value * mesesTotais;
              pvEventosPosApos += evento.isPositive ? pv : -pv;
            } else {
              // IMPORTANTE: Para eventos mensais em perpetuidade, o equivalente em capital é: valor_mensal / taxa_mensal
              // Exemplo: dividendos de R$ 50.000/mês equivale a um capital de R$ 50.000 / taxa_mensal
              // Esse capital já gera exatamente R$ 50.000/mês em perpetuidade, então reduz o capital necessário
              const capitalEquivalente = evento.value / taxa_mensal_real_consumo;
              
              // Se o evento vai até 100 anos ou além, tratar como perpetuidade
              // Caso contrário, usar anuidade finita
              if (endApos >= idadeMaxima || last >= idadeMaxima) {
                // Perpetuidade: usar capital equivalente descontado até o início
                const fatorDescontoInicio = mesesInicio > 0 
                  ? Math.pow(1 + taxa_mensal_real_consumo, -mesesInicio)
                  : 1;
                const pv = capitalEquivalente * fatorDescontoInicio;
                pvEventosPosApos += evento.isPositive ? pv : -pv;
              } else {
                // Anuidade finita: calcular PV de anuidade mensal limitada
                const pvAnuidade = evento.value * ((1 - Math.pow(1 + taxa_mensal_real_consumo, -mesesTotais)) / taxa_mensal_real_consumo);
                const fatorDescontoInicio = mesesInicio > 0 
                  ? Math.pow(1 + taxa_mensal_real_consumo, -mesesInicio)
                  : 1;
                const pv = pvAnuidade * fatorDescontoInicio;
                pvEventosPosApos += evento.isPositive ? pv : -pv;
              }
            }
          } else {
            // Evento anual recorrente: calcular como série de eventos anuais pós-aposentadoria
            let pvAnualTotal = 0;
            for (let idade = startApos; idade <= endApos; idade++) {
              const mesesDesdeAposentadoria = (idade - idade_para_aposentar) * 12;
              const fatorDesconto = Math.abs(taxa_mensal_real_consumo) < 1e-10 
                ? 1 
                : Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
              const pvAno = evento.value / fatorDesconto;
              pvAnualTotal += pvAno;
            }
            pvEventosPosApos += evento.isPositive ? pvAnualTotal : -pvAnualTotal;
          }
        }
      }
    });
    
    // Ajustar o capital necessário subtraindo o PV dos eventos positivos e somando o dos negativos
    capitalNecessarioPerpetuidade = Math.max(0, capitalNecessarioPerpetuidade - pvEventosPosApos);
  }

  // Calculamos o valor futuro dos eventos de liquidez (suportando recorrência)
  let valorFuturoEventos = 0;
  effectiveEvents.forEach(evento => {
    const recurrence = evento.recurrence || 'once';
    const start = evento.startAge ?? evento.age ?? idade_atual;
    const last = Math.min(evento.endAge ?? (idade_para_aposentar - 1), idade_para_aposentar - 1);
    const taxa = taxa_mensal_real;
    const fatorAnual = Math.pow(1 + taxa, 12);
    const annualAmount = recurrence === 'monthly'
      ? (taxa === 0 ? (evento.value * 12) : (evento.value * ((fatorAnual - 1) / taxa)))
      : evento.value;

    if (recurrence === 'once') {
      if (start < idade_para_aposentar) {
        const mesesAteAposentadoria = (idade_para_aposentar - start) * 12;
        const valorFuturo = annualAmount * Math.pow(1 + taxa_mensal_real, mesesAteAposentadoria);
        valorFuturoEventos += evento.isPositive ? valorFuturo : -valorFuturo;
      }
    } else {
      for (let a = start; a <= last; a++) {
        if (a < idade_para_aposentar) {
          // Para mensal: tratar como valor no FIM do ano => levar do fim do ano até aposentadoria
          const mesesAteAposentadoria = (idade_para_aposentar - (recurrence === 'monthly' ? (a + 1) : a)) * 12;
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
export const calculateRetirementProjection = (
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
  overrideAporteMensal: number | null = null,
  lockWithdrawalToTarget: boolean = false,
  forceFinalZeroAtEnd: boolean = true,
  overrideEndAge?: number
) => {

  // Função auxiliar para garantir que apenas eventos ativos sejam considerados
  const getActiveEventsLocal = getActiveEvents;

  // Taxa mensal equivalente (igual à planilha)
  const taxa_mensal_real = Math.pow(1 + rentabilidade_real_liquida_acumulacao, 1 / 12) - 1;

  // Cálculo do capital necessário (usando a mesma abordagem da planilha)
  const calculaCapitalNecessario = (rendaTarget: number) => {
    const taxa_mensal_real_consumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
    // Meses de acumulação para determinar se o cliente já está aposentado
    const meses_acumulacao = (idade_para_aposentar - idade_atual) * 12;
    
    // Base do capital necessário (sem considerar eventos pós-aposentadoria)
    let baseCapitalNecessario = 0;
    if (isPerpetuity) {
      // Para perpetuidade, o capital necessário é: saque_mensal / taxa_mensal (consumo)
      baseCapitalNecessario = rendaTarget / taxa_mensal_real_consumo;
    } else {
      // Para clientes já aposentados, considerar até 100 anos, caso contrário até 99
      const consumoEndAge = overrideEndAge ?? (meses_acumulacao <= 0 ? 100 : 99);
      const meses_consumo = (consumoEndAge - idade_para_aposentar) * 12;
      // Fórmula idêntica à usada na planilha (célula C9 em Apos(2)) com taxa de consumo
      baseCapitalNecessario = (rendaTarget * (1 - Math.pow(1 + taxa_mensal_real_consumo, -meses_consumo)) / taxa_mensal_real_consumo);
    }

    // Ajuste por eventos pós-aposentadoria: traz a valor presente na data de aposentadoria
    const effectiveEvents = getActiveEventsLocal(eventosLiquidez);
    if (effectiveEvents.length === 0) return baseCapitalNecessario;

    let pvEventosPosApos = 0;
    // Para clientes já aposentados, considerar eventos até 100 anos
    const idadeMaxima = isPerpetuity ? 100 : (meses_acumulacao <= 0 ? 100 : 99);
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
      
      if (recurrence === 'once') {
        if (start >= idade_para_aposentar) {
          const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
          const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      } else if (recurrence === 'monthly') {
        // Para eventos mensais, calcular PV como anuidade mensal
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesInicioAno = (a - idade_para_aposentar) * 12;
          if (taxa_mensal_real_consumo === 0) {
            const pvAnual = evento.value * 12 / Math.pow(1 + taxa_mensal_real_consumo, mesesInicioAno);
            pvEventosPosApos += evento.isPositive ? pvAnual : -pvAnual;
          } else {
            const pvAnuidadeMensal = evento.value * ((1 - Math.pow(1 + taxa_mensal_real_consumo, -12)) / taxa_mensal_real_consumo);
            const pvDescontado = pvAnuidadeMensal / Math.pow(1 + taxa_mensal_real_consumo, mesesInicioAno);
            pvEventosPosApos += evento.isPositive ? pvDescontado : -pvDescontado;
          }
        }
      } else {
        // Eventos anuais
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
          const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
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

  // Calcular aporte necessário originalmente (sem override) para determinar se precisa de aporte
  const calcularAporteNecessarioOriginal = (): number => {
    const meses = meses_acumulacao;
    if (meses <= 0) return 0;

    // Para modo Perpetuidade, manter a fórmula apropriada
    if (isPerpetuity) {
      return calculatePerpetuityContribution(
        idade_atual,
        idade_para_aposentar,
        capitalDisponivelHoje,
        saque_mensal_desejado,
        rentabilidade_real_liquida_acumulacao,
        eventosLiquidez
      );
    }

    // Objetivo: encontrar o aporte que zera o capital exatamente no final do ano 99 (considerando eventos)
    // Simulação interna sem clamps para obter o capital final em 99
    const endCapitalAt99For = (aporte: number): number => {
      let capital = capitalDisponivelHoje;
      let idade = idade_atual;

      // Pré-processa eventos por idade considerando recorrência
      const effectiveEvents = getActiveEventsLocal(eventosLiquidez);
      const eventsByAge = new Map<number, number>();
      effectiveEvents.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const maxAge = 99;
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

      // Acumulação
      while (idade < idade_para_aposentar) {
        const delta = eventsByAge.get(idade) || 0;
        capital += delta;

        const taxaMensalReal = Math.pow(1 + rentabilidade_real_liquida_acumulacao, 1 / 12) - 1;
        const fatorAnual = Math.pow(1 + taxaMensalReal, 12);
        const aporteAnual = aporte * 12;
        const fvAportes = taxaMensalReal === 0 ? aporteAnual : (aporte * ((fatorAnual - 1) / taxaMensalReal));
        const rendimentoCapital = capital * (fatorAnual - 1);
        const rendimentoAportes = fvAportes - aporteAnual;
        const rendimentoTotal = rendimentoCapital + rendimentoAportes;
        capital = capital + aporteAnual + rendimentoTotal;
        idade++;
      }

      // Consumo até 99
      const taxaMensalConsumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
      const fatorAnualConsumo = Math.pow(1 + taxaMensalConsumo, 12);
      while (idade <= 99) {
        const delta = eventsByAge.get(idade) || 0;
        capital += delta;
        const fvSaques = taxaMensalConsumo === 0
          ? (saque_mensal_desejado * 12)
          : (saque_mensal_desejado * ((fatorAnualConsumo - 1) / taxaMensalConsumo));
        const rendimentoCapital = capital * (fatorAnualConsumo - 1);
        capital = capital + rendimentoCapital - fvSaques;
        idade++;
      }

      return capital; // capital final no fim do ano 99
    };

    // Busca binária no aporte para atingir capital final ~ 0 em 99
    const f0 = endCapitalAt99For(0);
    if (f0 >= 0) return 0; // Sem aporte já sobra ou zera; não aceitamos aporte negativo

    // Encontrar limite superior onde capital final fique positivo
    let low = 0;
    let high = 1000; // chute inicial
    let fh = endCapitalAt99For(high);
    let guard = 0;
    while (fh <= 0 && guard < 28) {
      high *= 1.8;
      fh = endCapitalAt99For(high);
      guard++;
    }

    // Se não encontrou faixa, devolve último high para evitar loop
    if (fh <= 0) return Math.max(0, high);

    // Bisseção
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      const fm = endCapitalAt99For(mid);
      if (fm === 0) return mid;
      if (fm > 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return (low + high) / 2;
  };

  // Calcular se precisa de aporte mensal (sem override)
  const aporteNecessarioOriginal = calcularAporteNecessarioOriginal();
  // Proteção contra valores inválidos: tratar Infinity e NaN como 0
  const aporteNecessarioOriginalSafe = isFinite(aporteNecessarioOriginal) ? aporteNecessarioOriginal : 0;
  const precisaAporteMensal = aporteNecessarioOriginalSafe > 0;

  // Determinar aporte mensal usado (permite override)
  const aporteMensalCalculado = overrideAporteMensal != null 
    ? overrideAporteMensal 
    : aporteNecessarioOriginalSafe;

  // Se estamos resolvendo a renda a partir de um aporte específico, calcular renda correspondente
  const rendaMensalCalculada = (() => {
    // Quando solicitado, manter o saque mensal igual ao objetivo informado,
    // mesmo quando há override de aporte (Cenário Atual)
    if (lockWithdrawalToTarget) {
      return saque_mensal_desejado;
    }
    
    // Para clientes aposentados no cenário target sem override de aporte,
    // usar sempre a renda mensal editável como renda proposta
    const meses_acumulacao_check = (idade_para_aposentar - idade_atual) * 12;
    if (meses_acumulacao_check <= 0 && overrideAporteMensal == null) {
      return saque_mensal_desejado;
    }
    
    // Para clientes aposentados no cenário target com overrideEndAge e override de aporte,
    // calcular renda que zera no ano especificado
    if (meses_acumulacao_check <= 0 && overrideEndAge != null && overrideAporteMensal != null) {
      // Calcular renda que zera no overrideEndAge especificado
      const capitalNaAposentadoria = capitalDisponivelHoje;
      const taxa_mensal_real_consumo_check = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
      const effectiveEvents_check = getActiveEventsLocal(eventosLiquidez);
      let pvEventosPosApos_check = 0;
      const consumoEndAge_check = overrideEndAge;
      const idadeMaxima_check = isPerpetuity ? 100 : consumoEndAge_check;
      
      effectiveEvents_check.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const last = Math.min(evento.endAge ?? idadeMaxima_check, idadeMaxima_check);
        
        if (recurrence === 'once') {
          if (start >= idade_para_aposentar) {
            const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
            const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo_check, mesesDesdeAposentadoria);
            pvEventosPosApos_check += evento.isPositive ? pv : -pv;
          }
        } else if (recurrence === 'monthly') {
          for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
            const mesesInicioAno = (a - idade_para_aposentar) * 12;
            if (taxa_mensal_real_consumo_check === 0) {
              const pvAnual = evento.value * 12 / Math.pow(1 + taxa_mensal_real_consumo_check, mesesInicioAno);
              pvEventosPosApos_check += evento.isPositive ? pvAnual : -pvAnual;
            } else {
              const pvAnuidadeMensal = evento.value * ((1 - Math.pow(1 + taxa_mensal_real_consumo_check, -12)) / taxa_mensal_real_consumo_check);
              const pvDescontado = pvAnuidadeMensal / Math.pow(1 + taxa_mensal_real_consumo_check, mesesInicioAno);
              pvEventosPosApos_check += evento.isPositive ? pvDescontado : -pvDescontado;
            }
          }
        } else {
          for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
            const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
            const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo_check, mesesDesdeAposentadoria);
            pvEventosPosApos_check += evento.isPositive ? pv : -pv;
          }
        }
      });
      
      if (!isPerpetuity) {
        const meses_consumo_check = (consumoEndAge_check - idade_para_aposentar) * 12;
        if (meses_consumo_check > 0) {
          const coef_check = (1 - Math.pow(1 + taxa_mensal_real_consumo_check, -meses_consumo_check)) / taxa_mensal_real_consumo_check;
          return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos_check) / coef_check);
        }
      }
    }
    
    // Em perpetuidade, a renda mensal é a que mantém patrimônio constante: rendimento sobre o capital + efeito PV dos eventos pós-aposentadoria
    if (isPerpetuity) {
      if (meses_acumulacao <= 0) return 0;
      const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);
      const fvAportes = taxa_mensal_real === 0
        ? aporteMensalCalculado * meses_acumulacao
        : aporteMensalCalculado * ((Math.pow(1 + taxa_mensal_real, meses_acumulacao) - 1) / taxa_mensal_real);

      // Eventos pré-aposentadoria
      const effectiveEvents = getActiveEventsLocal(eventosLiquidez);
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

      // Renda alcançável em perpetuidade: simular o fluxo para encontrar a renda que estabiliza o capital
      // A lógica é: o saque anual = rendimento do ano + eventos do ano (para manter capital constante)
      // Simulamos alguns anos para ver qual é a renda média sustentável
      const taxa_mensal_real_consumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
      const fatorAnualConsumo = Math.pow(1 + taxa_mensal_real_consumo, 12);
      
      // Agregar eventos por idade
      const eventsByAge = new Map<number, number>();
      effectiveEvents.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const end = evento.endAge ?? 100;
        
        if (recurrence === 'once') {
          const age = start;
          if (age >= idade_para_aposentar) {
            const current = eventsByAge.get(age) || 0;
            eventsByAge.set(age, current + (evento.isPositive ? evento.value : -evento.value));
          }
        } else {
          // Eventos recorrentes: calcular FV anual para mensais
          const annualAmount = recurrence === 'monthly'
            ? (taxa_mensal_real_consumo === 0 
                ? (evento.value * 12) 
                : (evento.value * ((fatorAnualConsumo - 1) / taxa_mensal_real_consumo)))
            : evento.value;
          
          for (let age = Math.max(start, idade_para_aposentar); age <= Math.min(end, 100); age++) {
            const current = eventsByAge.get(age) || 0;
            eventsByAge.set(age, current + (evento.isPositive ? annualAmount : -annualAmount));
          }
        }
      });
      
      // Renda alcançável em perpetuidade:
      // Simular o impacto de TODOS os eventos (únicos e recorrentes) no capital
      // e calcular a renda sustentável após estabilização
      
      // Simular eventos únicos que afetarão o capital permanentemente
      let capitalAjustado = capitalNaAposentadoria;
      const eventosUnicosPosAposentadoria = effectiveEvents.filter(ev => {
        const recurrence = ev.recurrence || 'once';
        if (recurrence !== 'once') return false;
        const age = ev.startAge ?? ev.age ?? idade_atual;
        return age >= idade_para_aposentar && age <= 100;
      });
      
      // Aplicar impacto presente de eventos únicos futuros
      eventosUnicosPosAposentadoria.forEach(evento => {
        const age = evento.startAge ?? evento.age ?? idade_atual;
        const anosFuturo = age - idade_para_aposentar;
        // Trazer o evento a valor presente
        const pv = evento.value / Math.pow(1 + rentabilidade_real_liquida_consumo, anosFuturo);
        capitalAjustado += evento.isPositive ? pv : -pv;
      });
      
      const rendimentoMensalCapital = capitalAjustado * taxa_mensal_real_consumo;
      
      // Somar eventos RECORRENTES que estarão ativos na idade de aposentadoria
      let rendaMensalEventos = 0;
      effectiveEvents.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        if (recurrence === 'once') return;
        
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const end = evento.endAge ?? 100;
        
        if (start <= idade_para_aposentar && end >= idade_para_aposentar) {
          let valorMensal: number;
          if (recurrence === 'monthly') {
            valorMensal = evento.value;
          } else {
            const fvAnual = taxa_mensal_real_consumo === 0
              ? evento.value
              : (evento.value * fatorAnualConsumo);
            valorMensal = fvAnual / 12;
          }
          rendaMensalEventos += evento.isPositive ? valorMensal : -valorMensal;
        }
      });
      
      return Math.max(0, rendimentoMensalCapital + rendaMensalEventos);
    }

    if (overrideAporteMensal == null) return saque_mensal_desejado;
    
    // Para clientes já aposentados (meses_acumulacao <= 0), calcular a renda alcançável que zera aos 100 anos
    if (meses_acumulacao <= 0) {
      // O capital atual é o capital na aposentadoria (já estamos aposentados)
      const capitalNaAposentadoria = capitalDisponivelHoje;
      
      // PV dos eventos pós-aposentadoria (consumo)
      const taxa_mensal_real_consumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
      const effectiveEvents = getActiveEventsLocal(eventosLiquidez);
      let pvEventosPosApos = 0;
      
      // Para clientes já aposentados, considerar eventos até 100 anos
      const consumoEndAge = overrideEndAge ?? 100;
      const idadeMaxima = isPerpetuity ? 100 : consumoEndAge;
      
      effectiveEvents.forEach(evento => {
        const recurrence = evento.recurrence || 'once';
        const start = evento.startAge ?? evento.age ?? idade_atual;
        const last = Math.min(evento.endAge ?? idadeMaxima, idadeMaxima);
        
        if (recurrence === 'once') {
          if (start >= idade_para_aposentar) {
            const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
            const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
            pvEventosPosApos += evento.isPositive ? pv : -pv;
          }
        } else if (recurrence === 'monthly') {
          // Para eventos mensais, calcular PV como anuidade mensal
          // Para cada ano no período, calcular o PV dos 12 pagamentos mensais naquele ano
          for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
            // Meses desde o início da aposentadoria até o início do ano 'a'
            const mesesInicioAno = (a - idade_para_aposentar) * 12;
            // Calcular PV de 12 pagamentos mensais começando no início do ano
            if (taxa_mensal_real_consumo === 0) {
              // Se taxa é zero, PV é simplesmente a soma dos pagamentos descontados
              const pvAnual = evento.value * 12 / Math.pow(1 + taxa_mensal_real_consumo, mesesInicioAno);
              pvEventosPosApos += evento.isPositive ? pvAnual : -pvAnual;
            } else {
              // Fórmula de anuidade: PV = PMT * ((1 - (1+r)^(-n)) / r)
              // Descontar até o início do período
              const pvAnuidadeMensal = evento.value * ((1 - Math.pow(1 + taxa_mensal_real_consumo, -12)) / taxa_mensal_real_consumo);
              const pvDescontado = pvAnuidadeMensal / Math.pow(1 + taxa_mensal_real_consumo, mesesInicioAno);
              pvEventosPosApos += evento.isPositive ? pvDescontado : -pvDescontado;
            }
          }
        } else {
          // Eventos anuais
          for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
            const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
            const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
            pvEventosPosApos += evento.isPositive ? pv : -pv;
          }
        }
      });

      if (isPerpetuity) {
        return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) * taxa_mensal_real_consumo);
      } else {
        // Calcular renda mensal que zera aos 100 anos
        const meses_consumo = (consumoEndAge - idade_para_aposentar) * 12;
        if (meses_consumo <= 0) return 0;
        const coef = (1 - Math.pow(1 + taxa_mensal_real_consumo, -meses_consumo)) / taxa_mensal_real_consumo;
        return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) / coef);
      }
    }

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
      
      if (recurrence === 'once') {
        if (start >= idade_para_aposentar) {
          const mesesDesdeAposentadoria = (start - idade_para_aposentar) * 12;
          const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      } else if (recurrence === 'monthly') {
        // Para eventos mensais, calcular PV como anuidade mensal
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesInicioAno = (a - idade_para_aposentar) * 12;
          if (taxa_mensal_real_consumo === 0) {
            const pvAnual = evento.value * 12 / Math.pow(1 + taxa_mensal_real_consumo, mesesInicioAno);
            pvEventosPosApos += evento.isPositive ? pvAnual : -pvAnual;
          } else {
            const pvAnuidadeMensal = evento.value * ((1 - Math.pow(1 + taxa_mensal_real_consumo, -12)) / taxa_mensal_real_consumo);
            const pvDescontado = pvAnuidadeMensal / Math.pow(1 + taxa_mensal_real_consumo, mesesInicioAno);
            pvEventosPosApos += evento.isPositive ? pvDescontado : -pvDescontado;
          }
        }
      } else {
        // Eventos anuais
        for (let a = Math.max(start, idade_para_aposentar); a <= last; a++) {
          const mesesDesdeAposentadoria = (a - idade_para_aposentar) * 12;
          const pv = evento.value / Math.pow(1 + taxa_mensal_real_consumo, mesesDesdeAposentadoria);
          pvEventosPosApos += evento.isPositive ? pv : -pv;
        }
      }
    });

    if (isPerpetuity) {
      return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) * taxa_mensal_real_consumo);
    } else {
      const consumoEndAge = overrideEndAge ?? 99;
      const meses_consumo = (consumoEndAge - idade_para_aposentar) * 12;
      if (meses_consumo <= 0) return 0;
      const coef = (1 - Math.pow(1 + taxa_mensal_real_consumo, -meses_consumo)) / taxa_mensal_real_consumo;
      return Math.max(0, (capitalNaAposentadoria + pvEventosPosApos) / coef);
    }
  })();

  // Capital necessário com base na renda efetivamente usada
  const capitalNecessario = calculaCapitalNecessario(rendaMensalCalculada);
  
  // Debug: verificar se capitalNecessario está sendo calculado corretamente
  if (typeof window !== 'undefined' && (window as any).__DEBUG_RETIREMENT__) {
    console.log('calculateRetirementProjection:', {
      saque_mensal_desejado,
      rendaMensalCalculada,
      capitalNecessario,
      isPerpetuity,
      lockWithdrawalToTarget
    });
  }

  // Cálculo do aporte mensal necessário (igual à planilha - célula C14 em Apos(2))
  const calculaAporteMensal = () => {
    const meses_acumulacao = (idade_para_aposentar - idade_atual) * 12;
    if (meses_acumulacao <= 0) return 0;

    // Primeiro, calculamos o capital necessário total
    const capitalNecessarioTotal = capitalNecessario;

    // Calculamos o valor futuro do capital disponível hoje
    const capitalFuturo = capitalDisponivelHoje * Math.pow(1 + taxa_mensal_real, meses_acumulacao);

    // Considere apenas eventos ativos
    const effectiveEvents = getActiveEventsLocal(eventosLiquidez);

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
    const effectiveEvents = getActiveEventsLocal(eventosLiquidez);

    // Pré-processa eventos por idade considerando recorrência
    const eventsByAge = new Map<number, number>();
    effectiveEvents.forEach(evento => {
      const recurrence = evento.recurrence || 'once';
      const start = evento.startAge ?? evento.age ?? idade_atual;
      const maxAge = isPerpetuity ? 100 : (overrideEndAge ?? expectativa_de_vida);
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

    // Se já está aposentado, adiciona ponto inicial no gráfico
    if (idade >= idade_para_aposentar) {
      fluxo.push({ idade, capital: capital > 0 ? capital : 0 });
    }

    // Fase de acumulação
    while (idade < idade_para_aposentar) {
      const capitalInicial = capital;

      // Aplica eventos de liquidez no ano atual (já agregados por idade)
      const delta = eventsByAge.get(idade) || 0;
      capital += delta;

      // Nota: Para alinhar com a tabela, registramos o capital de fim de ano (capitalFinal)

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

      // Registra o capital de fim de ano para o gráfico (alinhado com a tabela)
      fluxo.push({ idade, capital: capitalFinal > 0 ? capitalFinal : 0 });

      capital = capitalFinal;
      idade++;
    }

    // Fase de consumo
    const saqueAnual = rendaMensalCalculada * 12;
    let idadeEsgotamento = null;

    if (isPerpetuity) {
      // Perpetuidade: manter o capital constante consumindo apenas os rendimentos.
      // Entradas de fluxo (eventos) não aumentam o saque; são mostradas na coluna "eventos".
      const idadeMaxima = 100;
      // Quando não há necessidade de aporte (<= 0), permitimos o patrimônio crescer com os eventos
      const shouldLetGrow = (aporteMensal <= 0);
      while (idade <= idadeMaxima) {
        const capitalInicial = capital;

        // Eventos do ano - SEMPRE incorporados ao capital em perpetuidade
        const delta = eventsByAge.get(idade) || 0;
        capital += delta;

        // Capitalização mensal equivalente na fase de consumo
        const taxaMensalConsumo = Math.pow(1 + rentabilidade_real_liquida_consumo, 1 / 12) - 1;
        const fatorAnualConsumo = Math.pow(1 + taxaMensalConsumo, 12);
        const rendimentoCapital = capital * (fatorAnualConsumo - 1);

        // Saque efetivo do PORTFÓLIO:
        // - Se lockWithdrawalToTarget (cenário atual com renda editada): usar fvSaquesDesejados e permitir esgotamento
        // - Se NÃO há necessidade de aporte (shouldLetGrow): rendimento + eventos positivos para manter capital base
        // - Se há necessidade de aporte: rendimento + eventos para manter capital constante
        const saqueMensal = rendaMensalCalculada; // usado somente para exibição
        const fvSaquesDesejados = taxaMensalConsumo === 0
          ? (saqueMensal * 12)
          : (saqueMensal * ((fatorAnualConsumo - 1) / taxaMensalConsumo));
        
        let saqueEfetivoDoPortfolio: number;
        if (lockWithdrawalToTarget) {
          // Cenário atual: usar renda desejada pelo usuário, permitindo esgotamento
          saqueEfetivoDoPortfolio = fvSaquesDesejados;
        } else {
          // Perpetuidade padrão: manter capital constante
          // Eventos já foram incorporados ao capital (linha 775)
          // Saque = apenas o rendimento do capital (que já inclui efeito dos eventos)
          saqueEfetivoDoPortfolio = rendimentoCapital;
        }
        
        let capitalFinal = capital + rendimentoCapital - saqueEfetivoDoPortfolio;

        // Se o capital ficaria negativo, limitar o saque mantendo saldo não-negativo
        if (capitalFinal < 0) {
          const saldoMinimo = 0;
          const maxSaque = Math.max(0, capital + rendimentoCapital - saldoMinimo);
          saqueEfetivoDoPortfolio = Math.min(saqueEfetivoDoPortfolio, maxSaque);
          capitalFinal = Math.max(saldoMinimo, capital + rendimentoCapital - saqueEfetivoDoPortfolio);
          if (idadeEsgotamento === null) idadeEsgotamento = idade;
        }

        fluxoCaixaAnual.push({
          idade,
          fase: 'Consumo',
          capitalInicial,
          eventos: delta,
          aporte: 0,
          rendimento: rendimentoCapital,
          // Exibição: saque como VALOR FUTURO no fim do ano
          // Observação: impacto no portfólio usa somente o rendimento (saqueEfetivoDoPortfolio)
          saque: fvSaquesDesejados,
          capitalFinal
        });

        // Registra o capital de fim de ano para o gráfico (sempre usar capitalFinal)
        fluxo.push({ idade, capital: capitalFinal > 0 ? capitalFinal : 0 });

        capital = capitalFinal;
        
        // Se o capital esgotou no cenário atual (lockWithdrawalToTarget), preencher os anos restantes com 0
        if (lockWithdrawalToTarget && capital === 0) {
          idade++;
          while (idade <= idadeMaxima) {
            fluxoCaixaAnual.push({
              idade,
              fase: 'Consumo',
              capitalInicial: 0,
              eventos: 0,
              aporte: 0,
              rendimento: 0,
              saque: 0,
              capitalFinal: 0
            });
            fluxo.push({ idade, capital: 0 });
            idade++;
          }
          break;
        }
        
        idade++;
      }
    } else {
      // Cenário finito: simular até o fim do consumo
      // Para clientes já aposentados, considerar até 100 anos, caso contrário até 99
      const consumoEndAge = overrideEndAge ?? (meses_acumulacao <= 0 ? 100 : 99);
      console.log(`[simularFluxoCapital] overrideEndAge=${overrideEndAge ?? 'undefined'}, meses_acumulacao=${meses_acumulacao}, consumoEndAge=${consumoEndAge}, forceFinalZeroAtEnd=${forceFinalZeroAtEnd}`);
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

        // Para clientes já aposentados com lockWithdrawalToTarget = true, garantir que não esgote antes do último ano
        if (lockWithdrawalToTarget && meses_acumulacao <= 0 && idade < consumoEndAge && capitalFinal < 0 && forceFinalZeroAtEnd) {
          // Não permitir esgotamento antes do último ano - ajustar saque para manter capital positivo
          const saldoMinimo = 0.01; // Pequeno saldo mínimo para manter capital positivo
          saqueEfetivo = Math.max(0, capital + rendimentoCapital - saldoMinimo);
          capitalFinal = saldoMinimo;
        }

        // Se o capital ficaria negativo, o patrimônio se esgotou.
        // Durante a BUSCA (forceFinalZeroAtEnd=false) precisamos detectar esgotamento mesmo com lockWithdrawalToTarget=true.
        if (capitalFinal < 0 && (!forceFinalZeroAtEnd || !(lockWithdrawalToTarget && meses_acumulacao <= 0 && idade < consumoEndAge))) {
          // Capital esgotou - consumir apenas o que resta
          saqueEfetivo = Math.max(0, capital + rendimentoCapital);
          capitalFinal = 0;
          if (idadeEsgotamento === null) {
            idadeEsgotamento = idade;
          }
          patrimonioEsgotado = true;
        }

        // Zerar o capital no último ano do consumo apenas se o cliente precisa de aporte mensal
        // Quando há excedente (não precisa de aporte), mesmo com overrideEndAge definido,
        // não forçamos zerar pois o capital pode sobrar naturalmente
        // overrideEndAge é usado apenas para calcular a renda sustentável, não para forçar zeramento
        if (idade === consumoEndAge && forceFinalZeroAtEnd && precisaAporteMensal) {
          // Consumir todo o capital disponível no último ano para alinhar com exibição e tabela
          const capitalDisponivelTotal = capital + rendimentoCapital;
          saqueEfetivo = Math.max(0, capitalDisponivelTotal);
          capitalFinal = 0;
          console.log(`[Último Ano ${idade}] Zerando capital: consumoEndAge=${consumoEndAge}, capital_inicial=${capital.toFixed(2)}, rendimento=${rendimentoCapital.toFixed(2)}, eventos=${delta.toFixed(2)}, capital_total=${capitalDisponivelTotal.toFixed(2)}, saque_efetivo=${saqueEfetivo.toFixed(2)}, fv_saques_mensais=${fvSaques.toFixed(2)}, overrideEndAge=${overrideEndAge ?? 'undefined'}, precisaAporteMensal=${precisaAporteMensal}`);
        }

        // Exibição: somatório nominal dos 12 saques mensais.
        // Se houver saque final para zerar o patrimônio, exibimos o valor efetivamente sacado.
        const saqueExibido = (idade === consumoEndAge && capitalFinal === 0 && (!lockWithdrawalToTarget || meses_acumulacao <= 0))
          ? saqueEfetivo
          : fvSaques;

        fluxoCaixaAnual.push({
          idade,
          fase: 'Consumo',
          capitalInicial,
          eventos: delta,
          aporte: 0,
          rendimento: rendimentoCapital,
          saque: saqueExibido,
          capitalFinal
        });

        // Registra o capital de fim de ano para o gráfico (sempre usar capitalFinal)
        fluxo.push({ idade, capital: capitalFinal > 0 ? capitalFinal : 0 });

        capital = capitalFinal;
        if (capital === 0 && lockWithdrawalToTarget) {
          patrimonioEsgotado = true;
        }
        idade++;
      }
      // Se o capital chegou exatamente a 0 no último ano e ainda não marcamos a idade de esgotamento,
      // definimos como o último ano do horizonte (consumoEndAge)
      if (capital === 0 && idadeEsgotamento === null) {
        idadeEsgotamento = consumoEndAge;
      }
    }

    return { fluxo, fluxoCaixaAnual, idadeEsgotamento };
  };

  const resultado = simularFluxoCapital();
  const fluxoCapital = resultado.fluxo;
  const idadeEsgotamento = resultado.idadeEsgotamento;
  const fluxoCaixaAnual = resultado.fluxoCaixaAnual;

  // Validar e limpar dados inválidos do fluxo de capital antes de retornar
  const fluxoCapitalLimpo = fluxoCapital
    .map(item => ({
      ...item,
      capital: isFinite(item.capital) && !isNaN(item.capital) ? Math.max(0, item.capital) : 0
    }))
    .filter(item => item.idade >= idade_atual);

  return {
    capitalNecessario: isFinite(capitalNecessario) ? capitalNecessario : 0,
    aporteMensal: isFinite(aporteMensal) ? aporteMensal : 0,
    rendaMensal: isFinite(rendaMensalCalculada) ? rendaMensalCalculada : 0,
    fluxoCapital: fluxoCapitalLimpo,
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

// Evita exibir "-R$ 0" quando o arredondamento gera -0
const normalizeMoneyInt = (value: number): number => {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
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
  externalLiquidityEvents,
  onTaxaRetornoChange,
  onLiquidityEventsChange
}) => {
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();
  
  // Verifica se o cliente já está aposentado
  const isAlreadyRetired = currentAge >= retirementAge;
  
  // Removed selectedView state since we only show the complete scenario
  const [taxaRetorno, setTaxaRetorno] = useState<number>(0.03); // 3% real ao ano como na planilha
  const [rendaMensal, setRendaMensal] = useState<number>(rendaMensalDesejada);
  const [idadeAposentadoria, setIdadeAposentadoria] = useState<number>(isAlreadyRetired ? currentAge : retirementAge);
  // Para clientes já aposentados, inicia com modo finito (false) para mostrar consumo do capital
  // Para clientes não aposentados, também inicia com false (padrão)
  const [isPerpetuity, setIsPerpetuity] = useState<boolean>(false);
  
  // Para clientes já aposentados, perpetuidade sempre é false
  // Garantir que o estado seja sempre false para aposentados
  React.useEffect(() => {
    if (isAlreadyRetired && isPerpetuity) {
      setIsPerpetuity(false);
    }
  }, [isAlreadyRetired, isPerpetuity]);
  
  // Variável computada: sempre false para aposentados
  const effectiveIsPerpetuity = isAlreadyRetired ? false : isPerpetuity;
  // Seletor de cenários: 'current' usa excedente; 'target' calcula aporte necessário
  const [selectedScenario, setSelectedScenario] = useState<'current' | 'target'>("target");
  const [excedentePct, setExcedentePct] = useState<number>(100);
  const [reachableIncome, setReachableIncome] = useState<number | null>(null);
  const [reachableDepletionAge, setReachableDepletionAge] = useState<number | null>(null);
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
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventValue, setNewEventValue] = useState<number>(0);
  const [newEventType, setNewEventType] = useState<'positive' | 'negative'>('positive');

  // Ref para manter a referência estável do callback
  const onLiquidityEventsChangeRef = useRef(onLiquidityEventsChange);
  
  // Atualizar o ref sempre que o callback mudar
  useEffect(() => {
    onLiquidityEventsChangeRef.current = onLiquidityEventsChange;
  }, [onLiquidityEventsChange]);

  // Função para obter o session_id da URL
  const getSessionId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId');
  };

  // Carregar eventos de liquidez da API ao montar o componente
  useEffect(() => {
    const loadLiquidityEvents = async () => {
      const sessionId = getSessionId();
      if (!sessionId) {
        return;
      }

      try {
        const apiEvents = await getLiquidityEvents(sessionId);
        
        const events: LiquidityEvent[] = apiEvents.map((event, index) => ({
          id: `event-${index}`,
          name: event.nome || '',
          age: Number(event.idade || 0),
          startAge: Number(event.idade || 0),
          value: Number(event.valor || 0),
          isPositive: event.tipo === 'entrada',
          recurrence: (event.recorrencia === 'anual' ? 'annual' :
            event.recorrencia === 'mensal' ? 'monthly' : 'once') as 'once' | 'annual' | 'monthly',
          endAge: event.termino ? Number(event.termino) : null,
          enabled: (event.status ?? 1) !== 0 // true se status for 1 ou undefined/null, false se status for 0
        }));
        
        setLiquidityEvents(events);
        
        // Notificar o componente pai sobre os eventos carregados usando o ref
        if (onLiquidityEventsChangeRef.current) {
          onLiquidityEventsChangeRef.current(events);
        }
      } catch (error) {
        console.error('RetirementProjectionChart: Erro ao carregar eventos de liquidez:', error);
      }
    };

    loadLiquidityEvents();
  }, []); // Executa apenas uma vez na montagem

  // Removido: injeção automática de eventos derivados. Agora só sugerimos rendas para inclusão manual.

  // Função auxiliar para determinar lockWithdrawalToTarget baseado em excedente para clientes aposentados
  const determineLockWithdrawal = React.useCallback((
    scenario: 'current' | 'target',
    override: number | null,
    currentRenda: number,
    currentTaxaRetorno: number = taxaRetorno
  ): boolean => {
    if (isAlreadyRetired && scenario === 'target' && override == null) {
      // Fazer um cálculo preliminar para verificar se precisa de aporte
      const prelimResult = calculateRetirementProjection(
        currentAge,
        idadeAposentadoria,
        lifeExpectancy,
        currentPortfolio,
        null, // não usar override para verificar aporte necessário
        currentRenda,
        currentTaxaRetorno,
        currentTaxaRetorno,
        liquidityEvents,
        effectiveIsPerpetuity,
        null, // sem override
        false, // não usar lockWithdrawalToTarget para verificação
        true,
        scenario === 'target' && !effectiveIsPerpetuity ? 99 : undefined
      );
      // Se precisa de aporte mensal (> 0), não há excedente, então usar lockWithdrawalToTarget
      // Se não precisa de aporte (<= 0), há excedente, então não usar lockWithdrawalToTarget
      return prelimResult.aporteMensal > 0;
    } else {
      // Para outros casos, usar a lógica padrão
      return (scenario === 'current') || (scenario === 'target' && effectiveIsPerpetuity);
    }
  }, [isAlreadyRetired, currentAge, idadeAposentadoria, lifeExpectancy, currentPortfolio, liquidityEvents, effectiveIsPerpetuity, taxaRetorno]);

  // Calcula a renda máxima que faz o capital terminar exatamente no ano final (99 anos para todos)
  const computeReachableIncomeEndAt99 = React.useCallback((overrideAporte: number | null) => {
    if (effectiveIsPerpetuity || overrideAporte == null) return null;

    // Sempre usar 99 anos como idade final para a renda alcançável
    const targetAge = 99;

    // Se com renda 0 já esgota antes da idade alvo, então não há renda alcançável que dure até a idade alvo
    const testIncome = (income: number) => {
      const res = calculateRetirementProjection(
        currentAge,
        idadeAposentadoria,
        lifeExpectancy,
        currentPortfolio,
        aporteMensal,
        income,
        taxaRetorno,
        taxaRetorno,
        liquidityEvents,
        false,
        overrideAporte,
        true,
        false,        // forceFinalZeroAtEnd: false durante busca para detectar esgotamento
        targetAge    // overrideEndAge: usar targetAge explicitamente durante busca
      );
      return res.idadeEsgotamento; // null => não esgota até targetAge; número => idade do esgotamento
    };

    const minAge = testIncome(0);
    if (minAge != null && minAge < targetAge) return 0; // impossível durar até targetAge

    // Busca um limite superior que esgote antes da idade alvo
    let low = 0;
    let high = Math.max(100, rendaMensal || 0);
    let ageHigh = testIncome(high);
    let guard = 0;
    while ((ageHigh == null || ageHigh >= targetAge) && guard < 24) {
      high *= 1.6;
      ageHigh = testIncome(high);
      guard++;
    }

    // Bisseção para encontrar renda que esgota exatamente na idade alvo
    for (let i = 0; i < 28; i++) {
      const mid = (low + high) / 2;
      const age = testIncome(mid);
      if (age == null || age > targetAge) {
        low = mid; // ainda sobra capital após targetAge
      } else if (age < targetAge) {
        high = mid; // esgota antes de targetAge
      } else {
        // age === targetAge
        return mid;
      }
    }
    return (low + high) / 2;
  }, [effectiveIsPerpetuity, currentAge, idadeAposentadoria, lifeExpectancy, currentPortfolio, aporteMensal, rendaMensal, taxaRetorno, liquidityEvents]);

  // Calcula a renda alcançável em modo perpetuidade (mantém patrimônio infinito)
  const computeReachableIncomePerpetuity = React.useCallback((overrideAporte: number | null) => {
    if (!effectiveIsPerpetuity || overrideAporte == null) return null;
    const reach = calculateRetirementProjection(
      currentAge,
      idadeAposentadoria,
      lifeExpectancy,
      currentPortfolio,
      aporteMensal,
      rendaMensal,
      taxaRetorno,
      taxaRetorno,
      liquidityEvents,
      true,
      overrideAporte,
      false
    );
    return reach.rendaMensal;
  }, [effectiveIsPerpetuity, currentAge, idadeAposentadoria, lifeExpectancy, currentPortfolio, aporteMensal, rendaMensal, taxaRetorno, liquidityEvents]);

  // Recalcular projeção sempre que inputs mudarem
  useEffect(() => {
    // Se estivermos no Cenário Atual, forçar override do aporte como % do excedente atual
    const aporteFromCurrentScenario = selectedScenario === 'current'
      ? ((monthlyContribution || 0) * (excedentePct / 100))
      : null;
    const effectiveOverride = (selectedScenario === 'current' ? aporteFromCurrentScenario : overrideAporte);

    // Determinar overrideEndAge baseado no cenário:
    // - Cenário target (renda editável): sempre 99 anos para zerar capital no fim do ano 99
    // - Cenário current: usar padrão (100 para aposentados, 99 para não aposentados)
    const meses_acumulacao = (idadeAposentadoria - currentAge) * 12;
    const overrideEndAge = selectedScenario === 'target' && !effectiveIsPerpetuity 
      ? 99  // Sempre zerar aos 99 quando editando renda no cenário target
      : undefined; // Usar padrão nos outros casos
    
    // Para clientes aposentados no cenário target, verificar se há excedente (aporte <= 0)
    // Se há excedente, não usar lockWithdrawalToTarget para permitir cálculo correto da renda que zera aos 99
    // Se não há excedente, usar lockWithdrawalToTarget para permitir esgotamento antes do fim
    const lockWithdrawal = determineLockWithdrawal(selectedScenario, effectiveOverride, rendaMensal, taxaRetorno);
    
    console.log(`[useEffect Projeção] selectedScenario=${selectedScenario}, effectiveIsPerpetuity=${effectiveIsPerpetuity}, overrideEndAge=${overrideEndAge}, rendaMensal=${rendaMensal.toFixed(2)}, isAlreadyRetired=${isAlreadyRetired}, lockWithdrawal=${lockWithdrawal}`);
    
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
      effectiveIsPerpetuity,
      effectiveOverride,
      lockWithdrawal,
      true,  // forceFinalZeroAtEnd: sempre true para exibição no gráfico/tabela
      overrideEndAge
    );

    // Atualiza saídas conforme a origem da edição
    if (effectiveOverride != null) {
      setAporteMensal(effectiveOverride);
      // No cenário atual, não alteramos a renda pretendida; mostramos a alcançável separadamente
      if (selectedScenario !== 'current') {
        setRendaMensal(result.rendaMensal);
      }
    } else {
      setAporteMensal(result.aporteMensal);
    }
    // Renda alcançável com o aporte atual: calcula separadamente SEM travar a renda na meta
    if (selectedScenario === 'current') {
      const income = effectiveIsPerpetuity
        ? computeReachableIncomePerpetuity(aporteFromCurrentScenario)
        : computeReachableIncomeEndAt99(aporteFromCurrentScenario);
      setReachableIncome(income == null ? null : income);
      // Renda alcançável sempre zera aos 99 anos
      setReachableDepletionAge(effectiveIsPerpetuity ? null : 99);
    } else {
      setReachableIncome(null);
      setReachableDepletionAge(null);
    }
    setProjection({
      ...result,
      fluxoCapital: result.fluxoCapital.map(item => ({
        age: item.idade,
        capital: Math.round(item.capital)
      }))
    });
  }, [liquidityEvents, currentAge, idadeAposentadoria, lifeExpectancy, currentPortfolio, aporteMensal, rendaMensal, taxaRetorno, effectiveIsPerpetuity, overrideAporte, selectedScenario, excedentePct, monthlyContribution, computeReachableIncomeEndAt99, computeReachableIncomePerpetuity, isAlreadyRetired, determineLockWithdrawal]);

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
          termino: e.endAge || undefined,
          recorrencia: e.recurrence === 'annual' ? 'anual' :
            e.recurrence === 'monthly' ? 'mensal' : 'unica',
          tipo: e.isPositive ? 'entrada' : 'saida',
          valor: e.value,
          status: (e.enabled !== false) ? 1 : 0 // Garantir que undefined/null seja tratado como true (ativo)
        }));
      }
      await saveLiquidityEvents(apiEvents);
      
      // Disparar evento customizado para notificar outros componentes
      // Usar setTimeout com delay maior para dar tempo do callback ser processado primeiro
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('liquidityEventsUpdated', { 
          detail: { sessionId } 
        }));
      }, 500); // Aumentar delay para dar tempo do callback ser processado
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
    
    // Notificar o componente pai sobre a mudança nos eventos
    if (onLiquidityEventsChangeRef.current) {
      onLiquidityEventsChangeRef.current(updatedEvents);
    }
    
    setNewEventName('');
    setNewEventStartAge(currentAge + 5);
    setNewEventEndAge('');
    setNewEventValue(0);
    setNewEventType('positive');
    setNewEventRecurrence('once');

    // Sincroniza com a API
    await syncEventsToApi(updatedEvents);
  };

  // Incluir sugestão de renda como evento manual
  const addSuggestedIncome = async (sugg: {
    id: string;
    name: string;
    value: number;
    isPositive?: boolean;
    recurrence?: 'once' | 'annual' | 'monthly';
    startAge?: number;
    endAge?: number | null;
    enabled?: boolean;
  }) => {
    const recurrence = sugg.recurrence || 'monthly';
    const startAge = (sugg.startAge ?? idadeAposentadoria);
    const newEvent: LiquidityEvent = {
      id: `manual-${Date.now()}`,
      name: sugg.name,
      value: Number(sugg.value) || 0,
      isPositive: sugg.isPositive !== false,
      recurrence,
      startAge,
      endAge: recurrence === 'once' ? null : (sugg.endAge ?? null),
      enabled: true,
    };
    const updatedEvents = [...liquidityEvents, newEvent];
    setLiquidityEvents(updatedEvents);
    
    // Notificar o componente pai sobre a mudança nos eventos
    if (onLiquidityEventsChangeRef.current) {
      onLiquidityEventsChangeRef.current(updatedEvents);
    }
    
    await syncEventsToApi(updatedEvents);
  };

  const handleRemoveLiquidityEvent = async (id: string) => {
    const updatedEvents = liquidityEvents.filter(event => event.id !== id);
    setLiquidityEvents(updatedEvents);

    // Notificar o componente pai sobre a mudança nos eventos
    if (onLiquidityEventsChangeRef.current) {
      onLiquidityEventsChangeRef.current(updatedEvents);
    }

    // Sincroniza com a API
    await syncEventsToApi(updatedEvents);
  };

  const handleToggleLiquidityEvent = async (id: string, enabled: boolean) => {
    // Garantir que enabled seja sempre um booleano explícito
    const enabledValue = enabled === true;
    const updatedEvents = liquidityEvents.map(ev => ev.id === id ? { ...ev, enabled: enabledValue } : ev);
    setLiquidityEvents(updatedEvents);

    // Notificar o componente pai sobre a mudança nos eventos ANTES de salvar na API
    // Isso garante que o componente pai receba a atualização primeiro
    if (onLiquidityEventsChangeRef.current) {
      onLiquidityEventsChangeRef.current(updatedEvents);
      
      // Aguardar um pouco para garantir que o callback foi processado antes de salvar na API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // O useEffect principal já recalcula quando liquidityEvents muda,
    // mas atualizamos localmente para feedback imediato
    // Usar os mesmos parâmetros do useEffect principal para consistência
    const aporteFromCurrentScenario = selectedScenario === 'current'
      ? ((monthlyContribution || 0) * (excedentePct / 100))
      : null;
    const effectiveOverride = (selectedScenario === 'current' ? aporteFromCurrentScenario : overrideAporte);
    const meses_acumulacao = (idadeAposentadoria - currentAge) * 12;
    const overrideEndAge = selectedScenario === 'target' && !effectiveIsPerpetuity ? 99 : undefined;
    
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
      effectiveIsPerpetuity,
      effectiveOverride,
      (isAlreadyRetired && selectedScenario === 'target' && effectiveOverride == null) || 
      (selectedScenario === 'current') || 
      (selectedScenario === 'target' && effectiveIsPerpetuity),
      true,
      overrideEndAge
    );
    setAporteMensal(result.aporteMensal);
    setProjection({
      ...result,
      fluxoCapital: result.fluxoCapital.map(item => ({
        age: item.idade,
        capital: Math.round(item.capital)
      }))
    });

    // Sincroniza com a API DEPOIS de notificar o componente pai
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

    // Notificar o componente pai sobre a mudança nos eventos
    if (onLiquidityEventsChangeRef.current) {
      onLiquidityEventsChangeRef.current(updatedEvents);
    }

    // O useEffect principal já recalcula quando liquidityEvents muda,
    // mas atualizamos localmente para feedback imediato
    // Usar os mesmos parâmetros do useEffect principal para consistência
    const aporteFromCurrentScenario = selectedScenario === 'current'
      ? ((monthlyContribution || 0) * (excedentePct / 100))
      : null;
    const effectiveOverride = (selectedScenario === 'current' ? aporteFromCurrentScenario : overrideAporte);
    const meses_acumulacao = (idadeAposentadoria - currentAge) * 12;
    const overrideEndAge = selectedScenario === 'target' && !effectiveIsPerpetuity ? 99 : undefined;
    
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
      effectiveIsPerpetuity,
      effectiveOverride,
      (isAlreadyRetired && selectedScenario === 'target' && effectiveOverride == null) || 
      (selectedScenario === 'current') || 
      (selectedScenario === 'target' && effectiveIsPerpetuity),
      true,
      overrideEndAge
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
    // Para clientes já aposentados, a idade de aposentadoria é a idade atual
    if (isAlreadyRetired) {
      if (idadeAposentadoria !== currentAge) {
        setIdadeAposentadoria(currentAge);
      }
    } else {
      // Para clientes não aposentados, garante que a idade de aposentadoria seja maior que a idade atual
      if (idadeAposentadoria < currentAge + 1) {
        setIdadeAposentadoria(currentAge + 1);
      }
    }
  }, [currentAge, idadeAposentadoria, isAlreadyRetired]);

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
    const end = effectiveIsPerpetuity ? 100 : lifeExpectancy;
    return [currentAge, end];
  }, [currentAge, lifeExpectancy, effectiveIsPerpetuity]);

  const xTicks = React.useMemo(() => {
    const end = effectiveIsPerpetuity ? 100 : lifeExpectancy;
    const range = end - currentAge;
    const interval = range <= 20 ? 5 : range <= 40 ? 10 : 15;
    
    const ticks = [];
    const start = Math.ceil(currentAge / interval) * interval;
    
    for (let i = start; i <= end; i += interval) {
      ticks.push(i);
    }
    
    // Garante que a idade atual e final apareçam
    if (!ticks.includes(currentAge)) ticks.unshift(currentAge);
    if (!ticks.includes(end)) ticks.push(end);
    
    return ticks;
  }, [currentAge, lifeExpectancy, effectiveIsPerpetuity]);

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
              Cenário de Aposentadoria {effectiveIsPerpetuity && "(Perpetuidade)"}
            </CardTitle>
            <CardDescription className="mt-1">
              {effectiveIsPerpetuity ?
                "Patrimônio perpétuo - apenas os rendimentos são consumidos" :
                "Evolução do patrimônio no prazo desejado (alinhado com a planilha)"
              }
            </CardDescription>
          </div>

          {/* Seletor de Cenário - apenas para clientes que ainda não se aposentaram */}
          {!isAlreadyRetired && (
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                className={`p-3 rounded-lg border text-left ${selectedScenario === 'current' ? 'border-accent bg-accent/10' : 'border-border/60 hover:bg-muted/30'}`}
                onClick={() => {
                  setSelectedScenario('current');
                  setOverrideAporte(null);
                }}
              >
                <div className="font-medium">Cenário Atual (com excedente)</div>
                <div className="text-xs text-muted-foreground mt-1">Usa o excedente mensal atual (ajustável por %) como aporte recorrente até a aposentadoria. Eventos de fluxo são considerados. Modo perpétuo opcional.</div>
              </button>
              <button
                type="button"
                className={`p-3 rounded-lg border text-left ${selectedScenario === 'target' ? 'border-accent bg-accent/10' : 'border-border/60 hover:bg-muted/30'}`}
                onClick={() => {
                  setSelectedScenario('target');
                  setOverrideAporte(null);
                }}
              >
                <div className="font-medium">Cenário para Atingir a Renda Desejada (padrão)</div>
                <div className="text-xs text-muted-foreground mt-1">Calcula o aporte necessário para atingir a renda pretendida na idade planejada, considerando eventos de fluxo. Modo perpétuo opcional.</div>
              </button>
            </div>
          )}
          
          {/* Aviso para clientes já aposentados */}
          {isAlreadyRetired && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <PiggyBank size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-blue-900 dark:text-blue-100">Cliente Já Aposentado</div>
                  <div className="text-sm text-blue-800/80 dark:text-blue-200/80 mt-1">
                    Como você já está aposentado, o simulador foca na gestão do seu patrimônio atual e na sustentabilidade da sua renda mensal. Ajuste a renda desejada e veja por quanto tempo seu capital durará.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle de Perpetuidade - oculto para clientes já aposentados */}
          {!isAlreadyRetired && (
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
                  const aporteFromCurrentScenario = selectedScenario === 'current' ? ((monthlyContribution || 0) * (excedentePct / 100)) : null;
                  const effectiveOverride = (selectedScenario === 'current' ? aporteFromCurrentScenario : overrideAporte);
                  const overrideEndAge = selectedScenario === 'target' && !checked ? 99 : undefined;
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
                    checked,
                    effectiveOverride,
                    (selectedScenario === 'current') || (selectedScenario === 'target' && checked),
                    true,
                    overrideEndAge
                  );

                  // Atualiza o aporte mensal com o valor calculado
                  if (selectedScenario === 'current') {
                    setAporteMensal(aporteFromCurrentScenario || 0);
                  } else {
                    setAporteMensal(result.aporteMensal);
                  }

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
          )}

          {/* Slider de % do Excedente quando Cenário Atual ativo - não aplica para aposentados */}
          {!isAlreadyRetired && selectedScenario === 'current' && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="pctExcedente">% do Excedente utilizado ({excedentePct}%)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="pctExcedente"
                  value={[excedentePct]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(value) => setExcedentePct(value[0])}
                  className="flex-1"
                />
                <div className="w-28 text-right text-sm font-medium">
                  {formatCurrency(((monthlyContribution || 0) * (excedentePct / 100)))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Excedente atual: {formatCurrency(monthlyContribution || 0)} / mês</p>
            </div>
          )}

          {/* Destaque da Renda Alcançável (Cenário Atual) */}
          {selectedScenario === 'current' && reachableIncome != null && (
            <div className="-mt-1 mb-3">
              <div
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: '#21887C', backgroundColor: '#21887C10' }}
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="text-xs text-muted-foreground">Renda alcançável com aporte atual</div>
                <div className="text-xl md:text-2xl font-semibold tabular-nums" style={{ color: '#21887C' }}>
                  {formatCurrency(reachableIncome)}
                </div>
              </div>
            </div>
          )}

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
                    
                    // Notificar o componente pai sobre a mudança na taxa
                    if (onTaxaRetornoChange) {
                      onTaxaRetornoChange(newTaxaRetorno);
                    }

                    // Recalcula a projeção com os novos valores
                  const aporteFromCurrentScenario = selectedScenario === 'current' ? ((monthlyContribution || 0) * (excedentePct / 100)) : null;
                    const lockWithdrawalForTaxa = determineLockWithdrawal(selectedScenario, aporteFromCurrentScenario, rendaMensal, newTaxaRetorno);
                    const overrideEndAgeForTaxa = selectedScenario === 'target' && !effectiveIsPerpetuity ? 99 : undefined;
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
                      effectiveIsPerpetuity,
                    aporteFromCurrentScenario,
                    lockWithdrawalForTaxa,
                    true,
                    overrideEndAgeForTaxa
                    );

                    // Atualiza o aporte mensal com o valor calculado
                    if (selectedScenario === 'current') {
                      setAporteMensal(aporteFromCurrentScenario || 0);
                    } else {
                      setAporteMensal(result.aporteMensal);
                    }

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
              <Label htmlFor="aporteMensal">Aporte Mensal (calculado)</Label>
              <CurrencyInput
                id="aporteMensal"
                value={aporteMensal}
                onChange={() => { /* leitura apenas */ }}
                className="h-9"
                disabled
              />
              {selectedScenario === 'current' && (
                <p className="text-[11px] text-muted-foreground">Controlado pelo % do excedente acima</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rendaMensal">Renda Mensal (editável)</Label>
              <CurrencyInput
                id="rendaMensal"
                value={rendaMensal}
                onChange={(value) => {
                  setRendaMensal(value);
                  // Se o usuário modificou a renda manualmente:
                  // - No cenário atual, mantemos o override (aporte fixo do excedente)
                  // - No cenário target, cancelamos o override para voltar ao modo "calcular aporte"
                  if (selectedScenario === 'target') {
                    setOverrideAporte(null);
                  }
                }}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">Objetivo registrado: {formatCurrency(rendaMensalDesejada)}</p>
              {/* Linha informativa sobre esgotamento removida por solicitação */}
            </div>

            <div className="space-y-2">
              {/* Campo de Idade de Aposentadoria - não aplica para aposentados */}
              {!isAlreadyRetired && (
                <>
                  <Label htmlFor="idadeAposentadoria">Idade de Aposentadoria</Label>
                  <Input
                    id="idadeAposentadoria"
                    type="number"
                    value={idadeAposentadoria}
                    onChange={(e) => {
                      const newAge = parseInt(e.target.value) || retirementAge;
                      setIdadeAposentadoria(newAge);

                      // Recalcula a projeção com os novos valores
                      const aporteFromCurrentScenario = selectedScenario === 'current' ? ((monthlyContribution || 0) * (excedentePct / 100)) : null;
                      const lockWithdrawalForAge = determineLockWithdrawal(selectedScenario, aporteFromCurrentScenario, rendaMensal, taxaRetorno);
                      const overrideEndAgeForAge = selectedScenario === 'target' && !effectiveIsPerpetuity ? 99 : undefined;
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
                        effectiveIsPerpetuity,
                        aporteFromCurrentScenario,
                        lockWithdrawalForAge,
                        true,
                        overrideEndAgeForAge
                      );

                      // Atualiza o aporte mensal com o valor calculado
                      if (selectedScenario === 'current') {
                        setAporteMensal(aporteFromCurrentScenario || 0);
                      } else {
                        setAporteMensal(result.aporteMensal);
                      }

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
                </>
              )}
            </div>
          </div>

          {/* Seção de Eventos de Liquidez */}
          <div className="flex items-center justify-between mb-0.5">
            <Label>Planejamento de Fluxos</Label>
            <div className="text-xs text-muted-foreground">
              Eventos que afetam seu patrimônio em momentos específicos
            </div>
          </div>

          {/* Sugestões de rendas (inclusão manual) - apenas para assessor */}
          {!hideControls && Array.isArray(externalLiquidityEvents) && externalLiquidityEvents.filter(e => (e.isPositive !== false)).length > 0 && (
            <div className="border border-dashed border-border rounded-md p-3 mb-3 bg-muted/20 w-full overflow-hidden">
              <div className="text-xs text-muted-foreground mb-2">
                Rendas sugeridas a incluir (manual):
              </div>
              <div className="flex flex-wrap gap-2 w-full">
                {externalLiquidityEvents
                  .filter((s) => s && (s.isPositive !== false))
                  .map((s) => {
                    const recurrence = s.recurrence || 'monthly';
                    const startAge = (s.startAge ?? idadeAposentadoria);
                    const alreadyIncluded = (liquidityEvents || []).some((nd) => (
                      nd.name === s.name &&
                      (nd.startAge ?? nd.age) === startAge &&
                      (nd.recurrence || 'once') === recurrence &&
                      Math.abs((nd.value ?? 0) - Number(s.value || 0)) < 1e-6 &&
                      nd.isPositive === (s.isPositive !== false)
                    ));
                    return (
                      <div key={s.id} className="px-2 py-1 rounded-md border text-xs w-full sm:w-auto min-w-0 max-w-full break-words"
                        style={{ borderColor: '#21887C', color: '#21887C', backgroundColor: '#21887C20' }}
                        title={`${s.name} • ${(recurrence === 'once') ? 'Única' : (recurrence === 'annual' ? 'Anual' : 'Mensal')}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#21887C' }}></span>
                          <span className="truncate">{s.name}</span>
                          <span className="opacity-70">{startAge}+</span>
                          <span className="font-medium">{formatCurrency(Number(s.value || 0))}</span>
                        </div>
                        <button
                          onClick={() => addSuggestedIncome(s)}
                          disabled={alreadyIncluded}
                          className={`w-full sm:w-auto sm:ml-auto h-6 px-2 rounded mt-1 sm:mt-0 ${alreadyIncluded ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-[#21887C] text-white'}`}
                        >
                          {alreadyIncluded ? 'Incluída' : 'Incluir'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

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
                    {!hideControls && <th className="py-2 px-3 text-center font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liquidityEvents.map(event => (
                    !hideControls && editingEventId === event.id ? (
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
                          {hideControls ? (
                            <span className="text-xs text-muted-foreground">
                              {event.enabled !== false ? 'Sim' : 'Não'}
                            </span>
                          ) : (
                            <Switch
                              checked={event.enabled === true}
                              onCheckedChange={(checked) => {
                                // Garantir que sempre passamos um booleano explícito
                                handleToggleLiquidityEvent(event.id, checked === true);
                              }}
                            />
                          )}
                        </td>
                        {!hideControls && (
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
                        )}
                      </tr>
                    )
                  ))}

                  {/* Formulário para adicionar novo evento - apenas para assessor */}
                  {!hideControls && (
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
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-4">
        <div className="h-[320px] mb-6">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              data={filteredData}
              margin={{ top: 40, right: 30, left: 20, bottom: 40 }}
            >
                <XAxis
                  dataKey="age"
                  label={{ value: 'Idade', position: 'insideBottom', offset: -15, fill: '#6b7280', fontSize: 12 }}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  padding={{ left: 10, right: 10 }}
                  domain={xDomain}
                  ticks={xTicks}
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

                {/* Linha de referência para idade de esgotamento do capital (Cenário Atual) */}
                {selectedScenario === 'current' && !effectiveIsPerpetuity && projection.idadeEsgotamento != null && (
                  <ReferenceLine
                    x={projection.idadeEsgotamento}
                    stroke="#E52B50"
                    strokeDasharray="3 3"
                    label={({ viewBox }: any) => {
                      const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) - 6;
                      const y = (viewBox?.y ?? 0) + 26; // levemente abaixo do label de aposentadoria
                      return (
                        <text x={x} y={y} fill="#E52B50" fontSize={11} textAnchor="end">
                          {`Esgota (${projection.idadeEsgotamento} anos)`}
                        </text>
                      );
                    }}
                  />
                )}

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
                >
                  <LabelList
                    dataKey="capital"
                    position="top"
                    content={({ x, y, width, height, value, index }: any) => {
                      // Mostrar apenas no último ponto
                      if (index === filteredData.length - 1) {
                        return (
                          <g>
                            <circle cx={x} cy={y} r={4} fill="#B8860B" stroke="#fff" strokeWidth={2} />
                            <text
                              x={x}
                              y={y - 15}
                              fill="#B8860B"
                              fontSize={11}
                              fontWeight="600"
                              textAnchor="middle"
                            >
                              {formatCurrency(value as number)}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    }}
                  />
                </Area>

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
          </ChartContainer>
        </div>

        {/* Lista compacta de eventos de liquidez */}
        {liquidityEvents && liquidityEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 w-full">
            {liquidityEvents
              .filter((e) => e && e.enabled !== false)
              .sort((a, b) => (a.startAge ?? a.age) - (b.startAge ?? b.age))
              .map((e) => (
                <div
                  key={e.id}
                  className={`px-2 py-1 border text-xs w-full sm:w-auto rounded-md sm:rounded-full min-w-0 break-words`}
                  style={{
                    borderColor: e.isPositive ? '#21887C' : '#E52B50',
                    color: e.isPositive ? '#21887C' : '#E52B50',
                    backgroundColor: e.isPositive ? '#21887C20' : '#E52B5020'
                  }}
                  title={`${e.name} • ${e.recurrence && e.recurrence !== 'once' ? 'Recorrente' : 'Único'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-block w-2 h-2 rounded-full`} style={{ backgroundColor: e.isPositive ? '#21887C' : '#E52B50' }}></span>
                      <span className="font-medium truncate">{e.name}</span>
                    </div>
                    <span className="hidden sm:inline mx-1">—</span>
                    <span className="font-medium">{formatCurrency(e.value)}</span>
                    <span className="hidden sm:inline mx-1">•</span>
                    <div className="flex items-center gap-1">
                      <span>{(e.startAge ?? e.age)} anos{e.endAge ? ` até ${e.endAge}` : ''}</span>
                      {e.recurrence && e.recurrence !== 'once' && (
                        <span className="text-muted-foreground">(recorrente)</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Alerta de esgotamento no cenário atual + perpetuidade */}
        {selectedScenario === 'current' && effectiveIsPerpetuity && projection.idadeEsgotamento != null && (
          <div className="mt-6 p-4 rounded-lg border-2" style={{ borderColor: '#E52B50', backgroundColor: '#E52B5015' }}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <div className="font-semibold text-base mb-1" style={{ color: '#E52B50' }}>
                  Atenção: Patrimônio insuficiente para a renda desejada
                </div>
                <div className="text-sm text-muted-foreground">
                  {isAlreadyRetired ? (
                    <>
                      Com a renda mensal de {formatCurrency(rendaMensal)}, 
                      o patrimônio se esgotará aos <span className="font-semibold" style={{ color: '#E52B50' }}>{projection.idadeEsgotamento} anos</span> 
                      {' '}({projection.idadeEsgotamento - currentAge} anos restantes).
                      {reachableIncome != null && (
                        <span> A renda sustentável com o patrimônio atual é de <span className="font-semibold" style={{ color: '#21887C' }}>{formatCurrency(reachableIncome)}/mês</span>.</span>
                      )}
                    </>
                  ) : (
                    <>
                      Com o aporte atual de {formatCurrency(aporteMensal)}/mês e a renda mensal planejada de {formatCurrency(rendaMensal)}, 
                      o patrimônio se esgotará aos <span className="font-semibold" style={{ color: '#E52B50' }}>{projection.idadeEsgotamento} anos</span> 
                      {' '}({projection.idadeEsgotamento - idadeAposentadoria} anos após a aposentadoria).
                      {reachableIncome != null && (
                        <span> A renda alcançável sustentável com o aporte atual é de <span className="font-semibold" style={{ color: '#21887C' }}>{formatCurrency(reachableIncome)}/mês</span>.</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Nota didática */}
        <div className="mt-2 text-[11px] text-muted-foreground">
          * Observação: Os saques exibidos são valores futuros ao fim do ano (FV dos 12 saques mensais). No modo Perpetuidade, o patrimônio na data de aposentadoria é mantido consumindo apenas os rendimentos; entradas de fluxo não elevam o saque. Se os fluxos tornarem o aporte mensal ≤ 0, os eventos passam a ser incorporados e o patrimônio pode crescer (o saque do portfólio permanece limitado ao rendimento). No modo finito, o saque é o FV dos 12 saques e, no último ano, pode ser ajustado para zerar o saldo.
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
                      <td className="py-2 px-3 text-right">{formatCurrency(normalizeMoneyInt(row.capitalInicial))}</td>
                      <td className="py-2 px-3 text-right">{row.eventos === 0 ? '-' : formatCurrency(normalizeMoneyInt(row.eventos))}</td>
                      <td className="py-2 px-3 text-right">{row.aporte === 0 ? '-' : formatCurrency(normalizeMoneyInt(row.aporte))}</td>
                      <td className="py-2 px-3 text-right">{row.rendimento === 0 ? '-' : formatCurrency(normalizeMoneyInt(row.rendimento))}</td>
                      <td className="py-2 px-3 text-right">{row.saque === 0 ? '-' : formatCurrency(normalizeMoneyInt(row.saque))}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(normalizeMoneyInt(row.capitalFinal))}</td>
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