// Turns streamed assistant markdown into speakable sentences.

// Strip markdown and things that shouldn't be read aloud
export function toSpeakable(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\|.*\|\s*$/gm, " ") // tables are for the screen
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>~]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\[NAME(?:_\d+)?\]/g, "your client")
    .replace(/\s+/g, " ")
    .trim();
}

// Splits off complete sentences; returns them plus the unfinished remainder
export function takeSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  const re = /[^.!?\n]+[.!?]+(?=\s|$)|[^\n]+\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer))) {
    const s = toSpeakable(m[0]);
    if (s) sentences.push(s);
    last = re.lastIndex;
  }
  return { sentences, rest: buffer.slice(last) };
}
