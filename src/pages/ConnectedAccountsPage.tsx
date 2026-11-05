import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, CheckCircle2, RefreshCw, Unlink, Lock, AlertTriangle, Cpu, Copy, Check, ExternalLink, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GmailAccountState, ThreatAnalysis } from '../types';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface Props {
  account: GmailAccountState | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onAnalyzeRecent?: (scope?: 'INBOX' | 'SPAM' | 'ALL') => Promise<{ success: boolean; count?: number; threats?: ThreatAnalysis[]; error?: string }>;
  oauthError?: { error: string; description: string } | null;
  onClearOAuthError?: () => void;
}

export const ConnectedAccountsPage: React.FC<Props> = ({ account, onConnect, onDisconnect, onAnalyzeRecent, oauthError, onClearOAuthError }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<{ count?: number; message?: string; error?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    isConfigured: boolean;
    clientIdMasked: string;
    projectNumber: string | null;
    effectiveRedirectUri: string;
    effectiveOrigin: string;
    requiredScopes: string[];
    expectedEmail?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/gmail/diagnostics')
      .then(res => res.json())
      .then(data => setDiagnostics(data))
      .catch(err => console.warn('Could not load OAuth diagnostics:', err));
  }, []);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnectClick = async () => {
    setIsConnecting(true);
    setAnalysisResult(null);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectClick = async () => {
    setIsConnecting(true);
    setAnalysisResult(null);
    try {
      await onDisconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAnalyzeClick = async (scope: 'INBOX' | 'ALL' = 'INBOX') => {
    if (!onAnalyzeRecent) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalyzeStep(scope === 'INBOX' ? 'Connecting to Gmail API & selecting 30 newest Inbox messages...' : 'Connecting to Gmail API & selecting latest Inbox + Spam messages...');

    const stepTimer = setTimeout(() => {
      setAnalyzeStep('Running emails through 5-Agent Security Orchestrator (Content, Sender, URL, Attachment, Scam)...');
    }, 1200);

    try {
      const result = await onAnalyzeRecent(scope);
      clearTimeout(stepTimer);

      if (result.error) {
        setAnalysisResult({ error: result.error });
      } else {
        setAnalysisResult({
          count: result.count || 0,
          message: `Successfully retrieved and security-analyzed ${result.count || 0} messages from ${scope === 'INBOX' ? 'Gmail Inbox' : 'Inbox + Spam'}.`
        });
      }
    } catch (err: any) {
      clearTimeout(stepTimer);
      setAnalysisResult({ error: err.message || 'Failed to analyze recent emails.' });
    } finally {
      setIsAnalyzing(false);
      setAnalyzeStep('');
    }
  };

  return (
    <div className="space-y-5 text-slate-100 max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pb-3.5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <span>Connected Gmail Account</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Google OAuth 2.0 authorization, real email retrieval, and security scanning
          </p>
        </div>

        {/* Mode Indicator with Smooth Transition */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Mode:</span>
          <AnimatePresence mode="wait">
            {account?.isConnected ? (
              <motion.span
                key="real-gmail-badge"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="px-2.5 py-1 rounded text-xs font-medium border bg-emerald-950/30 text-emerald-300 border-emerald-800/40 flex items-center space-x-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>GMAIL LIVE ACTIVE</span>
              </motion.span>
            ) : (
              <motion.span
                key="demo-mode-badge"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="px-2.5 py-1 rounded text-xs font-medium border bg-slate-900 text-slate-300 border-slate-800"
              >
                DEMO MODE
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Account Identity / Mismatch Banner */}
      {account?.accountMismatch && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-200 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-amber-300">Connected Account Identity Notice</span>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Google OAuth is authorized for <strong className="font-mono text-white">{account.email}</strong>. The messages retrieved and displayed are exclusively from this connected mailbox. If you expected emails from a different personal/work account, please click <strong>Disconnect</strong> below and authorize with that Google account.
            </p>
          </div>
        </div>
      )}

      {/* OAuth Error Alert Banner */}
      {oauthError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs space-y-2 text-rose-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Google OAuth Connection Failed ({oauthError.error})</span>
            </div>
            {onClearOAuthError && (
              <button
                onClick={onClearOAuthError}
                className="text-[11px] text-rose-400 hover:text-rose-200 cursor-pointer font-medium"
              >
                Dismiss
              </button>
            )}
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {oauthError.description}
          </p>
        </motion.div>
      )}

      {/* Main Account Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-4 transition-colors"
      >
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-base border transition-colors shrink-0 ${
              account?.isConnected
                ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                : 'bg-[#090d15] border-slate-800 text-slate-500'
            }`}>
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-100 font-mono">{account?.email || 'No Gmail Account Connected'}</h2>
                <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  account?.isConnected
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                    : 'bg-[#090d15] text-slate-400 border border-slate-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${account?.isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span>{account?.isConnected ? 'PROTECTED' : 'DISCONNECTED'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Google OAuth 2.0 Secure Authorization</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <AnimatePresence mode="wait">
              {account?.isConnected ? (
                <motion.div
                  key="connected-actions"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex items-center space-x-2"
                >
                  <button
                    onClick={() => handleAnalyzeClick('INBOX')}
                    disabled={isAnalyzing || isConnecting}
                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-xs transition-all duration-150 flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-950/50"
                    title="Retrieve and security-analyze 30 newest Inbox messages"
                  >
                    {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Recent Inbox (30)'}</span>
                  </button>

                  <button
                    onClick={() => handleAnalyzeClick('ALL')}
                    disabled={isAnalyzing || isConnecting}
                    className="px-3 py-1.5 rounded-md bg-[#090d15] border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white font-medium text-xs transition-all duration-150 flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                    title="Retrieve and security-analyze up to 30 Inbox + up to 30 Spam messages (max 60 total)"
                  >
                    <span>Analyze Inbox + Spam (60)</span>
                  </button>

                  <button
                    onClick={handleDisconnectClick}
                    disabled={isConnecting || isAnalyzing}
                    className="px-3 py-1.5 rounded-md bg-[#090d15] border border-slate-800 hover:bg-rose-950/20 hover:border-rose-900/50 hover:text-rose-300 active:scale-[0.98] text-slate-400 font-medium text-xs transition-all duration-150 flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="connect-action"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                  className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-xs transition-all duration-150 flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-950/50"
                >
                  {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isConnecting ? 'Connecting...' : 'Authorize & Connect Gmail'}</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress / Step message */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs space-y-2"
          >
            <div className="flex items-center space-x-2 text-blue-300 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Gmail API Threat Pipeline Executing...</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
              <motion.div
                className="bg-blue-500 h-full rounded-full"
                initial={{ width: '15%' }}
                animate={{ width: ['15%', '60%', '92%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <p className="text-slate-400 text-[11px] font-mono">{analyzeStep}</p>
          </motion.div>
        )}

        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg text-xs border ${
              analysisResult.error
                ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
            }`}
          >
            <div className="font-semibold flex items-center space-x-1.5">
              {analysisResult.error ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{analysisResult.error ? 'Analysis Error' : 'Analysis Complete'}</span>
            </div>
            <p className="mt-1 text-[11px] opacity-90">{analysisResult.error || analysisResult.message}</p>
          </motion.div>
        )}

        {/* Account Details with Animated Counters */}
        <AnimatePresence>
          {account?.isConnected ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs"
            >
              <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-lg space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Protection Status</span>
                <div className="font-semibold text-emerald-400 text-xs flex items-center space-x-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Real-time Active</span>
                </div>
              </div>

              <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-lg space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Last Synchronization</span>
                <div className="font-mono text-slate-200 text-xs tabular-nums truncate pt-0.5">
                  {account.lastSyncedAt
                    ? new Date(account.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </div>
              </div>

              <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-lg space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Emails Monitored</span>
                <div className="font-bold text-slate-100 text-xl font-mono tabular-nums leading-tight">
                  <AnimatedCounter value={account.totalEmailsMonitored} />
                </div>
              </div>

              <div className="p-3 bg-[#090d15] border border-slate-800/80 rounded-lg space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Threats Detected</span>
                <div className="font-bold text-rose-400 text-xl font-mono tabular-nums leading-tight">
                  <AnimatedCounter value={account.threatsDetected} />
                </div>
              </div>

              {/* Latest Analysis Run Stats (30 Inbox + 30 Spam, max 60) */}
              {account.analysisRunStats && (
                <div className="col-span-2 sm:col-span-4 p-3 bg-[#0a0e17] border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Latest Analysis Run Metrics (30 Inbox + 30 Spam Limit)</span>
                    <span className="font-mono text-blue-400 lowercase">{account.email}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-xs">
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Retrieved</div>
                      <div className="font-mono font-bold text-slate-200">{account.analysisRunStats.retrieved}</div>
                    </div>
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Analysed</div>
                      <div className="font-mono font-bold text-blue-400">{account.analysisRunStats.analyzed}</div>
                    </div>
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Threats</div>
                      <div className="font-mono font-bold text-rose-400">{account.analysisRunStats.threats}</div>
                    </div>
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Safe</div>
                      <div className="font-mono font-bold text-emerald-400">{account.analysisRunStats.safe}</div>
                    </div>
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Failed</div>
                      <div className="font-mono font-bold text-amber-400">{account.analysisRunStats.failed}</div>
                    </div>
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Inbox</div>
                      <div className="font-mono font-bold text-slate-200">{account.analysisRunStats.inbox}</div>
                    </div>
                    <div className="p-2 bg-[#0d121c] rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Spam</div>
                      <div className="font-mono font-bold text-slate-200">{account.analysisRunStats.spam}</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#090d15] border border-slate-800 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Operating in Demo Mode (Sample Corpus)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  MailGuard AI is currently inspecting 7 pre-analyzed security incidents from the built-in corpus. Connect your real Google Workspace or personal Gmail account to enable live mailbox synchronization, automated background threat detection, and one-click quarantine actions.
                </p>
              </div>

              {/* Real Google Cloud Console OAuth 2.0 Integration & 403 Diagnostics */}
              <div className="p-4 bg-[#0a0f1d] border border-blue-900/40 rounded-lg text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-900/30">
                  <div className="flex items-center space-x-2 text-blue-300 font-semibold">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <span>Google Cloud Console OAuth 2.0 Integration & 403 Diagnostics</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300">
                    Project #{diagnostics?.projectNumber || '692550882871'}
                  </span>
                </div>

                {/* Copyable Redirect URI & Origin */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-[#080c14] border border-slate-800 rounded space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Authorized Redirect URI:</span>
                      <button
                        onClick={() => copyToClipboard(diagnostics?.effectiveRedirectUri || 'https://ais-dev-3zwzb57zfek2buufbdgyym-655967031157.asia-southeast1.run.app/api/gmail/oauth/callback', 'redirectUri')}
                        className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-[10px] cursor-pointer"
                      >
                        {copiedField === 'redirectUri' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'redirectUri' ? 'Copied' : 'Copy URI'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-200 break-all select-all bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                      {diagnostics?.effectiveRedirectUri || 'https://ais-dev-3zwzb57zfek2buufbdgyym-655967031157.asia-southeast1.run.app/api/gmail/oauth/callback'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#080c14] border border-slate-800 rounded space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Authorized JavaScript Origin:</span>
                      <button
                        onClick={() => copyToClipboard(diagnostics?.effectiveOrigin || 'https://ais-dev-3zwzb57zfek2buufbdgyym-655967031157.asia-southeast1.run.app', 'origin')}
                        className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-[10px] cursor-pointer"
                      >
                        {copiedField === 'origin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'origin' ? 'Copied' : 'Copy Origin'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-200 break-all select-all bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                      {diagnostics?.effectiveOrigin || 'https://ais-dev-3zwzb57zfek2buufbdgyym-655967031157.asia-southeast1.run.app'}
                    </div>
                  </div>
                </div>

                {/* 403 Error Resolution Steps */}
                <div className="p-3 bg-[#0c1424] border border-amber-900/40 rounded space-y-2">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>How to Resolve Google Error 403 (access_denied)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 leading-relaxed">
                    <li>
                      Open <strong className="text-white">Google Cloud Console</strong> &rarr; select Project <strong className="font-mono text-blue-300">{diagnostics?.projectNumber || '692550882871'}</strong>.
                    </li>
                    <li>
                      Go to <strong className="text-white">APIs & Services &rarr; OAuth consent screen</strong>.
                    </li>
                    <li>
                      Under <strong className="text-white">Test users</strong>, click <strong className="text-white">+ ADD USERS</strong> and enter <strong className="font-mono text-emerald-300">hemasrinivasreddy263@gmail.com</strong>.
                    </li>
                    <li>
                      Go to <strong className="text-white">APIs & Services &rarr; Library</strong>, search <strong className="text-white">Gmail API</strong>, and confirm it is <strong className="text-emerald-300">ENABLED</strong>.
                    </li>
                    <li>
                      Click <strong className="text-white">Authorize & Connect Gmail</strong> above. On Google's screen ("Google hasn't verified this app"), click <strong className="text-blue-300 underline">Advanced</strong> &rarr; <strong className="text-blue-300 underline">Go to MailGuard AI (unsafe)</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Authorized Scopes */}
        <div className="p-3.5 bg-[#090d15] border border-slate-800 rounded-lg space-y-2 text-xs">
          <span className="font-semibold text-slate-300 uppercase text-[10px] tracking-wider block">
            OAuth Scopes Configured
          </span>
          
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center space-x-2 text-emerald-400 font-medium text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>gmail.readonly — Read email metadata and body text for real-time threat inspection</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400 font-medium text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>gmail.modify — Apply threat labels and execute Move to Spam on analyst approval</span>
            </div>
          </div>
        </div>

        {/* Security & Privacy Architecture */}
        <div className="p-3.5 bg-[#090d15] border border-slate-800 rounded-lg text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-blue-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Security Architecture</span>
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside leading-relaxed">
            <li><strong>No Passwords Requested:</strong> MailGuard AI uses OAuth 2.0 authorization tokens only.</li>
            <li><strong>Secure Server-Side Tokens:</strong> Credentials and refresh tokens never reach browser client code.</li>
            <li><strong>Transient Analysis:</strong> Email bodies are analyzed in-memory by the 5-agent pipeline.</li>
            <li><strong>Instant Revocation:</strong> Disconnecting immediately wipes session tokens on the server.</li>
          </ul>
        </div>

      </motion.div>

    </div>
  );
};

export default ConnectedAccountsPage;

