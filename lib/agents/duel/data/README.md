# Agent Scrabble League — Curated Word Codex

`scrabble-codex.txt` (human-readable) and the generated `scrabble-codex.data.ts`
(the runtime module) hold the lean, common-word dictionary the league plays from.
Every word is **both** a common English word **and** a legal Scrabble word,
restricted to **2–7 letters** (a 7-tile rack, no board to extend onto).

This mirrors Pentacles' design intent (`server/src/words.rs`): "the embedded
wordlist.txt is a curated common-word Codex so the module stays lean and the duel
works offline."

## Why a `.ts` module instead of an `fs` read

The codex is embedded as a module so it bundles cleanly in any Next.js runtime
(server, serverless, edge) with **no `outputFileTracingIncludes` config** and no
risk of a missing asset at runtime. `wordlist-loader.ts` builds the `Set` lazily
on first use; tests inject a small wordset via `__setWordlistForTests`.

## Provenance

- **Common words:** `google-10000-english-usa-no-swears` — the 10k most frequent
  English words (first20hours/google-10000-english, public domain).
- **Validity:** the **ENABLE** word list (~172k legal Scrabble words; the same list
  scrabblebot ships at `spacetimedb/wordlist.txt`).
- **Codex = (common ∩ ENABLE)**, length 2–7, `A–Z` only, uppercased, sorted, deduped.
- Result: **5,055 words** (86×2-letter, balanced 3–7).

## Regenerate

```sh
COMMON=google-10000-english-usa-no-swears.txt   # ~10k common words
ENABLE=path/to/ENABLE/wordlist.txt              # ~172k legal words

tr 'a-z' 'A-Z' < "$COMMON" | grep -E '^[A-Z]{2,7}$' | sort -u > /tmp/common.txt
grep -E '^[A-Z]{2,7}$' "$ENABLE"                 | sort -u > /tmp/enable.txt
comm -12 /tmp/common.txt /tmp/enable.txt > scrabble-codex.txt

# Regenerate the runtime module from the txt:
{ printf '%s\n' \
    '// AUTO-GENERATED — do not edit by hand. See ./README.md for provenance + regeneration.' \
    '// Curated common-word Codex: google-10000-english (USA, no-swears) ∩ ENABLE, length 2-7, uppercase.' \
    '// Embedded as a module (not an fs read) so it bundles cleanly in any Next.js runtime.' \
    '/* eslint-disable */' \
    'export const SCRABBLE_CODEX_RAW = `'
  cat scrabble-codex.txt
  printf '`\n'
} > scrabble-codex.data.ts
```

To switch to the full 172k ENABLE list instead, drop a length-2–7 ENABLE subset in
as `scrabble-codex.txt` and regenerate — the loader and every consumer are agnostic
to the list's size.
