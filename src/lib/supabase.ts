import { createClient } from '@supabase/supabase-js';
import type { StoredAudit, StoredLead, AuditResult, ToolEntry, UseCase, SavingsCategory } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client - for reading shared audits
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Server-only client - for writes (used only in API routes)
export const supabaseAdmin =
  supabaseUrl && (supabaseServiceKey ?? supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceKey ?? supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

// ─── AUDIT OPERATIONS ─────────────────────────────────────────────────────

export async function saveAudit(params: {
  teamSize: number;
  useCase: UseCase;
  toolsInput: ToolEntry[];
  auditResults: AuditResult;
  aiSummary: string | null;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  savingsCategory: SavingsCategory;
}): Promise<{ id: string; shareId: string } | null> {
  if (!supabaseAdmin) {
    console.warn('Supabase is not configured. Audit will not be persisted.');
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('audits')
    .insert({
      team_size: params.teamSize,
      use_case: params.useCase,
      tools_input: params.toolsInput,
      audit_results: params.auditResults,
      ai_summary: params.aiSummary,
      total_monthly_savings: params.totalMonthlySavings,
      total_annual_savings: params.totalAnnualSavings,
      savings_category: params.savingsCategory,
    })
    .select('id, share_id')
    .single();

  if (error) {
    console.error('Error saving audit:', error);
    return null;
  }

  return { id: data.id, shareId: data.share_id };
}

export async function getAuditById(id: string): Promise<StoredAudit | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapDbAudit(data);
}

export async function getAuditByShareId(shareId: string): Promise<StoredAudit | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('share_id', shareId)
    .single();

  if (error || !data) return null;

  return mapDbAudit(data);
}

function mapDbAudit(data: Record<string, unknown>): StoredAudit {
  return {
    id: data.id as string,
    shareId: data.share_id as string,
    createdAt: data.created_at as string,
    teamSize: data.team_size as number,
    useCase: data.use_case as UseCase,
    toolsInput: data.tools_input as ToolEntry[],
    auditResults: data.audit_results as AuditResult,
    aiSummary: data.ai_summary as string | null,
    totalMonthlySavings: data.total_monthly_savings as number,
    totalAnnualSavings: data.total_annual_savings as number,
    savingsCategory: data.savings_category as SavingsCategory,
  };
}

// ─── LEAD OPERATIONS ──────────────────────────────────────────────────────

export async function saveLead(params: {
  auditId: string;
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  isHighSavings: boolean;
}): Promise<StoredLead | null> {
  // Check for duplicate email + audit combo
  if (!supabaseAdmin) {
    console.warn('Supabase is not configured. Lead will not be saved.');
    return null;
  }

  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('audit_id', params.auditId)
    .eq('email', params.email)
    .single();

  if (existing) {
    // Already captured this lead - return gracefully
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      audit_id: params.auditId,
      email: params.email,
      company_name: params.companyName,
      role: params.role,
      team_size: params.teamSize,
      is_high_savings: params.isHighSavings,
      email_sent: false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error saving lead:', error);
    return null;
  }

  return {
    id: data.id,
    auditId: data.audit_id,
    email: data.email,
    companyName: data.company_name,
    role: data.role,
    teamSize: data.team_size,
    isHighSavings: data.is_high_savings,
    emailSent: data.email_sent,
    createdAt: data.created_at,
  };
}

export async function markEmailSent(leadId: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('leads')
    .update({ email_sent: true })
    .eq('id', leadId);
}
