export type ThreatType =
  | 'SAFE'
  | 'SPAM'
  | 'PHISHING'
  | 'SCAM_FRAUD'
  | 'MALICIOUS_URL'
  | 'SUSPICIOUS_ATTACHMENT'
  | 'IMPERSONATION'
  | 'MULTI_THREAT';

export type SeverityLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SenderInfo {
  name: string;
  email: string;
  domain: string;
  replyTo?: string;
  isDomainVerified?: boolean;
}

export interface URLMetadata {
  url: string;
  domain: string;
  isHttps: boolean;
  isShortened: boolean;
  hasIpAddress: boolean;
  suspiciousKeywords: string[];
  riskScore: number;
  indicators: string[];
}

export interface AttachmentMetadata {
  filename: string;
  fileExtension: string;
  mimeType: string;
  sizeBytes: number;
  isExecutableOrScript: boolean;
  isArchive: boolean;
  hasDoubleExtension: boolean;
  indicators: string[];
  riskScore: number;
}

export type EmailSource = 'INBOX' | 'SPAM';

export interface NormalizedEmail {
  id: string;
  rawGmailId?: string;
  messageId: string;
  threadId: string;
  sender: SenderInfo;
  recipients: string[];
  cc?: string[];
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  urls: URLMetadata[];
  attachments: AttachmentMetadata[];
  headers: Record<string, string>;
  receivedAt: string;
  internalDate?: number;
  isDemo?: boolean;
  source?: EmailSource;
}


export interface ContentAgentResult {
  agent: 'content';
  spamProbability: number;
  phishingProbability: number;
  scamProbability: number;
  urgencyScore: number;
  financialRequest: boolean;
  credentialRequest: boolean;
  indicators: string[];
  confidence: number;
}

export interface SenderAgentResult {
  agent: 'sender';
  domainMismatch: boolean;
  possibleImpersonation: boolean;
  suspiciousDomainChars: boolean;
  brandImpersonationName?: string;
  indicators: string[];
  confidence: number;
  riskScore: number;
}

export interface URLAgentResult {
  agent: 'url';
  totalUrls: number;
  suspiciousUrlsCount: number;
  maxUrlRisk: number;
  urls: URLMetadata[];
  indicators: string[];
  confidence: number;
}

export interface AttachmentAgentResult {
  agent: 'attachment';
  totalAttachments: number;
  highRiskCount: number;
  attachments: AttachmentMetadata[];
  indicators: string[];
  confidence: number;
  riskScore: number;
}

export interface ScamAgentResult {
  agent: 'scam';
  isPaymentRequest: boolean;
  isCryptoScam: boolean;
  isPrizeScam: boolean;
  isJobScam: boolean;
  isAccountTakeover: boolean;
  scamProbability: number;
  indicators: string[];
  confidence: number;
}

export interface MultiAgentAnalysis {
  contentAgent: ContentAgentResult;
  senderAgent: SenderAgentResult;
  urlAgent: URLAgentResult;
  attachmentAgent: AttachmentAgentResult;
  scamAgent: ScamAgentResult;
  orchestratorTimestamp: string;
  orchestratorNotes: string;
}

export interface MLPrediction {
  modelName: string;
  predictedCategory: ThreatType;
  probability: number;
  isConfigured: boolean;
}

export interface RiskScoreBreakdown {
  overallScore: number; // 0-100
  severity: SeverityLevel;
  contentRisk: number;
  senderRisk: number;
  urlRisk: number;
  attachmentRisk: number;
  scamRisk: number;
  mlRisk: number;
  contributingFactors: Array<{ factor: string; impact: number; description: string }>;
}

export interface Recommendation {
  action: 'MOVE_TO_SPAM' | 'MARK_SUSPICIOUS' | 'APPLY_SECURITY_LABEL' | 'MARK_SAFE' | 'QUARANTINE';
  title: string;
  explanation: string;
  suggestedGmailLabel?: string;
}

export interface ThreatAnalysis {
  id: string;
  email: NormalizedEmail;
  threatTypes: ThreatType[];
  primaryThreat: ThreatType;
  riskScore: RiskScoreBreakdown;
  multiAgentAnalysis: MultiAgentAnalysis;
  mlPrediction: MLPrediction;
  aiExplanation: {
    summary: string;
    reasons: string[];
    evidencePoints: string[];
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    generatedByGemini: boolean;
  };
  recommendation: Recommendation;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISMISSED' | 'FAILED';
  failureReason?: string;
  userActionTaken?: string;
  processedAt: string;
  isDemo: boolean;
  source?: EmailSource;
  accountEmail?: string;
  isCached?: boolean;
  isNew?: boolean;
  inLatestRun?: boolean;
}


export interface NotificationItem {
  id: string;
  threatId: string;
  subject: string;
  senderEmail: string;
  threatType: ThreatType;
  riskScore: number;
  severity: SeverityLevel;
  timestamp: string;
  read: boolean;
}

export interface UserFeedback {
  id: string;
  threatId: string;
  emailId: string;
  originalPrediction: ThreatType;
  originalRiskScore: number;
  userAssignedLabel: 'SAFE' | 'SPAM' | 'PHISHING' | 'SCAM' | 'MALICIOUS_URL';
  isCorrect: boolean;
  notes?: string;
  submittedAt: string;
}

export interface ModelEvaluation {
  architectureName: string; // e.g., "Traditional ML (Random Forest)", "Single LLM", "Multi-Agent LLM", "Hybrid MailGuard AI"
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sampleCount: number;
  avgLatencyMs: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  confusionMatrix: {
    trueSafe: number;
    falseSafe: number;
    trueThreat: number;
    falseThreat: number;
  };
}

export interface SourceMetrics {
  analyzed: number;
  threats: number;
  highRisk: number;
  safe?: number;
  failed?: number;
}

export interface EmailSourcesSummary {
  inbox: SourceMetrics;
  spam: SourceMetrics;
  total: SourceMetrics;
}

export interface AnalysisRunStats {
  retrievedCount: number;
  inboxRetrieved: number;
  spamRetrieved: number;
  analyzedCount: number;
  threatsDetectedCount: number;
  safeCount: number;
  failedCount: number;
  cachedCount: number;
  newCount: number;
  completedAt: string;
  scope?: 'INBOX' | 'SPAM' | 'ALL';
  inboxStats?: SourceMetrics;
  spamStats?: SourceMetrics;
}

export interface GmailAccountState {
  isConnected: boolean;
  email?: string;
  expectedEmail?: string;
  accountMismatch?: boolean;
  connectedAt?: string;
  status: 'ACTIVE' | 'DISCONNECTED' | 'DEMO_MODE';
  lastSyncedAt?: string;
  totalEmailsMonitored: number;
  threatsDetected: number;
  watchExpiration?: string;
  emailSourcesSummary?: EmailSourcesSummary;
  analysisRunStats?: AnalysisRunStats;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface SystemSettings {
  soundEnabled: boolean;
  soundVolume: number;
  soundType: 'POLICE_SIREN' | 'SECURITY_PING' | 'DIGITAL_BEEP';
  autoRefreshIntervalSeconds: number;
  riskThresholds: {
    low: number; // e.g. 21
    medium: number; // e.g. 41
    high: number; // e.g. 61
    critical: number; // e.g. 81
  };
  dataRetentionDays: number;
  enableBrowserNotifications: boolean;
}
