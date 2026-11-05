import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { SeverityLevel } from '../types';

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  riskScore: number;
  threatId?: string;
  timestamp: number;
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onInspect?: (threatId: string) => void;
}

export const ToastNotificationContainer: React.FC<Props> = ({ toasts, onDismiss, onInspect }) => {
  return (
    <div className="fixed top-18 right-4 sm:right-6 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => onDismiss(toast.id)}
            onInspect={() => toast.threatId && onInspect?.(toast.threatId)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: () => void;
  onInspect: () => void;
}> = ({ toast, onDismiss, onInspect }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isCritical = toast.severity === 'CRITICAL';
  const isHigh = toast.severity === 'HIGH';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`pointer-events-auto rounded-lg p-3 border shadow-lg backdrop-blur-md relative overflow-hidden ${
        isCritical
          ? 'bg-[#120a0e]/95 border-rose-900/70 text-rose-100'
          : isHigh
          ? 'bg-[#140e08]/95 border-amber-900/70 text-amber-100'
          : 'bg-[#0d121c]/95 border-slate-800 text-slate-100'
      }`}
    >
      {/* Progress auto-dismiss bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4.5, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${
          isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-400' : 'bg-blue-500'
        }`}
      />

      <div className="flex items-start space-x-2.5">
        <div
          className={`p-1.5 rounded-md shrink-0 ${
            isCritical
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : isHigh
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
          }`}
        >
          {isCritical ? (
            <ShieldAlert className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-xs text-white tracking-tight">
              {toast.title}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums font-bold ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              Risk {toast.riskScore}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 mt-0.5 truncate">
            {toast.description}
          </p>

          {toast.threatId && (
            <button
              onClick={onInspect}
              className="mt-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition cursor-pointer"
            >
              <span>Inspect Threat</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 transition p-1 -mr-1 -mt-1 rounded hover:bg-slate-800/50 cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default ToastNotificationContainer;
