import React from 'react';
import { SeverityLevel } from '../types';

interface Props {
  severity: SeverityLevel;
  className?: string;
}

export const ThreatSeverityBadge: React.FC<Props> = ({ severity, className = '' }) => {
  let badgeStyle = 'bg-slate-900/80 text-slate-300 border-slate-700/60';
  let dotColor = 'bg-slate-400';

  switch (severity) {
    case 'CRITICAL':
      badgeStyle = 'bg-rose-950/40 text-rose-200 border-rose-600/50 shadow-xs shadow-rose-950/60';
      dotColor = 'bg-rose-400 animate-pulse';
      break;
    case 'HIGH':
      badgeStyle = 'bg-orange-950/40 text-orange-200 border-orange-600/50';
      dotColor = 'bg-orange-400';
      break;
    case 'MEDIUM':
      badgeStyle = 'bg-amber-950/40 text-amber-200 border-amber-600/50';
      dotColor = 'bg-amber-400';
      break;
    case 'LOW':
      badgeStyle = 'bg-sky-950/40 text-sky-200 border-sky-600/50';
      dotColor = 'bg-sky-400';
      break;
    case 'SAFE':
      badgeStyle = 'bg-emerald-950/40 text-emerald-200 border-emerald-600/50';
      dotColor = 'bg-emerald-400';
      break;
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border uppercase tabular-nums font-mono ${badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{severity}</span>
    </span>
  );
};

export default ThreatSeverityBadge;


