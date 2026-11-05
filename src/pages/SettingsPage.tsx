import React, { useState } from 'react';
import { Settings, Volume2, Sliders, Shield, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemSettings } from '../types';

interface Props {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SettingsPage: React.FC<Props> = ({ settings, onUpdateSettings, soundEnabled, onToggleSound }) => {
  const [criticalThreshold, setCriticalThreshold] = useState(settings.riskThresholds.critical);
  const [highThreshold, setHighThreshold] = useState(settings.riskThresholds.high);
  const [retentionDays, setRetentionDays] = useState(settings.dataRetentionDays);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      riskThresholds: {
        ...settings.riskThresholds,
        critical: criticalThreshold,
        high: highThreshold
      },
      dataRetentionDays: retentionDays
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 text-slate-100 max-w-4xl mx-auto pb-10">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pb-3.5 border-b border-slate-800/80"
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>System Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Configure audio alert indicators, risk classification thresholds, and retention policies</p>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Sound Controls */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.05 }}
          className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-2.5 transition-colors"
        >
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                Threat Alert Audio
              </h2>
            </div>

            <button
              type="button"
              onClick={onToggleSound}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-600/15 text-blue-400 border-blue-500/30'
                  : 'bg-[#090d15] text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? 'Audio Alert Active' : 'Audio Alert Muted'}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Plays a real-time Web Audio notification when a HIGH or CRITICAL severity email threat is detected during mailbox scans.
          </p>
        </motion.div>

        {/* Risk Thresholds */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.1 }}
          className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-3.5 text-xs transition-colors"
        >
          <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-2.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Risk Score Classification Thresholds
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Critical Severity Threshold:</span>
                <span className="font-mono tabular-nums text-rose-400 font-semibold">≥ {criticalThreshold}</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                value={criticalThreshold}
                onChange={e => setCriticalThreshold(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Emails scoring at or above this are flagged Critical</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>High Severity Threshold:</span>
                <span className="font-mono tabular-nums text-amber-400 font-semibold">≥ {highThreshold}</span>
              </div>
              <input
                type="range"
                min="50"
                max="75"
                value={highThreshold}
                onChange={e => setHighThreshold(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Emails scoring at or above this are flagged High risk</span>
            </div>
          </div>
        </motion.div>

        {/* Retention Policy */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.15 }}
          className="p-4 sm:p-5 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-2.5 text-xs transition-colors"
        >
          <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-2.5">
            <Shield className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Data Retention & Privacy
            </h2>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Threat Log Retention Period:</label>
            <select
              value={retentionDays}
              onChange={e => setRetentionDays(Number(e.target.value))}
              className="bg-[#090d15] border border-slate-800 rounded-md p-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value={14}>14 Days</option>
              <option value={30}>30 Days (Recommended)</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
        </motion.div>

        <AnimatePresence>
          {savedSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded-md text-xs text-emerald-300 font-medium flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Settings saved successfully.</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-xs transition-all duration-150 cursor-pointer"
        >
          Save Configuration
        </button>

      </form>

    </div>
  );
};

export default SettingsPage;

