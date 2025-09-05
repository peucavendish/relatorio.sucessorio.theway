import React from 'react';
import { Input } from './input';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: number;
  onChange: (value: number) => void;
  allowNegative?: boolean;
}

function formatBRL(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function parseToNumber(text: string, allowNegative = false): number {
  if (!text) return 0;
  const digits = text.replace(/[^0-9-]/g, '');
  if (!digits) return 0;
  let num = parseInt(digits, 10);
  if (!allowNegative) num = Math.max(0, num);
  return Number.isFinite(num) ? num : 0;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, allowNegative = false, onBlur, onFocus, ...rest }) => {
  const [display, setDisplay] = React.useState<string>(formatBRL(value));

  React.useEffect(() => {
    // keep display in sync when external value changes
    setDisplay(formatBRL(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    const parsed = parseToNumber(raw, allowNegative);
    if (parsed !== value) onChange(parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setDisplay(formatBRL(value));
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // on focus, show plain number for easier edit
    setDisplay(String(value || 0));
    // move caret to end
    const el = e.target;
    requestAnimationFrame(() => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    onFocus?.(e);
  };

  return (
    <Input
      {...rest}
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  );
};

export default CurrencyInput;
