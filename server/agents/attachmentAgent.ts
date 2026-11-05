import { AttachmentAgentResult, AttachmentMetadata, NormalizedEmail } from '../../src/types.js';

export function analyzeAttachments(email: NormalizedEmail): AttachmentAgentResult {
  const attachments: AttachmentMetadata[] = [];
  const globalIndicators: string[] = [];
  let maxRisk = 0;

  for (const rawAtt of email.attachments) {
    const indicators: string[] = [...rawAtt.indicators];
    let attRisk = rawAtt.riskScore || 0;

    const lowerName = rawAtt.filename.toLowerCase();
    const ext = rawAtt.fileExtension.toLowerCase();

    // Double extension check
    if (rawAtt.hasDoubleExtension || (lowerName.match(/\.[a-z0-9]+\.[a-z0-9]+$/i) && !lowerName.endsWith('.tar.gz'))) {
      attRisk = Math.max(attRisk, 95);
      if (!indicators.includes('Double extension detected')) {
        indicators.push(`Dangerous double extension obfuscation: "${rawAtt.filename}"`);
      }
    }

    // Executable / Script check
    const dangerousExts = ['exe', 'bat', 'vbs', 'ps1', 'js', 'jar', 'cmd', 'scr', 'pif'];
    if (dangerousExts.includes(ext) || rawAtt.isExecutableOrScript) {
      attRisk = Math.max(attRisk, 90);
      indicators.push(`Executable binary or dangerous script payload extension (.${ext})`);
    }

    maxRisk = Math.max(maxRisk, attRisk);

    attachments.push({
      ...rawAtt,
      riskScore: attRisk,
      indicators
    });

    indicators.forEach(ind => {
      if (!globalIndicators.includes(ind)) globalIndicators.push(ind);
    });
  }

  const highRiskCount = attachments.filter(a => a.riskScore >= 50).length;

  return {
    agent: 'attachment',
    totalAttachments: attachments.length,
    highRiskCount,
    attachments,
    indicators: globalIndicators,
    confidence: attachments.length > 0 ? 0.98 : 0.90,
    riskScore: maxRisk
  };
}
