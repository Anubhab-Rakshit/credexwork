# Prompts

## 1. The Audit Summary Prompt (Active)
This prompt is used to generate the final "Narrative Summary" that appears at the top of the audit results. It is triggered after the deterministic engine has calculated the hard numbers.

```text
You are a senior CFO advisor who specializes in SaaS and AI tool procurement for high-growth tech companies. Your goal is to write a crisp, data-backed 80-120 word audit summary for a startup leadership team.

Context:
- Team size: {teamSize} people
- Primary use case: {useCase}
- Total current monthly AI spend: ${totalMonthlySpend}
- Total potential monthly savings: ${totalMonthlySavings} ({savingsPct}% reduction)
- Annual savings opportunity: ${totalAnnualSavings}

Detailed Tool Findings:
{toolsSummary}

Instructions:
1. Write in the second person ("Your team...", "You are currently...").
2. Use a "Direct but Constructive" tone. Do not be overly critical, but do not mince words about waste.
3. Be specific with dollar amounts. Ground every sentence in the provided math.
4. Sound like a trusted external auditor, not a salesperson. 
5. End with one concrete, non-salesy next step (e.g., "Review the seat counts on Cursor before the next billing cycle").
6. CRITICAL: Do NOT mention "Credex" or any specific credit-purchasing platform in this summary. Keep it focused on the audit results.

Output format: A single paragraph of 80-120 words.
```

### Why I wrote it this way:
- **The "CFO Advisor" Persona:** I initially tried "Friendly Assistant," but the output felt too soft. A CFO persona forces the LLM to use professional vocabulary (e.g., "optimization," "runway," "over-provisioning") which builds trust with the target user (Engineering Leads/Finance Ops).
- **Hard Grounding:** By passing the calculated savings into the prompt as variables, I ensure the LLM cannot "hallucinate" its own savings numbers. It is forced to narrate the engine's output.
- **Next-Step Constraint:** Providing a specific, low-friction next step makes the audit feel actionable immediately, increasing the user's perceived value of the tool.

## 2. What I tried that DID NOT work

### The "LLM-as-Auditor" Approach (FAILED)
Originally, I tried to skip the deterministic rule engine and simply pass the user's tool list to the LLM with a prompt like:
> "Look at this list of tools and tell them how to save money based on current 2026 pricing."

**Why it failed:**
- **Hallucinations:** Even with RAG (Search), the LLM would occasionally swap the pricing of "Cursor Pro" and "Cursor Business" or assume a tool had a discount that didn't exist.
- **Math Errors:** LLMs are notoriously bad at multi-step arithmetic involving seat-based calculations and percentage-based discounts. It would often get the total annual savings wrong by $100-$500.
- **Inconsistency:** Two users with the exact same stack would get slightly different savings numbers, which is unacceptable for a financial tool.

### The "Motivational" Persona (FAILED)
I tried a persona that was "Excited to help you save." 
**Why it failed:** 
The language used was too "marketing-heavy" (e.g., "Wow! You could save a fortune!"). This triggered "ad-blindness" in engineering managers. They want cold, hard data, not a cheerleader. The shift to the "CFO Advisor" persona fixed this immediately.

### Unlimited Word Count (FAILED)
Without the 120-word constraint, the LLM would write 300+ words, repeating the data already shown in the charts. This reduced the "scannability" of the dashboard and made users less likely to scroll down to the specific per-tool recommendations.
