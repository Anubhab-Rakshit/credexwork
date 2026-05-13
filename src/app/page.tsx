'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Search, Zap } from 'lucide-react';
import type { AuditAPIResponse, AuditFormData, AuditResult, ToolEntry, ToolName, UseCase } from '@/types';
import { TOOL_DISPLAY_NAMES, TOOL_ICONS, TOOL_PRICING } from '@/lib/pricing';
import { formatCurrency, formatNumber, capitalize } from '@/lib/utils';

const STORAGE_KEY = 'spendlens_form_v1';
const RESULT_KEY = 'spendlens_results_v1';

const TOOL_ORDER: ToolName[] = [
  'cursor',
  'github_copilot',
  'claude',
  'chatgpt',
  'anthropic_api',
  'openai_api',
  'gemini',
  'windsurf',
];

const USE_CASES: { value: UseCase; label: string; detail: string }[] = [
  { value: 'coding', label: 'Coding', detail: 'Software development, code review, debugging' },
  { value: 'writing', label: 'Writing', detail: 'Marketing, docs, product writing, content' },
  { value: 'data', label: 'Data', detail: 'Analysis, spreadsheets, SQL, dashboards' },
  { value: 'research', label: 'Research', detail: 'Competitive intel, briefs, synthesis' },
  { value: 'mixed', label: 'Mixed', detail: 'Across engineering + ops + product' },
];

const DEFAULT_FORM: AuditFormData = {
  teamSize: 6,
  useCase: 'coding',
  tools: [
    {
      tool: 'cursor',
      plan: 'pro',
      monthlySpend: 120,
      seats: 6,
    },
  ],
};

type AuditState = {
  auditId: string | null;
  shareId: string | null;
  results: AuditResult | null;
};

export default function HomePage() {
  const [form, setForm] = useState<AuditFormData>(DEFAULT_FORM);
  const [auditState, setAuditState] = useState<AuditState>({
    auditId: null,
    shareId: null,
    results: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadRole, setLeadRole] = useState('');
  const [leadTeamSize, setLeadTeamSize] = useState<number | ''>('');
  const [leadWebsite, setLeadWebsite] = useState('');
  const [leadStatus, setLeadStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedResults = localStorage.getItem(RESULT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuditFormData;
        if (parsed?.tools?.length) setForm(parsed);
      } catch {
        // ignore corrupt storage
      }
    }
    if (storedResults) {
      try {
        const parsed = JSON.parse(storedResults) as AuditState;
        if (parsed?.results) setAuditState(parsed);
      } catch {
        // ignore corrupt storage
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(RESULT_KEY, JSON.stringify(auditState));
  }, [auditState]);

  const toolOptions = useMemo(
    () =>
      TOOL_ORDER.map((tool) => ({
        value: tool,
        label: TOOL_DISPLAY_NAMES[tool],
        icon: TOOL_ICONS[tool],
      })),
    []
  );

  const totalMonthlySpend = useMemo(
    () => form.tools.reduce((sum, tool) => sum + (Number(tool.monthlySpend) || 0), 0),
    [form.tools]
  );

const totalSeats = useMemo(
    () => form.tools.reduce((sum, tool) => sum + (Number(tool.seats) || 0), 0),
    [form.tools]
  );

  const getExpectedMonthlySpend = (tool: ToolName, plan: string, seats: number) => {
    const pricing = TOOL_PRICING[tool];
    if (!pricing) return 0;
    const planDef = pricing.plans[plan];
    if (!planDef || planDef.pricePerSeat === null) return 0;
    return planDef.pricePerSeat * seats;
  };

  const handleToolChange = (index: number, update: Partial<ToolEntry>) => {
    setForm((prev) => {
      const nextTools = [...prev.tools];
      nextTools[index] = { ...nextTools[index], ...update };
      return { ...prev, tools: nextTools };
    });
  };

  const addTool = () => {
    setForm((prev) => ({
      ...prev,
      tools: [
        ...prev.tools,
        { tool: 'chatgpt', plan: 'plus', monthlySpend: 20, seats: 1 },
      ],
    }));
  };

  const removeTool = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
    }));
  };

  const runAudit = async () => {
    setError(null);
    setLeadStatus(null);
    setNoteStatus(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload?.error ?? 'Unable to run the audit.');
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as AuditAPIResponse & { warning?: string };
      setAuditState({
        auditId: payload.auditId ?? null,
        shareId: payload.shareId ?? null,
        results: payload.results,
      });
      if (payload.warning) {
        setNoteStatus(payload.warning);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitLead = async () => {
    if (!auditState.auditId) {
      setLeadStatus('This audit was not saved, so email delivery is unavailable.');
      return;
    }
    if (!leadEmail) {
      setLeadStatus('Please add an email to receive your report.');
      return;
    }
    setLeadStatus('Sending...');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: auditState.auditId,
          email: leadEmail,
          companyName: leadCompany || undefined,
          role: leadRole || undefined,
          teamSize: leadTeamSize === '' ? undefined : Number(leadTeamSize),
          website: leadWebsite,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setLeadStatus(payload?.error ?? 'Unable to send email.');
        return;
      }
      setLeadStatus(payload.message ?? 'Report sent.');
    } catch {
      setLeadStatus('Network error while sending email.');
    }
  };

  const copyShareLink = async () => {
    if (!auditState.shareId) return;
    const url = `${window.location.origin}/share/${auditState.shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('Copied share link.');
    } catch {
      setCopyStatus('Copy failed - please copy manually.');
    }
  };

  const results = auditState.results;
  const isHighSavings = (results?.totalMonthlySavings ?? 0) >= 500;
  const isLowSavings = (results?.totalMonthlySavings ?? 0) < 100;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
      <div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_top,_rgba(255,170,120,0.45),_transparent_60%)]" />
      <div className="pointer-events-none absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(94,234,212,0.35),_transparent_60%)]" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-10">
        <header className="hero-shell flex flex-col gap-10 p-8 md:p-10">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-md">
                <span className="text-lg">O</span>
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.2em] text-muted-foreground">SPENDLENS</p>
                <p className="text-xs text-muted-foreground">AI spend audit</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="hidden md:flex ribbon text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Instant audit
                <span className="text-primary">•</span>
                Shareable report
                <span className="text-primary">•</span>
                Credex-ready
              </div>
              <a className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground shadow-sm" href="#audit">
                Run audit
              </a>
            </div>
          </nav>

          <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col gap-6">
              <span className="ribbon text-sm">Free AI spend audit for founders + eng leaders</span>
              <h1 className="font-display text-4xl leading-tight text-foreground md:text-6xl">
                Know your AI stack
                <span className="gradient-text"> before</span> the bill lands.
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                SpendLens audits every AI subscription and API line item, flags plan mismatches,
                and quantifies real savings. Built for teams that care about every dollar -
                without sacrificing capability.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="tilt-card flex items-center gap-3 px-4 py-3 stagger-1">
                  <span className="text-xl text-primary"><BarChart3 size={20} /></span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current spend</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(totalMonthlySpend)}/mo</p>
                  </div>
                </div>
                <div className="tilt-card flex items-center gap-3 px-4 py-3 stagger-2">
                  <span className="text-xl text-primary"><Search size={20} /></span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tools tracked</p>
                    <p className="text-lg font-semibold text-foreground">{form.tools.length} tools</p>
                  </div>
                </div>
                <div className="tilt-card flex items-center gap-3 px-4 py-3 stagger-3">
                  <span className="text-xl text-primary"><Zap size={20} /></span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Seats tracked</p>
                    <p className="text-lg font-semibold text-foreground">{formatNumber(totalSeats)} seats</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-card border-animated p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="section-kicker">Live preview</p>
                  <h2 className="font-display text-2xl text-foreground">Based on your inputs</h2>
                </div>
                <span className="savings-badge">{formatCurrency(totalMonthlySpend)}/mo tracked</span>
              </div>
              <div className="mt-6 space-y-4">
                {form.tools.slice(0, 3).map((tool, index) => (
                  <div key={`${tool.tool}-${index}`} className="rounded-xl border border-border bg-white/60 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      {TOOL_DISPLAY_NAMES[tool.tool]} · {capitalize(tool.plan)} · {tool.seats} seats
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {formatCurrency(tool.monthlySpend)}/mo current spend
                    </p>
                  </div>
                ))}
                {form.tools.length === 0 && (
                  <div className="rounded-xl border border-border bg-white/60 px-4 py-3">
                    <p className="text-sm text-muted-foreground">Add tools to see the live preview.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 text-sm text-muted-foreground">
                This preview updates instantly as you edit the form.
              </div>
            </div>
          </div>
        </header>

        <section id="audit" className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div>
                <p className="section-kicker">Input</p>
                <h2 className="font-display text-3xl">Your AI spend snapshot</h2>
                <p className="text-sm text-muted-foreground">
                  Enter what you pay today. We will map this against current pricing and
                  rightsizing logic.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  Team size
                  <input
                    className="form-field"
                    type="number"
                    min={1}
                    value={form.teamSize}
                    onChange={(e) => setForm({ ...form, teamSize: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  Primary use case
                  <select
                    className="form-field"
                    value={form.useCase}
                    onChange={(e) => setForm({ ...form, useCase: e.target.value as UseCase })}
                  >
                    {USE_CASES.map((useCase) => (
                      <option key={useCase.value} value={useCase.value}>
                        {useCase.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-white/60 p-5">
                <p className="section-kicker">Tool stack</p>
                <div className="mt-4 space-y-4">
                  {form.tools.map((tool, index) => {
                    const pricing = TOOL_PRICING[tool.tool];
                    const plans = pricing ? Object.entries(pricing.plans) : [];
                    return (
                      <div key={`${tool.tool}-${index}`} className="rounded-xl border border-border bg-white/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{TOOL_ICONS[tool.tool]}</span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {TOOL_DISPLAY_NAMES[tool.tool]}
                              </p>
                              <p className="text-xs text-muted-foreground">{pricing?.source ?? 'Pricing source'}</p>
                            </div>
                          </div>
                          {form.tools.length > 1 && (
                            <button
                              className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                              onClick={() => removeTool(index)}
                              type="button"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Tool
                            <select
                              className="form-field text-sm"
                              value={tool.tool}
                              onChange={(e) => {
                                const nextTool = e.target.value as ToolName;
                                const nextPlan = Object.keys(TOOL_PRICING[nextTool].plans)[0];
                                handleToolChange(index, {
                                  tool: nextTool,
                                  plan: nextPlan,
                                });
                              }}
                            >
                              {toolOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.icon} {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Plan
                            <select
                              className="form-field text-sm"
                              value={tool.plan}
                              onChange={(e) => handleToolChange(index, { plan: e.target.value })}
                            >
                              {plans.map(([key, plan]) => (
                                <option key={key} value={key}>
                                  {plan.label}
                                  {plan.pricePerSeat !== null ? ` - $${plan.pricePerSeat}/seat` : ' - Custom'}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Monthly spend
                            <input
                              className="form-field text-sm"
                              type="number"
                              min={0}
                              step="1"
                              value={tool.monthlySpend}
                              onChange={(e) =>
                                handleToolChange(index, { monthlySpend: Number(e.target.value) || 0 })
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Seats
                            <input
                              className="form-field text-sm"
                              type="number"
                              min={1}
                              step="1"
                              value={tool.seats}
                              onChange={(e) => handleToolChange(index, { seats: Number(e.target.value) || 1 })}
                            />
                          </label>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Expected retail: {formatCurrency(getExpectedMonthlySpend(tool.tool, tool.plan, tool.seats))}/mo
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={addTool}
                  >
                    + Add another tool
                  </button>
                  <div className="text-sm text-muted-foreground">
                    Total current monthly spend: <span className="font-semibold text-foreground">{formatCurrency(totalMonthlySpend)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {noteStatus && (
                <div className="rounded-xl border border-border bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                  {noteStatus}
                </div>
              )}

              <button
                className="btn-primary glow-primary"
                onClick={runAudit}
                disabled={isLoading}
                type="button"
              >
                {isLoading ? 'Running audit...' : 'Run the audit'}
              </button>
              <p className="text-xs text-muted-foreground">
                We never gate the audit. Email is optional after results.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 md:p-8">
            <p className="section-kicker">Logic</p>
            <h3 className="font-display text-2xl">How the audit thinks</h3>
            <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">Plan fit</span> - checks if your team size
                warrants Business/Enterprise tiers or if Pro-level plans are enough.
              </li>
              <li>
                <span className="font-semibold text-foreground">Usage fit</span> - matches your use case
                (coding vs writing vs data) with tools that deliver the most output per dollar.
              </li>
              <li>
                <span className="font-semibold text-foreground">Consolidation</span> - flags overlapping
                tools that deliver identical capabilities.
              </li>
              <li>
                <span className="font-semibold text-foreground">Credex credits</span> - highlights where
                discounted credits can reduce spend without changing vendors.
              </li>
            </ul>
            <div className="mt-8 rounded-2xl border border-border bg-white/70 p-5">
              <p className="section-kicker">Coverage</p>
              <div className="mt-3 grid gap-2 text-sm">
                {toolOptions.map((tool) => (
                  <div key={tool.value} className="flex items-center justify-between">
                    <span>{tool.icon} {tool.label}</span>
                    <span className="text-xs text-muted-foreground">Pricing verified</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {results && (
          <section className="grid gap-8">
            <div className="glass-card border-animated p-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="section-kicker">Audit results</p>
                  <h2 className="font-display text-3xl">{isLowSavings ? 'You are spending well.' : 'Savings found.'}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isLowSavings
                      ? 'Your stack is already tightly optimized. We will still watch for new optimizations.'
                      : 'Every recommendation below is based on published pricing and usage-fit rules.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white/80 px-6 py-4 text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total potential savings</p>
                  <p className="stat-number savings-text text-4xl">
                    {formatCurrency(results.totalMonthlySavings)}
                    <span className="text-base text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(results.totalAnnualSavings)} annually
                  </p>
                </div>
              </div>

              {results.aiSummary && (
                <div className="mt-8 rounded-2xl border border-border bg-white/80 p-6">
                  <p className="section-kicker">AI summary</p>
                  <p className="mt-3 text-base leading-relaxed text-foreground">{results.aiSummary}</p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {results.toolResults.map((tool) => {
                const actionLabel = tool.recommendation.action.replace(/_/g, ' ');
                return (
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
                      <span className="action-badge">{actionLabel}</span>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>
                        Current spend: <span className="font-semibold text-foreground">{formatCurrency(tool.currentMonthlySpend)}</span>
                      </p>
                      <p>
                        Recommendation: <span className="font-semibold text-foreground">{actionLabel}</span>
                        {tool.recommendation.suggestedPlan ? ` -> ${tool.recommendation.suggestedPlan}` : ''}
                        {tool.recommendation.suggestedTool
                          ? ` -> ${TOOL_DISPLAY_NAMES[tool.recommendation.suggestedTool]}`
                          : ''}
                      </p>
                      <p className="mt-2 text-sm text-foreground">{tool.recommendation.reason}</p>
                      {tool.credexSavingsAvailable && (
                        <div className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
                          Credex credits can unlock ~{formatCurrency(tool.credexAdditionalSavings)}/mo in
                          additional savings on this line item.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isHighSavings && (
              <div className="glass-card border-animated p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="section-kicker">High-savings opportunity</p>
                    <h3 className="font-display text-2xl">Credex can capture even more.</h3>
                    <p className="text-sm text-muted-foreground">
                      With more than $500/mo in savings on the table, Credex credits can lock in
                      discounts across your AI infrastructure without vendor switching.
                    </p>
                  </div>
                  <a
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
                    href="https://credex.co"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Book a Credex consult
                  </a>
                </div>
              </div>
            )}

            <div className="glass-card p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="section-kicker">Shareable report</p>
                  <p className="text-sm text-muted-foreground">
                    {auditState.shareId
                      ? `Public report: /share/${auditState.shareId}`
                      : 'Share link is unavailable because the audit could not be saved.'}
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={copyShareLink}
                  disabled={!auditState.shareId}
                  type="button"
                >
                  Copy link
                </button>
              </div>
              {copyStatus && <p className="mt-3 text-xs text-muted-foreground">{copyStatus}</p>}
            </div>

            <div className="glass-card p-6">
              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="section-kicker">Get the report</p>
                  <h3 className="font-display text-2xl">Send the audit to your inbox.</h3>
                  <p className="text-sm text-muted-foreground">
                    {isLowSavings
                      ? 'You are already optimized - we will notify you when new optimizations apply to your stack.'
                      : 'We will email the full report and keep you updated on new pricing changes.'}
                  </p>
                </div>
                <div className="space-y-3">
                  <input
                    className="form-field"
                    placeholder="Work email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                  />
                  <input
                    className="form-field"
                    placeholder="Company name (optional)"
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                  />
                  <input
                    className="form-field"
                    placeholder="Role (optional)"
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value)}
                  />
                  <input
                    className="form-field"
                    placeholder="Team size (optional)"
                    type="number"
                    min={1}
                    value={leadTeamSize}
                    onChange={(e) => setLeadTeamSize(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <input
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    value={leadWebsite}
                    onChange={(e) => setLeadWebsite(e.target.value)}
                  />
                  <button
                    className="btn-secondary"
                    onClick={submitLead}
                    type="button"
                  >
                    Send report
                  </button>
                  {leadStatus && <p className="text-xs text-muted-foreground">{leadStatus}</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Audit design</p>
              <h3 className="font-display text-2xl">Transparent, finance-defensible logic.</h3>
              <p className="text-sm text-muted-foreground">
                Every recommendation is tied to a published price and a usage-fit rationale -
                no black box.
              </p>
            </div>
            <div className="rounded-full border border-border bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              Pricing verified May 2026
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
