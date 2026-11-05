import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Sparkles,
  Link2,
  FileWarning,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  Mail,
  User,
  MessageSquareCode,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThreatAnalysis } from '../types';
import { ThreatSeverityBadge } from '../components/ThreatSeverityBadge';
import { ThreatCategoryBadge } from '../components/ThreatCategoryBadge';

interface Props {
  threat: ThreatAnalysis | null;
  onBack: () => void;
  onApprove: (threatId: string) => Promise<void>;
  onReject: (threatId: string) => Promise<void>;
  onSubmitFeedback: (threatId: string, label: string, notes: string) => Promise<void>;
}

export const ThreatDetailPage: React.FC<Props> = ({
  threat,
  onBack,
  onApprove,
  onReject,
  onSubmitFeedback
}) => {
  const [feedbackLabel, setFeedbackLabel] = useState<string>('SAFE');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!threat) {
    return (
      <div className="p-10 text-center text-slate-400 bg-[#0d121c] border border-slate-800/80 rounded-lg max-w-4xl mx-auto my-6">
        <ShieldAlert className="w-7 h-7 mx-auto text-slate-500 mb-2" />
        <p className="font-medium text-slate-200 text-xs">No threat incident selected.</p>
        <button
          onClick={onBack}
          className="mt-3 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-medium transition-all duration-150 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleApproveAction = async () => {
    setIsProcessingAction(true);
    setActionSuccessMessage(null);
    try {
      await onApprove(threat.id);
      setActionSuccessMessage('Email successfully moved to Gmail Spam/Quarantine folder.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectAction = async () => {
    setIsProcessingAction(true);
    setActionSuccessMessage(null);
    try {
      await onReject(threat.id);
      setActionSuccessMessage('Email marked as Safe and retained in your inbox.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitFeedback(threat.id, feedbackLabel, feedbackNotes);
    setFeedbackSubmitted(true);
  };

  const isCritical = threat.riskScore.severity === 'CRITICAL';
  const isHigh = threat.riskScore.severity === 'HIGH';

  // Detection reason derived from recommendation explanation or top AI reason
  const detectionReason =
    threat.aiExplanation?.reasons?.[0] ||
    threat.recommendation?.explanation ||
    'Suspicious indicators detected across multi-agent analysis.';

  return (
    <div className="space-y-4 sm:space-y-5 text-slate-100 max-w-5xl mx-auto pb-10">
      
      {/* 1. Navigation Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex items-center justify-between pb-3 border-b border-slate-800/80"
      >
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-md bg-[#0d121c] border border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-[0.98] text-xs text-slate-300 hover:text-white font-medium flex items-center space-x-2 transition-all duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </button>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500">Incident ID:</span>
          <span className="text-blue-400 font-semibold">{threat.id}</span>
        </div>
      </motion.div>

      {/* 2. Primary Threat Overview & Decision Card (Immediately Visible Above The Fold) */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`p-4 sm:p-5 bg-[#0d121c] border rounded-lg space-y-4 transition-all duration-150 ${
          isCritical
            ? 'border-rose-900/60 shadow-xs shadow-rose-950/40'
            : isHigh
            ? 'border-orange-900/60 shadow-xs shadow-orange-950/40'
            : 'border-slate-800/80'
        }`}
      >
        {/* Top Header: Severity, Category, Risk Score */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ThreatSeverityBadge severity={threat.riskScore.severity} />
              <ThreatCategoryBadge threatType={threat.primaryThreat} />
              <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                threat.source === 'SPAM'
                  ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                  : 'bg-blue-950/30 text-blue-300 border-blue-800/40'
              }`}>
                <span>Email Source:</span>
                <span className="font-bold underline uppercase">{threat.source || 'INBOX'}</span>
              </span>
              {threat.isDemo ? (
                <span className="inline-flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span>Demo Incident</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 text-[11px] text-emerald-400 font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Live Gmail</span>
                  {threat.accountEmail && (
                    <span className="text-[10px] text-slate-400 font-normal">({threat.accountEmail})</span>
                  )}
                </span>
              )}
            </div>

            {/* Email Subject Headline */}
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 break-words">
              {threat.email.subject || '(No Subject)'}
            </h1>

            {/* Sender and Timing */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">From:</span>
                <span className="font-semibold text-slate-200">{threat.email.sender.name || 'Unknown'}</span>
                <span className="font-mono text-slate-400 text-[11px]">&lt;{threat.email.sender.email}&gt;</span>
              </div>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <div className="flex items-center space-x-1.5 font-mono text-[11px] tabular-nums text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{new Date(threat.email.receivedAt || threat.processedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Prominent Risk Score Meter */}
          <div className="sm:self-start bg-[#090d15] border border-slate-800/90 rounded-lg p-3 text-center sm:text-right shrink-0 min-w-[120px]">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block tracking-wider mb-0.5">
              Risk Score
            </span>
            <div className={`text-3xl font-extrabold font-mono tabular-nums leading-none ${
              threat.riskScore.overallScore >= 80 ? 'text-rose-400' :
              threat.riskScore.overallScore >= 60 ? 'text-orange-400' :
              threat.riskScore.overallScore >= 40 ? 'text-amber-400' :
              threat.riskScore.overallScore >= 20 ? 'text-sky-400' : 'text-emerald-400'
            }`}>
              {threat.riskScore.overallScore}
              <span className="text-xs text-slate-500 font-normal ml-1 font-sans">/ 100</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider font-mono">
              {threat.riskScore.severity} SEVERITY
            </div>
          </div>
        </div>

        {/* Detection Reason & Recommended Action Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          
          {/* Detection Reason */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
              Detection Reason
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {detectionReason}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1">
            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block">
              Recommended Action
            </span>
            <p className="text-slate-300 font-medium text-[11px]">
              {threat.recommendation?.title || 'Review Required'}
            </p>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              {threat.recommendation?.explanation || 'Inspect multi-agent telemetry and take remediation below.'}
            </p>
          </div>

        </div>

        {/* Remediation Action Controls: Primary (MOVE TO SPAM) & Secondary (MARK SAFE) */}
        <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action Button: MOVE TO SPAM / QUARANTINE */}
            <button
              onClick={handleApproveAction}
              disabled={isProcessingAction || threat.status === 'APPROVED'}
              className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed shadow-sm ${
                threat.status === 'APPROVED'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
                  : 'bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white shadow-rose-950/50'
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                {isProcessingAction
                  ? 'Executing Action...'
                  : threat.status === 'APPROVED'
                  ? 'Quarantined / Moved to Spam'
                  : 'MOVE TO SPAM / QUARANTINE'}
              </span>
            </button>

            {/* Secondary Action Button: MARK SAFE */}
            <button
              onClick={handleRejectAction}
              disabled={isProcessingAction || threat.status === 'REJECTED'}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-all duration-150 flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] ${
                threat.status === 'REJECTED'
                  ? 'bg-slate-900 text-slate-500 border border-slate-800'
                  : 'bg-slate-800/90 border border-slate-700 hover:bg-slate-750 hover:border-slate-600 text-slate-100 hover:text-white shadow-xs'
              }`}
            >
              <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {threat.status === 'REJECTED' ? 'Marked as Safe' : 'MARK SAFE'}
              </span>
            </button>
          </div>

          {/* Status Feedback Messages */}
          <AnimatePresence>
            {actionSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                className="text-xs text-emerald-400 font-medium flex items-center space-x-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{actionSuccessMessage}</span>
              </motion.div>
            )}
            {threat.status !== 'PENDING_REVIEW' && !actionSuccessMessage && (
              <div className="text-xs text-slate-400 font-mono">
                Status: <span className="text-slate-200 font-semibold">{threat.userActionTaken || threat.status}</span>
              </div>
            )}
          </AnimatePresence>

        </div>

      </motion.div>

      {/* 3. GenAI Gemini Explanation Card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.08 }}
        className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-3 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Gemini Threat Explanation
            </h2>
          </div>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded border border-blue-500/20">
            {threat.aiExplanation?.generatedByGemini ? 'Gemini 3.8 Flash' : 'Hybrid Pipeline'}
          </span>
        </div>

        <div className="text-xs text-slate-200 leading-relaxed font-normal bg-[#090d15] p-3 rounded-md border border-slate-800/80">
          {threat.aiExplanation?.summary || 'No detailed AI summary generated.'}
        </div>

        {(threat.aiExplanation?.reasons?.length ?? 0) > 0 && (
          <div className="space-y-1.5 text-xs pt-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Identified Threat Indicators:
            </span>
            <ul className="space-y-1 text-slate-300">
              {threat.aiExplanation?.reasons?.map((reason, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-[11px]">
                  <span className="text-rose-400 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* 4. Multi-Agent Telemetry Evidence (5 Agents Grid) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.12 }}
        className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-3 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Multi-Agent Telemetry Evidence (5 Specialized Agents)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Parallel Execution</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          
          {/* Agent 1: Sender */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-[11px]">Sender Agent</span>
              <User className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`font-semibold text-[11px] ${
              (threat.multiAgentAnalysis?.senderAgent?.indicators?.length ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(threat.multiAgentAnalysis?.senderAgent?.indicators?.length ?? 0) > 0 ? 'Suspicious Origin' : 'Clean SPF/DKIM'}
            </div>
            <p className="text-[10px] text-slate-400">
              {threat.multiAgentAnalysis?.senderAgent?.isDomainSpoofed ? 'Domain spoof flagged' : 'Legitimate domain'}
            </p>
          </div>

          {/* Agent 2: Content NLP */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-[11px]">Content NLP</span>
              <Mail className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`font-semibold text-[11px] ${
              (threat.multiAgentAnalysis?.contentAgent?.urgencyScore ?? 0) > 50 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(threat.multiAgentAnalysis?.contentAgent?.urgencyScore ?? 0) > 50 ? 'High Urgency' : 'Normal Tone'}
            </div>
            <p className="text-[10px] text-slate-400">
              Urgency: {threat.multiAgentAnalysis?.contentAgent?.urgencyScore ?? 0}/100
            </p>
          </div>

          {/* Agent 3: URL Scanner */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-[11px]">URL Scanner</span>
              <Link2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`font-semibold text-[11px] ${
              (threat.multiAgentAnalysis?.urlAgent?.indicators?.length ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(threat.multiAgentAnalysis?.urlAgent?.indicators?.length ?? 0) > 0 ? 'Flagged URLs' : 'Safe URLs'}
            </div>
            <p className="text-[10px] text-slate-400">
              {threat.multiAgentAnalysis?.urlAgent?.suspiciousUrlsCount ?? 0} suspicious link(s)
            </p>
          </div>

          {/* Agent 4: Attachment Inspector */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-[11px]">Attachment</span>
              <FileWarning className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`font-semibold text-[11px] ${
              (threat.multiAgentAnalysis?.attachmentAgent?.indicators?.length ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(threat.multiAgentAnalysis?.attachmentAgent?.indicators?.length ?? 0) > 0 ? 'Dangerous Payload' : 'Clean Payload'}
            </div>
            <p className="text-[10px] text-slate-400">
              {threat.multiAgentAnalysis?.attachmentAgent?.suspiciousCount ?? 0} flagged files
            </p>
          </div>

          {/* Agent 5: Scam & Fraud */}
          <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-md space-y-1 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-[11px]">Scam / Fraud</span>
              <AlertTriangle className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`font-semibold text-[11px] ${
              (threat.multiAgentAnalysis?.scamAgent?.scamProbability ?? 0) > 0.4 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {(threat.multiAgentAnalysis?.scamAgent?.scamProbability ?? 0) > 0.4 ? 'Financial Fraud' : 'Low Prob'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono tabular-nums">
              Prob: {Math.round((threat.multiAgentAnalysis?.scamAgent?.scamProbability ?? 0) * 100)}%
            </p>
          </div>

        </div>
      </motion.div>

      {/* 5. Normalized Email Content Preview */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.16 }}
        className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-3 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Normalized Email Content
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Raw Parser Output</span>
        </div>

        <div className="p-3.5 bg-[#090d15] border border-slate-800/80 rounded-md font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto selection:bg-blue-600 selection:text-white">
          {threat.email.bodyText || '(No plain text body content found)'}
        </div>
      </motion.div>

      {/* 6. Human Analyst Feedback Form */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.2 }}
        className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-3.5 transition-colors"
      >
        <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-2.5">
          <MessageSquareCode className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Human Analyst Verification & Model Feedback
          </h2>
        </div>

        <p className="text-xs text-slate-400">
          Refine the 5-agent detection pipeline by submitting verification ground-truth labels.
        </p>

        {feedbackSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-md text-xs text-emerald-300 font-medium flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Thank you. Your verification label was recorded and queued for the model pipeline.</span>
          </motion.div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Verified Classification:</label>
                <select
                  value={feedbackLabel}
                  onChange={e => setFeedbackLabel(e.target.value)}
                  className="w-full bg-[#090d15] border border-slate-800 rounded-md p-2 text-slate-200 focus:outline-none focus:border-blue-500/70 cursor-pointer"
                >
                  <option value="SAFE">SAFE (False Positive)</option>
                  <option value="PHISHING">PHISHING</option>
                  <option value="SPAM">SPAM</option>
                  <option value="SCAM_FRAUD">SCAM / FRAUD</option>
                  <option value="MALICIOUS_URL">MALICIOUS URL</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Analyst Notes:</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized domain, false-positive urgency phrase..."
                  value={feedbackNotes}
                  onChange={e => setFeedbackNotes(e.target.value)}
                  className="w-full bg-[#090d15] border border-slate-800 rounded-md p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-xs transition-all duration-150 flex items-center space-x-2 cursor-pointer shadow-sm shadow-blue-950/50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Classification</span>
            </button>
          </form>
        )}
      </motion.div>

    </div>
  );
};

export default ThreatDetailPage;
