import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          lowest: 'var(--color-surface-lowest)',
          'container-low': 'var(--color-surface-container-low)',
          container: 'var(--color-surface-container)',
          'container-high': 'var(--color-surface-container-high)',
          'container-highest': 'var(--color-surface-container-highest, #E0E0DE)',
        },
        'on-surface': {
          DEFAULT: 'var(--color-on-surface)',
          variant: 'var(--color-on-surface-variant)',
        },
        muted: 'var(--color-muted)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
        },
        'outline-variant': 'var(--color-outline-variant)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        navy: 'var(--color-navy)',
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
