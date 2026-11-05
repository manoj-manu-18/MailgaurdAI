import { ContentAgentResult, NormalizedEmail } from '../../src/types.js';

/**
 * Checks if a keyword occurrence at matchIndex in text is part of a negated phrase
 * (e.g., "no password", "no payment information", "no urgent request", "never send password", "without any password")
 */
function isKeywordNegated(text: string, matchIndex: number, matchLength: number): boolean {
  // 1. Look behind: Find the preceding clause/sentence boundary (up to 120 chars)
  const lastBoundary = Math.max(
    0,
    text.lastIndexOf('.', matchIndex),
    text.lastIndexOf('!', matchIndex),
    text.lastIndexOf('?', matchIndex),
    text.lastIndexOf('\n', matchIndex),
    matchIndex - 120
  );

  const prefix = text.slice(lastBoundary, matchIndex).trim();

  // Common negation prefixes (including list enumeration e.g., "no X, Y, Z")
  const negationPrefixRegex = /(^|[;,:.\s])(no|not|never|neither|nor|without|don't|dont|do not|won't|wont|will not|cannot|can't|cant|should not|shouldn't|never ask|never send|never share|never request|do not send|do not share|do not click|no need for|no requirement for|free from)\b/i;

  if (negationPrefixRegex.test(prefix)) {
    return true;
  }

  // 2. Look ahead: Find the following clause/sentence boundary (up to 80 chars)
  const nextBoundary = Math.min(
    text.length,
    matchIndex + matchLength + 80
  );

  const suffix = text.slice(matchIndex + matchLength, nextBoundary);

  // Common negation suffixes
  const negationSuffixRegex = /\b(is not required|are not required|is not included|are not included|not needed|not requested|is not requested|are not requested|was not requested)\b/i;

  if (negationSuffixRegex.test(suffix)) {
    return true;
  }

  return false;
}

/**
 * Finds keywords in text that represent active threat intent (i.e. NOT negated)
 */
function findActiveKeywords(text: string, keywords: string[]): string[] {
  const activeHits: string[] = [];

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    let searchStart = 0;

    while (searchStart < text.length) {
      const idx = text.indexOf(kwLower, searchStart);
      if (idx === -1) break;

      // Word boundary check to prevent matching substrings of other words
      const beforeChar = idx > 0 ? text[idx - 1] : ' ';
      const afterChar = idx + kwLower.length < text.length ? text[idx + kwLower.length] : ' ';
      const isWordBoundary = /[^a-z0-9]/i.test(beforeChar) && /[^a-z0-9]/i.test(afterChar);

      if (isWordBoundary) {
        if (!isKeywordNegated(text, idx, kwLower.length)) {
          if (!activeHits.includes(kw)) {
            activeHits.push(kw);
          }
          break; // Found at least one genuine, non-negated active occurrence of this keyword
        }
      }

      searchStart = idx + kwLower.length;
    }
  }

  return activeHits;
}

export function analyzeContent(email: NormalizedEmail): ContentAgentResult {
  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  const indicators: string[] = [];

  // Urgency detection
  const urgencyKeywords = [
    'urgent', 'immediately', 'in 2 hours', 'in 24 hours', 'action required', 
    'permanent locking', 'termination', 'within 1 hour', 'expired', 'suspended',
    'account will expire', 'will be deleted', 'act now'
  ];
  const activeUrgencyHits = findActiveKeywords(text, urgencyKeywords);
  activeUrgencyHits.forEach(kw => {
    indicators.push(`Urgent pressure tactic detected: "${kw}"`);
  });
  const urgencyHits = activeUrgencyHits.length;

  // Financial request detection
  const financialKeywords = [
    'wire transfer', 'zelle', 'check payment', 'cashier check', 'deposit check', 
    '$2,500,000', '$3,500', 'bank account details', 'routing number', 'bitcoin transfer', 'crypto deposit'
  ];
  const activeFinancialHits = findActiveKeywords(text, financialKeywords);
  const financialRequest = activeFinancialHits.length > 0;
  activeFinancialHits.forEach(kw => {
    indicators.push(`Financial/monetary claim detected: "${kw}"`);
  });

  // Credential request detection
  const credentialKeywords = [
    'password', 'login credentials', 'seed phrase', '12-word', 'verify your account', 
    'update billing', 'restore phrase', 'secret recovery phrase', 'enter your password',
    'confirm password', 'reset your password', 'provide credentials'
  ];
  const activeCredentialHits = findActiveKeywords(text, credentialKeywords);
  const credentialRequest = activeCredentialHits.length > 0;
  activeCredentialHits.forEach(kw => {
    indicators.push(`Credential or secret token solicitation detected: "${kw}"`);
  });

  // Scam / Lottery keywords
  const scamKeywords = ['congratulations', 'won lottery', 'lucky winner', 'mega millions', 'cash prize winner', 'won the lottery'];
  const activeScamHits = findActiveKeywords(text, scamKeywords);
  activeScamHits.forEach(kw => {
    indicators.push(`Lottery / unexpected award language detected: "${kw}"`);
  });
  const scamHits = activeScamHits.length;

  const urgencyScore = Math.min(100, urgencyHits * 25);
  const spamProbability = scamHits > 0 ? 0.85 : (text.includes('promo code') || text.includes('special discount') ? 0.6 : 0.05);
  const phishingProbability = credentialRequest ? 0.92 : (urgencyHits >= 2 ? 0.75 : 0.05);
  const scamProbability = financialRequest && (scamHits > 0 || urgencyHits > 0) ? 0.88 : (financialRequest ? 0.65 : 0.05);

  const confidence = indicators.length > 0 ? 0.95 : 0.90;

  return {
    agent: 'content',
    spamProbability,
    phishingProbability,
    scamProbability,
    urgencyScore,
    financialRequest,
    credentialRequest,
    indicators,
    confidence
  };
}

