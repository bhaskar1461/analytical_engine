import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#04070e',
          900: '#0b1222',
          800: '#12213b',
        },
        mint: {
          400: '#34d399',
          500: '#10b981',
        },
        flame: {
          400: '#f97316',
          500: '#ea580c',
        },
      },
      boxShadow: {
        glass: '0 10px 30px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
