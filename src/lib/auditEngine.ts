import type {
  AuditFormData,
  AuditResult,
  ToolAuditResult,
  ToolRecommendation,
  ToolEntry,
  UseCase,
  SavingsCategory,
} from '@/types';
import { TOOL_PRICING } from './pricing';

// --- CREDEX RETAIL MARKUP ---------------------------------------------------
// Credex credits provide ~25-35% discount vs retail pricing for supported tools
const CREDEX_DISCOUNT = 0.28; // avg 28% savings via Credex credits

// --- MAIN ENGINE ------------------------------------------------------------
export function runAuditEngine(data: AuditFormData): AuditResult {
  const toolResults: ToolAuditResult[] = data.tools.map((tool) =>
    auditSingleTool(tool, data.teamSize, data.useCase, data.tools)
  );

  const totalMonthlySpend = data.tools.reduce((s, t) => s + t.monthlySpend, 0);
  const totalMonthlySavings = toolResults.reduce(
    (s, r) => s + r.recommendation.monthlySavings,
    0
  );
  const totalAnnualSavings = totalMonthlySavings * 12;

  return {
    toolResults,
    totalMonthlySpend,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsCategory: categorizeSavings(totalMonthlySavings),
    teamSize: data.teamSize,
    useCase: data.useCase,
  };
}

// --- PER-TOOL AUDITOR -------------------------------------------------------
function auditSingleTool(
  entry: ToolEntry,
  teamSize: number,
  useCase: UseCase,
  allTools: ToolEntry[]
): ToolAuditResult {
  const { tool, plan, monthlySpend, seats } = entry;
  const pricingData = TOOL_PRICING[tool];
  const supportsCredex = pricingData?.supportsCredexCredits ?? false;
  const planLabel = pricingData?.plans?.[plan]?.label ?? plan;
  const expectedSpend = getExpectedSpend(tool, plan, seats);

  let recommendation: ToolRecommendation;

  switch (tool) {
    case 'cursor':
      recommendation = auditCursor(plan, monthlySpend, seats, teamSize, useCase, allTools);
      break;
    case 'github_copilot':
      recommendation = auditGitHubCopilot(plan, monthlySpend, seats, teamSize, useCase, allTools);
      break;
    case 'claude':
      recommendation = auditClaude(plan, monthlySpend, seats, teamSize, useCase);
      break;
    case 'chatgpt':
      recommendation = auditChatGPT(plan, monthlySpend, seats, teamSize, useCase);
      break;
    case 'anthropic_api':
      recommendation = auditAnthropicAPI(plan, monthlySpend, seats, useCase, allTools);
      break;
    case 'openai_api':
      recommendation = auditOpenAIAPI(plan, monthlySpend, seats, useCase, allTools);
      break;
    case 'gemini':
      recommendation = auditGemini(plan, monthlySpend, seats, teamSize, useCase, allTools);
      break;
    case 'windsurf':
      recommendation = auditWindsurf(plan, monthlySpend, seats, teamSize, useCase, allTools);
      break;
    default:
      recommendation = alreadyOptimal(monthlySpend);
  }

  // Generic check: user-entered spend exceeds published list pricing
  if (recommendation.action === 'already_optimal' && expectedSpend > 0) {
    const overpay = monthlySpend - expectedSpend;
    if (overpay > Math.max(5, expectedSpend * 0.05)) {
      recommendation = {
        action: 'overpaying_retail',
        reason: `Your stated spend of $${monthlySpend}/mo exceeds the published ${planLabel} rate for ${seats} seat(s) ($${expectedSpend}/mo). Verify billing or align to list pricing.`,
        monthlySavings: Math.round(overpay),
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: Math.round(expectedSpend),
      };
    }
  }

  // Generic check: Credex credits for high-spend lines only
  if (recommendation.action === 'already_optimal' && supportsCredex && monthlySpend >= 500) {
    const credexSavings = Math.round(monthlySpend * CREDEX_DISCOUNT);
    if (credexSavings > 0) {
      recommendation = {
        action: 'use_credits',
        reason: `Credex credits can reduce this line item by ~${Math.round(CREDEX_DISCOUNT * 100)}% while keeping the same vendor and plan.`,
        monthlySavings: credexSavings,
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: Math.round(monthlySpend - credexSavings),
      };
    }
  }

  const credexAdditionalSavings =
    supportsCredex && recommendation.action !== 'already_optimal'
      ? Math.round(recommendation.recommendedMonthlySpend * CREDEX_DISCOUNT)
      : supportsCredex
        ? Math.round(monthlySpend * CREDEX_DISCOUNT)
        : 0;

  return {
    tool,
    plan,
    seats,
    currentMonthlySpend: monthlySpend,
    recommendation,
    credexSavingsAvailable: supportsCredex,
    credexAdditionalSavings,
  };
}

// --- CURSOR AUDIT -----------------------------------------------------------
function auditCursor(
  plan: string,
  monthlySpend: number,
  seats: number,
  _teamSize: number,
  useCase: UseCase,
  allTools: ToolEntry[]
): ToolRecommendation {
  const expectedSpend = getExpectedSpend('cursor', plan, seats);

  if (plan === 'business' && seats <= 5) {
    const savings = seats * 20;
    return {
      action: 'downgrade_plan',
      reason: `With ${seats} seats, Cursor Pro ($20/seat) provides identical coding capability to Business; the $20/seat premium for admin controls and SSO is only justified for larger teams or compliance-heavy orgs.`,
      suggestedPlan: 'Pro',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
    };
  }

  const hasCopilot = allTools.some((t) => t.tool === 'github_copilot');
  const hasWindsurf = allTools.some((t) => t.tool === 'windsurf');
  if ((hasCopilot || hasWindsurf) && plan === 'pro') {
    const cheaperTool = hasWindsurf
      ? 'Windsurf Pro ($15/seat)'
      : 'GitHub Copilot Individual ($10/seat)';
    const cheaperCost = hasWindsurf ? 15 * seats : 10 * seats;
    const savings = monthlySpend - cheaperCost;
    if (savings > 0) {
      return {
        action: 'consolidate',
        reason: `You're paying for two coding AI tools. Consolidating to ${cheaperTool} alone would cut this spend by $${savings}/mo while maintaining inline autocomplete coverage.`,
        suggestedTool: hasWindsurf ? 'windsurf' : 'github_copilot',
        monthlySavings: savings,
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: cheaperCost,
      };
    }
  }

  if (useCase === 'writing' || useCase === 'research') {
    return {
      action: 'switch_tool',
      reason: `Cursor is optimized for code generation. For ${useCase} workflows, Claude Pro ($20/mo) or ChatGPT Plus ($20/mo) provide better value and long-form output quality.`,
      suggestedTool: 'claude',
      monthlySavings: Math.max(0, monthlySpend - 20 * seats),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: 20 * seats,
    };
  }

  if (monthlySpend > expectedSpend * 1.1 && expectedSpend > 0) {
    return {
      action: 'use_credits',
      reason: `You're paying $${monthlySpend}/mo for Cursor ${plan} but the standard rate for ${seats} seat(s) is $${expectedSpend}/mo. Credex credits provide the same licenses at ~28% below retail.`,
      monthlySavings: Math.round(monthlySpend * CREDEX_DISCOUNT),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: Math.round(monthlySpend * (1 - CREDEX_DISCOUNT)),
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- GITHUB COPILOT AUDIT ---------------------------------------------------
function auditGitHubCopilot(
  plan: string,
  monthlySpend: number,
  seats: number,
  _teamSize: number,
  useCase: UseCase,
  allTools: ToolEntry[]
): ToolRecommendation {
  if (plan === 'enterprise' && seats < 50) {
    const savings = seats * 20;
    return {
      action: 'downgrade_plan',
      reason: `Copilot Enterprise adds Workspace and custom model tuning; most teams under 50 developers don't need those features. Business at $19/seat saves $${savings}/mo with equivalent daily IDE value.`,
      suggestedPlan: 'Business',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 19,
    };
  }

  if (plan === 'business' && seats === 1) {
    return {
      action: 'downgrade_plan',
      reason: `Copilot Individual at $10/mo provides the same completions for a single developer; Business adds org controls that aren't needed for one seat.`,
      suggestedPlan: 'Individual',
      monthlySavings: 9,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: 10,
    };
  }

  const hasCursor = allTools.some((t) => t.tool === 'cursor');
  if (!hasCursor && useCase === 'coding' && seats <= 10 && plan === 'business') {
    const cursorCost = seats * 20;
    if (cursorCost < monthlySpend) {
      return {
        action: 'switch_tool',
        reason: `For ${seats}-person coding teams, Cursor Pro at $20/seat offers a stronger agentic coding workflow with similar total cost, often higher ROI than Copilot Business.`,
        suggestedTool: 'cursor',
        monthlySavings: monthlySpend - cursorCost,
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: cursorCost,
      };
    }
  }

  if (useCase === 'writing' || useCase === 'research') {
    return {
      action: 'switch_tool',
      reason: `GitHub Copilot is purely a coding assistant; for ${useCase}, Claude Pro or ChatGPT Plus delivers far better value for long-form and synthesis tasks.`,
      suggestedTool: 'claude',
      monthlySavings: Math.max(0, monthlySpend - 20),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: 20,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- CLAUDE AUDIT -----------------------------------------------------------
function auditClaude(
  plan: string,
  monthlySpend: number,
  seats: number,
  _teamSize: number,
  useCase: UseCase
): ToolRecommendation {
  if (plan === 'team' && seats < 5) {
    const correctCost = seats * 20;
    const savings = monthlySpend - correctCost;
    if (savings > 0) {
      return {
        action: 'downgrade_plan',
        reason: `Claude Team has a 5-seat minimum ($150/mo floor). Switching to individual Pro accounts ($20/seat) saves $${savings}/mo for your ${seats} users.`,
        suggestedPlan: 'Pro',
        monthlySavings: savings,
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: correctCost,
      };
    }
  }

  if (plan === 'max') {
    const proAlternative = seats * 20;
    const savings = monthlySpend - proAlternative;
    if (savings > 30) {
      return {
        action: 'downgrade_plan',
        reason: `Claude Max ($100/seat) is justified for heavy daily usage. For most teams, Claude Pro ($20/seat) is sufficient and saves $${savings}/mo.`,
        suggestedPlan: 'Pro',
        monthlySavings: savings,
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: proAlternative,
      };
    }
  }

  if ((plan === 'pro' || plan === 'team') && useCase === 'coding') {
    return {
      action: 'switch_tool',
      reason: `Claude is strong for general AI work, but coding teams typically get more value from Cursor Pro, which wraps Claude in an IDE-native workflow.`,
      suggestedTool: 'cursor',
      monthlySavings: 0,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- CHATGPT AUDIT ----------------------------------------------------------
function auditChatGPT(
  plan: string,
  monthlySpend: number,
  seats: number,
  _teamSize: number,
  useCase: UseCase
): ToolRecommendation {
  if (plan === 'team' && seats <= 2) {
    const savings = seats * 10;
    return {
      action: 'downgrade_plan',
      reason: `ChatGPT Team ($30/seat) primarily adds shared workspace. With ${seats} user(s), Plus accounts ($20/seat) provide identical model access and save $${savings}/mo.`,
      suggestedPlan: 'Plus',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
    };
  }

  if (useCase === 'data' && (plan === 'plus' || plan === 'team')) {
    return alreadyOptimal(monthlySpend);
  }

  if (useCase === 'writing' && plan === 'plus') {
    return {
      action: 'switch_tool',
      reason: `For long-form writing workflows, Claude Pro ($20/seat) is often stronger on coherence and style at the same price point.`,
      suggestedTool: 'claude',
      monthlySavings: 0,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- ANTHROPIC API AUDIT ----------------------------------------------------
function auditAnthropicAPI(
  plan: string,
  monthlySpend: number,
  _seats: number,
  _useCase: UseCase,
  allTools: ToolEntry[]
): ToolRecommendation {
  if (plan === 'opus' && monthlySpend > 200) {
    const estimatedSonnetCost = monthlySpend * 0.2;
    const savings = Math.round(monthlySpend - estimatedSonnetCost);
    return {
      action: 'downgrade_plan',
      reason: `Claude 3 Opus costs $15/$75 per MTok. Claude 3.5 Sonnet is priced at $3/$15 and performs better on many benchmarks, saving ~$${savings}/mo.`,
      suggestedPlan: 'Claude 3.5 Sonnet',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: estimatedSonnetCost,
    };
  }

  const hasOpenAI = allTools.some((t) => t.tool === 'openai_api');
  if (hasOpenAI) {
    const savings = Math.round(monthlySpend * 0.15);
    return {
      action: 'consolidate',
      reason: `Running parallel Anthropic and OpenAI API contracts often indicates redundant use cases. Consolidating to a primary provider and using credits typically cuts combined spend by 15-35%.`,
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend - savings,
    };
  }

  if (monthlySpend > 500) {
    const credexSavings = Math.round(monthlySpend * 0.3);
    return {
      action: 'use_credits',
      reason: `At $${monthlySpend}/mo API spend, Credex credits can provide roughly 30% savings on Anthropic usage without changing models.`,
      monthlySavings: credexSavings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend - credexSavings,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- OPENAI API AUDIT -------------------------------------------------------
function auditOpenAIAPI(
  plan: string,
  monthlySpend: number,
  _seats: number,
  useCase: UseCase,
  _allTools: ToolEntry[]
): ToolRecommendation {
  if (plan === 'gpt4_turbo' && monthlySpend > 100) {
    const savings = Math.round(monthlySpend * 0.75);
    return {
      action: 'downgrade_plan',
      reason: `GPT-4 Turbo is legacy. GPT-4o is faster and ~4x cheaper ($2.50/$10 per MTok), saving ~$${savings}/mo with no quality regression.`,
      suggestedPlan: 'GPT-4o',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend - savings,
    };
  }

  if (plan === 'gpt4o' && monthlySpend > 300 && useCase !== 'coding') {
    const miniCost = Math.round(monthlySpend * 0.06);
    const savings = monthlySpend - miniCost;
    return {
      action: 'downgrade_plan',
      reason: `GPT-4o mini handles summarization and structured tasks at ~6% of GPT-4o's cost. Routing simple calls to mini saves ~$${Math.round(savings * 0.6)}/mo conservatively.`,
      suggestedPlan: 'GPT-4o + GPT-4o mini routing',
      monthlySavings: Math.round(savings * 0.6),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: Math.round(monthlySpend * 0.4),
    };
  }

  if (monthlySpend > 500) {
    const credexSavings = Math.round(monthlySpend * 0.28);
    return {
      action: 'use_credits',
      reason: `At $${monthlySpend}/mo, you're a strong candidate for OpenAI credits through Credex. Bulk credits average ~28% below pay-as-you-go.`,
      monthlySavings: credexSavings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend - credexSavings,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- GEMINI AUDIT -----------------------------------------------------------
function auditGemini(
  plan: string,
  monthlySpend: number,
  seats: number,
  _teamSize: number,
  useCase: UseCase,
  allTools: ToolEntry[]
): ToolRecommendation {
  const hasOtherLLM =
    allTools.some((t) => t.tool === 'claude') ||
    allTools.some((t) => t.tool === 'chatgpt');

  if (plan === 'ai_premium' && hasOtherLLM) {
    const savings = seats * 19.99;
    return {
      action: 'consolidate',
      reason: `Google AI Premium ($19.99/seat) overlaps heavily with Claude or ChatGPT you already pay for. Consolidating to one subscription removes duplicate spend.`,
      monthlySavings: Math.round(savings),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: 0,
    };
  }

  if (plan === 'workspace' && useCase === 'coding') {
    return {
      action: 'switch_tool',
      reason: `Gemini in Google Workspace is optimized for Docs/Sheets. For coding teams, Cursor Pro ($20/seat) delivers far higher ROI per developer.`,
      suggestedTool: 'cursor',
      monthlySavings: Math.max(0, monthlySpend - seats * 20),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
    };
  }

  if (plan === 'workspace' && (useCase === 'writing' || useCase === 'research' || useCase === 'mixed')) {
    const altCost = seats * 20;
    const savings = Math.max(0, monthlySpend - altCost);
    return {
      action: 'switch_tool',
      reason: `If your team isn't Google-first, a standalone Claude Pro or ChatGPT Plus plan at $20/seat usually delivers similar quality for ${useCase} work at a lower effective cost.`,
      suggestedTool: 'claude',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: altCost,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- WINDSURF AUDIT ---------------------------------------------------------
function auditWindsurf(
  plan: string,
  monthlySpend: number,
  seats: number,
  _teamSize: number,
  _useCase: UseCase,
  allTools: ToolEntry[]
): ToolRecommendation {
  if (plan === 'teams' && seats <= 3) {
    const savings = seats * 20;
    return {
      action: 'downgrade_plan',
      reason: `Windsurf Teams ($35/seat) adds admin controls that usually matter at 5+ developers. For ${seats} users, individual Pro ($15/seat) delivers the same AI capability.`,
      suggestedPlan: 'Pro',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 15,
    };
  }

  const hasCursor = allTools.some((t) => t.tool === 'cursor');
  if (hasCursor) {
    return {
      action: 'consolidate',
      reason: `You're paying for both Windsurf and Cursor - both are AI-first IDEs with overlapping functionality. Dropping Windsurf saves $${monthlySpend}/mo.`,
      monthlySavings: monthlySpend,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: 0,
    };
  }

  return alreadyOptimal(monthlySpend);
}

// --- HELPERS ----------------------------------------------------------------
function alreadyOptimal(monthlySpend: number): ToolRecommendation {
  return {
    action: 'already_optimal',
    reason: 'Your current plan and seat count are well-matched to your team size and use case. No immediate changes recommended.',
    monthlySavings: 0,
    currentMonthlySpend: monthlySpend,
    recommendedMonthlySpend: monthlySpend,
  };
}

function getExpectedSpend(tool: string, plan: string, seats: number): number {
  const pricing = TOOL_PRICING[tool];
  if (!pricing) return 0;
  const planDef = pricing.plans[plan];
  if (!planDef || planDef.pricePerSeat === null) return 0;
  return planDef.pricePerSeat * seats;
}

function categorizeSavings(monthlySavings: number): SavingsCategory {
  if (monthlySavings >= 500) return 'high';
  if (monthlySavings >= 100) return 'medium';
  if (monthlySavings > 0) return 'low';
  return 'optimal';
}

// --- BENCHMARK DATA ---------------------------------------------------------
export interface SpendBenchmark {
  spendPerDev: number;
  p25: number;
  p50: number;
  p75: number;
  category: 'below_average' | 'average' | 'above_average' | 'outlier';
  message: string;
}

export function calculateBenchmark(
  totalMonthlySpend: number,
  teamSize: number
): SpendBenchmark {
  const spendPerDev = teamSize > 0 ? totalMonthlySpend / teamSize : totalMonthlySpend;

  // Industry benchmarks (May 2026, AI-Native Startups)
  const p25 = 45;  // Core tools only
  const p50 = 85;  // Median spend including API + Agentic IDEs
  const p75 = 180; // Heavy API usage + multiple power-user tiers

  let category: SpendBenchmark['category'];
  let message: string;

  if (spendPerDev < p25) {
    category = 'below_average';
    message = `Your AI spend of $${spendPerDev.toFixed(0)}/dev is below the 25th percentile ($${p25}). You might be under-leveraging agentic workflows compared to your peers.`;
  } else if (spendPerDev <= p50) {
    category = 'average';
    message = `Your AI spend of $${spendPerDev.toFixed(0)}/dev is in the average range ($${p25}-$${p50}) for Series A AI-native teams.`;
  } else if (spendPerDev <= p75) {
    category = 'above_average';
    message = `Your AI spend of $${spendPerDev.toFixed(0)}/dev is above the 50th percentile. Ensure your API token usage is being tracked at the team level.`;
  } else {
    category = 'outlier';
    message = `Your AI spend of $${spendPerDev.toFixed(0)}/dev is in the top decile. This usually indicates unoptimized API routing or redundant seat subscriptions.`;
  }

  return { spendPerDev, p25, p50, p75, category, message };
}
