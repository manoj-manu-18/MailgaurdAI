import React, { useState } from 'react';
import {
  ShieldCheck,
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  User,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  ShieldAlert,
  Mail,
  BarChart3,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GmailAccountState, NotificationItem, UserProfile } from '../types';

interface Props {
  user: UserProfile | null;
  gmailAccount: GmailAccountState | null;
  notifications: NotificationItem[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNavigate: (view: string) => void;
  onRefreshData: () => void;
  activeView: string;
  isRealGmailMode: boolean;
}

export const Navbar: React.FC<Props> = ({
  user,
  gmailAccount,
  notifications,
  soundEnabled,
  onToggleSound,
  onNavigate,
  onRefreshData,
  activeView,
  isRealGmailMode
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'threats', label: 'Threats', icon: ShieldAlert },
    { id: 'connected-accounts', label: 'Connected Gmail', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080b11]/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Left: Mobile Menu Button + Brand Wordmark */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center space-x-2.5 cursor-pointer group"
              onClick={() => {
                onNavigate('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              <div className="w-8 h-8 rounded-md bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="font-semibold text-sm sm:text-base tracking-tight text-slate-100 group-hover:text-blue-300 transition-colors">
                  MailGuard <span className="text-blue-400 font-bold">AI</span>
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline ml-2.5 pl-2.5 border-l border-slate-800">
                  Gmail Threat Security
                </span>
              </div>
            </div>
          </div>

          {/* Right: Status, Controls, Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">

            {/* Connection Status Badge */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {isRealGmailMode ? (
                  <motion.button
                    key="real-gmail-connected"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      onNavigate('connected-accounts');
                      setMobileMenuOpen(false);
                    }}
                    title={`Connected to ${gmailAccount?.email || 'Gmail'}`}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all duration-150 flex items-center space-x-1.5 bg-emerald-950/30 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/30 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-semibold tracking-wide">GMAIL LIVE</span>
                    {gmailAccount?.email && (
                      <span className="hidden lg:inline text-[10px] text-emerald-400/80 border-l border-emerald-800/60 pl-1.5 max-w-[140px] truncate font-mono">
                        {gmailAccount.email}
                      </span>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    key="demo-mode-disconnected"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      onNavigate('connected-accounts');
                      setMobileMenuOpen(false);
                    }}
                    title="Operating in Demo Mode. Click to connect real Gmail."
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all duration-150 flex items-center space-x-1.5 bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-slate-300">DEMO MODE</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Sound Notification Toggle */}
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Alert Sounds Active' : 'Alert Sounds Muted'}
              className={`p-1.5 sm:p-2 rounded-md border text-xs transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-950/40 text-blue-400 border-blue-800/50 hover:bg-blue-900/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshClick}
              title="Refresh Security Data"
              className="p-1.5 sm:p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700 transition-colors duration-150 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                title="Security Alerts"
                className="p-1.5 sm:p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 relative transition-colors duration-150 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown with Motion */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-72 sm:w-88 bg-[#0d121c] border border-slate-800 rounded-lg shadow-xl z-50 p-3 text-xs text-slate-200"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="font-semibold text-slate-100 flex items-center space-x-1.5">
                        <Bell className="w-3.5 h-3.5 text-blue-400" />
                        <span>Security Threat Alerts</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">{notifications.length} alerts</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 flex flex-col items-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
                          <span>No alerts in queue. Inbox clear.</span>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setShowNotifications(false);
                              onNavigate('threats');
                            }}
                            className="p-2 rounded bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition duration-150 cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-200 truncate">{n.subject}</span>
                              <span className="text-[10px] font-mono tabular-nums text-rose-400 font-semibold shrink-0 ml-2">
                                Risk {n.riskScore}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{n.senderEmail}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile / Icon */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1.5 sm:space-x-2 p-1 sm:p-1.5 pl-1.5 sm:pl-2 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors duration-150 text-left cursor-pointer"
                title={user?.email || 'SOC Analyst'}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600/25 text-blue-400 border border-blue-500/30 flex items-center justify-center font-semibold text-xs">
                  {user?.name ? user.name[0] : <User className="w-3 h-3" />}
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <div className="text-[11px] font-medium text-slate-200 leading-tight">
                    {user?.name || 'Security Lead'}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    {user?.role || 'SOC Lead'}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-56 bg-[#0d121c] border border-slate-800 rounded-lg shadow-xl z-50 p-2 text-xs text-slate-200"
                  >
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="font-semibold text-slate-100">{user?.name || 'Cybersecurity Officer'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email || 'analyst@mailguard.internal'}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-950/40 text-blue-300 border border-blue-800/40">
                        {user?.role || 'SOC Security Lead'}
                      </span>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('settings');
                        }}
                        className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition duration-150 cursor-pointer"
                      >
                        Security Settings
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('connected-accounts');
                        }}
                        className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition duration-150 cursor-pointer"
                      >
                        Connected Accounts
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Navigation Sheet (Visible when hamburger toggled on < md) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="md:hidden border-t border-slate-800/80 bg-[#0a0e17] px-4 py-3 space-y-2"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 pb-1">
              Security Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;

