import { GoogleGenAI } from '@google/genai';
import { MultiAgentAnalysis, NormalizedEmail, Recommendation, RiskScoreBreakdown, ThreatType } from '../../src/types.js';

let aiClient: GoogleGenAI | null = null;
const explanationCache = new Map<string, any>();

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize Gemini client:', err);
      }
    }
  }
  return aiClient;
}

const CANDIDATE_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];

async function executeGeminiWithRetryAndFallback(prompt: string): Promise<string | null> {
  const client = getGeminiClient();
  if (!client) return null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            abortSignal: controller.signal
          }
        });
        clearTimeout(timeoutId);
        const text = response.text?.trim();
        if (text) return text;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      const status = err?.status || err?.code || '';
      const msg = String(err?.message || err);
      const isQuotaExhausted = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || status === 429 || msg.includes('429');

      if (isQuotaExhausted) {
        console.info(`[Gemini API] Quota exhausted or rate limited. Using rule engine explanations without blocking.`);
        return null;
      }

      const isUnavailable = status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded') || msg.includes('aborted');
      if (isUnavailable) {
        console.info(`[Gemini API] Model API overloaded or timed out. Falling back to rule engine explanation.`);
        return null;
      } else {
        console.info(`[Gemini API] Model ${model} call error: ${msg.slice(0, 100)}`);
        break;
      }
    }
  }

  return null;
}

export async function generateGeminiExplanation(
  email: NormalizedEmail,
  multiAgent: MultiAgentAnalysis,
  riskScore: RiskScoreBreakdown,
  threatTypes: ThreatType[]
): Promise<{
  summary: string;
  reasons: string[];
  evidencePoints: string[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  generatedByGemini: boolean;
  recommendation: Recommendation;
}> {
  // Check in-memory cache first
  const cacheKey = `${email.messageId || email.id}-${riskScore.overallScore}`;
  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey);
  }

  const allIndicators: string[] = [
    ...multiAgent.contentAgent.indicators,
    ...multiAgent.senderAgent.indicators,
    ...multiAgent.urlAgent.indicators,
    ...multiAgent.attachmentAgent.indicators,
    ...multiAgent.scamAgent.indicators
  ];

  // Default deterministic evidence explanation
  const defaultSummary = riskScore.severity === 'SAFE'
    ? 'This email passed all security checks. Sender domain and SPF/DKIM authentication are verified, and no suspicious links or executable payloads were detected.'
    : `Threat Detected: ${threatTypes.join(', ')} with a risk score of ${riskScore.overallScore}/100 (${riskScore.severity}). Multiple specialized security agents identified urgent social engineering, suspicious domain indicators, or unsafe attachment structures.`;

  const defaultReasons = allIndicators.length > 0
    ? allIndicators.slice(0, 5)
    : ['Email authentication and structure match standard expected safe communications.'];

  const defaultRecommendation: Recommendation = riskScore.severity === 'SAFE'
    ? {
        action: 'MARK_SAFE',
        title: 'No Action Needed',
        explanation: 'Email is verified safe. You can interact with this message normally.'
      }
    : riskScore.severity === 'CRITICAL' || riskScore.severity === 'HIGH'
    ? {
        action: 'MOVE_TO_SPAM',
        title: 'Move Email to Spam / Quarantine',
        explanation: 'Do not click any links or download attachments. Move this message to Spam to prevent credential theft or malware execution.',
        suggestedGmailLabel: 'MailGuard/Threat-Blocked'
      }
    : {
        action: 'MARK_SUSPICIOUS',
        title: 'Flag as Suspicious',
        explanation: 'Proceed with caution. Verify sender via an out-of-band communication channel before acting on any request.',
        suggestedGmailLabel: 'MailGuard/Suspicious'
      };

  const client = getGeminiClient();
  if (!client) {
    const fallbackResult = {
      summary: defaultSummary,
      reasons: defaultReasons,
      evidencePoints: allIndicators,
      confidenceLevel: 'HIGH' as const,
      generatedByGemini: false,
      recommendation: defaultRecommendation
    };
    explanationCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  const prompt = `You are the lead AI Security Analyst for MailGuard AI.
Analyze the following email security context and produce a clear, accurate, human-readable security assessment in JSON format.

EMAIL DETAILS:
- Subject: "${email.subject}"
- Sender: "${email.sender.name}" <${email.sender.email}> (Domain: ${email.sender.domain})
- Full Body Text: "${email.bodyText.slice(0, 1000)}"

SECURITY AGENT DETECTED EVIDENCE:
${allIndicators.length > 0 ? allIndicators.map(i => `- ${i}`).join('\n') : '- No automated threat indicators detected. All checks passed.'}

RISK METRICS:
- Overall Score: ${riskScore.overallScore}/100
- Severity: ${riskScore.severity}
- Threat Categories: ${threatTypes.join(', ')}

CRITICAL EVALUATION GUIDELINES:
1. Contextually evaluate the actual email subject, sender, and body text.
2. The 'SECURITY AGENT DETECTED EVIDENCE' contains preliminary automated findings. You must contextually validate them against the real email text rather than blindly repeating them as confirmed threats.
3. Handle negated/benign statements accurately: Statements like "No password, payment information, urgent request, suspicious links, or attachments are included" are explicitly safe and must NEVER be flagged as active credential requests, payment solicitations, or urgency tactics.
4. For safe/low-risk emails, provide a reassuring explanation affirming that the message is clean and passed security inspections.
5. For genuine threats (e.g., active credential theft, extortion, domain spoofing, suspicious links), explain the specific danger clearly and concisely.

Please output strictly valid JSON matching this schema:
{
  "summary": "1-2 sentence plain language summary of the security assessment",
  "reasons": ["Reason 1", "Reason 2", "Reason 3"],
  "recommendationTitle": "Short title of recommended action (e.g. 'No Action Needed' for safe emails, or 'Move Email to Spam / Quarantine' for threats)",
  "recommendationExplanation": "1-2 sentences explaining why the user should take this action"
}`;

  const textResult = await executeGeminiWithRetryAndFallback(prompt);

  if (textResult) {
    try {
      const parsed = JSON.parse(textResult);
      const result = {
        summary: parsed.summary || defaultSummary,
        reasons: Array.isArray(parsed.reasons) && parsed.reasons.length > 0 ? parsed.reasons : defaultReasons,
        evidencePoints: allIndicators,
        confidenceLevel: 'HIGH' as const,
        generatedByGemini: true,
        recommendation: {
          action: defaultRecommendation.action,
          title: parsed.recommendationTitle || defaultRecommendation.title,
          explanation: parsed.recommendationExplanation || defaultRecommendation.explanation,
          suggestedGmailLabel: defaultRecommendation.suggestedGmailLabel
        }
      };
      explanationCache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.info('[Gemini API] Could not parse JSON response, using deterministic analysis fallback.');
    }
  }

  // Graceful fallback to multi-agent deterministic rules engine
  const fallbackResult = {
    summary: defaultSummary,
    reasons: defaultReasons,
    evidencePoints: allIndicators,
    confidenceLevel: 'HIGH' as const,
    generatedByGemini: false,
    recommendation: defaultRecommendation
  };
  explanationCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

