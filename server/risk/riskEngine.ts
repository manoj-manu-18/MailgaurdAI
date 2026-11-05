import {
  AttachmentAgentResult,
  ContentAgentResult,
  MLPrediction,
  RiskScoreBreakdown,
  ScamAgentResult,
  SenderAgentResult,
  SeverityLevel,
  URLAgentResult
} from '../../src/types.js';

export function calculateRiskScore(
  contentRes: ContentAgentResult,
  senderRes: SenderAgentResult,
  urlRes: URLAgentResult,
  attRes: AttachmentAgentResult,
  scamRes: ScamAgentResult,
  mlPred: MLPrediction
): RiskScoreBreakdown {
  const contentRisk = Math.round(contentRes.phishingProbability * 40 + contentRes.scamProbability * 30 + (contentRes.urgencyScore / 100) * 30);
  const senderRisk = senderRes.riskScore;
  const urlRisk = urlRes.maxUrlRisk;
  const attachmentRisk = attRes.riskScore;
  const scamRisk = Math.round(scamRes.scamProbability * 100);
  const mlRisk = mlPred.predictedCategory === 'SAFE' ? 10 : Math.round(mlPred.probability * 100);

  // Transparent weighted combination:
  // Highest risk agent provides strong floor to ensure critical threats aren't diluted
  const maxSubScore = Math.max(contentRisk, senderRisk, urlRisk, attachmentRisk, scamRisk);

  // Average of active signals
  const weightedAverage = Math.round(
    contentRisk * 0.20 +
    senderRisk * 0.20 +
    urlRisk * 0.25 +
    attachmentRisk * 0.25 +
    scamRisk * 0.10
  );

  // Final combined score with max floor boost
  let overallScore = Math.round(maxSubScore * 0.65 + weightedAverage * 0.35);

  if (overallScore > 100) overallScore = 100;
  if (overallScore < 0) overallScore = 0;

  let severity: SeverityLevel = 'SAFE';
  if (overallScore >= 81) severity = 'CRITICAL';
  else if (overallScore >= 61) severity = 'HIGH';
  else if (overallScore >= 41) severity = 'MEDIUM';
  else if (overallScore >= 21) severity = 'LOW';

  const contributingFactors: Array<{ factor: string; impact: number; description: string }> = [];

  if (senderRisk > 30) {
    contributingFactors.push({
      factor: 'Sender Authentication & Domain Integrity',
      impact: senderRisk,
      description: senderRes.indicators[0] || 'Domain mismatch or sender spoofing detected'
    });
  }

  if (urlRisk > 30) {
    contributingFactors.push({
      factor: 'Malicious Web Link Destinations',
      impact: urlRisk,
      description: urlRes.indicators[0] || 'Unsafe IP or credential harvesting URLs'
    });
  }

  if (attachmentRisk > 30) {
    contributingFactors.push({
      factor: 'Dangerous File Payload',
      impact: attachmentRisk,
      description: attRes.indicators[0] || 'Executable or double extension file payload'
    });
  }

  if (contentRisk > 30) {
    contributingFactors.push({
      factor: 'Social Engineering & Urgent Content',
      impact: contentRisk,
      description: contentRes.indicators[0] || 'Credential harvesting or artificial urgency pressure'
    });
  }

  if (scamRisk > 30) {
    contributingFactors.push({
      factor: 'Financial Fraud & Scam Pattern',
      impact: scamRisk,
      description: scamRes.indicators[0] || 'Advance fee check or crypto seed harvest pattern'
    });
  }

  return {
    overallScore,
    severity,
    contentRisk,
    senderRisk,
    urlRisk,
    attachmentRisk,
    scamRisk,
    mlRisk,
    contributingFactors
  };
}
