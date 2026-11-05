import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Mail,
  BarChart3,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  activeView: string;
  onNavigate: (view: string) => void;
  threatsCount: number;
}

export const Sidebar: React.FC<Props> = ({ activeView, onNavigate, threatsCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'threats', label: 'Threats', icon: ShieldAlert, badge: threatsCount },
    { id: 'connected-accounts', label: 'Connected Gmail', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="hidden md:flex w-56 lg:w-60 bg-[#0a0e17] border-r border-slate-800/70 text-slate-400 flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] p-3.5 lg:p-4 select-none">
      <div className="space-y-2">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        <nav className="space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 group text-left cursor-pointer ${
                  isActive
                    ? 'text-blue-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                {/* Active indicator animated background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-blue-600/10 border border-blue-500/25 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}

                <div className="relative z-10 flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-150 ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="relative z-10 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Engine Status Card */}
      <div className="p-3 bg-[#0d121c] border border-slate-800/80 rounded-lg space-y-1">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-medium text-slate-200">5-Agent Security</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Real-time threat inspection & risk scoring
        </p>
        <div className="pt-1 flex items-center space-x-1.5 text-[10px] text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Protection Operational</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

