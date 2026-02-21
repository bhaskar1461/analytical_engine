import { FORBIDDEN_PHRASES, MANDATORY_DISCLAIMERS } from '@anylical/config';

export function mandatoryDisclaimers(): string[] {
  return [...MANDATORY_DISCLAIMERS];
}

export function sanitizeNarrative(text: string): string {
  let next = text;
  for (const phrase of FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    next = next.replace(regex, '[removed-for-compliance]');
  }
  return next;
}

export function trustBand(score: number): 'STRONG' | 'WATCH' | 'RISKY' | 'AVOID' {
  if (score >= 80) return 'STRONG';
  if (score >= 60) return 'WATCH';
  if (score >= 40) return 'RISKY';
  return 'AVOID';
}
