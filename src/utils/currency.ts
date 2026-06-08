export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting currency with code: ${currencyCode}`, error);
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
