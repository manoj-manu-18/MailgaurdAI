import { analyzeAttachments } from './attachmentAgent.js';
import { analyzeContent } from './contentAgent.js';
import { analyzeScam } from './scamAgent.js';
import { analyzeSender } from './senderAgent.js';
import { analyzeURLs } from './urlAgent.js';
import { predictEmailML } from '../ml/classifier.js';
import { calculateRiskScore } from '../risk/riskEngine.js';
import { generateGeminiExplanation } from '../genai/geminiExplanation.js';
import { MultiAgentAnalysis, NormalizedEmail, ThreatAnalysis, ThreatType } from '../../src/types.js';

export async function runSecurityOrchestrator(email: NormalizedEmail): Promise<ThreatAnalysis> {
  const timestamp = new Date().toISOString();

  // 1. Run specialized agents
  const contentRes = analyzeContent(email);
  const senderRes = analyzeSender(email);
  const urlRes = analyzeURLs(email);
  const attRes = analyzeAttachments(email);
  const scamRes = analyzeScam(email);

  const multiAgentAnalysis: MultiAgentAnalysis = {
    contentAgent: contentRes,
    senderAgent: senderRes,
    urlAgent: urlRes,
    attachmentAgent: attRes,
    scamAgent: scamRes,
    orchestratorTimestamp: timestamp,
    orchestratorNotes: 'Evaluated email through 5 specialized security agents + classical ML feature predictor.'
  };

  // 2. Run traditional ML prediction
  const mlPred = predictEmailML(email);

  // 3. Calculate transparent risk score breakdown
  const riskScore = calculateRiskScore(contentRes, senderRes, urlRes, attRes, scamRes, mlPred);

  // 4. Identify all threat types (multi-threat detection)
  const threatTypes: ThreatType[] = [];

  if (attRes.highRiskCount > 0 || attRes.riskScore >= 70) threatTypes.push('SUSPICIOUS_ATTACHMENT');
  if (senderRes.possibleImpersonation || senderRes.domainMismatch) threatTypes.push('IMPERSONATION');
  if (urlRes.suspiciousUrlsCount > 0 || urlRes.maxUrlRisk >= 70) threatTypes.push('MALICIOUS_URL');
  if (contentRes.phishingProbability >= 0.70 || contentRes.credentialRequest) threatTypes.push('PHISHING');
  if (scamRes.scamProbability >= 0.70 || contentRes.scamProbability >= 0.70) threatTypes.push('SCAM_FRAUD');
  if (contentRes.spamProbability >= 0.70) threatTypes.push('SPAM');

  if (threatTypes.length === 0) {
    if (riskScore.overallScore <= 20) {
      threatTypes.push('SAFE');
    } else {
      threatTypes.push('SPAM');
    }
  }

  let primaryThreat: ThreatType = threatTypes[0];
  if (threatTypes.length > 1) {
    primaryThreat = 'MULTI_THREAT';
  }

  // 5. Generate GenAI explanation & recommendation
  const aiExplanationData = await generateGeminiExplanation(email, multiAgentAnalysis, riskScore, threatTypes);

  const threatId = `threat-${email.id}-${Date.now().toString().slice(-4)}`;

  return {
    id: threatId,
    email,
    threatTypes,
    primaryThreat,
    riskScore,
    multiAgentAnalysis,
    mlPrediction: mlPred,
    aiExplanation: {
      summary: aiExplanationData.summary,
      reasons: aiExplanationData.reasons,
      evidencePoints: aiExplanationData.evidencePoints,
      confidenceLevel: aiExplanationData.confidenceLevel,
      generatedByGemini: aiExplanationData.generatedByGemini
    },
    recommendation: aiExplanationData.recommendation,
    status: 'PENDING_REVIEW',
    processedAt: timestamp,
    isDemo: !!email.isDemo,
    source: email.source || 'INBOX'
  };
}

