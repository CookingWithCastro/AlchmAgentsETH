// Test setup configuration for vitest
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Next.js `server-only` is a sentinel module that throws on client import.
// In vitest (jsdom) it always trips, so replace with a no-op. Any code path
// reaching this still runs in tests — it just no longer asserts server-context.
vi.mock('server-only', () => ({}))

// Mock next-auth and next-auth/next to prevent getServerSession request scope failures
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(async () => null),
}))
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => null),
}))

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    reload: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  // Real impl rethrows only Next.js-internal control-flow errors (redirect,
  // notFound); those never occur under vitest, so a no-op is faithful here.
  unstable_rethrow: () => {},
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock Next.js dynamic imports
vi.mock('next/dynamic', () => {
  return {
    default: (fn: () => Promise<any>) => {
      const Component = (props: any) => {
        const [LoadedComponent, setLoadedComponent] = React.useState(null)
        React.useEffect(() => {
          fn().then(mod => setLoadedComponent(() => mod.default || mod))
        }, [])
        return LoadedComponent ? React.createElement(LoadedComponent, props) : null
      }
      return Component
    },
  }
})

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

// Mock global fetch for API testing
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock performance API for benchmarking tests
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
})

// Mock ResizeObserver for D3 visualizations
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock HTMLElement methods for D3 SVG manipulation
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
  })),
})

// Mock SVG methods for D3 testing
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  value: vi.fn(() => ({
    x: 0,
    y: 0,
    width: 100,
    height: 20,
  })),
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id))

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})
