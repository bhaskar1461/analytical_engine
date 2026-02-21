export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMarketPrice(
  value: number,
  exchange: 'NSE' | 'BSE' | 'NYSE' = 'NSE',
): string {
  if (exchange === 'NYSE') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  return formatInr(value);
}

export function sentimentLabel(score: number): 'Positive' | 'Neutral' | 'Negative' {
  if (score > 0.75) return 'Positive';
  if (score < -0.75) return 'Negative';
  return 'Neutral';
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High confidence';
  if (confidence >= 60) return 'Moderate confidence';
  return 'Low confidence';
}
