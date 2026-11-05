import { NormalizedEmail, ScamAgentResult } from '../../src/types.js';

export function analyzeScam(email: NormalizedEmail): ScamAgentResult {
  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  const indicators: string[] = [];

  let isPaymentRequest = false;
  let isCryptoScam = false;
  let isPrizeScam = false;
  let isJobScam = false;
  let isAccountTakeover = false;

  let scamProb = 0.05;

  if (text.includes('lottery') || text.includes('mega millions') || text.includes('$2,500,000') || text.includes('cash prize')) {
    isPrizeScam = true;
    scamProb = Math.max(scamProb, 0.92);
    indicators.push('Promotional lottery cash prize award scam vector');
  }

  if (text.includes('check') && text.includes('deposit') && (text.includes('wire') || text.includes('zelle') || text.includes('vendor'))) {
    isJobScam = true;
    isPaymentRequest = true;
    scamProb = Math.max(scamProb, 0.90);
    indicators.push('Advance fee / fraudulent equipment check wire scam pattern');
  }

  if (text.includes('seed phrase') || text.includes('12-word') || text.includes('metamask') || text.includes('ethereum') || text.includes('erc-20')) {
    isCryptoScam = true;
    isAccountTakeover = true;
    scamProb = Math.max(scamProb, 0.95);
    indicators.push('Cryptocurrency wallet recovery seed harvesting / asset drainer');
  }

  if (text.includes('account will be permanently deleted') || text.includes('password will expire') || text.includes('action required immediately')) {
    isAccountTakeover = true;
    scamProb = Math.max(scamProb, 0.85);
    indicators.push('Account lockout panic creation / takeover vector');
  }

  return {
    agent: 'scam',
    isPaymentRequest,
    isCryptoScam,
    isPrizeScam,
    isJobScam,
    isAccountTakeover,
    scamProbability: scamProb,
    indicators,
    confidence: indicators.length > 0 ? 0.95 : 0.85
  };
}
