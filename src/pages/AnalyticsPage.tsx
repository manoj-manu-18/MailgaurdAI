import React from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ThreatAnalysis } from '../types';
import {
  ResponsiveContainer,
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
}

export const AnalyticsPage: React.FC<Props> = ({ threats }) => {
  const phishing = threats.filter(t => (t.threatTypes && t.threatTypes.includes('PHISHING')) || t.primaryThreat === 'PHISHING').length;
  const scam = threats.filter(t => (t.threatTypes && t.threatTypes.includes('SCAM_FRAUD')) || t.primaryThreat === 'SCAM_FRAUD').length;
  const url = threats.filter(t => (t.threatTypes && t.threatTypes.includes('MALICIOUS_URL')) || t.primaryThreat === 'MALICIOUS_URL').length;
  const att = threats.filter(t => (t.threatTypes && t.threatTypes.includes('SUSPICIOUS_ATTACHMENT')) || t.primaryThreat === 'SUSPICIOUS_ATTACHMENT').length;
  const spam = threats.filter(t => (t.threatTypes && t.threatTypes.includes('SPAM')) || t.primaryThreat === 'SPAM').length;

  const categoryData = [
    { name: 'Phishing', count: phishing, color: '#f43f5e' },
    { name: 'Scam/Fraud', count: scam, color: '#f59e0b' },
    { name: 'Malicious URL', count: url, color: '#a855f7' },
    { name: 'Attachment', count: att, color: '#f97316' },
    { name: 'Spam', count: spam, color: '#eab308' }
  ].filter(c => c.count > 0);

  const severityData = [
    { level: 'Critical', count: threats.filter(t => t.riskScore?.severity === 'CRITICAL').length, color: '#ef4444' },
    { level: 'High', count: threats.filter(t => t.riskScore?.severity === 'HIGH').length, color: '#f97316' },
    { level: 'Medium', count: threats.filter(t => t.riskScore?.severity === 'MEDIUM').length, color: '#f59e0b' },
    { level: 'Low', count: threats.filter(t => t.riskScore?.severity === 'LOW').length, color: '#3b82f6' },
    { level: 'Safe', count: threats.filter(t => t.riskScore?.severity === 'SAFE').length, color: '#10b981' }
  ];

  return (
    <div className="space-y-5 text-slate-100 max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pb-3.5 border-b border-slate-800/80"
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span>Security Threat Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Aggregated detection metrics and risk distribution trends across the 5-agent pipeline</p>
      </motion.div>

      {/* Metrics Row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <div className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">Detection Accuracy</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tabular-nums">98.2%</div>
          <p className="text-[11px] text-slate-400">Multi-Agent + Gemini Verified</p>
        </div>

        <div className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">Average Pipeline Latency</span>
          <div className="text-xl sm:text-2xl font-bold text-blue-400 font-mono tabular-nums">340 ms</div>
          <p className="text-[11px] text-slate-400">Parallel Specialized Agents</p>
        </div>

        <div className="p-3.5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1 hover:border-slate-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block tracking-wider">False Positive Rate</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-200 font-mono tabular-nums">1.5%</div>
          <p className="text-[11px] text-slate-400">Phase 3 Risk Floor Engine</p>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
      >
        
        <div className="p-4 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-2.5 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <PieIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Threat Categories Volume</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">{categoryData.length} Types</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {categoryData.map((entry, index) => (
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
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/60 text-[10px]">
            {categoryData.map(c => (
              <div key={c.name} className="flex items-center space-x-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-slate-400 truncate">{c.name}:</span>
                <span className="font-semibold text-slate-200 font-mono tabular-nums">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-2.5 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span>Severity Breakdown</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">0–100 Scores</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="level" stroke="#64748b" fontSize={10} tickLine={false} />
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
                  name="Count"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </motion.div>

    </div>
  );
};

export default AnalyticsPage;

