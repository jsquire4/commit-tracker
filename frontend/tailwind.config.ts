import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
          lowest: 'rgb(var(--color-surface-lowest-rgb) / <alpha-value>)',
          'container-low': 'rgb(var(--color-surface-container-low-rgb) / <alpha-value>)',
          container: 'rgb(var(--color-surface-container-rgb) / <alpha-value>)',
          'container-high': 'rgb(var(--color-surface-container-high-rgb) / <alpha-value>)',
          'container-highest': 'rgb(var(--color-surface-container-highest-rgb, 224 224 222) / <alpha-value>)',
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--color-on-surface-rgb) / <alpha-value>)',
          variant: 'rgb(var(--color-on-surface-variant-rgb) / <alpha-value>)',
        },
        muted: 'rgb(var(--color-muted-rgb) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-accent-dark-rgb) / <alpha-value>)',
        },
        'outline-variant': 'rgb(var(--color-outline-variant-rgb) / <alpha-value>)',
        error: 'rgb(var(--color-error-rgb) / <alpha-value>)',
        warning: 'rgb(var(--color-warning-rgb) / <alpha-value>)',
        navy: 'rgb(var(--color-navy-rgb) / <alpha-value>)',
        // CHESS category colors
        strategic: '#2563EB',
        operational: '#6B7280',
        defensive: '#DC2626',
        capability: '#059669',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '4px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        pill: '9999px',
      },
      boxShadow: {
        whisper: '0 12px 32px -4px rgba(45, 52, 50, 0.06)',
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.15', fontWeight: '400' }],
        headline: ['1.5rem', { lineHeight: '1.35', fontWeight: '400' }],
        title: ['1rem', { lineHeight: '1.5', fontWeight: '500' }],
        body: ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        label: ['0.75rem', { lineHeight: '1.5', fontWeight: '500' }],
        small: ['0.6875rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
      animation: {
        'fade-up': 'fadeUp 300ms var(--ease-entrance, cubic-bezier(0.16, 1, 0.3, 1)) both',
        'fade-in': 'fadeIn 200ms var(--ease-standard, cubic-bezier(0.25, 0.1, 0.25, 1)) both',
        shimmer: 'shimmer 1.5s infinite linear',
        'count-up': 'countUp 400ms var(--ease-standard, cubic-bezier(0.25, 0.1, 0.25, 1)) both',
        'slide-in-right': 'slideInRight 300ms var(--ease-entrance, cubic-bezier(0.16, 1, 0.3, 1)) both',
        'slide-out-right': 'slideOutRight 200ms var(--ease-exit, cubic-bezier(0.4, 0, 1, 1)) both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
