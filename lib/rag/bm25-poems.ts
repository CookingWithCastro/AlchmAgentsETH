import poemsData from '../data/poems-real.json'

export interface PoemDoc {
  poemId: string
  title: string
  date: string
  chunkIdx: number
  text: string
  tokens: string[]
  tf: Record<string, number>
  len: number
}

const STOP = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'me',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'with',
  'would',
  'you',
  'your',
  'yours',
])

function tokenize(text: string): string[] {
  return (
    String(text)
      .toLowerCase()
      .match(/[a-z']+/g) || []
  ).filter(t => t.length > 1 && !STOP.has(t))
}

function chunkPoem(body: string): string[] {
  const stanzas = body
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean)
  if (stanzas.length === 0) return [body]
  const chunks: string[] = []
  let buf: string[] = []
  let bufLen = 0
  for (const st of stanzas) {
    buf.push(st)
    bufLen += st.length
    if (bufLen >= 220) {
      chunks.push(buf.join('\n\n'))
      buf = []
      bufLen = 0
    }
  }
  if (buf.length) {
    if (chunks.length && bufLen < 100) chunks[chunks.length - 1] += '\n\n' + buf.join('\n\n')
    else chunks.push(buf.join('\n\n'))
  }
  return chunks
}

export function buildPoemIndex() {
  const docs: PoemDoc[] = []
  ;(poemsData as any[]).forEach((p: any) => {
    const chunks = chunkPoem(p.body)
    chunks.forEach((text, i) => {
      const tokens = tokenize(text)
      const tf: Record<string, number> = {}
      tokens.forEach(t => {
        tf[t] = (tf[t] || 0) + 1
      })
      docs.push({
        poemId: p.id,
        title: p.title,
        date: p.date,
        chunkIdx: i,
        text,
        tokens,
        tf,
        len: tokens.length,
      })
    })
  })
  const N = docs.length || 1
  const df: Record<string, number> = {}
  docs.forEach(d => {
    for (const t of Object.keys(d.tf)) df[t] = (df[t] || 0) + 1
  })
  const idf: Record<string, number> = {}
  for (const t of Object.keys(df)) {
    idf[t] = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5))
  }
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / N || 1
  return { docs, idf, avgLen, N }
}

const poemIndex = buildPoemIndex()

export function searchPoemCorpus(query: string, topK = 6) {
  const k1 = 1.5
  const b = 0.75
  const qTokens = tokenize(query)
  if (!qTokens.length) return []
  const qSet = [...new Set(qTokens)]
  const scored = poemIndex.docs.map(d => {
    let score = 0
    for (const t of qSet) {
      const f = d.tf[t]
      if (!f) continue
      const idf = poemIndex.idf[t] || 0
      score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * d.len) / poemIndex.avgLen))
    }
    return { doc: d, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const out = []
  for (const s of scored) {
    if (s.score <= 0) break
    if (seen.has(s.doc.poemId)) continue
    seen.add(s.doc.poemId)
    out.push(s)
    if (out.length >= topK) break
  }
  return out
}
