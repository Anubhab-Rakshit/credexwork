import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveLead, getAuditById, markEmailSent } from '@/lib/supabase';
import { sendAuditConfirmationEmail } from '@/lib/resend';
import { checkRateLimit } from '@/lib/utils';

const LeadSchema = z.object({
  auditId: z.string().uuid(),
  email: z.string().email().max(254),
  companyName: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  teamSize: z.number().min(1).max(100_000).optional(),
  // honeypot field - must be empty from real users
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limiting: 3 lead submissions per IP per minute
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit(`lead:${ip}`, 3, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before submitting again.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { auditId, email, companyName, role, teamSize, website } = parsed.data;

  // Honeypot check - bots fill this field, humans don't see it
  if (website && website.length > 0) {
    // Silently succeed to not reveal detection
    return NextResponse.json({ success: true, message: 'Report sent.' });
  }

  // Get the audit to check savings amount
  const audit = await getAuditById(auditId);
  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  const isHighSavings = audit.totalMonthlySavings >= 500;

  // Save lead
  const lead = await saveLead({
    auditId,
    email,
    companyName,
    role,
    teamSize,
    isHighSavings,
  });

  // Send confirmation email (non-blocking - don't fail the request if email fails)
  if (lead) {
    const emailSent = await sendAuditConfirmationEmail({
      to: email,
      companyName,
      totalMonthlySavings: audit.totalMonthlySavings,
      totalAnnualSavings: audit.totalAnnualSavings,
      shareId: audit.shareId,
      isHighSavings,
    });

    if (emailSent) {
      await markEmailSent(lead.id);
    }
  }

  return NextResponse.json({
    success: true,
    message: isHighSavings
      ? 'Report sent! Given your savings opportunity, our Credex team will also reach out shortly.'
      : 'Report sent to your inbox. We\'ll notify you when new optimizations apply to your stack.',
  });
}
