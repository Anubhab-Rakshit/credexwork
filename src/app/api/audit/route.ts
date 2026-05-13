import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runAuditEngine } from '@/lib/auditEngine';
import { saveAudit } from '@/lib/supabase';
import { generateAISummary } from '@/lib/anthropic';
import { checkRateLimit } from '@/lib/utils';

const ToolEntrySchema = z.object({
  tool: z.enum([
    'cursor',
    'github_copilot',
    'claude',
    'chatgpt',
    'anthropic_api',
    'openai_api',
    'gemini',
    'windsurf',
  ]),
  plan: z.string().min(1),
  monthlySpend: z.number().min(0).max(1_000_000),
  seats: z.number().min(1).max(100_000),
});

const AuditRequestSchema = z.object({
  teamSize: z.number().min(1).max(100_000),
  useCase: z.enum(['coding', 'writing', 'data', 'research', 'mixed']),
  tools: z.array(ToolEntrySchema).min(1).max(20),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 10 audits per IP per minute
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    if (!checkRateLimit(`audit:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before running another audit.' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = AuditRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const data = parsed.data;

    // Run the audit engine (pure, deterministic)
    const auditResults = runAuditEngine(data);

    // Generate AI summary (may fall back to template on API error)
    const aiSummary = await generateAISummary(auditResults);
    auditResults.aiSummary = aiSummary;

    // Persist to Supabase
    const saved = await saveAudit({
      teamSize: data.teamSize,
      useCase: data.useCase,
      toolsInput: data.tools,
      auditResults,
      aiSummary,
      totalMonthlySavings: auditResults.totalMonthlySavings,
      totalAnnualSavings: auditResults.totalAnnualSavings,
      savingsCategory: auditResults.savingsCategory,
    });

    if (!saved) {
      // DB save failed - still return results to user (don't block on DB errors)
      return NextResponse.json(
        {
          auditId: null,
          shareId: null,
          results: auditResults,
          warning: 'Results generated but could not be saved. Share URL unavailable.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      auditId: saved.id,
      shareId: saved.shareId,
      results: auditResults,
    });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
