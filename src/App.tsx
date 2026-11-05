import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ThreatDashboardPage } from './pages/ThreatDashboardPage';
import { ThreatDetailPage } from './pages/ThreatDetailPage';
import { EmailAnalysisPlayground } from './pages/EmailAnalysisPlayground';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ConnectedAccountsPage } from './pages/ConnectedAccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { ResearchPage } from './pages/ResearchPage';
import { ToastNotificationContainer, ToastItem } from './components/ToastNotification';
import { ThreatAnalysis, UserProfile, GmailAccountState, NotificationItem, SystemSettings } from './types';
import { playThreatAlertSound } from './utils/sound';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [previousView, setPreviousView] = useState<string>('dashboard');
  const [threats, setThreats] = useState<ThreatAnalysis[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<ThreatAnalysis | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gmailAccount, setGmailAccount] = useState<GmailAccountState | null>(null);
  const [oauthError, setOauthError] = useState<{ error: string; description: string } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [highlightThreats, setHighlightThreats] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const alertedThreatIdsRef = useRef<Set<string>>(new Set());
  const [settings, setSettings] = useState<SystemSettings>({
    riskThresholds: { critical: 81, high: 61, medium: 41, low: 21 },
    autoQuarantine: false,
    dataRetentionDays: 30,
    enableSoundAlerts: true
  });

  // Toggle sound with preview chime and AudioContext unlock
  const handleToggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (next) {
        playThreatAlertSound('TEST_CHIME', 75);
      }
      return next;
    });
  };

  const addThreatToast = (threat: ThreatAnalysis) => {
    const isCritical = threat.riskScore.severity === 'CRITICAL';
    const isHigh = threat.riskScore.severity === 'HIGH';

    const newToast: ToastItem = {
      id: `toast-${threat.id}-${Date.now()}`,
      title: isCritical
        ? 'Critical Threat Detected — Review Required'
        : isHigh
        ? 'High-Risk Email Flagged'
        : 'Suspicious Email Detected',
      description: `${threat.email.subject || 'Threat detected'} from ${threat.email.sender.email}`,
      severity: threat.riskScore.severity,
      riskScore: threat.riskScore.overallScore,
      threatId: threat.id,
      timestamp: Date.now()
    };

    setToasts(prev => [newToast, ...prev.slice(0, 3)]); // Keep at most 4 toasts visible

    // Trigger brief visual highlight on threat counter/card
    setHighlightThreats(true);
    setTimeout(() => {
      setHighlightThreats(false);
    }, 2800);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleInspectToastThreat = (threatId: string) => {
    const threat = threats.find(t => t.id === threatId);
    if (threat) {
      handleSelectThreat(threat);
    }
  };

  // Fetch initial system data
  const loadInitialData = async () => {
    try {
      // 1. Fetch Threats
      const resThreats = await fetch('/api/threats');
      if (resThreats.ok) {
        const data = await resThreats.json();
        const initialThreats: ThreatAnalysis[] = data.threats || [];
        setThreats(initialThreats);
        // Seed already-loaded threats so initial page load does not sound spam
        initialThreats.forEach(t => alertedThreatIdsRef.current.add(t.id));
      }

      // 2. Fetch Accounts
      const resAccount = await fetch('/api/gmail/account');
      if (resAccount.ok) {
        const data = await resAccount.json();
        setGmailAccount(data.account || null);
      }

      // 3. Fetch Settings
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data.settings) setSettings(data.settings);
      }

      // Mock user profile
      setUser({
        id: 'usr-admin-01',
        email: 'hemasrinivasreddy263@gmail.com',
        name: 'Cybersecurity Officer',
        role: 'SOC Security Lead'
      });

    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  const handleAnalyzeRecentEmailsRef = useRef<((scope?: 'INBOX' | 'SPAM' | 'ALL') => Promise<any>) | null>(null);

  useEffect(() => {
    loadInitialData();

    // Listen for OAuth completion message from popup window
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'GMAIL_OAUTH_SUCCESS') {
        console.log('[MailGuard AI] Real Gmail OAuth authorized successfully for:', event.data.email);
        setOauthError(null);
        await loadInitialData();
        // Automatically trigger live inbox retrieval for 30 newest emails
        if (handleAnalyzeRecentEmailsRef.current) {
          handleAnalyzeRecentEmailsRef.current('INBOX');
        }
      } else if (event.data && event.data.type === 'GMAIL_OAUTH_ERROR') {
        const errorType = event.data.error || 'Authorization Failed';
        const errorDesc = event.data.description || 'Unable to connect Gmail account.';
        console.warn('[MailGuard AI] OAuth authorization error received:', errorType, errorDesc);

        setOauthError({ error: errorType, description: errorDesc });

        const errorToast: ToastItem = {
          id: `toast-err-${Date.now()}`,
          title: `OAuth Error: ${errorType}`,
          description: errorDesc,
          severity: 'HIGH',
          riskScore: 75,
          threatId: 'oauth-error',
          timestamp: Date.now()
        };
        setToasts(prev => [errorToast, ...prev.slice(0, 3)]);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Handler: Select a threat to inspect
  const handleSelectThreat = (threat: ThreatAnalysis) => {
    setPreviousView(activeView);
    setSelectedThreat(threat);
    setActiveView('threat-detail');
  };

  // Handler: Approve threat action (MOVE TO SPAM / QUARANTINE)
  const handleApproveThreat = async (threatId: string) => {
    try {
      const res = await fetch(`/api/threats/${threatId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.threat) {
        setThreats(prev => prev.map(t => t.id === threatId ? data.threat : t));
        if (selectedThreat?.id === threatId) {
          setSelectedThreat(data.threat);
        }
        if (soundEnabled) {
          playThreatAlertSound('ACTION_SUCCESS', 80);
        }
      } else {
        if (soundEnabled) {
          playThreatAlertSound('ACTION_ERROR', 80);
        }
        alert(data.error || 'Failed to execute Gmail Spam/Quarantine action.');
      }
    } catch (err: any) {
      console.error('Approve error:', err);
      if (soundEnabled) {
        playThreatAlertSound('ACTION_ERROR', 80);
      }
      alert('Network or server error while executing Gmail action: ' + (err?.message || 'Unknown error'));
    }
  };

  // Handler: Reject threat action (MARK SAFE)
  const handleRejectThreat = async (threatId: string) => {
    try {
      const res = await fetch(`/api/threats/${threatId}/reject`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.threat) {
        setThreats(prev => prev.map(t => t.id === threatId ? data.threat : t));
        if (selectedThreat?.id === threatId) {
          setSelectedThreat(data.threat);
        }
        if (soundEnabled) {
          playThreatAlertSound('ACTION_SAFE', 80);
        }
      } else {
        if (soundEnabled) {
          playThreatAlertSound('ACTION_ERROR', 80);
        }
        alert(data.error || 'Failed to execute Gmail Mark Safe action.');
      }
    } catch (err: any) {
      console.error('Reject error:', err);
      if (soundEnabled) {
        playThreatAlertSound('ACTION_ERROR', 80);
      }
      alert('Network or server error while executing Gmail action: ' + (err?.message || 'Unknown error'));
    }
  };

  // Handler: Submit Feedback
  const handleSubmitFeedback = async (threatId: string, label: string, notes: string) => {
    const current = threats.find(t => t.id === threatId);
    try {
      await fetch(`/api/threats/${threatId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threatId,
          userAssignedLabel: label,
          userNotes: notes,
          notes,
          originalPrediction: current?.primaryThreat || 'UNKNOWN',
          originalRiskScore: current?.riskScore?.overallScore || 0,
          isCorrect: current?.primaryThreat === label
        })
      });
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  // Handler: Analyze Custom Email in Demo Playground
  const handleAnalyzeCustom = async (customData: any): Promise<ThreatAnalysis> => {
    try {
      const res = await fetch('/api/analyze/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customData)
      });
      const data = await res.json();
      const newThreat: ThreatAnalysis = data.analysis;

      setThreats(prev => [newThreat, ...prev]);
      alertedThreatIdsRef.current.add(newThreat.id);

      // Add to notifications and toast
      if (newThreat.riskScore.severity !== 'SAFE') {
        const notif: NotificationItem = {
          id: `notif-${Date.now()}`,
          threatId: newThreat.id,
          subject: newThreat.email.subject,
          senderEmail: newThreat.email.sender.email,
          severity: newThreat.riskScore.severity,
          threatType: newThreat.primaryThreat,
          riskScore: newThreat.riskScore.overallScore,
          timestamp: new Date().toISOString(),
          read: false
        };
        setNotifications(prev => [notif, ...prev]);
        addThreatToast(newThreat);

        if (soundEnabled) {
          if (newThreat.riskScore.severity === 'CRITICAL') {
            playThreatAlertSound('CRITICAL_THREAT', 90);
          } else if (newThreat.riskScore.severity === 'HIGH') {
            playThreatAlertSound('HIGH_THREAT', 85);
          } else {
            playThreatAlertSound('SECURITY_PING', 80);
          }
        }
      } else if (soundEnabled) {
        playThreatAlertSound('ACTION_SAFE', 75);
      }

      return newThreat;
    } catch (err) {
      console.error('Custom analysis error:', err);
      if (soundEnabled) {
        playThreatAlertSound('ACTION_ERROR', 80);
      }
      throw err;
    }
  };

  const isConnectingOAuthRef = useRef(false);

  // Handler: Connect Gmail via Real OAuth
  const handleConnectGmail = async () => {
    if (isConnectingOAuthRef.current) return;
    isConnectingOAuthRef.current = true;

    // 1. Open blank popup synchronously to preserve user gesture and avoid browser popup blocking
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      'about:blank',
      'gmail_oauth_popup',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );

    try {
      const res = await fetch('/api/gmail/auth');
      const data = await res.json();

      if (!res.ok || data.error) {
        if (popup && !popup.closed) popup.close();
        alert(data.error || 'Failed to initiate Gmail connection.');
        return;
      }

      if (data.url && popup && !popup.closed) {
        popup.location.href = data.url;
      } else if (!popup || popup.closed) {
        // Popup was blocked by browser security policy
        alert('Browser popup was blocked. Please enable popups for this site in your browser address bar to allow Google OAuth sign-in.');
      }
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      console.error('Connect Gmail error:', err);
      alert('Network error connecting to Gmail OAuth endpoint.');
    } finally {
      setTimeout(() => {
        isConnectingOAuthRef.current = false;
      }, 1500);
    }
  };

  // Handler: Disconnect Gmail
  const handleDisconnectGmail = async () => {
    try {
      const res = await fetch('/api/gmail/disconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGmailAccount(data.account);
        await loadInitialData();
      }
    } catch (err) {
      console.error('Disconnect Gmail error:', err);
    }
  };

  // Handler: Analyze Recent Emails from Real Gmail (Inbox, Spam, or Both)
  const handleAnalyzeRecentEmails = async (scope: 'INBOX' | 'SPAM' | 'ALL' = 'INBOX') => {
    try {
      const res = await fetch('/api/gmail/analyze-recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        if (soundEnabled) {
          playThreatAlertSound('ACTION_ERROR', 80);
        }
        return { success: false, error: data.error || 'Failed to analyze recent messages.' };
      }

      if (data.account) {
        setGmailAccount(data.account);
      }

      // Refresh threats list
      const resThreats = await fetch('/api/threats');
      if (resThreats.ok) {
        const tData = await resThreats.json();
        const updatedThreats: ThreatAnalysis[] = tData.threats || [];
        setThreats(updatedThreats);

        // Find newly retrieved threats that haven't triggered sound yet
        const newUnseen = updatedThreats.filter(t => !alertedThreatIdsRef.current.has(t.id));
        newUnseen.forEach(t => alertedThreatIdsRef.current.add(t.id));

        const nonSafeThreats = newUnseen.filter(t => t.riskScore.severity !== 'SAFE');

        // Show toast for newly detected threat
        if (nonSafeThreats.length > 0) {
          addThreatToast(nonSafeThreats[0]);
        }

        if (soundEnabled) {
          const hasCritical = newUnseen.some(t => t.riskScore.severity === 'CRITICAL');
          const hasHigh = newUnseen.some(t => t.riskScore.severity === 'HIGH');
          const hasMedium = newUnseen.some(t => t.riskScore.severity === 'MEDIUM');

          if (hasCritical) {
            playThreatAlertSound('CRITICAL_THREAT', 90);
          } else if (hasHigh) {
            playThreatAlertSound('HIGH_THREAT', 85);
          } else if (hasMedium) {
            playThreatAlertSound('SECURITY_PING', 80);
          } else {
            // Clean safe sync
            playThreatAlertSound('ACTION_SAFE', 75);
          }
        }
      }

      return {
        success: true,
        count: data.analyzedCount || 0,
        threats: data.threats || []
      };
    } catch (err: any) {
      console.error('Analyze recent error:', err);
      if (soundEnabled) {
        playThreatAlertSound('ACTION_ERROR', 80);
      }
      return { success: false, error: err.message || 'Network error fetching emails.' };
    }
  };

  handleAnalyzeRecentEmailsRef.current = handleAnalyzeRecentEmails;

  // Handler: Update Settings
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  // Determine whether Real Gmail mode is active
  const isRealGmailMode = Boolean(gmailAccount?.isConnected);

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Professional SOC Toast Alerts Container */}
      <ToastNotificationContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onInspect={handleInspectToastThreat}
      />

      {/* Top Header */}
      <Navbar
        user={user}
        gmailAccount={gmailAccount}
        notifications={notifications}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onNavigate={setActiveView}
        onRefreshData={loadInitialData}
        activeView={activeView}
        isRealGmailMode={isRealGmailMode}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          onNavigate={setActiveView}
          threatsCount={threats.filter(t => t.riskScore.severity !== 'SAFE').length}
        />

        {/* Right Content Area with Global Page Transition (Fade + Slight Upward Movement, 180ms) */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full"
            >
              {activeView === 'landing' && (
                <LandingPage onNavigate={setActiveView} />
              )}

              {activeView === 'dashboard' && (
                <DashboardPage
                  threats={threats}
                  onSelectThreat={handleSelectThreat}
                  onNavigate={setActiveView}
                  isRealGmailMode={isRealGmailMode}
                  gmailAccount={gmailAccount}
                  onAnalyzeRecent={handleAnalyzeRecentEmails}
                  notifications={notifications}
                  highlightThreats={highlightThreats}
                />
              )}

              {activeView === 'threats' && (
                <ThreatDashboardPage
                  threats={threats}
                  onSelectThreat={handleSelectThreat}
                  isRealGmailMode={isRealGmailMode}
                  gmailAccount={gmailAccount}
                />
              )}

              {activeView === 'threat-detail' && (
                <ThreatDetailPage
                  threat={selectedThreat}
                  onBack={() => setActiveView(previousView === 'threats' ? 'threats' : 'dashboard')}
                  onApprove={handleApproveThreat}
                  onReject={handleRejectThreat}
                  onSubmitFeedback={handleSubmitFeedback}
                />
              )}

              {activeView === 'demo' && (
                <EmailAnalysisPlayground
                  onAnalyzeCustom={handleAnalyzeCustom}
                  onSelectThreat={handleSelectThreat}
                  soundEnabled={soundEnabled}
                />
              )}

              {activeView === 'analytics' && (
                <AnalyticsPage threats={threats} />
              )}

              {activeView === 'feedback' && (
                <FeedbackPage />
              )}

              {activeView === 'connected-accounts' && (
                <ConnectedAccountsPage
                  account={gmailAccount}
                  onConnect={handleConnectGmail}
                  onDisconnect={handleDisconnectGmail}
                  onAnalyzeRecent={handleAnalyzeRecentEmails}
                  oauthError={oauthError}
                  onClearOAuthError={() => setOauthError(null)}
                />
              )}

              {activeView === 'health' && (
                <SystemHealthPage />
              )}

              {activeView === 'research' && (
                <ResearchPage />
              )}

              {activeView === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  soundEnabled={soundEnabled}
                  onToggleSound={handleToggleSound}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

    </div>
  );
};

export default App;
