import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7f4',
          100: '#d9ede6',
          200: '#b3dace',
          300: '#7ec0aa',
          400: '#4da085',
          500: '#2d8268',
          600: '#1e6852',
          700: '#1a5c4a',  // primary
          800: '#154839',
          900: '#0f3329',
        },
        gold: {
          400: '#e8c06a',
          500: '#d4a853',  // accent
          600: '#b8893a',
        },
        surface: '#f7f4ef',
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(26,92,74,0.08)',
        'card-hover': '0 8px 32px 0 rgba(26,92,74,0.16)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
