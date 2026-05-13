import type { Metadata } from 'next';
import { TOOL_DISPLAY_NAMES, TOOL_ICONS } from '@/lib/pricing';
import { formatCurrency, capitalize } from '@/lib/utils';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function getShareData(id: string) {
  const res = await fetch(`${appUrl}/api/share/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getShareData(id);
  const total = data?.totalMonthlySavings ?? 0;
  const title = total > 0 ? `AI Spend Audit - Save ${formatCurrency(total)}/mo` : 'AI Spend Audit';
  const description = data
    ? `Audit summary: ${formatCurrency(data.totalMonthlySavings)}/mo in savings across ${data.auditResults?.toolResults?.length ?? 0} tools.`
    : 'Shared AI spend audit.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/share/${id}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShareData(id);

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
        <div className="glass-card p-8 text-center">
          <h1 className="font-display text-3xl">Report not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This share link is missing or expired.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <p className="section-kicker">SpendLens share</p>
        <h1 className="font-display text-4xl">AI Spend Audit Report</h1>
        <p className="text-sm text-muted-foreground">
          This report is public and stripped of identifying details.
        </p>
      </header>

      <section className="glass-card border-animated p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="section-kicker">Total savings</p>
            <p className="stat-number savings-text text-4xl">
              {formatCurrency(data.totalMonthlySavings)}<span className="text-base text-muted-foreground">/mo</span>
            </p>
            <p className="text-sm text-muted-foreground">{formatCurrency(data.totalAnnualSavings)} annually</p>
          </div>
          <div className="rounded-2xl border border-border bg-white/80 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team size</p>
            <p className="text-2xl font-semibold text-foreground">{data.teamSize} people</p>
          </div>
          <div className="rounded-2xl border border-border bg-white/80 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Primary use case</p>
            <p className="text-2xl font-semibold text-foreground">{capitalize(data.useCase)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {data.auditResults?.toolResults?.map((tool: any) => (
          <div key={`${tool.tool}-${tool.plan}`} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{TOOL_ICONS[tool.tool]}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{TOOL_DISPLAY_NAMES[tool.tool]}</p>
                  <p className="text-xs text-muted-foreground">{capitalize(tool.plan)}</p>
                </div>
              </div>
              {tool.recommendation.monthlySavings > 0 ? (
                <span className="savings-badge">Save {formatCurrency(tool.recommendation.monthlySavings)}/mo</span>
              ) : (
                <span className="optimal-badge">Optimal</span>
              )}
            </div>
            <div className="mt-3">
              <span className="action-badge">{tool.recommendation.action.replace(/_/g, ' ')}</span>
            </div>
            <p className="mt-3 text-sm text-foreground">{tool.recommendation.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Current: {formatCurrency(tool.currentMonthlySpend)} → Recommended: {formatCurrency(tool.recommendation.recommendedMonthlySpend)}
            </p>
          </div>
        ))}
      </section>

      {data.aiSummary && (
        <section className="glass-card p-6">
          <p className="section-kicker">AI summary</p>
          <p className="mt-3 text-base text-foreground">{data.aiSummary}</p>
        </section>
      )}

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Run your own audit</p>
            <p className="text-sm text-muted-foreground">Get a personalized report for your team.</p>
          </div>
          <a
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
            href="/"
          >
            Start a free audit
          </a>
        </div>
      </section>
    </main>
  );
}
