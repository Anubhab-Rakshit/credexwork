import type { ToolPricingData } from '@/types';

/**
 * Canonical pricing data for all supported AI tools.
 * Every number traces to an official pricing page URL.
 * See PRICING_DATA.md for full citations.
 * Verified: 2026-05-13 (Today)
 */
export const TOOL_PRICING: Record<string, ToolPricingData> = {
  cursor: {
    displayName: 'Cursor',
    plans: {
      hobby: {
        label: 'Hobby',
        pricePerSeat: 0,
        minSeats: 1,
        description: '2,000 completions/mo, limited agentic credits',
      },
      pro: {
        label: 'Pro',
        pricePerSeat: 20,
        minSeats: 1,
        description: 'Includes $20 of usage credits for frontier models (Claude 4.6 / GPT-5.4)',
      },
      pro_plus: {
        label: 'Pro+',
        pricePerSeat: 60,
        minSeats: 1,
        description: 'Includes $70 of usage credits, higher context windows',
      },
      ultra: {
        label: 'Ultra',
        pricePerSeat: 200,
        minSeats: 1,
        description: 'Includes $400 of usage credits, dedicated GPU priority',
      },
      business: {
        label: 'Teams',
        pricePerSeat: 40,
        minSeats: 1,
        description: 'Pro features + admin dashboard, SSO, audit logs, centralized billing',
      },
      enterprise: {
        label: 'Enterprise',
        pricePerSeat: null,
        description: 'Custom contract, dedicated support, SOC 2',
      },
    },
    source: 'https://cursor.sh/pricing',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: true,
    credexDiscountPercent: 30,
  },

  github_copilot: {
    displayName: 'GitHub Copilot',
    plans: {
      individual: {
        label: 'Individual',
        pricePerSeat: 10,
        minSeats: 1,
        maxSeats: 1,
        description: '$10/mo, includes $10 in GitHub AI Credits for token consumption',
      },
      business: {
        label: 'Business',
        pricePerSeat: 19,
        minSeats: 1,
        description: 'Organization policy management, audit logs, $19 AI Credit pool per user',
      },
      enterprise: {
        label: 'Enterprise',
        pricePerSeat: 39,
        minSeats: 1,
        description: 'Business features + Copilot Workspace, custom models, $39 AI Credit pool',
      },
    },
    source: 'https://github.com/features/copilot#pricing',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: true,
    credexDiscountPercent: 25,
  },

  claude: {
    displayName: 'Claude (Anthropic)',
    plans: {
      free: {
        label: 'Free',
        pricePerSeat: 0,
        description: 'Limited messages per day, Claude 4.5 Haiku',
      },
      pro: {
        label: 'Pro',
        pricePerSeat: 20,
        minSeats: 1,
        description: '5x more usage than Free, Claude 4.6 Sonnet & 4.7 Opus access',
      },
      max: {
        label: 'Max',
        pricePerSeat: 100,
        minSeats: 1,
        description: '25x Free usage, priority access, early model drops',
      },
      team: {
        label: 'Team',
        pricePerSeat: 30,
        minSeats: 5,
        description: 'Pro features, central billing, admin console, private data silo',
      },
      enterprise: {
        label: 'Enterprise',
        pricePerSeat: null,
        description: 'Custom SSO, expanded context, compliance, dedicated support',
      },
    },
    source: 'https://www.anthropic.com/pricing',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: true,
    credexDiscountPercent: 30,
  },

  chatgpt: {
    displayName: 'ChatGPT (OpenAI)',
    plans: {
      free: {
        label: 'Free',
        pricePerSeat: 0,
        description: 'GPT-5.4 Mini access, limited GPT-5.5 messages',
      },
      plus: {
        label: 'Plus',
        pricePerSeat: 20,
        minSeats: 1,
        description: 'GPT-5.5, DALL·E 4, O1 reasoning models, 100 image gen/mo',
      },
      team: {
        label: 'Team',
        pricePerSeat: 30,
        minSeats: 2,
        description: 'Plus features + shared workspace, admin controls, private data silo',
      },
      enterprise: {
        label: 'Enterprise',
        pricePerSeat: null,
        description: 'Unlimited GPT-5.5, SSO, admin analytics, expanded context window',
      },
    },
    source: 'https://openai.com/chatgpt/pricing/',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: true,
    credexDiscountPercent: 25,
  },

  anthropic_api: {
    displayName: 'Anthropic API',
    plans: {
      haiku: {
        label: 'Claude 4.5 Haiku (API)',
        pricePerSeat: 0,
        description: '$1.00/MTok in, $5.00/MTok out - efficient agentic model',
      },
      sonnet: {
        label: 'Claude 4.6 Sonnet (API)',
        pricePerSeat: 0,
        description: '$3.00/MTok in, $15.00/MTok out - industry standard for coding',
      },
      opus: {
        label: 'Claude 4.7 Opus (API)',
        pricePerSeat: 0,
        description: '$5.00/MTok in, $25.00/MTok out - reasoning flagship (recent price drop)',
      },
      mixed: {
        label: 'Mixed Models (API)',
        pricePerSeat: 0,
        description: 'Multiple Claude model tiers via API',
      },
    },
    source: 'https://www.anthropic.com/pricing#api',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: true,
    credexDiscountPercent: 35,
  },

  openai_api: {
    displayName: 'OpenAI API',
    plans: {
      gpt5_mini: {
        label: 'GPT-5.4 Mini (API)',
        pricePerSeat: 0,
        description: '$0.25/MTok in, $2.00/MTok out - high-speed summarization',
      },
      gpt5: {
        label: 'GPT-5.4 (API)',
        pricePerSeat: 0,
        description: '$2.50/MTok in, $15.00/MTok out - flagship reasoning model',
      },
      gpt5_ultra: {
        label: 'GPT-5.5 (API)',
        pricePerSeat: 0,
        description: '$5.00/MTok in, $30.00/MTok out - frontier capability',
      },
      mixed: {
        label: 'Mixed Models (API)',
        pricePerSeat: 0,
        description: 'Multiple OpenAI model tiers via API',
      },
    },
    source: 'https://openai.com/api/pricing/',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: true,
    credexDiscountPercent: 30,
  },

  gemini: {
    displayName: 'Gemini (Google)',
    plans: {
      free: {
        label: 'Gemini Free',
        pricePerSeat: 0,
        description: 'Gemini 2.0 Flash, limited usage',
      },
      ai_premium: {
        label: 'Google AI Premium',
        pricePerSeat: 19.99,
        minSeats: 1,
        description: 'Gemini 2.0 Pro, 2TB Google One storage, integrated in Docs/Sheets',
      },
      api_flash: {
        label: 'Gemini 2.0 Flash (API)',
        pricePerSeat: 0,
        description: '$0.10/MTok in, $0.40/MTok out - ultra-fast inference',
      },
      api_pro: {
        label: 'Gemini 2.0 Pro (API)',
        pricePerSeat: 0,
        description: '$3.50/MTok in (>128K ctx), $10.50/MTok out',
      },
      workspace: {
        label: 'Google Workspace + Gemini',
        pricePerSeat: 30,
        minSeats: 1,
        description: 'Workspace Business Standard + Gemini add-on combined seat',
      },
    },
    source: 'https://one.google.com/about/google-ai-premium/',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: false,
    credexDiscountPercent: 0,
  },

  windsurf: {
    displayName: 'Windsurf (Codeium)',
    plans: {
      free: {
        label: 'Free',
        pricePerSeat: 0,
        description: 'Daily refreshing Flow Action quota',
      },
      pro: {
        label: 'Pro',
        pricePerSeat: 20,
        minSeats: 1,
        description: 'High Flow Action quota, unlimited completions, premium models',
      },
      max: {
        label: 'Max',
        pricePerSeat: 200,
        minSeats: 1,
        description: 'Highest usage quotas for enterprise-grade power users',
      },
      teams: {
        label: 'Teams',
        pricePerSeat: 40,
        minSeats: 1,
        description: 'Pro features + shared rules, team admin, audit logs',
      },
    },
    source: 'https://windsurf.com/pricing',
    verifiedDate: '2026-05-13',
    supportsCredexCredits: false,
    credexDiscountPercent: 0,
  },
};

export const CREDEX_SUPPORTED_TOOLS: string[] = [
  'cursor',
  'github_copilot',
  'claude',
  'chatgpt',
  'anthropic_api',
  'openai_api',
];

export const CODING_TOOLS: string[] = ['cursor', 'github_copilot', 'windsurf'];
export const GENERAL_AI_TOOLS: string[] = ['claude', 'chatgpt', 'gemini'];
export const API_TOOLS: string[] = ['anthropic_api', 'openai_api', 'gemini'];

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  cursor: 'Cursor',
  github_copilot: 'GitHub Copilot',
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  anthropic_api: 'Anthropic API',
  openai_api: 'OpenAI API',
  gemini: 'Gemini',
  windsurf: 'Windsurf',
};

export const TOOL_ICONS: Record<string, string> = {
  cursor: 'CR',
  github_copilot: 'GH',
  claude: 'CL',
  chatgpt: 'GP',
  anthropic_api: 'AP',
  openai_api: 'OA',
  gemini: 'GM',
  windsurf: 'WS',
};
