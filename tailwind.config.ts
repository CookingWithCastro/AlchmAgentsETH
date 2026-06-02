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
      },
      fontFamily: {
        display: 'var(--ff-display)',
        ui: 'var(--ff-ui)',
        sans: 'var(--ff-ui)',
        mono: 'var(--ff-mono)',
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
    },
  },
  plugins: [],
}
export default config
