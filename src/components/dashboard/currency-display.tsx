'use client';

import React from 'react';
import { useCurrency } from '@/hooks/use-currency';

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  inline?: boolean;
}

export function CurrencyDisplay({
  amount,
  className = '',
  primaryClassName = 'font-bold text-foreground',
  secondaryClassName = 'text-[11px] text-muted-foreground font-medium block mt-0.5',
  inline = false,
}: CurrencyDisplayProps) {
  const { format, formatHome } = useCurrency();
  const primaryVal = format(amount);
  const secondaryVal = formatHome(amount);

  if (!secondaryVal) {
    return <span className={className}>{primaryVal}</span>;
  }

  if (inline) {
    return (
      <span className={`${className} inline-flex items-baseline gap-1.5`}>
        <span className={primaryClassName}>{primaryVal}</span>
        <span className={`${secondaryClassName} !inline !mt-0`}>{secondaryVal}</span>
      </span>
    );
  }

  return (
    <span className={`${className} flex flex-col`}>
      <span className={primaryClassName}>{primaryVal}</span>
      <span className={secondaryClassName}>{secondaryVal}</span>
    </span>
  );
}
