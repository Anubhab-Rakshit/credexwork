## Day 1 — 2026-05-07
**Hours worked:** 2
**What I did:** Project initialization and architecture design. Set up the Next.js environment, defined the TypeScript schemas for the audit data, and researched pricing models for the top 15 AI tools.
**What I learned:** The complexity of AI pricing (seats vs. usage vs. platform fees) requires a more robust data structure than a simple flat file.
**Blockers / what I'm stuck on:** Deciding whether to use a database for pricing or a static TypeScript library. Decided on static for speed and auditability.
**Plan for tomorrow:** Build the core logic of the Audit Engine.

## Day 2 — 2026-05-08
**Hours worked:** 3
**What I did:** Built the "Audit Engine" (the logic in `src/lib/auditEngine.ts`). Implemented over 20 deterministic rules for tool consolidation, plan downgrades, and Credex credit optimizations.
**What I learned:** Managing "overlapping" tools (like Cursor vs Copilot) is the hardest part of the logic—you can't just look at one tool in a vacuum.
**Blockers / what I'm stuck on:** Handling "Custom/Enterprise" plans that don't have a public price per seat.
**Plan for tomorrow:** Start the frontend and the multi-step audit form.

## Day 3 — 2026-05-09
**Hours worked:** 2
**What I did:** Frontend development. Built the premium, minimalist UI using Tailwind CSS. Implemented the multi-step audit form and the results dashboard with glassmorphism effects and smooth transitions.
**What I learned:** Using Framer Motion for simple entry animations significantly elevates the "premium" feel of a finance tool.
**Blockers / what I'm stuck on:** Complex state management for a dynamic list of tools where each tool has different plan options.
**Plan for tomorrow:** Integrate AI for summaries and set up lead capture.

## Day 4 — 2026-05-10
**Hours worked:** 3
**What I did:** Logs, Prompts, and AI Integration. Wrote the system prompts for the Anthropic API to generate human-readable audit summaries. Set up the Resend integration to email leads to the Credex team.
**What I learned:** Prompt engineering for finance requires very strict constraints to prevent the AI from making up savings numbers that don't match the engine's output.
**Blockers / what I'm stuck on:** Rate limiting on the Anthropic API for long audit reports.
**Plan for tomorrow:** Focus on semester exams (no work).

## Day 5 — 2026-05-11
**Hours worked:** 0
**What I did:** Took a day off to focus on Semester Exams.
**What I learned:** -
**Blockers / what I'm stuck on:** -
**Plan for tomorrow:** Focus on semester exams (no work).

## Day 6 — 2026-05-12
**Hours worked:** 0
**What I did:** Took a day off to focus on Semester Exams.
**What I learned:** -
**Blockers / what I'm stuck on:** -
**Plan for tomorrow:** Final polish, deployment, and submission documentation.

## Day 7 — 2026-05-13
**Hours worked:** 4
**What I did:** Final answers and deployment. Refined the "Custom Pricing" bug fix, updated all documentation (README, REFLECTION, DEVLOG), and deployed the application to Vercel. 
**What I learned:** Finalizing documentation often reveals edge cases you missed during coding; it's a critical second layer of testing.
**Blockers / what I'm stuck on:** Ensuring the OpenGraph images for shared audit results were rendering correctly.
**Plan for tomorrow:** Submission complete.
