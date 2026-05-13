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

  // Generic check: discounts via Credex credits when savings are otherwise zero
  if (recommendation.action === 'already_optimal' && supportsCredex && monthlySpend > 0) {
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

  // Rule 1: High tier Pro+ or Ultra for non-power users
  if ((plan === 'pro_plus' || plan === 'ultra') && useCase !== 'coding') {
    const proCost = seats * 20;
    return {
      action: 'downgrade_plan',
      reason: `Cursor Pro ($20/seat) includes ample credits for non-coding workflows. Your current ${plan} tier is optimized for 8+ hours of daily agentic coding which doesn't match your profile.`,
      suggestedPlan: 'Pro',
      monthlySavings: monthlySpend - proCost,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: proCost,
    };
  }

  // Rule 2: Coding tool overlap
  const hasCopilot = allTools.some((t) => t.tool === 'github_copilot');
  const hasWindsurf = allTools.some((t) => t.tool === 'windsurf');
  if ((hasCopilot || hasWindsurf) && (plan === 'pro' || plan === 'business')) {
    const cheaperTool = hasWindsurf ? 'Windsurf Pro ($20/seat)' : 'GitHub Copilot ($10/seat)';
    const cheaperCost = hasWindsurf ? 20 * seats : 10 * seats;
    const savings = monthlySpend - cheaperCost;
    if (savings > 0) {
      return {
        action: 'consolidate',
        reason: `Duplicate agentic IDE spend detected. Consolidating to ${cheaperTool} alone cuts monthly spend by $${savings} without losing frontier model access.`,
        suggestedTool: hasWindsurf ? 'windsurf' : 'github_copilot',
        monthlySavings: savings,
        currentMonthlySpend: monthlySpend,
        recommendedMonthlySpend: cheaperCost,
      };
    }
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
  _allTools: ToolEntry[]
): ToolRecommendation {
  if (plan === 'enterprise' && seats < 30) {
    const savings = seats * (39 - 19);
    return {
      action: 'downgrade_plan',
      reason: `Copilot Enterprise features (Workspace, custom models) are under-utilized in teams < 30. Business at $19/seat saves $${savings}/mo with near-identical day-to-day IDE capability.`,
      suggestedPlan: 'Business',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 19,
    };
  }

  if (useCase === 'writing' || useCase === 'research') {
    return {
      action: 'switch_tool',
      reason: `GitHub Copilot is a specialized coding engine. For ${useCase}, Claude Pro ($20/mo) provides significantly higher value via 200k context and better prose logic.`,
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

  if (plan === 'max' && useCase !== 'research') {
    const savings = monthlySpend - seats * 20;
    return {
      action: 'downgrade_plan',
      reason: `Claude Max ($100/seat) is for high-volume research. For general tasks, Claude Pro ($20/seat) is sufficient, saving $${savings}/mo.`,
      suggestedPlan: 'Pro',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
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
      reason: `ChatGPT Team ($30/seat) adds a 2-user minimum. Solo or duo users save $10/seat by using Plus ($20/mo) with identical model access.`,
      suggestedPlan: 'Plus',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
    };
  }

  if (useCase === 'writing' && plan === 'plus') {
    return {
      action: 'switch_tool',
      reason: `Claude 4.6 Sonnet (Pro, $20) generally outperforms GPT-5.5 on long-form stylistic writing. Same cost, better output for your use case.`,
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
  if (plan === 'opus' && monthlySpend > 500) {
    const estimatedSonnetCost = monthlySpend * 0.6; // Sonnet is cheaper, but Opus has had price drops
    const savings = Math.round(monthlySpend - estimatedSonnetCost);
    return {
      action: 'downgrade_plan',
      reason: `Claude 4.7 Opus ($5/$25 MTok) is for extreme reasoning. Claude 4.6 Sonnet ($3/$15) is the 2026 industry standard for speed-to-intelligence, saving ~$${savings}/mo.`,
      suggestedPlan: 'Claude 4.6 Sonnet',
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
      reason: `Parallel Claude/OpenAI API usage usually indicates redundant routing. Consolidating into one provider via Credex credits typical cuts spend by 15%.`,
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend - savings,
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
  if (plan === 'gpt4_turbo' || plan === 'gpt4o') {
    const savings = Math.round(monthlySpend * 0.6);
    return {
      action: 'downgrade_plan',
      reason: `GPT-4 variants are legacy in May 2026. Migrating to GPT-5.4 Mini/Standard provides better reasoning at ~40-60% lower cost per million tokens.`,
      suggestedPlan: 'GPT-5.4 Standard',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: monthlySpend - savings,
    };
  }

  if (plan === 'gpt5' && monthlySpend > 400 && useCase !== 'coding') {
    const miniCost = Math.round(monthlySpend * 0.1); 
    const savings = monthlySpend - miniCost;
    return {
      action: 'downgrade_plan',
      reason: `GPT-5.4 Mini ($0.25/$2.00 MTok) is perfect for your ${useCase} tasks. Running a router to move simple calls to Mini saves ~$${Math.round(savings * 0.7)}/mo.`,
      suggestedPlan: 'GPT-5.4 Mini Routing',
      monthlySavings: Math.round(savings * 0.7),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: Math.round(monthlySpend * 0.3),
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
      reason: `Google AI Premium ($19.99/seat) overlaps with your existing Claude/ChatGPT Pro sub. Consolidating saves $${Math.round(savings)}/mo.`,
      monthlySavings: Math.round(savings),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: 0,
    };
  }

  if (plan === 'workspace' && useCase === 'coding') {
    return {
      action: 'switch_tool',
      reason: `Gemini Workspace is for Docs/Sheets. For coding, Cursor Pro ($20/seat) or Copilot ($10/seat) has higher engineering ROI.`,
      suggestedTool: 'cursor',
      monthlySavings: Math.max(0, monthlySpend - seats * 20),
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
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
    const savings = seats * (40 - 20);
    return {
      action: 'downgrade_plan',
      reason: `Windsurf Teams ($40/seat) is unnecessary for small squads. Individual Pro ($20/seat) provides identical agentic capability.`,
      suggestedPlan: 'Pro',
      monthlySavings: savings,
      currentMonthlySpend: monthlySpend,
      recommendedMonthlySpend: seats * 20,
    };
  }

  const hasCursor = allTools.some((t) => t.tool === 'cursor');
  if (hasCursor) {
    return {
      action: 'consolidate',
      reason: `Dual-coding AI setup (Windsurf + Cursor) is redundant. Dropping Windsurf saves $${monthlySpend}/mo with zero loss in frontier model access.`,
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
