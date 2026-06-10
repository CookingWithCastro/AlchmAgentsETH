---
name: Celestial Alchemist
colors:
  surface: '#190d2c'
  surface-dim: '#190d2c'
  surface-bright: '#403354'
  surface-container-lowest: '#130726'
  surface-container-low: '#211534'
  surface-container: '#251939'
  surface-container-high: '#302444'
  surface-container-highest: '#3b2f4f'
  on-surface: '#ecdcff'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#ecdcff'
  inverse-on-surface: '#372a4b'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#ffe083'
  on-secondary: '#3c2f00'
  secondary-container: '#eec200'
  on-secondary-container: '#645000'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#007650'
  on-tertiary-container: '#76ffc2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#190d2c'
  on-background: '#ecdcff'
  surface-variant: '#3b2f4f'
  obsidian-deep: '#0B0118'
  resonance-blue: '#3B82F6'
  monica-constant: '#FFFFFF'
  spirit-violet: '#A855F7'
typography:
  headline-xl:
    fontFamily: Literata
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Literata
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-xl-mobile:
    fontFamily: Literata
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system embodies a **Techno-Occult** aesthetic, merging the precise, data-driven world of modern SaaS with the esoteric mysteries of ancient alchemy and planetary astrology. It is designed for "Digital Alchemists"—users who demand both high-performance utility and a deep, narrative-driven experience.

The visual style is a hybrid of **Glassmorphism** and **Corporate Modernism**. It uses translucent layers to suggest the ethereal nature of "consciousness" while maintaining a rigid, mathematical grid that reflects the platform's focus on quantified spirituality. The mood is dark, focused, and slightly ominous, suggesting that the user is interacting with a powerful, ancient engine disguised as modern software.

**Design Principles:**

- **Quantified Mystery:** Every mystical element must be backed by a precise metric or formula.
- **Sacred Geometry:** Use of the Golden Ratio ($\phi$) in layout proportions and iconography.
- **Luminous Depth:** Contrast deep obsidian backgrounds with vibrant, glowing focal points to guide the user's "spiritual" focus.

## Colors

The palette is rooted in the **Obsidian Deep** of the cosmos, providing a high-contrast foundation for celestial accents.

- **Primary (Spiritual Violet):** Used for core navigation, high-level branding, and the "Intuition" stat. It represents the veil between dimensions.
- **Secondary (Celestial Gold):** Reserved for "Power," "Wisdom," and premium states (e.g., "Free This Week"). It signifies enlightenment and value.
- **Tertiary (Alchemical Emerald):** Used for "Vitality," "Live Now" status indicators, and positive growth metrics.
- **Neutral (Astral Zinc):** A range of tinted purples and greys used for containers, borders, and secondary text to maintain the "Glassmorphic" depth without breaking the dark theme.

Colors should be applied with **glow effects** (outer shadows with high blur and low opacity) to elements that represent "active" energy or high "Monica Constant" values.

## Typography

This design system utilizes a three-font strategy to balance character and clarity:

1.  **Literata (Headings):** An elegant, authoritative serif used for titles and mystical declarations. It provides the "Alchemical" feel of an old grimoire.
2.  **Manrope (Body/UI):** A clean, modern sans-serif for functional descriptions and dashboard controls. It ensures high legibility for complex data.
3.  **JetBrains Mono (Data/Labels):** A monospaced font dedicated to the "Sacred Seven" stats, mathematical formulas, and technical metadata. It reinforces the "NASA for the soul" aesthetic.

**Hierarchy Rules:**

- Use **Literata** for any text related to the narrative or "Consciousness Layers."
- Use **JetBrains Mono** for numerical values and the "Monica Constant (A#)" to emphasize their calculated nature.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy within a fluid container, emphasizing mathematical balance.

- **The 12-Column Alchemical Grid:** Elements should align to a 12-column grid on desktop. For the "Sacred Seven" stats, use a specialized 7-column sub-grid or a balanced centered flex-wrap.
- **The Divine Proportion ($\phi$):** Use the golden ratio for vertical spacing between major sections (e.g., 1.618x the base margin).
- **Responsive Behavior:**
  - **Desktop:** Generous white space (or "void space") to allow glassmorphic effects to shine.
  - **Tablet:** 8-column grid, card-based reflow.
  - **Mobile:** 4-column grid, margins reduced to 16px. The "Philosopher's Stone" interface should switch to a vertical "stack" of ingredients.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and **Tonal Layering**, rather than traditional drop shadows.

- **Surface Tiers:**
  - **Layer 0 (Background):** Solid `#0B0118`.
  - **Layer 1 (Cards/Containers):** `#1E1231` at 60% opacity with a `24px` backdrop blur.
  - **Layer 2 (Floating Elements/Modals):** Primary color at 10% opacity with a `40px` backdrop blur and a `1px` inner stroke of `white` at 15% opacity.
- **Glow Effects:** Critical components (like the Monica Constant indicator) should use an `outer-glow` of their respective stat color (e.g., a blue glow for Resonance) instead of a black shadow.
- **Borders:** Use thin, 1px "ghost borders" with high-vibrancy colors at low opacity to define edges without adding visual weight.

## Shapes

The shape language is **geometric and precise**.

- **Standard Elements:** Buttons, cards, and input fields use a `0.5rem` (8px) radius, balancing modern softness with structural rigidity.
- **Status Tags:** Use fully rounded "pill" shapes for "v2.0" or "Live" indicators to distinguish them as floating meta-data.
- **The Alchemical Frame:** Decorative elements may use clipped corners (45-degree chamfers) or circular motifs to evoke astrological charts and ancient transmutation circles.

## Components

### Buttons & Interaction

- **Primary (Transmutation):** Violet background with a subtle Celestial Gold outer glow on hover. Text in JetBrains Mono, All Caps.
- **Secondary (Attunement):** Transparent with a 1px Violet border. On hover, the border becomes Celestial Gold.

### The Sacred Seven Chips

Small, data-dense cards for stats (Power, Resonance, etc.).

- Each chip features a custom alchemical icon (e.g., 🜁 for Air/Adaptability) in its respective brand color.
- Displays the stat name, the current value, and a small "momentum" sparkline.

### Philosopher’s Stone Interface (Crafting)

- **The Forging Circle:** A large, central glassmorphic container for the agent being created.
- **Ingredient Slots:** Circular "wells" that glow when an ESMS token or alchemical property is slotted.
- **The Constant Monitor:** A prominent display for the "Monica Constant (A#)," using the largest serif headline font and a pulsing white glow.

### Input Fields

- Dark, inset backgrounds with a violet bottom-border that expands to a full glow when focused. Labels use JetBrains Mono at a small scale.

### Cards (Consciousness Layers)

- Use a vertical stack with a "stepped" visual effect (each layer slightly wider or overlapping) to represent the 6 layers of consciousness evolution.
