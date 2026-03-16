import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        strategic: '#2563EB',
        operational: '#6B7280',
        defensive: '#DC2626',
        capability: '#059669',
      },
    },
  },
  plugins: [],
} satisfies Config;
