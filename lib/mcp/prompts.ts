import type { McpServer } from "@modelcontextprotocol/server";

// Guided workflows. In Claude these appear as shortcuts the user can pick; each one tells the
// model which Therapay tools to use, in what order, and what never to ask for. ChatGPT may not
// surface prompts, so the server instructions and tool descriptions must work on their own too.

const NEVER =
  "Never ask for or record session dates, client names, initials or any client detail. Therapay only stores payouts, " +
  "rates per payer and CPT code, and monthly counts.";

const PROMPTS: { name: string; title: string; description: string; text: string }[] = [
  {
    name: "set-up-therapay",
    title: "Set up Therapay",
    description: "Profile, rate card and payout history, then a first check-in",
    text:
      "Help me set up Therapay, one step at a time:\n" +
      "1. Use setup_profile for my name, license, states and typical session length (ask what's missing).\n" +
      "2. Ask what each payer pays me per session and for which CPT codes, including the platform if sessions go through one " +
      "(Grow Therapy, Headway, Alma…). Save it with set_rate_card.\n" +
      "3. Ask me for my payout history going back to January of last year: a Stripe Express payout export, a platform statement " +
      "or a bank statement. Explain which is best for me and why. Import it with import_payouts (dry run first, then confirm).\n" +
      "4. Run check_in and tell me how I'm tracking, then offer to set a goal with set_goal.\n" +
      NEVER,
  },
  {
    name: "monthly-check-in",
    title: "Monthly check-in",
    description: "Last month's counts, new payouts, then where you stand",
    text:
      "Let's do my monthly check-in:\n" +
      "1. Ask how many sessions I completed last month per payer and CPT code, plus no-shows and late cancels. Save with log_month.\n" +
      "2. Ask for any payouts since my last import and add them with import_payouts (dry run first; already-imported payouts are skipped).\n" +
      "3. Run check_in and summarize: am I on track, what's still arriving, and the one lever that would help most.\n" +
      NEVER,
  },
  {
    name: "am-i-on-track",
    title: "Am I on track?",
    description: "Where this year stands against last year and your goal",
    text:
      "Am I on track this year? Run check_in and explain it in plain language: my year to date vs the same months last year, " +
      "my projected year-end vs my goal, what's still arriving, and what would close any gap. If check_in's data notes suggest " +
      "importing last year's payouts, setting a goal or adding my rate card, offer to do that.\n" +
      NEVER,
  },
];

export function registerPrompts(server: McpServer) {
  for (const p of PROMPTS) {
    server.registerPrompt(p.name, { title: p.title, description: p.description }, () => ({
      messages: [{ role: "user", content: { type: "text", text: p.text } }],
    }));
  }
}
