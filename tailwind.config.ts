import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        'border-glow': 'hsl(var(--border-glow))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: '#18181b', // zinc-900 (legacy; existing bg-surface consumers)
        // Elemental palette for the landing showcase (planetary + economy cards)
        'element-fire': '#FB923C',
        'element-water': '#60A5FA',
        'element-earth': '#4ADE80',
        'element-air': '#FACC15',
        'nebula-indigo': '#818CF8',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Elemental brand palette (hex tokens)
        element: {
          fire: 'var(--fire)',
          water: 'var(--water)',
          air: 'var(--air)',
          earth: 'var(--earth)',
        },
        gold: { DEFAULT: 'var(--gold)', hi: 'var(--gold-hi)' },
        cosmicRose: 'var(--rose)',
        cosmicViolet: { DEFAULT: 'var(--violet)', hi: 'var(--violet-hi)' },
        // ESMS coin currency (existing)
        alchemical: {
          spirit: '#a855f7', // purple-500
          essence: '#10b981', // emerald-500
          matter: '#3b82f6', // blue-500
          substance: '#f59e0b', // amber-500
        },
        /* ── Techno-Occult v2 palette (Stitch prototypes) ─────────────────
           Source: design/prototypes/celestial_alchemist/DESIGN.md + the
           inline tailwind config shared by every design/stitch-exports
           code.html. Four names (primary/secondary/background/surface)
           collide with the live shadcn tokens above, so those four are
           exposed as st-* and scripts/convert-stitch.cjs rewrites them
           during conversion. Everything else keeps its prototype name. */
        'st-primary': '#d2bbff',
        'st-secondary': '#ffe083',
        'st-background': '#190d2c',
        'st-surface': '#190d2c',
        'spirit-violet': '#A855F7',
        'monica-constant': '#FFFFFF',
        'resonance-blue': '#3B82F6',
        'obsidian-deep': '#0B0118',
        'surface-dim': '#10131f',
        'surface-bright': '#363946',
        'surface-container': '#1c1f2c',
        'surface-container-low': '#181b27',
        'surface-container-lowest': '#0b0e19',
        'surface-container-high': '#272936',
        'surface-container-highest': '#313442',
        'surface-variant': '#313442',
        'surface-tint': '#d2bbff',
        'on-surface': '#e0e1f3',
        'on-surface-variant': '#d0c5b4',
        'on-background': '#e0e1f3',
        'inverse-surface': '#e0e1f3',
        'inverse-on-surface': '#2d303d',
        'primary-container': '#7c3aed',
        'primary-fixed': '#eaddff',
        'primary-fixed-dim': '#d2bbff',
        'on-primary': '#3f008e',
        'on-primary-container': '#ede0ff',
        'on-primary-fixed': '#25005a',
        'on-primary-fixed-variant': '#5a00c6',
        'inverse-primary': '#732ee4',
        'secondary-container': '#eec200',
        'secondary-fixed': '#ffe083',
        'secondary-fixed-dim': '#eec200',
        'on-secondary': '#3c2f00',
        'on-secondary-container': '#645000',
        'on-secondary-fixed': '#231b00',
        'on-secondary-fixed-variant': '#574500',
        tertiary: '#4edea3',
        'tertiary-container': '#007650',
        'tertiary-fixed': '#6ffbbe',
        'tertiary-fixed-dim': '#4edea3',
        'on-tertiary': '#003824',
        'on-tertiary-container': '#76ffc2',
        'on-tertiary-fixed': '#002113',
        'on-tertiary-fixed-variant': '#005236',
        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',
        outline: '#958da1',
        'outline-variant': '#4a4455',

        // Additional Stitch Occult v2 colors
        'tertiary-fixed-dim-gold': '#fcbb51',
        'inverse-primary-gold': '#765a19',
        'primary-fixed-gold': '#ffdfa0',
        'tertiary-fixed-gold': '#ffddb0',
        'tertiary-container-gold': '#edad44',
        'border-gold': 'rgba(216, 180, 106, 0.18)',
        'panel-glass': 'rgba(18, 20, 31, 0.8)',
        'bright-gold': '#f1dba1',
        'essence-water': '#4aa3d8',
        'spirit-fire': '#e0a23a',
        'substance-air': '#b98cd6',
        'matter-earth': '#5fb37a',
        'primary-gold': '#f6cf83',
        'on-primary-gold': '#402d00',
        'deep-gold': '#9c7e42',
        'primary-container-gold': '#d8b46a',
        'ivory-text': '#e8e3d4',
        'muted-text': '#9aa0b0',
        'on-secondary-fixed-variant-blue': '#004c6d',
        'on-secondary-container-blue': '#f4f9ff',
      },
      spacing: {
        // Techno-Occult v2 layout scale (Stitch prototypes)
        unit: '8px',
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '64px',
        safe: 'env(safe-area-inset-bottom)',
        // Stitch specific spacing
        xxl: '64px',
        xs: '4px',
        xl: '40px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      fontFamily: {
        display: 'var(--ff-display)',
        ui: 'var(--ff-ui)',
        sans: 'var(--ff-ui)',
        mono: 'var(--ff-mono)',
        // Techno-Occult v2 type roles (Stitch prototypes). Families load via
        // next/font in app/layout.tsx (--font-literata / --font-jetbrains-mono).
        'headline-xl': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        'headline-xl-mobile': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        'headline-lg': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        'headline-md': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        'headline-sm': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        'body-lg': ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
        'body-md': ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
        'label-mono': ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
        // Stitch specific fonts
        eyebrow: ['var(--font-manrope)', 'sans-serif'],
        'mono-data': ['var(--font-jetbrains-mono)', 'monospace'],
        'hero-title': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        'mono-label': ['var(--font-jetbrains-mono)', 'monospace'],
        'headline-lg-mobile': ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
      },
      // Canonical shadcn radius mapping (drives Button/Card/Input via --radius).
      // xs/pill are additive (no Tailwind default to override).
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xs: 'var(--r-xs)',
        pill: 'var(--r-pill)',
      },
      // Fluid display sizes — OPT-IN keys (do not override default text-* scale).
      fontSize: {
        'fluid-lg': 'var(--text-lg)',
        'fluid-xl': 'var(--text-xl)',
        'fluid-2xl': 'var(--text-2xl)',
        'fluid-3xl': 'var(--text-3xl)',
        // Techno-Occult v2 type scale (pairs with the font-headline-* families)
        'headline-xl': [
          '48px',
          { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'headline-xl-mobile': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '500' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-mono': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '500' }],
        // Stitch specific sizes
        eyebrow: ['11px', { lineHeight: '1', letterSpacing: '0.12em', fontWeight: '700' }],
        'mono-data': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'hero-title': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'mono-label': ['10px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'headline-lg-mobile': ['28px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      boxShadow: {
        e1: 'var(--e-1)',
        e2: 'var(--e-2)',
        e3: 'var(--e-3)',
        glow: 'var(--e-glow)',
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(to right, #09090b, #18181b)',
        aurora: 'var(--aurora)',
        'aurora-soft': 'var(--aurora-soft)',
        nebula: 'var(--nebula)',
      },
      transitionTimingFunction: {
        smooth: 'var(--ease)',
      },
      // Techno-Occult v2 motion. Keyframes live in app/techno-occult.css —
      // animation entries here only emit the shorthand, so the names resolve
      // against that stylesheet at runtime.
      animation: {
        'pulse-ring': 'pulse-ring 3s infinite',
        'pulse-glow': 'pulse-glow 2s infinite alternate',
        'spin-slow': 'spin-slow 20s linear infinite',
        'spin-slow-reverse': 'spin-reverse-slow 30s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
        'fade-in-down': 'fade-in-down 0.5s ease-out both',
        'float-soft': 'float 6s ease-in-out infinite',
        'float-rune': 'float-rune 3s ease-in infinite',
        ticker: 'ticker 30s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
