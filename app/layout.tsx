import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  Manrope,
  IBM_Plex_Mono,
  Literata,
  JetBrains_Mono,
} from 'next/font/google'
import './globals.css'
import './navigation.css'
import './techno-occult.css'
import { Providers } from './providers'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { RootChrome } from '@/components/RootChrome'

// Alchm Design System type families. Exposed as CSS variables and consumed by
// app/globals.css (--ff-ui / --ff-display / --ff-mono) + tailwind.config.ts.
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
})

// Techno-Occult v2 families (Stitch prototypes): Literata for headlines,
// JetBrains Mono for Sacred-7 stats / labels. Consumed by the
// font-headline-* / font-label-mono utilities in tailwind.config.ts.
const literata = Literata({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-literata',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  ),
  title: 'Planetary Agents - Consciousness Evolution Platform',
  description:
    'Revolutionary consciousness evolution through AI-powered planetary agents and real-time cosmic integration',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${cormorant.variable} ${ibmPlexMono.variable} ${literata.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex flex-col min-h-screen font-sans antialiased">
        {/* Material Symbols Outlined (Techno-Occult v2 iconography). Loaded as
            an explicit link because icon fonts aren't served by next/font and
            a CSS @import would land mid-bundle and be ignored. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <Providers>
          <RootChrome>{children}</RootChrome>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}
