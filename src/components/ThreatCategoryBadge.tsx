import React from 'react';
import { ThreatType } from '../types';

interface Props {
  threatType: ThreatType;
  className?: string;
}

export const ThreatCategoryBadge: React.FC<Props> = ({ threatType, className = '' }) => {
  let dotColor = 'bg-slate-400';
  let label = threatType as string;

  switch (threatType) {
    case 'PHISHING':
      dotColor = 'bg-rose-400';
      label = 'Phishing';
      break;
    case 'SCAM_FRAUD':
      dotColor = 'bg-orange-400';
      label = 'Scam / Fraud';
      break;
    case 'MALICIOUS_URL':
      dotColor = 'bg-purple-400';
      label = 'Malicious URL';
      break;
    case 'SUSPICIOUS_ATTACHMENT':
      dotColor = 'bg-amber-400';
      label = 'Attachment';
      break;
    case 'IMPERSONATION':
      dotColor = 'bg-pink-400';
      label = 'Impersonation';
      break;
    case 'SPAM':
      dotColor = 'bg-yellow-400';
      label = 'Spam';
      break;
    case 'MULTI_THREAT':
      dotColor = 'bg-rose-500';
      label = 'Multi-Threat Matrix';
      break;
    case 'SAFE':
      dotColor = 'bg-emerald-400';
      label = 'Safe Email';
      break;
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#090d15] text-slate-300 border border-slate-800/90 whitespace-nowrap ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{label}</span>
    </span>
  );
};

export default ThreatCategoryBadge;


