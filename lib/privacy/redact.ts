// Pure redaction helpers shared by the browser worker and tests.

export interface NerToken {
  entity: string; // e.g. "B-PER", "I-PER", "O"
  score: number;
  index: number;
  word: string; // wordpiece; continuation pieces start with "##"
}

// Merge consecutive PER tokens into full names: ["Ja", "##ne", "Doe"] → ["Jane Doe"]
export function extractNames(tokens: NerToken[], minScore: number): string[] {
  const names: string[] = [];
  let current: string | null = null;
  let lastIndex = -2;

  for (const t of tokens) {
    const isPer = t.entity.endsWith("PER") && t.score >= minScore;
    const contiguous = t.index === lastIndex + 1;
    if (current !== null && contiguous && t.word.startsWith("##")) {
      // A word's label comes from its first piece: "Do" (PER) + "##e" (O) is still "Doe"
      current += t.word.slice(2);
    } else if (isPer && current !== null && contiguous && t.entity.startsWith("I-")) {
      current += t.word.startsWith("##") ? t.word.slice(2) : ` ${t.word}`;
    } else {
      if (current) names.push(current);
      current = isPer && !t.word.startsWith("##") ? t.word : null;
    }
    lastIndex = t.index;
  }
  if (current) names.push(current);
  return [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 1))];
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface RedactionResult {
  text: string;
  count: number;
}

// Replace each name (and each word of a multi-word name, so "Jane" alone is also caught) with [NAME], [NAME_2], …
// Allowlist entries match whole (e.g. the therapist's own full name), so a client who shares
// only a first name with the therapist is still redacted. Over-redacting is the safe failure.
export function applyRedaction(text: string, names: string[], allow: string[]): RedactionResult {
  const allowed = new Set(allow.map((a) => a.toLowerCase()));
  const placeholders = new Map<string, string>();
  const placeholderFor = (key: string) => {
    if (!placeholders.has(key)) placeholders.set(key, placeholders.size === 0 ? "[NAME]" : `[NAME_${placeholders.size + 1}]`);
    return placeholders.get(key)!;
  };

  // Longest first so "Jane Doe" is replaced before "Jane"
  const targets = names.filter((n) => !allowed.has(n.toLowerCase())).sort((a, b) => b.length - a.length);

  let out = text;
  for (const name of targets) {
    const key = name.toLowerCase();
    // \\w* completes a name whose last word-piece the model dropped ("Jane Do" → "Jane Doe")
    const full = new RegExp(`(?<!\\[)\\b${escapeRegExp(name)}\\w*`, "gi");
    if (full.test(out)) out = out.replace(full, placeholderFor(key));
    for (const part of name.split(/\s+/)) {
      if (part === name || part.length < 3 || allowed.has(part.toLowerCase())) continue;
      // Case-sensitive so a surname like "Will" doesn't swallow the verb "will"
      const word = new RegExp(`(?<!\\[)\\b${escapeRegExp(part)}\\w*`, "g");
      if (word.test(out)) out = out.replace(word, placeholderFor(key));
    }
  }
  return { text: out, count: placeholders.size };
}

export function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z']*)/g, (_, a: string, b: string) => a.toUpperCase() + b);
}

// Names found only after title-casing must be confident, whole words in the original text
// (not fragments like "Aet" from "aetna"), and not everyday words that double as names
export function filterLowercaseNames(
  names: string[],
  tokens: NerToken[],
  originalText: string,
  minScore: number,
  stopwords: readonly string[]
): string[] {
  const stop = new Set(stopwords);
  const confident = tokens
    .filter((t) => t.entity.endsWith("PER") && t.score >= minScore && !t.word.startsWith("##"))
    .map((t) => t.word.toLowerCase());
  return names.filter(
    (n) =>
      n.length >= 3 &&
      new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(originalText) &&
      n.split(/\s+/).every((part) => !stop.has(part.toLowerCase()) && confident.some((c) => part.toLowerCase().startsWith(c)))
  );
}
