import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Manrope"', 'sans-serif'],
        text: ['"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Manrope"', 'sans-serif'],
        sans: ['"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Manrope"', 'sans-serif'],
      },
      colors: {
        product: {
          bg: '#F4F6FA',
          card: '#FFFFFF',
          alt: '#EEF2F8',
          border: '#DCE3EE',
          main: '#172033',
          secondary: '#667085',
          muted: '#98A2B3',
          primary: '#4B57D1',
          'primary-dark': '#3946B8',
          'primary-soft': '#E8EBFF',
          success: '#219669',
          'success-soft': '#E7F6EE',
          warning: '#F4A340',
          'warning-soft': '#FFF3E7',
        },
        ink: {
          50: '#F8FAFC',
          100: '#EEF2F7',
          200: '#DDE5F0',
          300: '#BBC7D7',
          400: '#8291A8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#111827',
          950: '#070B13',
        },
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
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 30px rgba(37, 56, 88, 0.06)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 18px 48px rgba(34, 48, 72, 0.07)',
        'card-hover': '0 3px 10px rgba(15, 23, 42, 0.07), 0 24px 58px rgba(34, 48, 72, 0.1)',
        modal: '0 12px 40px rgba(15, 23, 42, 0.14)',
        focus: '0 0 0 4px rgba(82, 104, 224, 0.12)',
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
