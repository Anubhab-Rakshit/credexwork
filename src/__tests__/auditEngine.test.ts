import { runAuditEngine } from '@/lib/auditEngine';
import type { AuditFormData } from '@/types';

describe('audit engine', () => {
  it('downgrades Cursor Business for small teams', () => {
    const input: AuditFormData = {
      teamSize: 3,
      useCase: 'coding',
      tools: [{ tool: 'cursor', plan: 'business', monthlySpend: 120, seats: 3 }],
    };
    const result = runAuditEngine(input);
    expect(result.toolResults[0].recommendation.action).toBe('downgrade_plan');
    expect(result.toolResults[0].recommendation.monthlySavings).toBe(60);
  });

  it('flags Claude Team minimum seat issue', () => {
    const input: AuditFormData = {
      teamSize: 2,
      useCase: 'writing',
      tools: [{ tool: 'claude', plan: 'team', monthlySpend: 150, seats: 2 }],
    };
    const result = runAuditEngine(input);
    expect(result.toolResults[0].recommendation.action).toBe('downgrade_plan');
    expect(result.toolResults[0].recommendation.monthlySavings).toBeGreaterThan(0);
  });

  it('routes GPT-4 Turbo to GPT-4o', () => {
    const input: AuditFormData = {
      teamSize: 4,
      useCase: 'data',
      tools: [{ tool: 'openai_api', plan: 'gpt4_turbo', monthlySpend: 400, seats: 1 }],
    };
    const result = runAuditEngine(input);
    expect(result.toolResults[0].recommendation.action).toBe('downgrade_plan');
    expect(result.toolResults[0].recommendation.suggestedPlan).toBe('GPT-4o');
  });

  it('detects redundant coding tools', () => {
    const input: AuditFormData = {
      teamSize: 5,
      useCase: 'coding',
      tools: [
        { tool: 'cursor', plan: 'pro', monthlySpend: 100, seats: 5 },
        { tool: 'github_copilot', plan: 'business', monthlySpend: 95, seats: 5 },
      ],
    };
    const result = runAuditEngine(input);
    const cursorResult = result.toolResults.find((t) => t.tool === 'cursor');
    expect(cursorResult?.recommendation.action).toBe('consolidate');
  });

  it('marks optimal when no savings are found', () => {
    const input: AuditFormData = {
      teamSize: 1,
      useCase: 'data',
      tools: [{ tool: 'chatgpt', plan: 'plus', monthlySpend: 20, seats: 1 }],
    };
    const result = runAuditEngine(input);
    expect(result.toolResults[0].recommendation.action).toBe('already_optimal');
    expect(result.totalMonthlySavings).toBe(0);
  });
});
