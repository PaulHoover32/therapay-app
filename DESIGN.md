---
# gstack: design-md-format=spec
name: Therapay
description: After hours. The quiet hour after the last client leaves, with a desk lamp on and the year laid out plainly. Warm moss-ink dark, one lamp-amber accent, a bookish serif over a highly legible sans.
colors:
  background: "#141D1A"
  surface: "#1C2723"
  raised: "#23302B"
  border: "#2C3A35"
  text: "#E7E2D4"
  text-muted: "#9BA69F"
  primary: "#E0A04A"
  on-primary: "#1A1407"
  tide: "#8AB0B9"
  clay: "#D9846C"
  sage: "#93BE9C"
  error: "#E07A6A"
  light-background: "#ECEFEA"
  light-surface: "#F7F8F4"
  light-raised: "#FFFFFF"
  light-border: "#CDD5CF"
  light-text: "#1B2925"
  light-text-muted: "#5E6B65"
  light-primary: "#94590F"
  light-on-primary: "#FFFBF2"
  light-tide: "#3F6F7C"
  light-clay: "#B4553D"
  light-sage: "#3E7A4C"
  light-error: "#B3402F"
typography:
  display:
    fontFamily: Literata
    fontWeight: 500
    fontSize: clamp(2.4rem, 5vw, 3.5rem)
    letterSpacing: -0.015em
    lineHeight: 1.08
  heading:
    fontFamily: Literata
    fontWeight: 500
    fontSize: clamp(1.6rem, 3vw, 2.1rem)
    lineHeight: 1.15
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 1rem
    lineHeight: 1.6
  label:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 0.8125rem
    letterSpacing: 0.01em
  mono:
    fontFamily: Atkinson Hyperlegible Mono
    fontFeature: tnum
rounded:
  sm: 2px
  md: 4px
  lg: 6px
  xl: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 72px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    borderColor: "{colors.border}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  input:
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.xl}"
  link:
    textColor: "{colors.tide}"
---

# Therapay

## Overview

**Creative North Star:** "After hours." It should feel like the hour after the last client leaves: the door is shut, a lamp is on, and the year is laid out quietly. It is calm, warm and print-like (an almanac, not a SaaS dashboard), because the founder's test for every page is: *"It's calm, and it never touches my clients' details."*

**Product context:** Therapay helps independent 1099 therapists (Headway, Alma, Grow, private pay) answer "am I on track this year?" inside Claude and ChatGPT. The website is only the front door. Peers are therapy platforms (soft teal and sage, white, stock clinicians) and small-business finance tools (charts, red/green).

**Mode per surface:**
- Landing, /pricing, /about: **Persuade.** One calm left-aligned column, sections of unequal weight.
- /login, /connect, /account, /oauth/consent: **Operate.** Plain, roomy forms. One card at most per concern, never a card inside a card.
- /guides (planned): **Read.** It should adopt this system: a Literata heading scale and Atkinson body at a 65ch measure.

**Reference sites:** none. Competitive research was declined; the direction comes from design knowledge plus one independent Claude subagent proposal (2026-11-11).

**Key characteristics:**
- Dark moss-ink ground, not black. Linen text, not white.
- One warm accent (lamp amber) and nothing glowing.
- Privacy is shown as an absence ("Therapay has no box for your clients"), not as a badge.
- The demo is a quiet chat answer with one small "year horizon" line, not a dashboard screenshot.
- No photos of people, no illustrations, no emoji.

## Colors

**Strategy:** Restrained. Neutrals carry the page. Amber marks the one thing to do: the primary button, the "connected" state and the actual-income line. Tide blue is for links, focus rings and projections (things that aren't settled yet).

**Light or dark:** Dark is the default (the `dark` class on `<html>`) because the use scene is evening admin, often after a full client day, in a dim office or at home. The light theme ("fog morning", cool grey-green rather than cream) exists in `:root` for completeness and for future use; nothing switches to it yet.

**Status language:** sage means on track or settled. Clay means behind pace: it is gentle on purpose, so bad news arrives softly, and is never alarm red. Tide means not settled yet or projected. Error (`--destructive`) is used only for failures and the irreversible delete. Status is signalled with a tinted background plus a word, never with a colored edge on a card.

**Mapping to shadcn variables (`app/globals.css`):** `background`/`foreground` = ground/text; `card`/`popover` = surface; `secondary`/`muted`/`accent` = raised (hover fills); `primary` = amber; `ring` = tide; `border`/`input` = border; `destructive` = error. Extra tokens: `--tide`, `--clay`, `--sage` (Tailwind `text-tide`, `bg-clay/10`, etc.). Dark surfaces step up in lightness (ground → surface → raised) instead of inverting the light theme.

**Contrast:** text on ground is about 13:1, muted on ground about 7:1, and on-primary on amber about 9:1. The light primary was darkened from #A86A1C to #94590F so white button text clears 4.5:1.

## Typography

- **Display and headings: Literata** (variable, opsz + wght), weight 500, upright, sentence case. It is a serif built for long reading on screens and feels like a book on a therapist's shelf rather than a fashion masthead. Founder picked it over Young Serif by eye on 2026-11-11. Never italic for emphasis.
- **Body and UI: Atkinson Hyperlegible Next.** It was designed by the Braille Institute for legibility, which suits tired evening eyes and reads as careful. Weights 400 / 500 / 700.
- **Figures and code: Atkinson Hyperlegible Mono**, tabular numerals. Use it for dollar amounts, CPT codes and the connector URL (`font-mono tabular-nums`).
- Loading: `next/font/google` in `app/layout.tsx`, exposed as `--font-display`, `--font-sans` and `--font-mono`; `h1`–`h3` get `font-display` from the base layer.
- **Scale:** display 2.4–3.5rem, h2 1.6–2.1rem, h3 1.25rem, body 1rem (marketing lead 1.125rem), label 0.8125rem. Adjacent levels differ by size, not just weight.

## Layout

- Marketing: `max-w-5xl` container, `px-6`. Prose columns stay at `max-w-xl`/`max-w-2xl`. The hero is a two-column grid on `md+` (pitch left, example conversation right, divided by a hairline) and stacks on mobile.
- Section rhythm: `py-20`–`py-24`, separated by a `border-t`, with each section a different shape (two-column privacy block, a plain ordered list, a single price paragraph). There is no repeated card grid.
- Operate pages: one column, `max-w-2xl` (consent and login `max-w-sm`), `space-y-8` between groups.
- Spacing is on a 4px base and roomy: favour more air over more boxes.

## Elevation & Depth

Borders do the work. Surfaces separate by a one-step lightness change plus a 1px `border`. There is no glow and no frosted glass. The sticky nav uses an opaque `bg-background` with a bottom border. The only shadow is the shadcn dialog's own.

## Shapes

`--radius` is 0.375rem, which gives sm 2px, md 4px (buttons, inputs), lg 6px and xl 8px (cards, panels). Badges may stay full-round because they are tiny. Nothing is bubbly.

## Components

- **Buttons:** primary is solid amber with dark text, hover mixes toward text, and focus-visible shows the tide ring. Secondary is `outline`. Tertiary actions are underlined text links. "Delete account" is an outline button in the destructive color, not a solid red block.
- **Inputs:** shadcn `Input`; focus uses the tide ring; errors are a message below in `text-destructive`.
- **Cards:** at most one level. On /account each concern is one card; on /connect the two app instructions sit side by side as two cards and everything else is plain sections.
- **Connection status:** waiting = muted dot plus a calm spinner. Connected = amber-tinted background and an amber dot, like a lamp switching on, with no glow.
- **Year horizon:** an inline SVG (`components/marketing/YearHorizon.tsx`) with an amber actual line, a faint fill, a dotted tide projection, a dotted goal line and a "today" tick. The figures are illustrative and labelled as an example.
- **Empty, loading and error states** use the same voice: one plain sentence and the next step.

## Do's and Don'ts

- Do write like a person explaining something: say what Therapay does with your payouts.
- Do name the outcome on calls to action ("Create your account", "Connect Claude"), not "Get started" or "Learn more".
- Do use the mono face for every dollar figure.
- Do keep amber rare: about one amber element per screen region.
- Don't use photos of clinicians, illustrations, emoji or icon tiles above headings.
- Don't use red or green for money. Behind pace is clay, on track is sage.
- Don't use HIPAA seals or shield icons. Show what isn't collected instead.
- Don't use centered hero stacks, pill chips above headlines, gradient text or radial glows.
- Don't nest cards or put every section in a card.

## Motion

- **Approach:** minimal-functional.
- **Easing:** enter ease-out, exit ease-out, move ease-in-out.
- **Duration:** micro 100ms, short 150–250ms (hover, color), medium 400ms (connection status), long 1.2s (horizon draw).
- **The one authored moment:** the year horizon's actual line draws once on load (`animate-draw`, 1.2s ease-out, 0.3s delay). It is skipped under `prefers-reduced-motion`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-11 | Initial design system "After hours" created | /design-consultation from the product brief (design knowledge, no competitor research), with one independent Claude subagent voice; founder's memorable thing: "It's calm, and it never touches my clients' details." |
| 2026-11-11 | Literata as display over Young Serif | Founder chose it by eye in the HTML preview |
| 2026-11-11 | Privacy shown as absence; chat answer as hero; lamp amber accent | Approved risks: trust you can see, honest to a chat product, distinct from teal/sage peers |
| 2026-11-11 | Atkinson Hyperlegible Mono instead of Recursive casual | Keeps the type to two families |
