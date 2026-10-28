// Regression check for on-device name redaction. Downloads the NER model (~100 MB) on first run.
// Run: npm run check:redaction
import { pipeline } from "@huggingface/transformers";
import { extractNames, applyRedaction, filterLowercaseNames, titleCase, type NerToken } from "../lib/privacy/redact";
import { PRIVACY_CONFIG, US_STATES } from "../lib/privacy/config";

const allow = [...PRIVACY_CONFIG.alwaysAllow, ...US_STATES, "Sarah Chen", "Aetna", "BlueCross BlueShield", "Self-Pay", "Optum EAP"];
const cases = [
  "I saw Jane Doe today for a 90837, Aetna paid $120",
  "log a session for Michael at 3pm, self pay $150",
  "How am I doing this year?",
  "My client Priya Patel and her husband Raj came in for couples",
  "Headway and Alma both paid late this month",
  "Hi, I'm Sarah Chen, set up my profile",
  "log a session for jennifer, blue cross, $95",
  "Can you compare Aetna vs BlueCross BlueShield for Q1?",
  "saw mike and sarah johnson today",
  "log a session today for $120 with aetna",
  "my bill from cigna was wrong in virginia",
  "set up my profile, i'm an lmft in california",
  "Will I hit my goal if I work in May?",
  "I'm Sarah, and my client Sarah Miller cancelled",
  "Mr. Will Thompson said he will pay next week",
  "I saw Jane Doe and mike today, both Aetna. How many sessions did I log in March?",
  "Christopher Nguyen-Baptiste rescheduled again",
];

const EXPECTED: Record<string, string> = {
  "I saw Jane Doe today for a 90837, Aetna paid $120": "I saw [NAME] today for a 90837, Aetna paid $120",
  "log a session for jennifer, blue cross, $95": "log a session for [NAME], blue cross, $95",
  "Headway and Alma both paid late this month": "Headway and Alma both paid late this month",
  "Mr. Will Thompson said he will pay next week": "Mr. [NAME] said he will pay next week",
  "log a session today for $120 with aetna": "log a session today for $120 with aetna"
};
let failures = 0;

const ner = await pipeline("token-classification", PRIVACY_CONFIG.nerModel, { dtype: PRIVACY_CONFIG.nerDtype });
for (const text of cases) {
  const tokens = (await ner(text)) as unknown as NerToken[];
  const names = extractNames(tokens, PRIVACY_CONFIG.minScore);
  if (text !== titleCase(text)) {
    const tc = (await ner(titleCase(text))) as unknown as NerToken[];
    const known = names.map((n) => n.toLowerCase());
    names.push(...filterLowercaseNames(extractNames(tc, PRIVACY_CONFIG.lowercaseMinScore), tc, text, PRIVACY_CONFIG.lowercaseMinScore, PRIVACY_CONFIG.lowercaseStopwords).filter((n) => !known.some((k) => k.includes(n.toLowerCase()))));
  }
  const r = applyRedaction(text, names, allow);
  const want = EXPECTED[text];
  const ok = want === undefined || want === r.text;
  if (!ok) failures++;
  console.log(`${ok ? (r.count ? "✂" : "·") : "✗"} ${r.text}${ok ? "" : `   (expected: ${want})`}`);
}
if (failures) {
  console.error(`\n${failures} redaction check(s) failed`);
  process.exit(1);
}
