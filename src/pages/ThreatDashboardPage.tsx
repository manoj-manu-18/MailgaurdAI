import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, Clock, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { ThreatAnalysis, ThreatType, GmailAccountState } from '../types';
import { ThreatSeverityBadge } from '../components/ThreatSeverityBadge';
import { ThreatCategoryBadge } from '../components/ThreatCategoryBadge';

interface Props {
  threats: ThreatAnalysis[];
  onSelectThreat: (threat: ThreatAnalysis) => void;
  isRealGmailMode?: boolean;
  gmailAccount?: GmailAccountState | null;
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

export const ThreatDashboardPage: React.FC<Props> = ({
  threats,
  onSelectThreat,
  isRealGmailMode = false,
  gmailAccount = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [folderFilter, setFolderFilter] = useState<'ALL' | 'INBOX' | 'SPAM' | 'THREATS' | 'SAFE' | 'FAILED'>('ALL');
  const [runBatchFilter, setRunBatchFilter] = useState<'ALL' | 'LATEST' | 'HISTORY'>('ALL');
  const [minRiskScore, setMinRiskScore] = useState<number>(0);

  const inboxCount = threats.filter(t => (t.source || 'INBOX') === 'INBOX').length;
  const spamCount = threats.filter(t => t.source === 'SPAM').length;
  const threatsCount = threats.filter(t => t.status !== 'FAILED' && t.riskScore?.severity !== 'SAFE').length;
  const safeCount = threats.filter(t => t.status !== 'FAILED' && t.riskScore?.severity === 'SAFE').length;
  const failedCount = threats.filter(t => t.status === 'FAILED').length;
  const latestBatchCount = threats.filter(t => t.inLatestRun === true).length;
  const historyBatchCount = threats.filter(t => t.inLatestRun === false).length;

  const categories = [
    { id: 'ALL', label: 'All Incidents' },
    { id: 'PHISHING', label: 'Phishing' },
    { id: 'SCAM_FRAUD', label: 'Scam / Fraud' },
    { id: 'MALICIOUS_URL', label: 'Malicious URLs' },
    { id: 'SUSPICIOUS_ATTACHMENT', label: 'Attachments' },
    { id: 'IMPERSONATION', label: 'Impersonation' },
    { id: 'SPAM', label: 'Spam' },
    { id: 'SAFE', label: 'Safe Emails' }
  ];

  const filteredThreats = threats.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const subject = (t.email?.subject || '').toLowerCase();
    const senderName = (t.email?.sender?.name || '').toLowerCase();
    const senderEmail = (t.email?.sender?.email || '').toLowerCase();

    const matchesSearch =
      subject.includes(searchLower) ||
      senderName.includes(searchLower) ||
      senderEmail.includes(searchLower);

    const matchesBatch =
      runBatchFilter === 'ALL' ||
      (runBatchFilter === 'LATEST' && t.inLatestRun === true) ||
      (runBatchFilter === 'HISTORY' && t.inLatestRun === false);

    const matchesFolder =
      folderFilter === 'ALL' ||
      (folderFilter === 'INBOX' && (t.source || 'INBOX') === 'INBOX') ||
      (folderFilter === 'SPAM' && t.source === 'SPAM') ||
      (folderFilter === 'THREATS' && t.status !== 'FAILED' && t.riskScore?.severity !== 'SAFE') ||
      (folderFilter === 'SAFE' && t.status !== 'FAILED' && t.riskScore?.severity === 'SAFE') ||
      (folderFilter === 'FAILED' && t.status === 'FAILED');

    const matchesCategory =
      selectedCategory === 'ALL' ||
      t.primaryThreat === selectedCategory ||
      (t.threatTypes && t.threatTypes.includes(selectedCategory as ThreatType));

    const matchesRisk = (t.riskScore?.overallScore ?? 0) >= minRiskScore;

    return matchesSearch && matchesBatch && matchesFolder && matchesCategory && matchesRisk;
  });

  return (
    <div className="space-y-5 text-slate-100 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pb-3.5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
              <span>Threat Intelligence</span>
            </h1>

            {/* Mode / Data Source Indicator */}
            {isRealGmailMode ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/30 text-emerald-300 border border-emerald-800/40 inline-flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>GMAIL LIVE DATA</span>
                {gmailAccount?.email && (
                  <span className="hidden sm:inline font-mono text-[10px] text-emerald-400/80 pl-1.5 border-l border-emerald-800/60">
                    {gmailAccount.email}
                  </span>
                )}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-800 inline-flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>DEMO CORPUS</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRealGmailMode
              ? `Historical and live security incident log from ${gmailAccount?.email || 'Gmail inbox'}`
              : 'Search, filter, and inspect email threat incidents analyzed by the 5-agent security pipeline'}
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-[#0d121c] border border-slate-800/80 px-3 py-1.5 rounded-md self-start md:self-auto font-mono tabular-nums">
          Showing <span className="font-semibold text-slate-100">{filteredThreats.length}</span> of <span className="font-semibold text-slate-100">{threats.length}</span> threats
        </div>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.05 }}
        className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-3 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by sender, email address, or subject..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#090d15] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 transition duration-150"
            />
          </div>

          {/* Minimum Risk Slider */}
          <div className="flex items-center space-x-2 text-xs bg-[#090d15] border border-slate-800 px-3 py-1.5 rounded-md">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Min Risk:</span>
            <span className="font-semibold text-blue-400 font-mono tabular-nums w-5 text-center">{minRiskScore}</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minRiskScore}
              onChange={e => setMinRiskScore(Number(e.target.value))}
              className="w-20 sm:w-24 accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Batch / Run Filter (Distinguish current run from history) */}
        {threats.some(t => t.inLatestRun === true) && (
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Batch:</span>
            {[
              { id: 'ALL' as const, label: 'All History', count: threats.length },
              { id: 'LATEST' as const, label: 'Latest Analysis Run', count: latestBatchCount },
              { id: 'HISTORY' as const, label: 'Previous Runs', count: historyBatchCount }
            ].map(b => {
              const isSelected = runBatchFilter === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setRunBatchFilter(b.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600/25 text-blue-300 border border-blue-500/50 shadow-xs'
                      : 'bg-[#090d15] text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800/80 text-slate-400'
                  }`}>
                    {b.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Source / Folder Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Folder:</span>
          {[
            { id: 'ALL' as const, label: 'All Emails', count: threats.length },
            { id: 'INBOX' as const, label: 'Inbox', count: inboxCount },
            { id: 'SPAM' as const, label: 'Spam', count: spamCount },
            { id: 'THREATS' as const, label: 'Threats', count: threatsCount },
            { id: 'SAFE' as const, label: 'Safe Emails', count: safeCount },
            ...(failedCount > 0 ? [{ id: 'FAILED' as const, label: 'Failed', count: failedCount }] : []),
          ].map(f => {
            const isSelected = folderFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFolderFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-xs'
                    : 'bg-[#090d15] text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 self-center">Category:</span>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'bg-[#090d15] text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Threats List / Table */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.1 }}
        className="bg-[#0d121c] border border-slate-800/80 rounded-lg overflow-hidden"
      >
        {filteredThreats.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <ShieldAlert className="w-7 h-7 mx-auto text-slate-500" />
            <div className="text-xs font-semibold text-slate-200">No matching threat incidents found</div>
            <p className="text-xs text-slate-500">Try adjusting your search query or lowering the risk threshold.</p>
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
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5">Detected</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredThreats.map(threat => {
                  const isCrit = threat.riskScore.severity === 'CRITICAL';
                  const isHigh = threat.riskScore.severity === 'HIGH';

                  return (
                    <tr
                      key={threat.id}
                      onClick={() => onSelectThreat(threat)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 group ${
                        isCrit
                          ? 'border-l-2 border-l-rose-500 bg-rose-950/5'
                          : isHigh
                          ? 'border-l-2 border-l-orange-500 bg-orange-950/5'
                          : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Risk Badge & Score */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {threat.status === 'FAILED' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-rose-950/40 text-rose-300 border border-rose-800/50">
                              FAILED
                            </span>
                          ) : (
                            <ThreatSeverityBadge severity={threat.riskScore.severity} />
                          )}
                          <span className={`font-mono tabular-nums text-[11px] font-semibold transition-colors ${
                            threat.status === 'FAILED'
                              ? 'text-rose-400'
                              : isCrit
                              ? 'text-rose-400'
                              : isHigh
                              ? 'text-orange-400'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            {threat.status === 'FAILED' ? 'ERR' : threat.riskScore.overallScore}
                          </span>
                        </div>
                      </td>

                      {/* Folder Source ([INBOX] / [SPAM]) & Batch Tag */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                            threat.source === 'SPAM'
                              ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                              : 'bg-blue-950/30 text-blue-300 border-blue-800/40'
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
                            <span className="text-[10px] text-slate-500 font-mono" title="Demo corpus sample">
                              demo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap max-w-[180px]">
                        <div className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                          {threat.email?.sender?.name || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {threat.email?.sender?.email}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="px-3.5 py-2.5 min-w-[200px] max-w-sm sm:max-w-md">
                        <span className="text-slate-200 font-medium truncate block group-hover:text-blue-300 transition-colors" title={threat.email?.subject}>
                          {threat.email?.subject || '(No Subject)'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <ThreatCategoryBadge threatType={threat.primaryThreat} />
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

export default ThreatDashboardPage;

