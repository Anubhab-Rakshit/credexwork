import { NextRequest, NextResponse } from 'next/server';
import { getAuditByShareId } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length < 8) {
    return NextResponse.json({ error: 'Invalid share ID' }, { status: 400 });
  }

  const audit = await getAuditByShareId(id);

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Strip PII from public response
  return NextResponse.json({
    shareId: audit.shareId,
    createdAt: audit.createdAt,
    teamSize: audit.teamSize,
    useCase: audit.useCase,
    auditResults: audit.auditResults,
    aiSummary: audit.aiSummary,
    totalMonthlySavings: audit.totalMonthlySavings,
    totalAnnualSavings: audit.totalAnnualSavings,
    savingsCategory: audit.savingsCategory,
    // Note: email, companyName, role are NOT included
  });
}
