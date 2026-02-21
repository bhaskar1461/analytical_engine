export const MANDATORY_DISCLAIMERS = [
  'Educational purposes only.',
  'This is not financial advice.',
  'Market risks are involved in all investments.',
  'No guaranteed returns.',
];

export const FORBIDDEN_PHRASES = [
  'you should buy',
  'guaranteed profit',
  'this stock will go up',
  'best stock to buy now',
  'sure shot',
];

export const PROBABILISTIC_PHRASES = [
  'Historically this may indicate',
  'Data suggests',
  'Higher volatility observed',
  'May indicate',
  'Statistically stronger than peers',
];

export const TRUST_BANDS = {
  STRONG: { min: 80, max: 100 },
  WATCH: { min: 60, max: 79 },
  RISKY: { min: 40, max: 59 },
  AVOID: { min: 0, max: 39 },
} as const;

export const MODEL_VERSIONS = {
  TRUST_SCORE: 'trust-v1.0.0',
  QUIZ: 'quiz-v1.0.0',
  PORTFOLIO: 'portfolio-v1.0.0',
  SIP: 'sip-v1.0.0',
  NEWS: 'news-v1.0.0',
  SOCIAL: 'social-v1.0.0',
} as const;

export const INDIA_DEFAULTS = {
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  market: 'NSE',
};
