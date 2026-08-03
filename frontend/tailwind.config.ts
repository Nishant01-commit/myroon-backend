import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // mechanism in place; components aren't fully dark-themed yet — see frontend/README.md
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'royal-blue': {
          DEFAULT: 'rgb(var(--color-royal-blue) / <alpha-value>)',
          deep: 'rgb(var(--color-royal-blue-deep) / <alpha-value>)',
        },
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
        'soft-gray': 'rgb(var(--color-soft-gray) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-work-sans)', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -12px rgb(30 58 138 / 0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
