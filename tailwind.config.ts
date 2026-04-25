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
          50: '#F5F7FF',
          100: '#EBF0FF',
          200: '#D7E0FF',
          300: '#B7C7FF',
          400: '#8EA6FF',
          500: '#6D86F7',
          600: '#5268E0',
          700: '#4455C4',
          800: '#38469D',
          900: '#2D3877',
          950: '#1E264D',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)',
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 30px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 2px 6px rgba(15, 23, 42, 0.06), 0 16px 36px rgba(15, 23, 42, 0.06)',
        modal: '0 12px 40px rgba(15, 23, 42, 0.14)',
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
