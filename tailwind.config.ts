import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', 'sans-serif'],
        sans: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', '"Inter"', 'sans-serif'],
      },
      colors: {
        // Premium monochrome palette
        bg: '#F2F3F4',
        surface: '#FFFFFF',
        'surface-soft': '#F7F8F9',
        ink: '#111418',
        dark: '#171B20',
        'dark-soft': '#20252B',

        // Text
        text: '#111111',
        'text-muted': '#6F747A',
        'text-soft': '#9EA3A8',

        // Borders
        border: 'rgba(0, 0, 0, 0.06)',
        'border-strong': 'rgba(0, 0, 0, 0.10)',

        // Map
        'map-line': '#DDE2E8',
        'map-bg': '#F6F8FA',

        // Accent — warm gold, used sparingly
        accent: {
          DEFAULT: '#F6B84D',
          soft: '#FFF1D2',
          dark: '#D4900A',
        },

        // Status cards
        'card-blue': '#E8EEF5',
        'card-cream': '#FFF0CF',
        'danger-soft': '#F1E7E5',

        // Legacy warm tokens (kept for compatibility)
        warm: {
          base: '#F2F3F4',
          surface: '#FFFFFF',
          muted: '#F7F8F9',
          border: 'rgba(0,0,0,0.06)',
          'border-hover': 'rgba(0,0,0,0.10)',
          main: '#111418',
          secondary: '#6F747A',
          muted2: '#9EA3A8',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#F0FDF4',
          border: '#BBF7D0',
        },
        warning: {
          DEFAULT: '#B45309',
          soft: '#FFFBEB',
          border: '#FDE68A',
        },
        error: {
          DEFAULT: '#B91C1C',
          soft: '#FEF2F2',
          border: '#FECACA',
        },
        info: {
          DEFAULT: '#1D4ED8',
          soft: '#EFF6FF',
          border: '#BFDBFE',
        },
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '18px',
        lg: '24px',
        xl: '32px',
        '2xl': '40px',
        '3xl': '56px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 20, 25, 0.08)',
        card: '0 18px 45px rgba(15, 20, 25, 0.10)',
        floating: '0 30px 90px rgba(15, 20, 25, 0.16)',
        button: '0 12px 28px rgba(0, 0, 0, 0.16)',
        'card-inset': 'inset 0 0 0 1px rgba(0,0,0,0.04)',
        'dark-inset': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      fontSize: {
        'display-hero': ['72px', { lineHeight: '0.92', letterSpacing: '-0.06em', fontWeight: '900' }],
        'display-xl': ['48px', { lineHeight: '1', letterSpacing: '-0.045em', fontWeight: '900' }],
        'display-lg': ['40px', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '900' }],
        'display-md': ['32px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-sm': ['24px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '800' }],
        'body-lg': ['18px', { lineHeight: '1.55', fontWeight: '500' }],
        'body': ['15px', { lineHeight: '1.6', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '700' }],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        luxury: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
