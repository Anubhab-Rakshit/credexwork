import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'audit@spendlens.io';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://spendlens.io';

export async function sendAuditConfirmationEmail(params: {
  to: string;
  companyName?: string;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  shareId: string;
  isHighSavings: boolean;
}): Promise<boolean> {
  const { to, companyName, totalMonthlySavings, totalAnnualSavings, shareId, isHighSavings } =
    params;

  const greeting = companyName ? `Hi ${companyName} team` : 'Hi there';
  const shareUrl = `${APP_URL}/share/${shareId}`;

  const highSavingsSection = isHighSavings
    ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:24px 0;">
      <strong style="color:#166534;">🎯 High-savings opportunity identified</strong>
      <p style="color:#166534;margin:8px 0 0;">Given your $${totalMonthlySavings}/mo savings potential, our team at Credex would like to show you how AI infrastructure credits can capture even more of that savings. We'll be in touch shortly - or <a href="https://credex.co" style="color:#16a34a;">book a call directly</a>.</p>
    </div>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">SpendLens</h1>
      <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Your AI Spend Audit</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;">${greeting},</p>
      <p style="color:#374151;">Your AI spend audit is complete. Here's what we found:</p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <div style="font-size:36px;font-weight:800;color:#4f46e5;">$${totalMonthlySavings.toLocaleString()}<span style="font-size:16px;font-weight:500;color:#6b7280;">/mo</span></div>
        <div style="color:#6b7280;font-size:14px;margin-top:4px;">Potential monthly savings identified</div>
        <div style="font-size:20px;font-weight:700;color:#059669;margin-top:12px;">$${totalAnnualSavings.toLocaleString()} annually</div>
      </div>
      ${highSavingsSection}
      <p style="color:#374151;">View your full report and share it with your team:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${shareUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View Full Report →</a>
      </div>
      <p style="color:#9ca3af;font-size:13px;">This report is public and shareable - identifying details have been stripped from the shared version.</p>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">SpendLens by Credex · <a href="${APP_URL}" style="color:#6b7280;">spendlens.io</a></p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: `SpendLens <${FROM}>`,
      to: [to],
      subject: `Your AI Spend Audit - $${totalAnnualSavings.toLocaleString()} annual savings found`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}
