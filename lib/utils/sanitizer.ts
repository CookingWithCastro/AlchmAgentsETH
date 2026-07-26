/**
 * Security Sanitizer Utility (OWASP LLM05 / ASVS V5 Conformance)
 * Prevents XSS, HTML injection, and malicious tag execution in user inputs and LLM outputs.
 */

// Tags permitted in rendered SVGs for natal charts and horoscopes
const ALLOWED_SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'line',
  'text',
  'tspan',
  'rect',
  'ellipse',
  'polygon',
  'polyline',
  'defs',
  'style',
  'marker',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'use',
  'clipPath',
  'filter',
  'feDropShadow',
  'feGaussianBlur',
])

// Attributes permitted in SVG elements
const ALLOWED_SVG_ATTRS = new Set([
  'id',
  'class',
  'style',
  'width',
  'height',
  'viewBox',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
  'd',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
  'transform',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'dx',
  'dy',
  'gradientUnits',
  'spreadMethod',
  'offset',
  'stop-color',
  'stop-opacity',
  'filter',
  'stdDeviation',
  'dx',
  'dy',
  'flood-color',
  'flood-opacity',
])

/**
 * Sanitizes an SVG string by stripping dangerous tags (<script>, <iframe>, event handlers, javascript: URIs).
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return ''

  // Remove script tags and inline event listeners (onload, onclick, onerror, etc.)
  let cleaned = svgContent
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"])(.*?)\1/gi, '')
    .replace(/\son\w+\s*=\s*([^\s>]+)/gi, '')
    .replace(/href\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, 'href="#"')
    .replace(/xlink:href\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, 'xlink:href="#"')

  return cleaned
}

/**
 * Escapes HTML entities in untrusted text to prevent HTML/XSS injection.
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Sanitizes LLM output text before rendering in markdown or dynamic blocks.
 * Escapes malicious script injections while preserving valid markdown.
 */
export function sanitizeLlmOutput(output: string): string {
  if (!output || typeof output !== 'string') return ''
  // Strip raw executable script blocks or embedded javascript event handlers
  return output
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '[Removed script]')
    .replace(/javascript\s*:/gi, 'no-javascript:')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
}

/**
 * Escapes XML/Markdown prompt delimiter tags in user input to prevent prompt injection breakout (LLM01).
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/<\/?user_message>/gi, '[user_message]')
    .replace(/<\/?reference_material>/gi, '[reference_material]')
    .replace(/<\/?system>/gi, '[system]')
    .replace(/<\/?persona_context>/gi, '[persona_context]')
}
