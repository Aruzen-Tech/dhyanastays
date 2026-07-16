import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand: deep evergreen mapped to CSS vars (softens to sage in dark mode)
        brand: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        // Page surface background
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // Luxury accent — antique gold (brightens in dark mode)
        gold: 'rgb(var(--gold) / <alpha-value>)',
        // Semantic whites/grays — auto-invert in dark mode
        white: 'rgb(var(--white) / <alpha-value>)',
        gray: {
          50:  'rgb(var(--gray-50)  / <alpha-value>)',
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
        },
        // Fixed pure values (never invert — used for status colors, etc.)
        pure: {
          white: '#ffffff',
          black: '#000000',
        },
        muted: 'rgb(var(--gray-500) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl:  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        // Warm forest-tinted shadows (rgba base 21,32,25) — softer than pure black
        card:       '0 1px 4px 0 rgba(21,32,25,0.06), 0 1px 2px -1px rgba(21,32,25,0.04)',
        'card-hover': '0 12px 40px -8px rgba(21,32,25,0.14)',
        glass:      '0 8px 32px 0 rgba(21,32,25,0.10)',
        'glass-dark': '0 8px 32px 0 rgba(0,0,0,0.50)',
        glow:       '0 0 24px 0 rgba(34,77,56,0.18)',
        'glow-dark':  '0 0 24px 0 rgba(220,233,224,0.10)',
        'inner-sm':  'inset 0 1px 3px 0 rgba(21,32,25,0.08)',
      },
      backgroundImage: {
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'shimmer-dark': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-5px)' },
        },
        'theme-toggle': {
          '0%':   { transform: 'rotate(0deg)   scale(1)' },
          '40%':  { transform: 'rotate(180deg) scale(0.75)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(0.95)', opacity: '0.6' },
          '100%': { transform: 'scale(1.4)',  opacity: '0' },
        },
        'border-spin': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'fade-in':     'fade-in 0.3s ease-out both',
        'slide-up':    'slide-up 0.4s ease-out both',
        'slide-down':  'slide-down 0.25s ease-out both',
        'scale-in':    'scale-in 0.2s ease-out both',
        'shimmer':     'shimmer 2s linear infinite',
        'float':       'float 4s ease-in-out infinite',
        'theme-toggle':'theme-toggle 0.5s ease-in-out',
        'pulse-ring':  'pulse-ring 1.2s ease-out infinite',
        'border-spin': 'border-spin 3s ease infinite',
        'spin-slow':   'spin 4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
