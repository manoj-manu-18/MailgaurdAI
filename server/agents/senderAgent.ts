import { NormalizedEmail, SenderAgentResult } from '../../src/types.js';

export function analyzeSender(email: NormalizedEmail): SenderAgentResult {
  const sender = email.sender;
  const indicators: string[] = [];
  let riskScore = 0;

  let domainMismatch = false;
  let possibleImpersonation = false;
  let suspiciousDomainChars = false;
  let brandImpersonationName: string | undefined = undefined;

  const senderEmailLower = sender.email.toLowerCase();
  const domainLower = sender.domain.toLowerCase();
  const displayNameLower = (sender.name || '').toLowerCase().trim();
  const localPartLower = senderEmailLower.split('@')[0] || '';

  // Reply-To mismatch check
  if (sender.replyTo && sender.replyTo.trim() !== '' && sender.replyTo.toLowerCase() !== senderEmailLower) {
    const replyToDomain = (sender.replyTo.split('@')[1] || '').toLowerCase().trim();
    if (replyToDomain && replyToDomain !== domainLower) {
      domainMismatch = true;
      riskScore += 35;
      indicators.push(`Reply-To domain mismatch: Email from "${domainLower}" requests replies to "${replyToDomain}"`);
    }
  }

  // Protected brand impersonation rules:
  // - name: Brand title
  // - brandTerms: phrases that claim official organization or corporate service authority
  // - authenticDomains: authorized corporate sender domains
  const protectedBrands = [
    {
      name: 'Google / GCP',
      brandTerms: ['google security', 'google support', 'google cloud', 'gcp billing', 'google workspace', 'google team', 'gmail support team', 'google admin'],
      authenticDomains: ['google.com', 'googlemail.com', 'youtube.com']
    },
    {
      name: 'Microsoft / Office365',
      brandTerms: ['office365', 'microsoft', 'msft support', 'outlook security', 'microsoft team', 'microsoft security', 'azure billing', 'office 365'],
      authenticDomains: ['microsoft.com', 'office.com', 'microsoftonline.com', 'azure.com']
    },
    {
      name: 'MetaMask',
      brandTerms: ['metamask', 'metamask support', 'metamask security', 'metamask io'],
      authenticDomains: ['metamask.io']
    },
    {
      name: 'Apple',
      brandTerms: ['apple support', 'apple security', 'icloud support', 'apple id', 'appleid team', 'apple care'],
      authenticDomains: ['apple.com', 'icloud.com']
    },
    {
      name: 'PayPal',
      brandTerms: ['paypal', 'service-paypal', 'paypal security', 'paypal support', 'paypal billing'],
      authenticDomains: ['paypal.com', 'paypal-communication.com']
    }
  ];

  for (const brand of protectedBrands) {
    // If the domain is an authentic domain for this brand, it is authorized
    const isAuthenticDomain = brand.authenticDomains.some(d => domainLower === d || domainLower.endsWith('.' + d));
    if (isAuthenticDomain) {
      continue;
    }

    // Only flag brand impersonation if the display name or local email username explicitly claims the brand's identity
    const displayClaimsBrand = brand.brandTerms.some(term => displayNameLower.includes(term));
    const localPartClaimsBrand = brand.brandTerms.some(term => {
      const normalizedTerm = term.replace(/\s+/g, '');
      const hyphenatedTerm = term.replace(/\s+/g, '-');
      return localPartLower === normalizedTerm || localPartLower.includes(hyphenatedTerm) || localPartLower.includes(normalizedTerm);
    });

    if (displayClaimsBrand || localPartClaimsBrand) {
      possibleImpersonation = true;
      brandImpersonationName = brand.name;
      riskScore += 45;
      indicators.push(`Possible brand impersonation: Display name or username claims "${brand.name}", but domain is "${domainLower}" (expected ${brand.authenticDomains.join(' or ')})`);
      break;
    }
  }

  // Suspicious TLD check
  const suspiciousTLDs = ['.top', '.xyz', '.biz', '.cc', '.info', '.work', '.net'];
  if (suspiciousTLDs.some(tld => domainLower.endsWith(tld))) {
    suspiciousDomainChars = true;
    riskScore += 20;
    indicators.push(`Domain uses high-risk security TLD extension: "${domainLower}"`);
  }

  // Check header authentication results (SPF / DKIM failures)
  if (email.headers.SPF === 'fail' || email.headers.DKIM === 'fail') {
    riskScore += 25;
    indicators.push(`Email authentication failed: SPF=${email.headers.SPF || 'none'}, DKIM=${email.headers.DKIM || 'none'}`);
  }

  riskScore = Math.min(100, riskScore);

  return {
    agent: 'sender',
    domainMismatch,
    possibleImpersonation,
    suspiciousDomainChars,
    brandImpersonationName,
    indicators,
    confidence: indicators.length > 0 ? 0.94 : 0.88,
    riskScore
  };
}

