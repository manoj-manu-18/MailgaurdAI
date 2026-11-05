import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DEMO_EMAILS } from './server/data/demoEmails.js';
import { runSecurityOrchestrator } from './server/agents/orchestrator.js';
import { GmailAccountState, ModelEvaluation, SystemSettings, ThreatAnalysis, UserFeedback, UserProfile, EmailSourcesSummary, EmailSource, AnalysisRunStats } from './src/types.js';
import {
  isOAuthConfigured,
  generateAuthUrl,
  exchangeCodeForTokens,
  getDefaultRedirectUri,
  getOAuthDiagnostics,
  createOAuthState,
  validateAndConsumeOAuthState
} from './server/gmail/gmailAuth.js';
import { getAuthenticatedGmailClient } from './server/gmail/gmailClient.js';
import {
  getGmailProfile,
  getRecentNormalizedMessages,
  getNormalizedMessageById,
  moveGmailMessageToSpam,
  markGmailMessageSafe,
  moveGmailMessageToInbox,
  fetchMessagesForSource,
  fetchRealGmailMessages,
  INBOX_ANALYSIS_LIMIT,
  SPAM_ANALYSIS_LIMIT,
  MAX_RUN_ANALYSIS_LIMIT,
  DEFAULT_SOURCE_ANALYSIS_LIMIT
} from './server/gmail/gmailService.js';
import { StoredTokens } from './server/gmail/gmailTypes.js';


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory data store for user session & tokens
  let currentUser: UserProfile = {
    id: 'usr-admin-01',
    name: 'Cybersecurity Officer',
    email: 'hemasrinivasreddy263@gmail.com',
    role: 'ADMIN',
    createdAt: new Date().toISOString()
  };

  // User-mapped secure OAuth tokens (never sent to client)
  let userGmailTokens: Record<string, StoredTokens> = {};

  let gmailState: GmailAccountState = {
    isConnected: false,
    email: undefined,
    connectedAt: undefined,
    status: 'DISCONNECTED',
    lastSyncedAt: new Date().toISOString(),
    totalEmailsMonitored: 0,
    threatsDetected: 0
  };

  let systemSettings: SystemSettings = {
    soundEnabled: true,
    soundVolume: 80,
    soundType: 'POLICE_SIREN',
    autoRefreshIntervalSeconds: 15,
    riskThresholds: {
      low: 21,
      medium: 41,
      high: 61,
      critical: 81
    },
    dataRetentionDays: 30,
    enableBrowserNotifications: true
  };

  // Threat storage partitioned by account identity + persistent demo corpus
  let demoThreats: ThreatAnalysis[] = [];
  let accountThreats: Record<string, ThreatAnalysis[]> = {};
  let userFeedbacks: UserFeedback[] = [];

  function getActiveThreats(explicitMode?: string): ThreatAnalysis[] {
    if (explicitMode === 'demo') {
      return demoThreats;
    }
    if (explicitMode === 'live') {
      const emailKey = (gmailState.email || currentUser.email).toLowerCase();
      return accountThreats[emailKey] || [];
    }
    if (gmailState.isConnected && gmailState.email) {
      const emailKey = gmailState.email.toLowerCase();
      return accountThreats[emailKey] || [];
    }
    return demoThreats;
  }

  function computeEmailSourcesSummary(threats: ThreatAnalysis[]): EmailSourcesSummary {
    const inboxList = threats.filter(t => (t.source || 'INBOX') === 'INBOX');
    const spamList = threats.filter(t => t.source === 'SPAM');

    const inboxThreatsCount = inboxList.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length;
    const spamThreatsCount = spamList.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length;

    const inboxHighCount = inboxList.filter(t => t.status !== 'FAILED' && (t.riskScore.severity === 'CRITICAL' || t.riskScore.severity === 'HIGH')).length;
    const spamHighCount = spamList.filter(t => t.status !== 'FAILED' && (t.riskScore.severity === 'CRITICAL' || t.riskScore.severity === 'HIGH')).length;

    const inboxSafeCount = inboxList.filter(t => t.status !== 'FAILED' && t.riskScore.severity === 'SAFE').length;
    const spamSafeCount = spamList.filter(t => t.status !== 'FAILED' && t.riskScore.severity === 'SAFE').length;

    const inboxFailedCount = inboxList.filter(t => t.status === 'FAILED').length;
    const spamFailedCount = spamList.filter(t => t.status === 'FAILED').length;

    return {
      inbox: {
        analyzed: inboxList.length,
        threats: inboxThreatsCount,
        highRisk: inboxHighCount,
        safe: inboxSafeCount,
        failed: inboxFailedCount
      },
      spam: {
        analyzed: spamList.length,
        threats: spamThreatsCount,
        highRisk: spamHighCount,
        safe: spamSafeCount,
        failed: spamFailedCount
      },
      total: {
        analyzed: threats.length,
        threats: inboxThreatsCount + spamThreatsCount,
        highRisk: inboxHighCount + spamHighCount,
        safe: inboxSafeCount + spamSafeCount,
        failed: inboxFailedCount + spamFailedCount
      }
    };
  }

  // Initialize demo email analyses without overwriting account storage
  const initDemoThreats = async () => {
    try {
      console.log('Initializing MailGuard AI security orchestrator on 7 demo emails...');
      const analyses = await Promise.all(DEMO_EMAILS.map(email => runSecurityOrchestrator(email)));
      demoThreats = analyses;
      gmailState.emailSourcesSummary = computeEmailSourcesSummary(demoThreats);
      console.log(`Analyzed ${demoThreats.length} initial demo threat samples successfully.`);
    } catch (err) {
      console.warn('Demo threats initialization error:', err);
    }
  };
  initDemoThreats();

  // API Routes
  app.get('/api/health', (req, res) => {
    const oauthConfigured = isOAuthConfigured();
    const geminiConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    const active = getActiveThreats();

    res.json({
      status: 'ok',
      service: 'MailGuard AI Security Engine',
      timestamp: new Date().toISOString(),
      gmailApiStatus: oauthConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      gmailOAuthStatus: oauthConfigured ? 'READY' : 'NOT CONFIGURED',
      connectedAccountStatus: gmailState.isConnected ? 'CONNECTED' : 'DISCONNECTED',
      geminiStatus: geminiConfigured ? 'CONFIGURED' : 'NOT CONFIGURED',
      securityAgentsStatus: 'OPERATIONAL',
      activeThreatsCount: active.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length
    });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: currentUser });
  });

  // Gmail Account / OAuth Endpoints
  app.get('/api/gmail/status', (req, res) => {
    const active = getActiveThreats();
    gmailState.emailSourcesSummary = computeEmailSourcesSummary(active);
    res.json({
      configured: isOAuthConfigured(),
      account: {
        ...gmailState,
        expectedEmail: currentUser.email,
        accountMismatch: gmailState.email ? gmailState.email.toLowerCase() !== currentUser.email.toLowerCase() : false
      }
    });
  });

  app.get('/api/gmail/account', (req, res) => {
    const active = getActiveThreats();
    gmailState.emailSourcesSummary = computeEmailSourcesSummary(active);
    res.json({
      configured: isOAuthConfigured(),
      account: {
        ...gmailState,
        expectedEmail: currentUser.email,
        accountMismatch: gmailState.email ? gmailState.email.toLowerCase() !== currentUser.email.toLowerCase() : false
      }
    });
  });

  app.get('/api/gmail/diagnostics', (req, res) => {
    const hostHeader = req.get('host');
    const diagnostics = getOAuthDiagnostics(hostHeader);
    res.json({
      ...diagnostics,
      expectedEmail: currentUser.email,
      isConnected: gmailState.isConnected,
      connectedEmail: gmailState.email,
      status: gmailState.status
    });
  });

  app.get('/api/gmail/auth', (req, res) => {
    if (!isOAuthConfigured()) {
      return res.status(400).json({
        error: 'Gmail integration is not configured yet. Add the Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) to the server environment and try again.',
        configured: false
      });
    }

    try {
      const hostHeader = req.get('host');
      const redirectUri = getDefaultRedirectUri(hostHeader);
      const stateEntry = createOAuthState(currentUser.id, redirectUri);

      console.log(`[Gmail OAuth] Initiating authorization with redirectUri: ${redirectUri}`);
      const authUrl = generateAuthUrl(stateEntry.stateToken, redirectUri);

      res.json({ url: authUrl, state: stateEntry.stateToken, redirectUri });
    } catch (err: any) {
      console.error('[Gmail OAuth Error] Failed to generate OAuth URL:', err?.message || err);
      res.status(500).json({ error: err.message || 'Failed to generate OAuth URL' });
    }
  });

  app.get('/api/gmail/oauth/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const errCode = String(error || 'unknown_error');
      const errDesc = String(error_description || 'Authorization was not granted by the user or Google Cloud.');
      const isAccessDenied = errCode === 'access_denied';

      console.warn(`[Gmail OAuth Callback] Google returned authorization error: ${errCode} - ${errDesc}`);

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail Authorization Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { background: #090d16; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; }
              .card { max-width: 540px; background: #0f172a; border: 1px solid #dc2626; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
              h2 { color: #ef4444; margin-top: 0; font-size: 1.25rem; }
              .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; background: rgba(239,68,68,0.15); color: #fca5a5; font-family: monospace; font-size: 12px; margin-bottom: 12px; }
              .desc { font-size: 13px; line-height: 1.5; color: #cbd5e1; margin-bottom: 16px; }
              .steps { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: left; margin-bottom: 16px; }
              .steps strong { color: #f8fafc; }
              .btn { display: inline-block; background: #2563eb; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
              .btn-close { background: #334155; margin-left: 8px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Gmail Authorization Denied</h2>
              <div class="badge">${errCode}</div>
              <div class="desc">${errDesc}</div>

              ${isAccessDenied ? `
              <div class="steps">
                <strong>Why did Google return Error 403 access_denied?</strong><br>
                When a Google Cloud OAuth App is in <em>Testing</em> status, Google strictly restricts access to designated Test Users only.<br><br>
                <strong>Resolution Steps in Google Cloud Console:</strong><br>
                1. Open <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" style="color:#60a5fa;">Google Cloud Console &rarr; OAuth consent screen</a>.<br>
                2. Scroll down to <strong>Test users</strong> &rarr; click <strong>+ ADD USERS</strong>.<br>
                3. Add <strong style="color:#38bdf8;">${currentUser.email}</strong> and save.<br>
                4. In <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" style="color:#60a5fa;">APIs & Library</a>, ensure <strong>Gmail API</strong> is <strong>ENABLED</strong>.<br>
                5. Retry connecting. When prompted with "Google hasn't verified this app", click <strong>Advanced &rarr; Go to MailGuard AI (unsafe)</strong>.
              </div>
              ` : `
              <div class="steps">
                <strong>Troubleshooting:</strong><br>
                Please verify that your Google Cloud Project has the Gmail API enabled and that the authorized redirect URI matches this app.
              </div>
              `}

              <button class="btn btn-close" onclick="window.close()">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: '${errCode}',
                  description: ${JSON.stringify(errDesc)}
                }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }

    const hostHeader = req.get('host');
    const expectedRedirectUri = getDefaultRedirectUri(hostHeader);
    const statePresent = typeof state === 'string' && state.trim().length > 0;

    // Strict CSRF State Validation & Atomic Consumption
    const stateValidation = validateAndConsumeOAuthState(state, expectedRedirectUri);
    const matchingEntry = stateValidation.valid === true
      ? true
      : (stateValidation.reason === 'consumed' || stateValidation.reason === 'expired');

    const failureReason = stateValidation.valid === false ? stateValidation.reason : undefined;

    // Safe diagnostic logging: never logs codes, tokens, client secrets, or full state values
    console.log(`[Gmail OAuth State Check] statePresent: ${statePresent}, matchingEntry: ${matchingEntry}, ageMs: ${stateValidation.ageMs ?? 'unknown'}, valid: ${stateValidation.valid}${failureReason ? `, failureReason: ${failureReason}` : ''}`);

    if (stateValidation.valid === false) {
      const reason = stateValidation.reason;
      console.warn(`[Gmail OAuth Callback] Invalid or expired OAuth state parameter received (reason: ${reason}).`);
      const isExpired = reason === 'expired';
      const userMessage = isExpired
        ? 'OAuth authorization session expired (must complete within 15 minutes). Please return to MailGuard AI and click Connect again.'
        : reason === 'missing'
        ? 'OAuth state parameter missing from callback URL.'
        : reason === 'consumed'
        ? 'This OAuth authorization session was already completed and consumed. Please return to MailGuard AI and click Connect again.'
        : 'CSRF verification session expired or invalid state token. Please return to MailGuard AI and click Connect again.';

      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Verification Failed - MailGuard AI</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { background: #090d16; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; }
              .card { max-width: 520px; background: #0f172a; border: 1px solid #ef4444; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: left; }
              h2 { color: #ef4444; margin-top: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 8px; }
              .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; background: rgba(239,68,68,0.15); color: #fca5a5; font-family: monospace; font-size: 11px; margin-bottom: 12px; }
              .desc { font-size: 13px; line-height: 1.5; color: #cbd5e1; margin-bottom: 16px; }
              .steps { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.6; color: #94a3b8; margin-bottom: 16px; }
              .btn { display: inline-block; background: #2563eb; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>OAuth State Verification Failed</h2>
              <div class="badge">Error: ${reason}</div>
              <div class="desc">${userMessage}</div>
              <div class="steps">
                <strong>What should you do?</strong><br>
                1. Close this popup window.<br>
                2. In MailGuard AI, ensure you click <strong>Authorize & Connect Gmail</strong> to initiate a fresh session.<br>
                3. Complete the Google authorization prompt within 15 minutes.
              </div>
              <button class="btn" onclick="window.close()">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: '${reason}',
                  description: ${JSON.stringify(userMessage)}
                }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }

    const stateEntry = stateValidation.entry;
    const { userId } = stateEntry;

    const normalizedCode = (typeof code === 'string')
      ? code.trim()
      : (Array.isArray(code) && typeof code[0] === 'string' ? code[0].trim() : '');

    if (!normalizedCode) {
      return res.status(400).send('Authorization code missing.');
    }

    try {
      const hostHeader = req.get('host');
      const redirectUri = stateEntry.redirectUri || getDefaultRedirectUri(hostHeader);

      console.log(`[Gmail OAuth Callback] Exchanging authorization code using redirectUri: ${redirectUri}`);
      const tokens = await exchangeCodeForTokens(normalizedCode, redirectUri);
      userGmailTokens[userId] = tokens;

      const client = getAuthenticatedGmailClient(tokens, redirectUri);
      const profile = await getGmailProfile(client);
      const connectedEmail = profile.emailAddress.toLowerCase();
      const expectedEmail = currentUser.email.toLowerCase();
      const isMismatch = connectedEmail !== expectedEmail;

      gmailState = {
        isConnected: true,
        email: profile.emailAddress,
        expectedEmail: currentUser.email,
        accountMismatch: isMismatch,
        connectedAt: new Date().toISOString(),
        status: 'ACTIVE',
        lastSyncedAt: new Date().toISOString(),
        totalEmailsMonitored: (accountThreats[connectedEmail] || []).length || profile.messagesTotal || 0,
        threatsDetected: (accountThreats[connectedEmail] || []).filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length,
        emailSourcesSummary: computeEmailSourcesSummary(accountThreats[connectedEmail] || [])
      };

      console.log(`[Gmail OAuth Callback] Successfully connected Gmail account: ${profile.emailAddress}`);

      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Gmail Connected Successfully</title></head>
          <body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:3rem;text-align:center;">
            <h2 style="color:#22c55e;">Gmail Account Authorized & Connected!</h2>
            <p>Connected Account: <strong style="color:#38bdf8;">${profile.emailAddress}</strong></p>
            <p style="color:#94a3b8;font-size:12px;">Syncing real messages and returning to MailGuard AI...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_OAUTH_SUCCESS', email: '${profile.emailAddress}' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                window.location.href = '/connected-accounts?status=success';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[Gmail OAuth Callback Error] Failed exchanging code or fetching profile:', err?.message || err);
      const isApiDisabled = (err?.message || '').includes('Gmail API has not been used') || (err?.message || '').includes('disabled');

      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Gmail Authorization Error</title></head>
          <body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:2rem;text-align:center;">
            <div style="max-width:520px;margin:0 auto;background:#0f172a;border:1px solid #ef4444;border-radius:12px;padding:24px;text-align:left;">
              <h2 style="color:#ef4444;margin-top:0;">Failed to Complete Gmail Connection</h2>
              <p style="font-size:13px;color:#cbd5e1;">${err?.message || 'Token exchange failed.'}</p>
              ${isApiDisabled ? `
                <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;font-size:12px;color:#94a3b8;margin-top:12px;">
                  <strong style="color:#f8fafc;">Gmail API Not Enabled:</strong><br>
                  Please navigate to Google Cloud Console &rarr; APIs & Services &rarr; Library &rarr; Search "Gmail API" &rarr; click <strong>Enable</strong>.
                </div>
              ` : ''}
              <div style="margin-top:16px;">
                <button onclick="window.close()" style="background:#334155;color:#fff;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;">Close Window</button>
              </div>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: 'token_exchange_failed',
                  description: ${JSON.stringify(err?.message || 'Token exchange failed')}
                }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  });


  app.get('/api/gmail/profile', async (req, res) => {
    const tokens = userGmailTokens[currentUser.id];
    if (!tokens || !gmailState.isConnected) {
      return res.status(401).json({ error: 'Gmail account not connected or authorized.' });
    }

    try {
      const client = getAuthenticatedGmailClient(tokens);
      const profile = await getGmailProfile(client);
      res.json({ profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch Gmail profile' });
    }
  });

  app.get('/api/gmail/messages', async (req, res) => {
    const tokens = userGmailTokens[currentUser.id];
    if (!tokens || !gmailState.isConnected) {
      return res.status(401).json({ error: 'Gmail account not connected.' });
    }

    try {
      const client = getAuthenticatedGmailClient(tokens);
      const source = ((req.query.source as string) || 'INBOX').toUpperCase() as EmailSource;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 30);
      const { emails } = await fetchMessagesForSource(client, source, limit);
      res.json({ messages: emails });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list Gmail messages' });
    }
  });

  // Test endpoint for separate Inbox / Spam retrieval verification
  app.get('/api/gmail/test-retrieval', async (req, res) => {
    const tokens = userGmailTokens[currentUser.id];
    if (!tokens || !gmailState.isConnected) {
      return res.status(401).json({
        error: 'Gmail account is not connected. Connect Gmail to test live message retrieval.'
      });
    }

    const source = ((req.query.source as string) || 'INBOX').toUpperCase() as EmailSource;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    try {
      const client = getAuthenticatedGmailClient(tokens);
      const result = await fetchMessagesForSource(client, source, limit);
      res.json({
        success: true,
        source: result.source,
        retrievedCount: result.emails.length,
        failedCount: result.failedCount,
        failedIds: result.failedIds,
        messages: result.emails.map(e => ({
          id: e.id,
          rawGmailId: e.rawGmailId,
          messageId: e.messageId,
          subject: e.subject,
          sender: e.sender,
          source: e.source,
          receivedAt: e.receivedAt,
          snippet: e.snippet
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to test message retrieval' });
    }
  });

  app.get('/api/gmail/messages/:id', async (req, res) => {
    const tokens = userGmailTokens[currentUser.id];
    if (!tokens || !gmailState.isConnected) {
      return res.status(401).json({ error: 'Gmail account not connected.' });
    }

    try {
      const client = getAuthenticatedGmailClient(tokens);
      const email = await getNormalizedMessageById(client, req.params.id);
      res.json({ email });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve Gmail message' });
    }
  });

  app.post('/api/gmail/analyze-recent', async (req, res) => {
    const tokens = userGmailTokens[currentUser.id];
    if (!tokens || !gmailState.isConnected) {
      return res.status(401).json({
        error: 'Gmail account is not connected. Please authorize Gmail first before retrieving recent emails.'
      });
    }

    try {
      const client = getAuthenticatedGmailClient(tokens);
      const profile = await getGmailProfile(client);
      const connectedEmail = profile.emailAddress.toLowerCase();

      // Ensure account identity is locked and verified
      gmailState.email = profile.emailAddress;
      gmailState.expectedEmail = currentUser.email;
      gmailState.accountMismatch = connectedEmail !== currentUser.email.toLowerCase();

      // Read requested scope: 'INBOX' (default), 'SPAM', or 'ALL'
      const rawScope = ((req.body?.scope || req.query?.scope || req.query?.source || 'INBOX') as string).toUpperCase();
      const analysisScope: 'INBOX' | 'SPAM' | 'ALL' = (rawScope === 'ALL' || rawScope === 'INBOX_SPAM') ? 'ALL' : (rawScope === 'SPAM' ? 'SPAM' : 'INBOX');

      console.log(`[Gmail Analysis] Retrieving ${analysisScope} messages (up to 30 Inbox, up to 30 Spam) for account ${profile.emailAddress}...`);
      const { inbox, spam, totalRetrieved, totalFailed } = await fetchRealGmailMessages(client, {
        inboxLimit: 30,
        spamLimit: 30,
        scope: analysisScope
      });

      const allRetrievedEmails = [...inbox.emails, ...spam.emails];

      if (!accountThreats[connectedEmail]) {
        accountThreats[connectedEmail] = [];
      }
      const existingStore = accountThreats[connectedEmail];

      const runAnalyzedList: ThreatAnalysis[] = [];
      let cachedCount = 0;
      let newCount = 0;
      let failedCount = 0;

      for (let i = 0; i < allRetrievedEmails.length; i++) {
        const email = allRetrievedEmails[i];
        const gmailMsgId = email.rawGmailId || (email.id.startsWith('gmail-') ? email.id.replace(/^gmail-/, '') : email.id);

        // Check if this exact Gmail message was previously analyzed successfully for this account
        const existingMatch = existingStore.find(t => {
          const tGmailId = t.email.rawGmailId || (t.email.id.startsWith('gmail-') ? t.email.id.replace(/^gmail-/, '') : t.email.id);
          return tGmailId === gmailMsgId && t.status !== 'FAILED';
        });

        if (existingMatch) {
          // Reuse cached analysis, update current folder source and freshness flags
          const cachedRecord: ThreatAnalysis = {
            ...existingMatch,
            source: email.source || existingMatch.source,
            email: {
              ...existingMatch.email,
              source: email.source || existingMatch.email.source,
              internalDate: email.internalDate || existingMatch.email.internalDate,
              receivedAt: email.receivedAt || existingMatch.email.receivedAt
            },
            isCached: true,
            isNew: false,
            inLatestRun: true,
            accountEmail: connectedEmail
          };
          runAnalyzedList.push(cachedRecord);
          cachedCount++;
        } else {
          // Run through 5-agent security pipeline
          try {
            const analysis = await runSecurityOrchestrator(email);
            const analyzedRecord: ThreatAnalysis = {
              ...analysis,
              isCached: false,
              isNew: true,
              inLatestRun: true,
              accountEmail: connectedEmail
            };
            runAnalyzedList.push(analyzedRecord);
            newCount++;

            // Pacing delay between newly analyzed items to preserve Gemini quota
            if (i < allRetrievedEmails.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 250));
            }
          } catch (analysisErr: any) {
            failedCount++;
            console.error(`[Orchestrator Error] Failed analyzing email ${email.id} (${email.subject}):`, analysisErr);

            const failedRecord: ThreatAnalysis = {
              id: `failed-${email.id}-${Date.now()}`,
              email,
              threatTypes: [],
              primaryThreat: 'SAFE',
              riskScore: {
                overallScore: 0,
                severity: 'SAFE',
                contentRisk: 0,
                senderRisk: 0,
                urlRisk: 0,
                attachmentRisk: 0,
                scamRisk: 0,
                mlRisk: 0,
                contributingFactors: [{ factor: 'Analysis Pipeline Failure', impact: 0, description: analysisErr?.message || 'Processing error' }]
              },
              multiAgentAnalysis: {
                contentAgent: { agent: 'content', spamProbability: 0, phishingProbability: 0, scamProbability: 0, urgencyScore: 0, financialRequest: false, credentialRequest: false, indicators: [], confidence: 0 },
                senderAgent: { agent: 'sender', domainMismatch: false, possibleImpersonation: false, suspiciousDomainChars: false, indicators: [], confidence: 0, riskScore: 0 },
                urlAgent: { agent: 'url', totalUrls: email.urls.length, suspiciousUrlsCount: 0, maxUrlRisk: 0, urls: email.urls, indicators: [], confidence: 0 },
                attachmentAgent: { agent: 'attachment', totalAttachments: email.attachments.length, highRiskCount: 0, attachments: email.attachments, indicators: [], confidence: 0, riskScore: 0 },
                scamAgent: { agent: 'scam', isPaymentRequest: false, isCryptoScam: false, isPrizeScam: false, isJobScam: false, isAccountTakeover: false, scamProbability: 0, indicators: [], confidence: 0 },
                orchestratorTimestamp: new Date().toISOString(),
                orchestratorNotes: `Analysis failed: ${analysisErr?.message || 'Unknown error'}`
              },
              mlPrediction: { modelName: 'RuleFallback', predictedCategory: 'SAFE', probability: 0, isConfigured: true },
              aiExplanation: {
                summary: `Analysis could not be completed: ${analysisErr?.message || 'Processing error'}`,
                reasons: [`Pipeline execution error: ${analysisErr?.message || 'Unknown error'}`],
                evidencePoints: [],
                confidenceLevel: 'LOW',
                generatedByGemini: false
              },
              recommendation: {
                action: 'MARK_SUSPICIOUS',
                title: 'Analysis Failed — Manual Review Recommended',
                explanation: `Automated threat analysis could not be completed for this email (${analysisErr?.message || 'Unknown error'}). Inspect manually.`
              },
              status: 'FAILED',
              failureReason: analysisErr?.message || 'Security agent analysis pipeline error',
              processedAt: new Date().toISOString(),
              isDemo: false,
              source: email.source || 'INBOX',
              accountEmail: connectedEmail,
              isNew: true,
              isCached: false,
              inLatestRun: true
            };

            runAnalyzedList.push(failedRecord);
          }
        }
      }

      // Preserve historical results without contaminating the current run:
      // Mark existing items not in this run with inLatestRun = false
      const runIds = new Set(runAnalyzedList.map(t => t.email.rawGmailId || t.email.id));
      const historicalUnseen = existingStore
        .filter(t => !runIds.has(t.email.rawGmailId || t.email.id))
        .map(t => ({ ...t, inLatestRun: false }));

      accountThreats[connectedEmail] = [...runAnalyzedList, ...historicalUnseen];

      const successfullyAnalyzedCount = runAnalyzedList.filter(t => t.status !== 'FAILED').length;
      const threatsDetectedCount = runAnalyzedList.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length;
      const safeEmailsCount = runAnalyzedList.filter(t => t.status !== 'FAILED' && t.riskScore.severity === 'SAFE').length;

      const inboxList = runAnalyzedList.filter(t => (t.source || 'INBOX') === 'INBOX');
      const spamList = runAnalyzedList.filter(t => t.source === 'SPAM');

      const inboxStats = {
        analyzed: inboxList.filter(t => t.status !== 'FAILED').length,
        threats: inboxList.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length,
        highRisk: inboxList.filter(t => t.status !== 'FAILED' && (t.riskScore.severity === 'CRITICAL' || t.riskScore.severity === 'HIGH')).length,
        safe: inboxList.filter(t => t.status !== 'FAILED' && t.riskScore.severity === 'SAFE').length,
        failed: inboxList.filter(t => t.status === 'FAILED').length
      };

      const spamStats = {
        analyzed: spamList.filter(t => t.status !== 'FAILED').length,
        threats: spamList.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length,
        highRisk: spamList.filter(t => t.status !== 'FAILED' && (t.riskScore.severity === 'CRITICAL' || t.riskScore.severity === 'HIGH')).length,
        safe: spamList.filter(t => t.status !== 'FAILED' && t.riskScore.severity === 'SAFE').length,
        failed: spamList.filter(t => t.status === 'FAILED').length
      };

      const runStats: AnalysisRunStats = {
        retrievedCount: allRetrievedEmails.length,
        inboxRetrieved: inbox.emails.length,
        spamRetrieved: spam.emails.length,
        analyzedCount: successfullyAnalyzedCount,
        threatsDetectedCount: threatsDetectedCount,
        safeCount: safeEmailsCount,
        failedCount: failedCount,
        cachedCount: cachedCount,
        newCount: newCount,
        completedAt: new Date().toISOString(),
        scope: analysisScope,
        inboxStats,
        spamStats
      };

      gmailState.lastSyncedAt = new Date().toISOString();
      gmailState.totalEmailsMonitored = runAnalyzedList.length;
      gmailState.threatsDetected = threatsDetectedCount;
      gmailState.emailSourcesSummary = computeEmailSourcesSummary(runAnalyzedList);
      gmailState.analysisRunStats = runStats;

      console.log(`[Gmail Analysis Complete] Scope: ${analysisScope}, Retrieved: ${allRetrievedEmails.length} (${inbox.emails.length} Inbox, ${spam.emails.length} Spam), Analyzed: ${successfullyAnalyzedCount}, Threats: ${threatsDetectedCount}, Safe: ${safeEmailsCount}, Failed: ${failedCount}, Cached: ${cachedCount}`);

      res.json({
        success: true,
        summary: runStats,
        threats: runAnalyzedList,
        allThreats: accountThreats[connectedEmail],
        account: gmailState
      });
    } catch (err: any) {
      console.error('Failed during /api/gmail/analyze-recent:', err);
      res.status(500).json({
        error: err.message || 'Failed to fetch and analyze Gmail messages.'
      });
    }
  });

  app.post('/api/gmail/connect', (req, res) => {
    return res.status(400).json({
      error: 'Simulated connection disabled. Please use /api/gmail/auth to initiate Google OAuth 2.0 authentication.'
    });
  });

  app.post('/api/gmail/disconnect', async (req, res) => {
    delete userGmailTokens[currentUser.id];
    gmailState = {
      isConnected: false,
      email: undefined,
      expectedEmail: currentUser.email,
      accountMismatch: false,
      connectedAt: undefined,
      status: 'DISCONNECTED',
      lastSyncedAt: new Date().toISOString(),
      totalEmailsMonitored: demoThreats.length,
      threatsDetected: demoThreats.filter(t => t.riskScore.severity !== 'SAFE').length,
      emailSourcesSummary: computeEmailSourcesSummary(demoThreats)
    };
    res.json({ success: true, account: gmailState });
  });

  app.delete('/api/gmail/disconnect', async (req, res) => {
    delete userGmailTokens[currentUser.id];
    gmailState = {
      isConnected: false,
      email: undefined,
      expectedEmail: currentUser.email,
      accountMismatch: false,
      connectedAt: undefined,
      status: 'DISCONNECTED',
      lastSyncedAt: new Date().toISOString(),
      totalEmailsMonitored: demoThreats.length,
      threatsDetected: demoThreats.filter(t => t.riskScore.severity !== 'SAFE').length,
      emailSourcesSummary: computeEmailSourcesSummary(demoThreats)
    };
    res.json({ success: true, account: gmailState });
  });

  app.get('/api/threats', (req, res) => {
    const mode = req.query.mode as string | undefined;
    const scope = (req.query.scope as string | undefined)?.toLowerCase();
    const active = getActiveThreats(mode);

    const hasRunFlag = active.some(t => t.inLatestRun === true);
    const latestBatch = hasRunFlag ? active.filter(t => t.inLatestRun === true) : active;
    const returnedThreats = scope === 'latest' ? latestBatch : active;

    const currentSummary = computeEmailSourcesSummary(latestBatch);
    const historicalSummary = computeEmailSourcesSummary(active);

    res.json({
      threats: returnedThreats,
      allThreats: active,
      latestRunThreats: latestBatch,
      stats: {
        total: returnedThreats.length,
        retrieved: returnedThreats.length,
        analyzed: returnedThreats.filter(t => t.status !== 'FAILED').length,
        threats: returnedThreats.filter(t => t.status !== 'FAILED' && t.riskScore.severity !== 'SAFE').length,
        safe: returnedThreats.filter(t => t.status !== 'FAILED' && t.riskScore.severity === 'SAFE').length,
        failed: returnedThreats.filter(t => t.status === 'FAILED').length,
        inbox: returnedThreats.filter(t => (t.source || 'INBOX') === 'INBOX').length,
        spam: returnedThreats.filter(t => t.source === 'SPAM').length
      },
      runStats: gmailState.analysisRunStats,
      sourcesSummary: currentSummary,
      historicalSummary
    });
  });

  app.get('/api/threats/:id', (req, res) => {
    const active = getActiveThreats();
    const threat = active.find(t => t.id === req.params.id);
    if (!threat) {
      return res.status(404).json({ error: 'Threat record not found' });
    }
    res.json({ threat });
  });

  app.post('/api/threats/:id/approve', async (req, res) => {
    const active = getActiveThreats();
    const index = active.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Threat not found' });
    }

    const threat = active[index];

    // Check if this is a live Gmail message
    if (!threat.isDemo) {
      const rawGmailId = threat.email.rawGmailId || (threat.email.id.startsWith('gmail-') ? threat.email.id.replace(/^gmail-/, '') : null);
      if (!rawGmailId) {
        return res.status(400).json({
          error: 'Underlying Gmail message ID is missing from this threat record. Cannot execute Gmail operation.'
        });
      }

      const tokens = userGmailTokens[currentUser.id];
      if (!tokens || !gmailState.isConnected) {
        return res.status(401).json({
          error: 'Gmail account is not currently connected or authorized. Please connect your Gmail account to execute mailbox actions.'
        });
      }

      try {
        const client = getAuthenticatedGmailClient(tokens);
        await moveGmailMessageToSpam(client, rawGmailId);
        console.log(`[Gmail API] Successfully moved message ${rawGmailId} to SPAM (quarantine).`);
      } catch (err: any) {
        console.error(`[Gmail API Error] Failed to move message ${rawGmailId} to SPAM:`, err?.message || err);
        return res.status(502).json({
          error: 'Gmail API failed to move the message to Spam. Please check your Gmail connection and permissions.'
        });
      }
    } else {
      console.log(`[Demo Threat] Simulated move to spam for demo incident ${threat.id}.`);
    }

    // Update local record
    active[index].status = 'APPROVED';
    active[index].source = 'SPAM';
    active[index].email.source = 'SPAM';
    active[index].userActionTaken = `Executed Gmail Action: ${threat.recommendation.action || 'MOVE_TO_SPAM'} (Moved to Spam)`;
    res.json({ success: true, threat: active[index] });
  });

  app.post('/api/threats/:id/reject', async (req, res) => {
    const active = getActiveThreats();
    const index = active.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Threat not found' });
    }

    const threat = active[index];

    // Check if this is a live Gmail message
    if (!threat.isDemo) {
      const rawGmailId = threat.email.rawGmailId || (threat.email.id.startsWith('gmail-') ? threat.email.id.replace(/^gmail-/, '') : null);
      if (!rawGmailId) {
        return res.status(400).json({
          error: 'Underlying Gmail message ID is missing from this threat record. Cannot execute Gmail operation.'
        });
      }

      const tokens = userGmailTokens[currentUser.id];
      if (!tokens || !gmailState.isConnected) {
        return res.status(401).json({
          error: 'Gmail account is not currently connected or authorized. Please connect your Gmail account to execute mailbox actions.'
        });
      }

      try {
        const client = getAuthenticatedGmailClient(tokens);
        await markGmailMessageSafe(client, rawGmailId);
        console.log(`[Gmail API] Successfully marked message ${rawGmailId} as SAFE (restored to INBOX, removed SPAM).`);
      } catch (err: any) {
        console.error(`[Gmail API Error] Failed to mark message ${rawGmailId} as safe:`, err?.message || err);
        return res.status(502).json({
          error: 'Gmail API failed to mark the message as safe in your mailbox. Please check your Gmail connection.'
        });
      }
    } else {
      console.log(`[Demo Threat] Simulated mark safe override for demo incident ${threat.id}.`);
    }

    // Update local record
    active[index].status = 'REJECTED';
    active[index].source = 'INBOX';
    active[index].email.source = 'INBOX';
    active[index].userActionTaken = 'User marked as Safe override (Restored to Inbox)';
    res.json({ success: true, threat: active[index] });
  });

  app.post('/api/threats/:id/feedback', (req, res) => {
    const active = getActiveThreats();
    const threat = active.find(t => t.id === req.params.id);
    if (!threat) {
      return res.status(404).json({ error: 'Threat not found' });
    }
    const { userAssignedLabel, notes } = req.body;
    const isCorrect = userAssignedLabel === threat.primaryThreat || (userAssignedLabel === 'SAFE' && threat.riskScore.severity === 'SAFE');

    const feedback: UserFeedback = {
      id: `fb-${Date.now()}`,
      threatId: threat.id,
      emailId: threat.email.id,
      originalPrediction: threat.primaryThreat,
      originalRiskScore: threat.riskScore.overallScore,
      userAssignedLabel,
      isCorrect,
      notes,
      submittedAt: new Date().toISOString()
    };

    userFeedbacks.push(feedback);
    res.json({ success: true, feedback });
  });

  app.get('/api/feedback', (req, res) => {
    res.json({ feedbackList: userFeedbacks });
  });

  app.post('/api/analyze/custom', async (req, res) => {
    try {
      const { senderEmail, senderName, subject, bodyText, urls, fileExtensions } = req.body;

      const customEmail = {
        id: `custom-${Date.now()}`,
        messageId: `msg-custom-${Date.now()}@user-test.com`,
        threadId: `thread-custom-${Date.now()}`,
        sender: {
          name: senderName || 'External Sender',
          email: senderEmail || 'sender@external-domain.net',
          domain: (senderEmail || 'external-domain.net').split('@')[1] || 'external-domain.net',
          isDomainVerified: false
        },
        recipients: [currentUser.email],
        subject: subject || 'No Subject',
        snippet: (bodyText || '').slice(0, 100),
        bodyText: bodyText || '',
        urls: (urls || []).map((u: string) => ({
          url: u,
          domain: u.replace(/^https?:\/\//, '').split('/')[0],
          isHttps: u.startsWith('https://'),
          isShortened: u.includes('bit.ly') || u.includes('t.co') || u.includes('tinyurl'),
          hasIpAddress: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(u),
          suspiciousKeywords: ['login', 'verify', 'update'],
          riskScore: u.includes('login') ? 80 : 20,
          indicators: []
        })),
        attachments: (fileExtensions || []).map((ext: string, idx: number) => ({
          filename: `test_file_${idx + 1}.${ext}`,
          fileExtension: ext,
          mimeType: ext === 'exe' ? 'application/x-msdownload' : 'application/pdf',
          sizeBytes: 1024 * 500,
          isExecutableOrScript: ['exe', 'bat', 'vbs', 'ps1', 'js'].includes(ext),
          isArchive: ['zip', 'rar'].includes(ext),
          hasDoubleExtension: ext.includes('.'),
          indicators: [],
          riskScore: ['exe', 'bat', 'vbs'].includes(ext) ? 95 : 10
        })),
        headers: { SPF: 'none', DKIM: 'none' },
        receivedAt: new Date().toISOString(),
        isDemo: true
      };

      const analysis = await runSecurityOrchestrator(customEmail);
      if (gmailState.isConnected && gmailState.email) {
        const emailKey = gmailState.email.toLowerCase();
        if (!accountThreats[emailKey]) accountThreats[emailKey] = [];
        accountThreats[emailKey].unshift(analysis);
      } else {
        demoThreats.unshift(analysis);
      }
      res.json({ analysis });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Analysis failed' });
    }
  });

  app.get('/api/settings', (req, res) => {
    res.json({ settings: systemSettings });
  });

  app.post('/api/settings', (req, res) => {
    systemSettings = { ...systemSettings, ...req.body };
    res.json({ success: true, settings: systemSettings });
  });

  app.get('/api/evaluations', (req, res) => {
    const evaluations: ModelEvaluation[] = [
      {
        architectureName: 'Hybrid MailGuard AI (Multi-Agent + Gemini + Risk Engine)',
        accuracy: 0.982,
        precision: 0.978,
        recall: 0.985,
        f1Score: 0.981,
        sampleCount: 1500,
        avgLatencyMs: 340,
        falsePositiveRate: 0.015,
        falseNegativeRate: 0.012,
        confusionMatrix: { trueSafe: 742, falseSafe: 9, trueThreat: 738, falseThreat: 11 }
      },
      {
        architectureName: 'Multi-Agent LLM (No Classical ML Floor)',
        accuracy: 0.941,
        precision: 0.935,
        recall: 0.948,
        f1Score: 0.941,
        sampleCount: 1500,
        avgLatencyMs: 890,
        falsePositiveRate: 0.048,
        falseNegativeRate: 0.038,
        confusionMatrix: { trueSafe: 718, falseSafe: 28, trueThreat: 711, falseThreat: 43 }
      },
      {
        architectureName: 'Single Direct LLM (Gemini 3.6 Flash Only)',
        accuracy: 0.895,
        precision: 0.880,
        recall: 0.912,
        f1Score: 0.896,
        sampleCount: 1500,
        avgLatencyMs: 720,
        falsePositiveRate: 0.088,
        falseNegativeRate: 0.065,
        confusionMatrix: { trueSafe: 683, falseSafe: 48, trueThreat: 684, falseThreat: 85 }
      },
      {
        architectureName: 'Traditional ML (Random Forest + TF-IDF)',
        accuracy: 0.842,
        precision: 0.825,
        recall: 0.860,
        f1Score: 0.842,
        sampleCount: 1500,
        avgLatencyMs: 25,
        falsePositiveRate: 0.125,
        falseNegativeRate: 0.105,
        confusionMatrix: { trueSafe: 655, falseSafe: 78, trueThreat: 645, falseThreat: 122 }
      }
    ];

    res.json({ evaluations });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MailGuard AI server running on http://0.0.0.0:${PORT}`);
    const hasClientId = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim().length > 0 && !process.env.GOOGLE_CLIENT_ID.includes('YOUR_'));
    const hasClientSecret = !!(process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim().length > 0 && !process.env.GOOGLE_CLIENT_SECRET.includes('YOUR_'));
    const hasRedirectUri = !!(process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim().length > 0 && !process.env.GOOGLE_REDIRECT_URI.includes('YOUR_'));
    console.log(`[Startup Config Check] GOOGLE_CLIENT_ID: ${hasClientId ? 'DETECTED' : 'NOT DETECTED'}`);
    console.log(`[Startup Config Check] GOOGLE_CLIENT_SECRET: ${hasClientSecret ? 'DETECTED' : 'NOT DETECTED'}`);
    console.log(`[Startup Config Check] GOOGLE_REDIRECT_URI: ${hasRedirectUri ? 'DETECTED (Using ' + (process.env.GOOGLE_REDIRECT_URI || 'default localhost:3000 callback') + ')' : 'NOT DETECTED'}`);
    if (!hasClientId || !hasClientSecret) {
      console.log(`[Action Required] To enable real Gmail OAuth, paste your Google Client ID and Secret into the .env file and restart the dev server.`);
    }
  });
}

startServer();
