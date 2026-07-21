/**
 * VENDORED COPY — do not hand-edit the matching logic independently.
 *
 * This is a byte-for-byte copy of the canonical visibility matcher from
 * geo-platform's src/skills/geo-visibility.ts (extractEvidence +
 * buildBrandPatterns + supporting helpers), taken at
 * VISIBILITY_MATCHER_VERSION = "1.0.0" (geo-platform commit 6e810eb).
 *
 * WHY A COPY, NOT A LIVE IMPORT: Next.js's Turbopack bundler (v16.1.6)
 * refuses to resolve a file: dependency whose symlink target lives outside
 * this project's root — confirmed failing in both `next build` and
 * `next dev` + a live request, after three independent fix attempts
 * (experimental.externalDir, a package.json "default" export condition,
 * a tsconfig.json path alias). See docs/superpowers/plans/
 * 2026-07-21-visibility-matcher-unification.md, "PIVOT" section, in the
 * geo-platform repo, for the full investigation.
 *
 * WHY THIS IS SAFE: brand-prompt-compare is scheduled for full deletion in
 * Phase 6 of that same plan — this duplication has a bounded lifespan. If
 * geo-platform's matcher logic changes before then, this file must be
 * updated to match, or brand-prompt-compare's visibility numbers will
 * silently diverge from geo-platform's — the exact failure mode spec D2/R5
 * exists to prevent. Check this file whenever geo-visibility.ts changes.
 */

/** Bump whenever brand-match logic changes (patterns, stopwords, alias
 * handling, corporate-suffix stripping) — mirrors geo-platform's constant
 * of the same name. */
export const VISIBILITY_MATCHER_VERSION = "1.0.0";

export function extractEvidence(
  text: string,
  brand: string,
  aliases?: string[],
): string[] {
  if (!text || !brand) return [];

  const brandPatterns = buildBrandPatterns(brand, aliases);

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const matches: string[] = [];
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    if (brandPatterns.some((p) => p.test(sentenceLower))) {
      matches.push(sentence);
    }
  }

  return matches;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "in", "on", "at", "to", "by",
  "is", "it", "as", "if", "so", "up", "no", "not", "but", "all", "any",
  "new", "old", "big", "one", "two", "our", "my", "we", "us",
  "first", "best", "top", "next", "last", "great", "good",
  "national", "american", "united", "general", "global", "modern",
  "true", "real", "smart", "prime", "pure", "direct", "open", "safe",
]);

const MIN_FIRST_WORD_LENGTH = 4;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A distinctive acronym is an all-caps token of >= 3 chars (e.g. "CRC", "IBM",
// "QD"). These are specific enough to match alone even though they fall under
// the >= 4 char rule that guards normal mixed-case words. Must contain a letter
// so pure numbers ("500") don't qualify.
const isDistinctiveAcronym = (word: string): boolean =>
  word.length >= 3 && /^[A-Z0-9]+$/.test(word) && /[A-Z]/.test(word);

function buildBrandPatterns(brand: string, aliases?: string[]): RegExp[] {
  const patterns: RegExp[] = [
    new RegExp(`\\b${escapeRegExp(brand)}\\b`, "i"),
  ];
  const seen = new Set<string>([brand.toLowerCase()]);

  const addPattern = (raw: string): void => {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (value.length === 0 || seen.has(key)) return;
    seen.add(key);
    patterns.push(new RegExp(`\\b${escapeRegExp(value)}\\b`, "i"));
  };

  // Explicit, caller-provided short forms are the primary, general fix — any
  // brand can declare the ways an LLM actually names it (e.g. "CRC").
  for (const alias of aliases ?? []) {
    if (typeof alias === "string") addPattern(alias);
  }

  // Also match without common corporate suffixes ("Inc", "LLC", ...) and
  // descriptor words ("Industries", "Technologies", ...) that LLMs routinely
  // drop when naming a brand.
  const stripped = brand
    .replace(
      /\s+(Inc\.?|LLC|Corp\.?|Ltd\.?|Co\.?|Group|Holdings?|International|Industries|Industrial|Industry|Company|Technologies|Systems|Solutions|Labs|Products|Brands)$/i,
      "",
    )
    .trim();
  if (stripped.length > 2) addPattern(stripped);

  // For multi-word brands, also match the first word alone if it's distinctive
  // enough: normal mixed-case words need >= 4 chars, but all-caps acronyms are
  // accepted at >= 3 chars ("CRC"). Stopwords are always rejected.
  const words = brand.split(/\s+/);
  if (words.length >= 2) {
    const firstWord = words[0];
    const distinctive =
      firstWord.length >= MIN_FIRST_WORD_LENGTH || isDistinctiveAcronym(firstWord);
    if (distinctive && !STOPWORDS.has(firstWord.toLowerCase())) {
      addPattern(firstWord);
    }
  }

  return patterns;
}
