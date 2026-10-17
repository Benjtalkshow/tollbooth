/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        '#0B1120',
        surface:   '#111827',
        surface2:  '#1E293B',
        border:    '#334155',
        borderSubtle: '#1F2937',
        fg:        '#F8FAFC',
        muted:     '#94A3B8',
        accent:    '#22C55E',
        accentHover: '#16A34A',
        info:      '#38BDF8',
        warning:   '#F59E0B',
        danger:    '#EF4444',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '8px',
      },
      boxShadow: {
        card: 'none',
        'card-hover': 'none',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}
