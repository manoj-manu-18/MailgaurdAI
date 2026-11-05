import { MLPrediction, NormalizedEmail, ThreatType } from '../../src/types.js';

function isTokenNegated(text: string, matchIndex: number): boolean {
  const lastBoundary = Math.max(
    0,
    text.lastIndexOf('.', matchIndex),
    text.lastIndexOf('\n', matchIndex),
    matchIndex - 80
  );
  const prefix = text.slice(lastBoundary, matchIndex).trim();
  return /(^|[;,:.\s])(no|not|never|without|don't|do not|free from)\b/i.test(prefix);
}

function hasActiveToken(text: string, token: string): boolean {
  let searchStart = 0;
  while (searchStart < text.length) {
    const idx = text.indexOf(token, searchStart);
    if (idx === -1) break;
    if (!isTokenNegated(text, idx)) {
      return true;
    }
    searchStart = idx + token.length;
  }
  return false;
}

export function predictEmailML(email: NormalizedEmail): MLPrediction {
  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  
  // Feature extraction simulation based on classical TF-IDF / Naive Bayes / Random Forest bag of words
  const suspiciousTokens = ['password', 'verify', 'urgent', 'login', 'cash', 'wire', 'lottery', 'invoice', '.exe', 'metamask', 'billing'];
  let hitCount = 0;
  suspiciousTokens.forEach(token => {
    if (hasActiveToken(text, token)) hitCount++;
  });

  const urlCount = email.urls.length;
  const executableAttachments = email.attachments.filter(a => a.isExecutableOrScript || a.hasDoubleExtension).length;

  let category: ThreatType = 'SAFE';
  let prob = 0.08;

  if (executableAttachments > 0) {
    category = 'SUSPICIOUS_ATTACHMENT';
    prob = 0.98;
  } else if (hasActiveToken(text, 'seed phrase') || hasActiveToken(text, 'office365') || hasActiveToken(text, 'password') || hasActiveToken(text, 'verify')) {
    category = 'PHISHING';
    prob = 0.91;
  } else if (hasActiveToken(text, 'lottery') || hasActiveToken(text, 'check') || hasActiveToken(text, 'wire')) {
    category = 'SCAM_FRAUD';
    prob = 0.86;
  } else if (urlCount > 0 && email.urls.some(u => u.hasIpAddress || u.isShortened)) {
    category = 'MALICIOUS_URL';
    prob = 0.89;
  } else if (hitCount > 3) {
    category = 'SPAM';
    prob = 0.78;
  }

  return {
    modelName: 'Random Forest (TF-IDF Hybrid)',
    predictedCategory: category,
    probability: prob,
    isConfigured: true
  };
}

