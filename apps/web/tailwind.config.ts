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
        // Primary action colour — the button/CTA accent (#97A177 in light,
        // inverted to a light sage in dark). Separate from the `brand` scale
        // because a fill and a text colour need independent tuning; pair it
        // with `text-on-primary`, never with `text-white`, which fails
        // contrast against it.
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover:   'rgb(var(--primary-hover) / <alpha-value>)',
          active:  'rgb(var(--primary-active) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
        // Brand: sage scale mapped to CSS vars (inverts in dark mode)
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
        // Secondary accent — burnt terracotta, used sparingly (e.g. alt tags)
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        // Modal/dialog scrim
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        // Semantic status colors — reusable everywhere, same hues .badge-*/.alert-* use
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        error:   'rgb(var(--error) / <alpha-value>)',
        info:    'rgb(var(--info) / <alpha-value>)',
        // Categorical (non-status) accent — see --violet in globals.css.
        // Single value, so it shadows Tailwind's default violet-50…950 scale;
        // that scale is unused here (admin screens use the purple-* scale).
        violet:  'rgb(var(--violet) / <alpha-value>)',
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
        // Cool neutral-tinted shadows (rgba base 17,24,39) — softer than pure black
        card:       '0 1px 4px 0 rgba(17,24,39,0.06), 0 1px 2px -1px rgba(17,24,39,0.04)',
        'card-hover': '0 12px 40px -8px rgba(17,24,39,0.10)',
        glass:      '0 8px 32px 0 rgba(17,24,39,0.10)',
        'glass-dark': '0 8px 32px 0 rgba(0,0,0,0.50)',
        glow:       '0 0 24px 0 rgba(14,59,71,0.18)',
        'glow-dark':  '0 0 24px 0 rgba(163,222,223,0.10)',
        'inner-sm':  'inset 0 1px 3px 0 rgba(17,24,39,0.08)',
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
        // ── Layered-composition motion (Explore page's Stay Spotlight) ──
        // Entrance pair: a panel/card settling up into place, and cards
        // arriving from the left or right so a stagger reads as a sequence
        // rather than one block fading in.
        'rise-in': {
          '0%':   { opacity: '0', transform: 'translateY(28px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-left': {
          '0%':   { opacity: '0', transform: 'translateX(-32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Continuous ambient drift. Larger amplitude than `float` above,
        // which stays at -5px for small in-place accents.
        'float-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'float-tilt': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%':      { transform: 'translateY(-9px) rotate(1.5deg)' },
        },
        // Stroke-draw for decorative line art. Pairs with a stroke-dasharray
        // of 220 on the path being drawn. Carries opacity as well as the
        // dashoffset so it composes with the same `opacity-0 + animate-*`
        // reveal pattern as the other entrances.
        'draw-in': {
          '0%':   { opacity: '0', strokeDashoffset: '220' },
          '25%':  { opacity: '1' },
          '100%': { opacity: '1', strokeDashoffset: '0' },
        },
        // ── Editorial heading entrance (Explore hero) ──
        // Mask reveal: the line rises from fully below an overflow-hidden
        // clip box, so it reads as being uncovered rather than merely
        // sliding. 120% (not 100%) so the glyphs clear the clip box even
        // after the box is padded out to fit descenders — see ExploreHero.
        'line-reveal': {
          '0%':   { opacity: '0', transform: 'translateY(120%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Supporting copy: same upward direction, no mask, and a longer,
        // gentler curve so it settles after the heading rather than
        // competing with it.
        'soft-rise': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Fade with no movement — for elements that sit alongside a moving
        // line and would otherwise fight it for attention.
        'soft-fade': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Hairline rule drawing outward from its left edge. scaleX (not
        // width) so it stays on the compositor and costs no layout.
        'accent-grow': {
          '0%':   { opacity: '0', transform: 'scaleX(0)' },
          '100%': { opacity: '1', transform: 'scaleX(1)' },
        },
        // Typewriter caret. A soft fade rather than a hard on/off `steps()`
        // blink — at this size a square-wave blink is the single most
        // "gimmicky-terminal" cue there is, and the brief asks for elegant.
        'caret-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        // Ken-Burns drift for a photo inside an overflow-hidden frame. The
        // scale never returns below 1 and the translate stays inside the
        // headroom that scale buys, so no edge of the image can ever pull
        // away from the frame. Symmetric 0%/100% keyframes mean the loop
        // closes on itself — no jump at the seam.
        'slow-pan': {
          '0%, 100%': { transform: 'scale(1.02) translate3d(0, 0, 0)' },
          '50%':      { transform: 'scale(1.05) translate3d(-1.2%, -1%, 0)' },
        },
        // ── Overflow ("More") popover ──
        // Fade + scale + slide + blur in ONE keyframe on purpose. The panel
        // can only carry a single `animation`, and `transform` here would
        // clobber any separate transform utility anyway (the reason its
        // wrapper does the centering — see MoreMenu.tsx), so splitting these
        // across elements would buy nothing but layers.
        'popover-in': {
          '0%':   { opacity: '0', transform: 'translateY(-10px) scale(0.96)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)',        filter: 'blur(0)' },
        },
        // Per-row entrance for the popover's items, offset into a stagger by
        // an inline animation-delay.
        'menu-item-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
        // `both` fill-mode is what lets a stagger work: an element holds its
        // 0% frame (opacity 0) through its animation-delay instead of
        // flashing in first.
        'rise-in':        'rise-in 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left':  'slide-in-left 0.65s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'slide-in-right 0.65s cubic-bezier(0.22,1,0.36,1) both',
        'float-soft':     'float-soft 6s ease-in-out infinite',
        'float-tilt':     'float-tilt 7.5s ease-in-out infinite',
        'draw-in':        'draw-in 1.2s ease-out both',
        // Explore hero entrance. All four carry `both` so each element holds
        // its 0% frame through its animation-delay instead of flashing in
        // first — that fill-mode is what makes the cascade a cascade.
        'line-reveal':    'line-reveal 0.65s cubic-bezier(0.22,1,0.36,1) both',
        'soft-rise':      'soft-rise 0.9s cubic-bezier(0.22,1,0.36,1) both',
        'soft-fade':      'soft-fade 0.7s ease-out both',
        'accent-grow':    'accent-grow 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'caret-blink':    'caret-blink 1.05s ease-in-out infinite',
        // 24s: slow enough that the movement is felt rather than watched.
        'slow-pan':       'slow-pan 24s ease-in-out infinite',
        // easeOutExpo-ish: decelerates hard into place with no overshoot, so
        // the panel settles rather than bounces.
        'popover-in':     'popover-in 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'menu-item-in':   'menu-item-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
        // Reuses the `soft-fade` keyframe at a modal-appropriate speed — the
        // hero's 0.7s version would leave a scrim visibly catching up to the
        // card it sits behind.
        'scrim-in':       'soft-fade 0.18s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
