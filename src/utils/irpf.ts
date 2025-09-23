export interface IrpfParams {
  annualTaxableIncome: number;
  numberOfDependents: number;
  educationExpenses: number; // total anual informado (será limitado externamente se desejado)
  healthExpenses: number; // total anual dedutível
  pgblContributions: number; // total anual informado
}

export interface IrpfResultItem {
  // Renda tributável anual antes de deduções/descontos
  annualTaxableIncome: number;
  // Base de cálculo após deduções/descontos do modelo
  taxableBase: number;
  taxDue: number;
  effectiveRate: number; // taxDue / annualTaxableIncome
  // Quebra das deduções consideradas no cálculo do modelo.
  // Para o completo: { pgbl, dependents, education, health, total }
  // Para o simplificado: { simplifiedDiscount, total }
  deductions: Record<string, number>;
}

export interface IrpfComparisonResult {
  complete: IrpfResultItem;
  simplified: IrpfResultItem;
  recommendedModel: "Completo" | "Simplificado" | "Empate";
}

// Tabela progressiva anual (baseada em faixas vigentes recentes). Valores aproximados.
// Observação: A tabela oficial é publicada anualmente. Ajuste conforme necessário.
// Faixas em R$ por ANO (12x mensal). Utilizamos a tabela mensal 2024 multiplicada por 12 para estimativa.
// 2024 (mensal): até 2.259,20 isento; 2.259,21–2.826,65 7,5%; 2.826,66–3.751,05 15%; 3.751,06–4.664,68 22,5%; acima 27,5%
// Convertendo para anual aproximado:
const BRACKETS = [
  { upTo: 2259.20 * 12, rate: 0.0, deduction: 0 },
  { upTo: 2826.65 * 12, rate: 0.075, deduction: 169.44 * 12 },
  { upTo: 3751.05 * 12, rate: 0.15, deduction: 381.44 * 12 },
  { upTo: 4664.68 * 12, rate: 0.225, deduction: 662.77 * 12 },
  { upTo: Infinity, rate: 0.275, deduction: 896.00 * 12 },
] as const;

// Desconto simplificado (20% limitado a teto). Valor de teto aproximado de anos recentes.
// Para fins de ilustração, utiliza-se 16.754,34.
export const SIMPLIFIED_DISCOUNT_RATE = 0.20;
export const SIMPLIFIED_DISCOUNT_CAP = 16754.34;

// Dedução por dependente (valor anual aproximado de anos recentes)
export const DEPENDENT_DEDUCTION_ANNUAL = 2275.08;

// Limite anual de educação por pessoa (aproximado)
export const EDUCATION_CAP_PER_PERSON_ANNUAL = 3561.50;

// Limite legal de dedução PGBL: 12% da renda tributável anual
export const PGBL_LIMIT_RATE = 0.12;

function clampToZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateProgressiveTax(annualBase: number): number {
  const base = clampToZero(annualBase);
  for (const bracket of BRACKETS) {
    if (base <= bracket.upTo) {
      // Método com parcela a deduzir
      // imposto = base * rate - deducao
      return Math.max(0, base * bracket.rate - bracket.deduction);
    }
  }
  return 0;
}

export function calculateIrpfComparison(params: IrpfParams): IrpfComparisonResult {
  const annualTaxableIncome = clampToZero(params.annualTaxableIncome);
  const dependents = clampToZero(params.numberOfDependents);
  const education = clampToZero(params.educationExpenses);
  const health = clampToZero(params.healthExpenses);
  const pgbl = clampToZero(params.pgblContributions);

  // Modelo Completo: deduções legais
  const pgblLimit = annualTaxableIncome * PGBL_LIMIT_RATE;
  const pgblDeduction = Math.min(pgbl, pgblLimit);
  const dependentsDeduction = dependents * DEPENDENT_DEDUCTION_ANNUAL;
  // Nota: educação possui limites por pessoa/ano; aqui usamos o valor informado pelo usuário.
  // Limitar educação por pessoa (contribuinte + dependentes)
  const educationCapTotal = (dependents + 1) * EDUCATION_CAP_PER_PERSON_ANNUAL;
  const educationDeduction = Math.min(education, educationCapTotal);

  const totalDeductionsComplete = pgblDeduction + dependentsDeduction + educationDeduction + health;
  const baseComplete = Math.max(0, annualTaxableIncome - totalDeductionsComplete);
  const taxComplete = calculateProgressiveTax(baseComplete);

  // Modelo Simplificado: desconto padrão de 20% limitado ao teto
  const simplifiedDiscount = Math.min(annualTaxableIncome * SIMPLIFIED_DISCOUNT_RATE, SIMPLIFIED_DISCOUNT_CAP);
  const baseSimplified = Math.max(0, annualTaxableIncome - simplifiedDiscount);
  const taxSimplified = calculateProgressiveTax(baseSimplified);

  const recommendedModel =
    Math.abs(taxComplete - taxSimplified) < 1e-2
      ? "Empate"
      : taxComplete < taxSimplified
      ? "Completo"
      : "Simplificado";

  return {
    complete: {
      annualTaxableIncome,
      taxableBase: baseComplete,
      taxDue: taxComplete,
      effectiveRate: annualTaxableIncome > 0 ? taxComplete / annualTaxableIncome : 0,
      deductions: {
        pgbl: pgblDeduction,
        dependents: dependentsDeduction,
        education: educationDeduction,
        health,
        total: totalDeductionsComplete,
      },
    },
    simplified: {
      annualTaxableIncome,
      taxableBase: baseSimplified,
      taxDue: taxSimplified,
      effectiveRate: annualTaxableIncome > 0 ? taxSimplified / annualTaxableIncome : 0,
      deductions: {
        simplifiedDiscount,
        total: simplifiedDiscount,
      },
    },
    recommendedModel,
  };
}


