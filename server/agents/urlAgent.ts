import { NormalizedEmail, URLAgentResult, URLMetadata } from '../../src/types.js';

export function analyzeURLs(email: NormalizedEmail): URLAgentResult {
  const urls: URLMetadata[] = [];
  const globalIndicators: string[] = [];
  let maxRisk = 0;

  for (const rawUrl of email.urls) {
    const indicators: string[] = [...rawUrl.indicators];
    let urlRisk = rawUrl.riskScore || 0;

    // Additional dynamic rule checks on URL
    if (rawUrl.hasIpAddress) {
      urlRisk = Math.max(urlRisk, 90);
      if (!indicators.includes('Raw IP host in URL')) {
        indicators.push('Raw IP address host detected instead of registered domain name');
      }
    }

    if (!rawUrl.isHttps) {
      urlRisk = Math.max(urlRisk, 40);
      indicators.push('Insecure HTTP protocol used for sensitive web destination');
    }

    if (rawUrl.isShortened) {
      urlRisk = Math.max(urlRisk, 65);
      indicators.push('Shortened URL service hides actual destination URL');
    }

    const lowerUrl = rawUrl.url.toLowerCase();
    if (lowerUrl.includes('office365') || lowerUrl.includes('metamask') || lowerUrl.includes('cloud-google') || lowerUrl.includes('login') || lowerUrl.includes('verify')) {
      urlRisk = Math.max(urlRisk, 85);
      indicators.push('URL path targets credential login or account verification interface');
    }

    maxRisk = Math.max(maxRisk, urlRisk);

    urls.push({
      ...rawUrl,
      riskScore: urlRisk,
      indicators
    });

    indicators.forEach(ind => {
      if (!globalIndicators.includes(ind)) globalIndicators.push(ind);
    });
  }

  const suspiciousUrlsCount = urls.filter(u => u.riskScore >= 50).length;

  return {
    agent: 'url',
    totalUrls: urls.length,
    suspiciousUrlsCount,
    maxUrlRisk: maxRisk,
    urls,
    indicators: globalIndicators,
    confidence: urls.length > 0 ? 0.95 : 0.90
  };
}
