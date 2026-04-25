import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Manrope"', 'sans-serif'],
        sans: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Manrope"', 'sans-serif'],
      },
      colors: {
        forest: {
          50: '#F2F7F4',
          100: '#DCEEE3',
          200: '#BADDC8',
          300: '#8DC4A8',
          400: '#5AA880',
          500: '#3A8B62',
          600: '#2A6E4C',
          700: '#1F5239',
          800: '#163B29',
          900: '#0E261A',
          950: '#071410',
        },
      },
      boxShadow: {
        soft: '0 2px 8px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03)',
        card: '0 4px 16px 0 rgba(0,0,0,0.06), 0 1px 4px 0 rgba(0,0,0,0.03)',
        'card-hover': '0 8px 32px 0 rgba(0,0,0,0.09), 0 2px 8px 0 rgba(0,0,0,0.04)',
        modal: '0 24px 64px 0 rgba(0,0,0,0.14), 0 4px 16px 0 rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.55s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
