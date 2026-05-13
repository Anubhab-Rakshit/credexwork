# Reflection

## 1. The hardest bug you hit this week, and how you debugged it
The most significant technical challenge I encountered was a subtle logical failure within the core `auditEngine.ts` concerning "Custom" or "Enterprise" pricing tiers. The engine was designed to compare user-entered spend against a deterministic database of published retail rates. However, for many enterprise plans, the `pricePerSeat` is set to `null` because vendors require a quote. 

**Hypothesis & Testing:**
Initially, when a user entered a high monthly spend for an enterprise plan, the engine would return "Already Optimal" because the `expectedSpend` calculation defaulted to `0`. My first hypothesis was a simple data type mismatch between the form input (string) and the engine logic (number). However, after adding extensive logging to the `auditSingleTool` function, I realized the issue was more architectural: the engine lacked a "non-comparable" state for custom plans.

**Resolution:**
I debugged this by writing a specific unit test in `src/__tests__/auditEngine.test.ts` that passed a mock Enterprise plan with a $5,000 monthly spend. I observed that the engine failed to flag this as a potential overage. To fix it, I implemented a specific check: if a plan is "Custom," the engine now skips the retail price comparison and instead triggers a "Manual Audit" recommendation or a "Credex Credit" optimization rule, ensuring users don't get a false sense of security just because a public price isn't available.

## 2. A decision you reversed mid-week, and what made you reverse it
Mid-week, I made a pivot regarding the fundamental architecture of the recommendation engine. Originally, I had built a prototype where the entire audit was "vibe-coded" by an LLM—the user's tool list was sent to Claude, and it would return a JSON block of recommendations. 

**The Reversal:**
I reversed this decision after three consecutive test runs where the LLM hallucinated pricing data (e.g., suggesting a $15/seat rate for a tool that actually costs $25/seat). For a product that targets CFOs and Finance teams, even a 5% error in a calculation destroys the entire product's credibility. 

**Result:**
I spent an entire day refactoring the engine into a deterministic, rule-based TypeScript system. I kept the AI only for the "Narrative Summary" at the end—turning the hard numbers into a readable story—but the math itself is now 100% hardcoded and auditable. This move from "AI-First" to "AI-Augmented Logic" was critical for the tool's defense-ability.

## 3. What you would build in week 2 if you had it
If I had a second week, I would focus on "Benchmarking Intelligence" and "The Board-Ready Artifact."

**Benchmark Intelligence:**
I would expand the `calculateBenchmark` function to ingest a larger dataset of anonymized SaaS spend. Right now, it uses static percentiles ($25/55/120). In Week 2, I'd build a backend service that compares your spend against companies of similar headcount and industry, allowing us to say, "You are in the 90th percentile of AI spend for a 20-person Fintech startup."

**PDF Export:**
Currently, the results live on a URL. To make this a true lead-gen tool for Credex, it needs a "Download PDF" button. This PDF would be formatted as a professional audit report that a CTO could literally slide across a table to a CEO to justify a budget change. This turns a "cool web tool" into an "essential business utility."

## 4. How you used AI tools
I leveraged AI tools (Cursor, Gemini, and Claude) extensively throughout this sprint, but with very specific boundaries.

**The Workflow:**
- **Cursor:** Used for high-speed UI scaffolding and boilerplate generation. It saved me hours on the complex multi-step form and Tailwind layout.
- **Claude (via API):** Used as the "copywriter" for the final audit summaries. It takes the deterministic savings data and writes a persuasive, human-readable summary.
- **Gemini:** Used for brainstorming edge-case pricing rules for obscure AI tools.

**What I didn't trust:**
I never trusted AI with pricing logic or numeric comparisons. I caught it being wrong specifically when it claimed GPT-4o mini was "more expensive than GPT-4o but with a larger window." This was a complete hallucination. I caught it because I had the OpenAI pricing page open in another tab. This reinforced my decision to keep the "pricing database" in `src/lib/pricing.ts` as a manual, human-verified file.

## 5. Self-rating (1–10)
- **Discipline (8/10):** I maintained a strict daily milestone schedule even while managing semester exams, though the final deployment polish happened in a late-night push.
- **Code Quality (8/10):** The engine is strongly typed and unit-tested, though I'd like to add more integration tests for the API layer.
- **Design Sense (9/10):** I achieved a premium, minimalist SaaS aesthetic that feels like a professional Credex product, not a weekend project.
- **Problem Solving (8/10):** I successfully navigated the pivot from LLM-based logic to a deterministic engine without losing momentum.
- **Entrepreneurial Thinking (9/10):** I didn't just build an "audit tool"; I built a lead-generation funnel that captures high-intent emails for Credex consultations.
