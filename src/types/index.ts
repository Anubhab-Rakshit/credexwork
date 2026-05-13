// ─── Tool Names ─────────────────────────────────────────────────────────────
export type ToolName =
  | 'cursor'
  | 'github_copilot'
  | 'claude'
  | 'chatgpt'
  | 'anthropic_api'
  | 'openai_api'
  | 'gemini'
  | 'windsurf';

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

// ─── Plan definitions per tool ──────────────────────────────────────────────
export type CursorPlan = 'hobby' | 'pro' | 'business' | 'enterprise';
export type CopilotPlan = 'individual' | 'business' | 'enterprise';
export type ClaudePlan = 'free' | 'pro' | 'max' | 'team' | 'enterprise' | 'api';
export type ChatGPTPlan = 'free' | 'plus' | 'team' | 'enterprise' | 'api';
export type AnthropicAPIPlan = 'haiku' | 'sonnet' | 'opus' | 'mixed';
export type OpenAIAPIPlan = 'gpt4o_mini' | 'gpt4o' | 'gpt4_turbo' | 'mixed';
export type GeminiPlan = 'free' | 'ai_premium' | 'api_flash' | 'api_pro' | 'workspace';
export type WindsurfPlan = 'free' | 'pro' | 'teams';

export type ToolPlan =
  | CursorPlan
  | CopilotPlan
  | ClaudePlan
  | ChatGPTPlan
  | AnthropicAPIPlan
  | OpenAIAPIPlan
  | GeminiPlan
  | WindsurfPlan;

// ─── Form Input ──────────────────────────────────────────────────────────────
export interface ToolEntry {
  tool: ToolName;
  plan: string;
  monthlySpend: number; // what they're actually paying today
  seats: number;
}

export interface AuditFormData {
  teamSize: number;
  useCase: UseCase;
  tools: ToolEntry[];
}

// ─── Audit Engine Output ─────────────────────────────────────────────────────
export type RecommendationAction =
  | 'downgrade_plan'     // same vendor, cheaper plan
  | 'reduce_seats'       // remove unused seats
  | 'switch_tool'        // move to a different tool
  | 'use_credits'        // buy via Credex credits for discount
  | 'already_optimal'    // spending is already right-sized
  | 'overpaying_retail'  // paying retail when credits available
  | 'consolidate';       // combine with another tool you already have

export interface ToolRecommendation {
  action: RecommendationAction;
  reason: string;          // 1-sentence, finance-defensible
  suggestedPlan?: string;
  suggestedTool?: ToolName;
  monthlySavings: number;  // concrete savings per month
  currentMonthlySpend: number;
  recommendedMonthlySpend: number;
}

export interface ToolAuditResult {
  tool: ToolName;
  plan: string;
  seats: number;
  currentMonthlySpend: number;
  recommendation: ToolRecommendation;
  credexSavingsAvailable: boolean; // can Credex provide credits for this tool?
  credexAdditionalSavings: number; // extra % savings via Credex credits
}

export type SavingsCategory = 'high' | 'medium' | 'low' | 'optimal';

export interface AuditResult {
  toolResults: ToolAuditResult[];
  totalMonthlySpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  savingsCategory: SavingsCategory;
  aiSummary?: string;
  teamSize: number;
  useCase: UseCase;
}

// ─── Stored Audit (from DB) ──────────────────────────────────────────────────
export interface StoredAudit {
  id: string;
  shareId: string;
  createdAt: string;
  teamSize: number;
  useCase: UseCase;
  toolsInput: ToolEntry[];
  auditResults: AuditResult;
  aiSummary: string | null;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  savingsCategory: SavingsCategory;
}

// ─── Lead Capture ────────────────────────────────────────────────────────────
export interface LeadFormData {
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  // honeypot - never filled by real users
  website?: string;
}

export interface StoredLead {
  id: string;
  auditId: string;
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  isHighSavings: boolean;
  emailSent: boolean;
  createdAt: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────
export interface AuditAPIResponse {
  auditId: string;
  shareId: string;
  results: AuditResult;
}

export interface LeadAPIResponse {
  success: boolean;
  message: string;
}

// ─── Pricing Data Types ──────────────────────────────────────────────────────
export interface PlanDefinition {
  label: string;
  pricePerSeat: number | null; // null = custom/contact sales
  minSeats?: number;
  maxSeats?: number;
  description: string;
}

export interface ToolPricingData {
  displayName: string;
  plans: Record<string, PlanDefinition>;
  source: string;
  verifiedDate: string;
  supportsCredexCredits: boolean;
  credexDiscountPercent: number; // 0-40% discount via Credex
}
