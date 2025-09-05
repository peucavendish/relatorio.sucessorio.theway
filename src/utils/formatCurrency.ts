/**
 * Formats a number as Brazilian currency (BRL)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formats a number as compact Brazilian currency (e.g., R$ 27,9 mil / R$ 2,1 mi)
 */
export const formatCurrencyCompact = (value: number): string => {
  try {
    // Use CompactNumber where supported
    const abs = Math.abs(value);
    if (abs < 1000) return formatCurrency(value);

    const units = [
      { v: 1_000_000_000, s: 'bi' },
      { v: 1_000_000, s: 'mi' },
      { v: 1_000, s: 'mil' },
    ];
    for (const u of units) {
      if (abs >= u.v) {
        const n = value / u.v;
        return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${u.s}`;
      }
    }
    return formatCurrency(value);
  } catch {
    return formatCurrency(value);
  }
};
