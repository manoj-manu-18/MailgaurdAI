import React, { useState } from 'react';
import {
  ShieldAlert,
  Mail,
  AlertTriangle,
  Link2,
  Clock,
  CheckCircle2,
  RefreshCw,
  Activity,
  ArrowRight,
  Eye,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { motion } from 'motion/react';
import { ThreatAnalysis, GmailAccountState, NotificationItem } from '../types';
import { ThreatSeverityBadge } from '../components/ThreatSeverityBadge';
import { ThreatCategoryBadge } from '../components/ThreatCategoryBadge';
import { AnimatedCounter } from '../components/AnimatedCounter';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

interface Props {
  threats: ThreatAnalysis[];
  onSelectThreat: (threat: ThreatAnalysis) => void;
  onNavigate: (view: string) => void;
  isRealGmailMode?: boolean;
  gmailAccount?: GmailAccountState | null;
  onAnalyzeRecent?: () => Promise<{ success: boolean; count?: number; threats?: any[]; error?: string }>;
  notifications?: NotificationItem[];
  highlightThreats?: boolean;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(date.getTime())) return 'Recently';
    if (diffMs < 0 || diffMs < 60000) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const DashboardPage: React.FC<Props> = ({
  threats,
  onSelectThreat,
  onNavigate,
  isRealGmailMode = false,
  gmailAccount = null,
  onAnalyzeRecent,
  notifications = [],
  highlightThreats = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INBOX' | 'SPAM' | 'THREATS' | 'SAFE' | 'FAILED'>('ALL');

  const [viewScope, setViewScope] = useState<'LATEST' | 'ALL'>('LATEST');

  // Distinguish latest batch from historical results
  const hasLatestRunMarker = threats.some(t => t.inLatestRun === true);
  const activeBatchThreats = React.useMemo(() => {
    if (viewScope === 'LATEST' && hasLatestRunMarker) {
      return threats.filter(t => t.inLatestRun === true);
    }
    return threats;
  }, [threats, viewScope, hasLatestRunMarker]);

  // Use run stats if available for the latest run, otherwise compute from active batch
  const runStats = gmailAccount?.analysisRunStats;

  const emailsRetrieved = (viewScope === 'LATEST' && runStats)
    ? runStats.retrievedCount
    : activeBatchThreats.length;

  const successfullyAnalysed = (viewScope === 'LATEST' && runStats)
    ? runStats.analyzedCount
    : activeBatchThreats.filter(t => t.status !== 'FAILED').length;

  const threatsDetected = (viewScope === 'LATEST' && runStats)
    ? runStats.threatsDetectedCount
    : activeBatchThreats.filter(t => t.status !== 'FAILED' && t.riskScore?.severity !== 'SAFE').length;

  const safeEmails = (viewScope === 'LATEST' && runStats)
    ? runStats.safeCount
    : activeBatchThreats.filter(t => t.status !== 'FAILED' && t.riskScore?.severity === 'SAFE').length;

  const analysisFailures = (viewScope === 'LATEST' && runStats)
    ? runStats.failedCount
    : activeBatchThreats.filter(t => t.status === 'FAILED').length;

  const inboxCount = (viewScope === 'LATEST' && runStats)
    ? runStats.inboxRetrieved
    : activeBatchThreats.filter(t => (t.source || 'INBOX') === 'INBOX').length;

  const spamCount = (viewScope === 'LATEST' && runStats)
    ? runStats.spamRetrieved
    : activeBatchThreats.filter(t => t.source === 'SPAM').length;

  const totalAnalyzed = isRealGmailMode
    ? (gmailAccount?.totalEmailsMonitored || emailsRetrieved)
    : emailsRetrieved;

  // Email Sources breakdown (Inbox vs Spam vs Total)
  const inboxAnalyzed = (viewScope === 'LATEST' && runStats?.inboxStats)
    ? runStats.inboxStats.analyzed
    : activeBatchThreats.filter(t => (t.source || 'INBOX') === 'INBOX' && t.status !== 'FAILED').length;

  const inboxThreats = (viewScope === 'LATEST' && runStats?.inboxStats)
    ? runStats.inboxStats.threats
    : activeBatchThreats.filter(t => (t.source || 'INBOX') === 'INBOX' && t.status !== 'FAILED' && t.riskScore?.severity !== 'SAFE').length;

  const inboxHighRisk = (viewScope === 'LATEST' && runStats?.inboxStats)
    ? runStats.inboxStats.highRisk
    : activeBatchThreats.filter(t => (t.source || 'INBOX') === 'INBOX' && t.status !== 'FAILED' && (t.riskScore?.severity === 'CRITICAL' || t.riskScore?.severity === 'HIGH')).length;

  const spamAnalyzed = (viewScope === 'LATEST' && runStats?.spamStats)
    ? runStats.spamStats.analyzed
    : activeBatchThreats.filter(t => t.source === 'SPAM' && t.status !== 'FAILED').length;

  const spamThreats = (viewScope === 'LATEST' && runStats?.spamStats)
    ? runStats.spamStats.threats
    : activeBatchThreats.filter(t => t.source === 'SPAM' && t.status !== 'FAILED' && t.riskScore?.severity !== 'SAFE').length;

  const spamHighRisk = (viewScope === 'LATEST' && runStats?.spamStats)
    ? runStats.spamStats.highRisk
    : activeBatchThreats.filter(t => t.source === 'SPAM' && t.status !== 'FAILED' && (t.riskScore?.severity === 'CRITICAL' || t.riskScore?.severity === 'HIGH')).length;

  const totalAnalyzedCount = inboxAnalyzed + spamAnalyzed;
  const totalThreatsCount = inboxThreats + spamThreats;
  const totalHighRiskCount = inboxHighRisk + spamHighRisk;

  const highRiskCount = activeBatchThreats.filter(t => t.status !== 'FAILED' && (t.riskScore?.severity === 'CRITICAL' || t.riskScore?.severity === 'HIGH')).length;
  const phishingCount = activeBatchThreats.filter(t => t.status !== 'FAILED' && (t.primaryThreat === 'PHISHING' || (t.threatTypes && t.threatTypes.includes('PHISHING')))).length;
  const maliciousUrlsCount = activeBatchThreats.filter(t => 
    t.status !== 'FAILED' && (
      t.primaryThreat === 'MALICIOUS_URL' ||
      (t.threatTypes && t.threatTypes.includes('MALICIOUS_URL')) ||
      ((t.multiAgentAnalysis?.urlAgent?.suspiciousUrlsCount ?? 0) > 0)
    )
  ).length;

  // Chart 1: Threat Trend Over Time
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trendData = React.useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];

      const matchingThreats = threats.filter(t => {
        const itemDate = (t.processedAt || t.email?.receivedAt || '').split('T')[0];
        return itemDate === dateStr;
      });

      days.push({
        day: dayName,
        date: dateStr,
        threats: matchingThreats.filter(t => t.riskScore.severity !== 'SAFE').length,
        total: matchingThreats.length
      });
    }

    const totalPlotPoints = days.reduce((acc, curr) => acc + curr.threats, 0);
    if (totalPlotPoints === 0 && threats.length > 0) {
      const dayMap: Record<string, { threats: number; total: number }> = {
        Mon: { threats: 0, total: 0 },
        Tue: { threats: 0, total: 0 },
        Wed: { threats: 0, total: 0 },
        Thu: { threats: 0, total: 0 },
        Fri: { threats: 0, total: 0 },
        Sat: { threats: 0, total: 0 },
        Sun: { threats: 0, total: 0 }
      };

      threats.forEach(t => {
        const dateObj = new Date(t.processedAt || t.email?.receivedAt || Date.now());
        const day = daysOfWeek[dateObj.getDay()] || 'Sun';
        dayMap[day].total += 1;
        if (t.riskScore.severity !== 'SAFE') {
          dayMap[day].threats += 1;
        }
      });

      return daysOfWeek.map(day => ({
        day,
        date: day,
        threats: dayMap[day].threats,
        total: dayMap[day].total
      }));
    }

    return days;
  }, [threats]);

  // Chart 2: Threat Categories Distribution
  const pieData = React.useMemo(() => {
    const categoryCounts: Record<string, { label: string; count: number; color: string }> = {
      PHISHING: { label: 'Phishing', count: 0, color: '#f43f5e' },
      SPAM: { label: 'Spam', count: 0, color: '#eab308' },
      SCAM_FRAUD: { label: 'Scam / Fraud', count: 0, color: '#f59e0b' },
      MALICIOUS_URL: { label: 'Malicious URL', count: 0, color: '#8b5cf6' },
      SUSPICIOUS_ATTACHMENT: { label: 'Attachment', count: 0, color: '#f97316' },
      IMPERSONATION: { label: 'Impersonation', count: 0, color: '#ec4899' },
      SAFE: { label: 'Safe Email', count: 0, color: '#10b981' }
    };

    threats.forEach(t => {
      const primary = t.primaryThreat || (t.riskScore.severity === 'SAFE' ? 'SAFE' : 'PHISHING');
      if (categoryCounts[primary]) {
        categoryCounts[primary].count += 1;
      } else {
        categoryCounts['PHISHING'].count += 1;
      }
    });

    return Object.values(categoryCounts)
      .filter(c => c.count > 0)
      .map(c => ({ name: c.label, value: c.count, color: c.color }));
  }, [threats]);

  // Chart 3: Risk distribution histogram
  const riskHistogram = React.useMemo(() => {
    return [
      { range: '0–20 Safe', count: threats.filter(t => t.riskScore.overallScore <= 20).length, color: '#10b981' },
      { range: '21–40 Low', count: threats.filter(t => t.riskScore.overallScore >= 21 && t.riskScore.overallScore <= 40).length, color: '#3b82f6' },
      { range: '41–60 Med', count: threats.filter(t => t.riskScore.overallScore >= 41 && t.riskScore.overallScore <= 60).length, color: '#f59e0b' },
      { range: '61–80 High', count: threats.filter(t => t.riskScore.overallScore >= 61 && t.riskScore.overallScore <= 80).length, color: '#f97316' },
      { range: '81–100 Crit', count: threats.filter(t => t.riskScore.overallScore >= 81).length, color: '#ef4444' }
    ];
  }, [threats]);

  const handleScanClick = async (scope: 'INBOX' | 'ALL' = 'INBOX') => {
    if (!onAnalyzeRecent || isScanning) return;
    setIsScanning(true);
    setScanFeedback(null);
    setScanStep(scope === 'INBOX' ? 'Connecting to Gmail API & selecting latest 30 Inbox messages...' : 'Connecting to Gmail API & selecting latest Inbox + Spam messages...');

    const stepTimer = setTimeout(() => {
      setScanStep('Executing 5-Agent Pipeline & Gemini Threat Classification...');
    }, 1200);

    try {
      const res = await onAnalyzeRecent(scope);
      clearTimeout(stepTimer);
      if (res.success) {
        setViewScope('LATEST'); // automatically focus on fresh batch
        setScanFeedback(`Analysis complete: ${res.count || 0} messages analyzed from ${scope === 'INBOX' ? 'Gmail Inbox' : 'Inbox + Spam'}.`);
      } else {
        setScanFeedback(res.error || 'Scan failed. Check Gmail connection.');
      }
    } catch {
      clearTimeout(stepTimer);
      setScanFeedback('An error occurred during scanning.');
    } finally {
      setIsScanning(false);
      setScanStep('');
      setTimeout(() => setScanFeedback(null), 5000);
    }
  };

  const filteredThreats = React.useMemo(() => {
    return activeBatchThreats.filter(t => {
      if (activeFilter === 'INBOX') return (t.source || 'INBOX') === 'INBOX';
      if (activeFilter === 'SPAM') return t.source === 'SPAM';
      if (activeFilter === 'THREATS') return t.status !== 'FAILED' && t.riskScore?.severity !== 'SAFE';
      if (activeFilter === 'SAFE') return t.status !== 'FAILED' && t.riskScore?.severity === 'SAFE';
      if (activeFilter === 'FAILED') return t.status === 'FAILED';
      return true;
    });
  }, [activeBatchThreats, activeFilter]);

  return (
    <div className="space-y-4 sm:space-y-5 text-slate-100 max-w-7xl mx-auto pb-10">

      {/* Account Identity Notice if user is connected to a different account than expected */}
      {isRealGmailMode && gmailAccount?.accountMismatch && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center space-x-2 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Authorized Mailbox: <strong className="text-blue-300 font-mono">{gmailAccount.email}</strong>. Data is isolated to this verified Google account.
            </span>
          </div>
          <button
            onClick={() => onNavigate('connected-accounts')}
            className="text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap cursor-pointer text-[11px]"
          >
            Manage Accounts →
          </button>
        </motion.div>
      )}
      
      {/* LEVEL 1: Header Section - Email Security Overview */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.02 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80"
      >
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Email Security Overview
            </h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider inline-flex items-center space-x-1.5 ${
              isRealGmailMode
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isRealGmailMode ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{isRealGmailMode ? 'GMAIL LIVE' : 'DEMO CORPUS'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time mailbox threat detection, AI multi-agent telemetry, and risk response.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAnalyzeRecent && isRealGmailMode ? (
            <>
              <button
                onClick={() => handleScanClick('INBOX')}
                disabled={isScanning}
                className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-blue-950/50"
                title="Fetch and security-analyze the 30 most recently received Inbox emails"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Analyzing...' : 'Analyze Recent Inbox (30)'}</span>
              </button>

              <button
                onClick={() => handleScanClick('ALL')}
                disabled={isScanning}
                className="px-3 py-1.5 rounded-md bg-[#0d121c] hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer"
                title="Fetch and security-analyze up to 30 Inbox + up to 30 Spam emails (max 60 total)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Analyze Inbox + Spam (60)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('connected-accounts')}
              className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-blue-950/50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Connect Real Gmail</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('threats')}
            className="px-3 py-1.5 rounded-md bg-[#0d121c] hover:bg-slate-800 active:scale-[0.98] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Threat Intelligence</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </motion.div>

      {/* Gmail Analysis Loading Progress Bar */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs space-y-2"
        >
          <div className="flex items-center justify-between text-blue-300 font-medium">
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span>Executing 5-Agent Security Orchestrator...</span>
            </div>
            <span className="text-[10px] font-mono text-blue-400 font-semibold tracking-wider">RUNNING</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
            <motion.div
              className="bg-blue-500 h-full rounded-full"
              initial={{ width: '15%' }}
              animate={{ width: ['15%', '65%', '92%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-400">{scanStep}</p>
        </motion.div>
      )}

      {scanFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-3.5 py-2 bg-blue-950/40 border border-blue-800/50 rounded-md text-xs text-blue-300 flex items-center space-x-2"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{scanFeedback}</span>
        </motion.div>
      )}

      {/* LEVEL 1: Gmail Protection & Pipeline Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-[#0d121c] border border-slate-800/80 rounded-lg p-3 sm:p-3.5 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          
          {/* Status Left */}
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
              isRealGmailMode
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-400'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-slate-200">
                  {isRealGmailMode ? 'Gmail Live Protection Active' : 'Demo Threat Inspection Active'}
                </span>
                <span className="text-slate-500 hidden sm:inline">·</span>
                <span className="text-slate-400 text-[11px] font-mono">
                  {isRealGmailMode ? (gmailAccount?.email || 'Authorized Account') : '7 Pre-Analyzed Sample Incidents'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                5-Agent Pipeline: Content NLP · Sender Verification · URL Scanner · Attachment Inspector · Scam Detector
              </p>
            </div>
          </div>

          {/* Status Right: Sync Time & Action */}
          <div className="flex items-center space-x-3 text-xs text-slate-400 self-start md:self-auto border-t md:border-t-0 pt-2 md:pt-0 border-slate-800/60">
            <div className="flex items-center space-x-1.5 font-mono text-[11px] tabular-nums text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {gmailAccount?.lastSyncedAt
                  ? `Synced: ${new Date(gmailAccount.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Synced: Just now'}
              </span>
            </div>

            <button
              onClick={() => onNavigate('connected-accounts')}
              className="text-blue-400 hover:text-blue-300 font-medium text-xs transition duration-150 cursor-pointer inline-flex items-center space-x-1"
            >
              <span>{isRealGmailMode ? 'Manage Gmail' : 'Connect Real Gmail'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

        </div>
      </motion.div>

      {/* LEVEL 2: Core 7-Metric KPI Grid */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5"
      >
        
        {/* Metric 1: Emails Retrieved */}
        <div className="p-3 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Emails Retrieved</span>
            <div className="w-5 h-5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
              <Mail className="w-3 h-3" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono tabular-nums leading-tight">
            <AnimatedCounter value={emailsRetrieved} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            {isRealGmailMode ? 'Fetched from Gmail' : 'Demo Sample Set'}
          </div>
        </div>

        {/* Metric 2: Successfully Analysed */}
        <div className="p-3 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Successfully Analysed</span>
            <div className="w-5 h-5 rounded bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400">
              <Cpu className="w-3 h-3" />
            </div>
          </div>
          <div className="text-xl font-bold text-blue-400 font-mono tabular-nums leading-tight">
            <AnimatedCounter value={successfullyAnalysed} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            5-Agent Pipeline
          </div>
        </div>

        {/* Metric 3: Threats Detected */}
        <div
          className={`p-3 bg-[#0d121c] border rounded-lg space-y-1 transition-all duration-150 ${
            threatsDetected > 0 ? 'border-rose-900/60 bg-rose-950/15' : 'border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Threats Detected</span>
            <div className={`w-5 h-5 rounded flex items-center justify-center ${
              threatsDetected > 0 ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40' : 'bg-slate-900 border border-slate-800 text-slate-500'
            }`}>
              <ShieldAlert className="w-3 h-3" />
            </div>
          </div>
          <div className={`text-xl font-bold font-mono tabular-nums leading-tight ${threatsDetected > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            <AnimatedCounter value={threatsDetected} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            {threatsDetected > 0 ? 'Review & Quarantine' : 'No Threat Found'}
          </div>
        </div>

        {/* Metric 4: Safe Emails */}
        <div className="p-3 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Safe Emails</span>
            <div className="w-5 h-5 rounded bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums leading-tight">
            <AnimatedCounter value={safeEmails} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            Clean / Verified
          </div>
        </div>

        {/* Metric 5: Analysis Failures */}
        <div className={`p-3 bg-[#0d121c] border rounded-lg space-y-1 hover:border-slate-700 transition-all duration-150 ${
          analysisFailures > 0 ? 'border-amber-800/60 bg-amber-950/15' : 'border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Analysis Failures</span>
            <div className={`w-5 h-5 rounded flex items-center justify-center ${
              analysisFailures > 0 ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40' : 'bg-slate-900 border border-slate-800 text-slate-500'
            }`}>
              <AlertTriangle className="w-3 h-3" />
            </div>
          </div>
          <div className={`text-xl font-bold font-mono tabular-nums leading-tight ${analysisFailures > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            <AnimatedCounter value={analysisFailures} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            {analysisFailures > 0 ? 'Check Agent Logs' : '0 Pipeline Errors'}
          </div>
        </div>

        {/* Metric 6: Inbox Messages */}
        <div className="p-3 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Inbox Messages</span>
            <div className="w-5 h-5 rounded bg-sky-950/40 border border-sky-800/40 flex items-center justify-center text-sky-400">
              <Mail className="w-3 h-3" />
            </div>
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono tabular-nums leading-tight">
            <AnimatedCounter value={inboxCount} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            in:inbox Folder
          </div>
        </div>

        {/* Metric 7: Spam Messages */}
        <div className="p-3 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 transition-all duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 truncate">Spam Messages</span>
            <div className="w-5 h-5 rounded bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Mail className="w-3 h-3" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono tabular-nums leading-tight">
            <AnimatedCounter value={spamCount} />
          </div>
          <div className="text-[9px] text-slate-500 truncate pt-0.5 border-t border-slate-800/50">
            in:spam Folder
          </div>
        </div>

      </motion.div>

      {/* 3.5 Compact Email Sources Summary */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Email Sources Summary</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {isRealGmailMode ? `Gmail Sources (${gmailAccount?.email || 'Live'})` : 'Corpus Source Breakdown'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Inbox Column */}
          <div className="p-2.5 bg-[#090d15] border border-slate-800/80 rounded-md space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
              <span className="font-semibold text-sky-400 font-mono text-xs flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>Inbox</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">label:INBOX</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Analyzed</div>
                <div className="font-bold text-slate-200 text-sm tabular-nums">{inboxAnalyzed}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Threats</div>
                <div className={`font-bold text-sm tabular-nums ${inboxThreats > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{inboxThreats}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">High Risk</div>
                <div className={`font-bold text-sm tabular-nums ${inboxHighRisk > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{inboxHighRisk}</div>
              </div>
            </div>
          </div>

          {/* Spam Column */}
          <div className="p-2.5 bg-[#090d15] border border-slate-800/80 rounded-md space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
              <span className="font-semibold text-amber-400 font-mono text-xs flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Spam</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">label:SPAM</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Analyzed</div>
                <div className="font-bold text-slate-200 text-sm tabular-nums">{spamAnalyzed}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Threats</div>
                <div className={`font-bold text-sm tabular-nums ${spamThreats > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{spamThreats}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">High Risk</div>
                <div className={`font-bold text-sm tabular-nums ${spamHighRisk > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{spamHighRisk}</div>
              </div>
            </div>
          </div>

          {/* Total Column */}
          <div className="p-2.5 bg-[#090d15] border border-slate-800/80 rounded-md space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
              <span className="font-semibold text-slate-200 font-mono text-xs flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Total Mailbox</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Combined</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Analyzed</div>
                <div className="font-bold text-slate-100 text-sm tabular-nums">{totalAnalyzedCount}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Threats</div>
                <div className={`font-bold text-sm tabular-nums ${totalThreatsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{totalThreatsCount}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">High Risk</div>
                <div className={`font-bold text-sm tabular-nums ${totalHighRiskCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{totalHighRiskCount}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Threat Overview Section (Charts with 600ms entry animations) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.12 }}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Threat Intelligence & Trends</span>
          </h2>
          <span className="text-[11px] text-slate-500">Multi-agent analysis telemetry</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          
          {/* Chart 1: Threats detected over time */}
          <div className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1.5 hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Threat Volume Trend</h3>
                <p className="text-[10px] text-slate-400">Threats detected over time</p>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                7 Days
              </span>
            </div>

            <div className="h-40 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 6, right: 6, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="threatTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d121c',
                      borderColor: '#1e293b',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#f8fafc'
                    }}
                    labelStyle={{ fontWeight: '600', color: '#f8fafc' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    name="Threats"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#threatTrendGrad)"
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Threat Category Distribution */}
          <div className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1.5 flex flex-col justify-between hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Threat Categories</h3>
                <p className="text-[10px] text-slate-400">Distribution of flagged categories</p>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                {pieData.length} Types
              </span>
            </div>

            <div className="h-32 w-full flex items-center justify-center">
              {pieData.length === 0 ? (
                <div className="text-xs text-slate-400 flex flex-col items-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
                  <span>No active threats</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d121c',
                        borderColor: '#1e293b',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#f8fafc'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-1 text-[10px]">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center space-x-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400 truncate">{item.name}:</span>
                  <span className="font-semibold text-slate-200 font-mono tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 3: Risk Distribution Histogram */}
          <div className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1.5 hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Risk Distribution</h3>
                <p className="text-[10px] text-slate-400">Score buckets across analyzed emails</p>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                0–100 Scale
              </span>
            </div>

            <div className="h-40 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskHistogram} margin={{ top: 6, right: 6, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d121c',
                      borderColor: '#1e293b',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#f8fafc'
                    }}
                    labelStyle={{ fontWeight: '600', color: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Emails"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {riskHistogram.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 5. Mailbox Security Feed & Threat Table */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.15 }}
        className="bg-[#0d121c] border border-slate-800/80 rounded-lg overflow-hidden space-y-0"
      >
        <div className="p-3.5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-100">
                Mailbox Security & Threat Feed
              </h2>
              <span className="px-2 py-0.2 text-[10px] rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono tabular-nums">
                {activeBatchThreats.length} Messages
              </span>
              {hasLatestRunMarker && (
                <div className="flex items-center bg-[#090d15] p-0.5 rounded-md border border-slate-800 text-[10px] font-medium ml-2">
                  <button
                    onClick={() => setViewScope('LATEST')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      viewScope === 'LATEST'
                        ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Current Batch ({threats.filter(t => t.inLatestRun === true).length})
                  </button>
                  <button
                    onClick={() => setViewScope('ALL')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      viewScope === 'ALL'
                        ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All History ({threats.length})
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRealGmailMode
                ? `Live analyzed mailbox feed (${gmailAccount?.email || 'Authorized Gmail'}) — ${viewScope === 'LATEST' ? 'Displaying latest batch' : 'Displaying cumulative history'}`
                : 'Sample incident feed — 5-agent security pipeline'}
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Emails', count: activeBatchThreats.length },
              { id: 'INBOX', label: 'Inbox', count: inboxCount },
              { id: 'SPAM', label: 'Spam', count: spamCount },
              { id: 'THREATS', label: 'Threats', count: threatsDetected, alert: threatsDetected > 0 },
              { id: 'SAFE', label: 'Safe Emails', count: safeEmails },
              ...(analysisFailures > 0 ? [{ id: 'FAILED', label: 'Failed', count: analysisFailures, warn: true }] : [])
            ].map(f => {
              const isSelected = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer inline-flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                      : 'bg-[#090d15] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${
                    f.alert && f.count > 0
                      ? 'bg-rose-950/60 text-rose-300'
                      : f.warn
                      ? 'bg-amber-950/60 text-amber-300'
                      : 'bg-slate-900 text-slate-400'
                  }`}>
                    {f.count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => onNavigate('threats')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1 transition pl-2 cursor-pointer"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {filteredThreats.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-200">No Emails Matching Filter</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {activeFilter === 'THREATS'
                ? 'Great news! No security threats were flagged in the analyzed emails.'
                : 'No messages match the current folder or status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#0a0e17] text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-3.5 py-2.5">Risk</th>
                  <th className="px-3.5 py-2.5">Source</th>
                  <th className="px-3.5 py-2.5">Sender</th>
                  <th className="px-3.5 py-2.5">Subject</th>
                  <th className="px-3.5 py-2.5">Classification</th>
                  <th className="px-3.5 py-2.5">Detected</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredThreats.slice(0, 15).map((threat) => {
                  const isCrit = threat.status !== 'FAILED' && threat.riskScore.severity === 'CRITICAL';
                  const isHigh = threat.status !== 'FAILED' && threat.riskScore.severity === 'HIGH';
                  const isFailed = threat.status === 'FAILED';
                  const isSafe = threat.status !== 'FAILED' && threat.riskScore.severity === 'SAFE';

                  return (
                    <tr
                      key={threat.id}
                      onClick={() => onSelectThreat(threat)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 group ${
                        isCrit
                          ? 'border-l-2 border-l-rose-500 bg-rose-950/5'
                          : isHigh
                          ? 'border-l-2 border-l-orange-500 bg-orange-950/5'
                          : isFailed
                          ? 'border-l-2 border-l-amber-500 bg-amber-950/5'
                          : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Risk Badge & Numeric Score */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {isFailed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/40">
                            FAILED
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <ThreatSeverityBadge severity={threat.riskScore.severity} />
                            <span className={`font-mono tabular-nums text-[11px] font-semibold transition-colors ${
                              isCrit ? 'text-rose-400' : isHigh ? 'text-orange-400' : isSafe ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                              {threat.riskScore.overallScore}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Source Folder & Batch Marker */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            threat.source === 'SPAM'
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                              : 'bg-sky-950/40 text-sky-300 border border-sky-800/40'
                          }`}>
                            [{threat.source || 'INBOX'}]
                          </span>
                          {threat.inLatestRun === true && (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-800/40">
                              Latest
                            </span>
                          )}
                          {threat.inLatestRun === false && (
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                              History
                            </span>
                          )}
                          {threat.isDemo && (
                            <span className="text-[9px] font-mono text-slate-500">
                              demo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap max-w-[170px]">
                        <div className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                          {threat.email?.sender?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {threat.email?.sender?.email}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="px-3.5 py-2.5 min-w-[200px] max-w-sm sm:max-w-md">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-200 font-medium truncate block group-hover:text-blue-300 transition-colors" title={threat.email?.subject}>
                            {threat.email?.subject || '(No Subject)'}
                          </span>
                          {threat.isCached && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 font-mono shrink-0">
                              Cached
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {isFailed ? (
                          <span className="text-amber-400 text-[11px] font-medium" title={threat.failureReason}>
                            Pipeline Error
                          </span>
                        ) : isSafe ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>VERIFIED SAFE</span>
                          </span>
                        ) : (
                          <ThreatCategoryBadge threatType={threat.primaryThreat} />
                        )}
                      </td>

                      {/* Detected */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                        <div className="flex items-center space-x-1.5 font-mono tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatRelativeTime(threat.processedAt || threat.email?.receivedAt || '')}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectThreat(threat);
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-blue-600/15 active:scale-[0.97] text-slate-300 hover:text-blue-300 font-medium text-xs border border-slate-800 hover:border-blue-500/40 transition-all duration-150 inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-blue-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </div>
  );
};

export default DashboardPage;

