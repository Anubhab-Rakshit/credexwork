import type { AuditResult } from '@/types';
import { TOOL_DISPLAY_NAMES } from './pricing';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
const GEMINI_ENDPOINT = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  : null;

/**
 * Generate a personalized ~100-word audit summary via Gemini.
 * Falls back to a templated summary on any API failure or missing API key.
 * Full prompt documented in PROMPTS.md.
 */
export async function generateAISummary(audit: AuditResult): Promise<string> {
  try {
    if (!GEMINI_ENDPOINT) {
      console.warn('GEMINI_API_KEY is missing. Using fallback summary.');
      return buildFallbackSummary(audit);
    }

    const toolsSummary = audit.toolResults
      .map((r) => {
        const name = TOOL_DISPLAY_NAMES[r.tool] ?? r.tool;
        const saving = r.recommendation.monthlySavings;
        return saving > 0
          ? `${name} (${r.plan}): potential $${saving}/mo saving - ${r.recommendation.action.replace(/_/g, ' ')}`
          : `${name} (${r.plan}): already optimal`;
      })
      .join('\n');

    const prompt = buildPrompt(audit, toolsSummary);

    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((part: { text?: string }) => part.text ?? '').join('')
      : '';

    if (text.trim().length >= 60) {
      return text.trim();
    }

    return buildFallbackSummary(audit);
  } catch (error) {
    console.error('Gemini API error, using fallback:', error);
    return buildFallbackSummary(audit);
  }
}

function buildPrompt(audit: AuditResult, toolsSummary: string): string {
  return `You are a senior CFO advisor who specializes in SaaS and AI tool procurement. Write a crisp, personalized 80-120 word audit summary for a startup team.

Team profile:
- Team size: ${audit.teamSize} people
- Primary use case: ${audit.useCase}
- Total current monthly AI spend: $${audit.totalMonthlySpend}
- Total potential monthly savings: $${audit.totalMonthlySavings} (${((audit.totalMonthlySavings / Math.max(audit.totalMonthlySpend, 1)) * 100).toFixed(0)}% reduction)
- Annual savings opportunity: $${audit.totalAnnualSavings}

Per-tool findings:
${toolsSummary}

Write this in second person ("Your team..."). Be specific with dollar amounts. Sound like a trusted advisor, not a sales pitch. End with one concrete next step. Do NOT mention Credex.`;
}

function buildFallbackSummary(audit: AuditResult): string {
  const savingsPct = audit.totalMonthlySpend > 0
    ? ((audit.totalMonthlySavings / audit.totalMonthlySpend) * 100).toFixed(0)
    : 0;

  if (audit.totalMonthlySavings === 0) {
    return `Your ${audit.teamSize}-person team is spending $${audit.totalMonthlySpend}/mo on AI tools with a stack that's already well-optimized for ${audit.useCase} workflows. Every tool is on the right plan for your team size. The best next step is tracking actual usage per seat over the next 30 days to make sure all licenses stay active.`;
  }

  const topRecommendation = audit.toolResults
    .filter((r) => r.recommendation.monthlySavings > 0)
    .sort((a, b) => b.recommendation.monthlySavings - a.recommendation.monthlySavings)[0];

  const topToolName = TOOL_DISPLAY_NAMES[topRecommendation?.tool ?? ''] ?? 'your top tool';

  return `Your ${audit.teamSize}-person team is spending $${audit.totalMonthlySpend}/mo on AI tools - and this audit found $${audit.totalMonthlySavings}/mo (${savingsPct}%) in legitimate savings without sacrificing capability. The biggest opportunity is ${topToolName}, where plan right-sizing alone accounts for a significant portion of that gap. Across your stack, the pattern is clear: your current selections are solid, but plan tiers are mismatched to your actual team size and usage. Implementing these changes takes less than a day and saves $${audit.totalAnnualSavings} over the next year.`;
}
