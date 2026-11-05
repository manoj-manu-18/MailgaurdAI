import { google } from 'googleapis';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { StoredTokens } from './gmailTypes.js';

export const REQUIRED_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

export const OAUTH_STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes validity

export interface OAuthStateEntry {
  stateToken: string;
  userId: string;
  createdAt: number;
  redirectUri: string;
  consumed?: boolean;
}

// Dual persistence paths: project directory for local VS Code stability + OS tmpdir as fallback
const PRIMARY_STATE_FILE = path.join(process.cwd(), '.mailguard_oauth_states.json');
const SECONDARY_STATE_FILE = path.join(os.tmpdir(), 'mailguard_oauth_states.json');

const memoryOAuthStates = new Map<string, OAuthStateEntry>();
const consumedOAuthStates = new Map<string, { consumedAt: number }>();

function getHmacSecret(): string {
  if (process.env.GOOGLE_CLIENT_SECRET && !process.env.GOOGLE_CLIENT_SECRET.includes('YOUR_')) {
    return process.env.GOOGLE_CLIENT_SECRET;
  }
  return 'mailguard_oauth_local_security_secret_2026';
}

function computeStateHmac(timestamp: number, entropy: string, redirectUri: string): string {
  const secret = getHmacSecret();
  return crypto.createHmac('sha256', secret)
    .update(`${timestamp}:${entropy}:${redirectUri}`)
    .digest('hex')
    .substring(0, 32);
}

function loadStatesFromDisk(): void {
  const filesToRead = [PRIMARY_STATE_FILE, SECONDARY_STATE_FILE];
  const now = Date.now();

  for (const filePath of filesToRead) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        
        // Handle array format (legacy/simple)
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item && item.stateToken && !item.consumed && (now - item.createdAt) <= OAUTH_STATE_TTL_MS) {
              if (!memoryOAuthStates.has(item.stateToken)) {
                memoryOAuthStates.set(item.stateToken, item);
              }
            } else if (item && item.stateToken && item.consumed) {
              consumedOAuthStates.set(item.stateToken, { consumedAt: item.createdAt });
            }
          }
        } else if (data && typeof data === 'object') {
          // Structured format { pending: [...], consumed: [...] }
          if (Array.isArray(data.pending)) {
            for (const item of data.pending) {
              if (item && item.stateToken && (now - item.createdAt) <= OAUTH_STATE_TTL_MS) {
                if (!memoryOAuthStates.has(item.stateToken)) {
                  memoryOAuthStates.set(item.stateToken, item);
                }
              }
            }
          }
          if (Array.isArray(data.consumed)) {
            for (const item of data.consumed) {
              if (item && item.stateToken && (now - item.consumedAt) <= OAUTH_STATE_TTL_MS) {
                consumedOAuthStates.set(item.stateToken, { consumedAt: item.consumedAt });
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Gmail OAuth] Warning reading state cache from ${filePath}:`, err?.message);
    }
  }
}

function persistStatesToDisk(): void {
  const payload = {
    pending: Array.from(memoryOAuthStates.values()),
    consumed: Array.from(consumedOAuthStates.entries()).map(([token, val]) => ({
      stateToken: token,
      consumedAt: val.consumedAt
    }))
  };
  const jsonStr = JSON.stringify(payload);

  const filesToWrite = [PRIMARY_STATE_FILE, SECONDARY_STATE_FILE];
  for (const filePath of filesToWrite) {
    try {
      fs.writeFileSync(filePath, jsonStr, 'utf-8');
    } catch (err: any) {
      // Non-fatal if one path is read-only
    }
  }
}

// Pre-load persisted states on module initialization
loadStatesFromDisk();

export function pruneExpiredStates(): number {
  const now = Date.now();
  let prunedCount = 0;
  
  for (const [key, entry] of memoryOAuthStates.entries()) {
    if (entry.consumed || (now - entry.createdAt) > OAUTH_STATE_TTL_MS) {
      memoryOAuthStates.delete(key);
      prunedCount++;
    }
  }

  for (const [key, entry] of consumedOAuthStates.entries()) {
    if ((now - entry.consumedAt) > OAUTH_STATE_TTL_MS) {
      consumedOAuthStates.delete(key);
      prunedCount++;
    }
  }

  if (prunedCount > 0) {
    persistStatesToDisk();
  }
  return prunedCount;
}

export function createOAuthState(userId: string, redirectUri: string): OAuthStateEntry {
  // Always refresh disk states before pruning and generating to support multi-process environments
  loadStatesFromDisk();
  pruneExpiredStates();

  const timestamp = Date.now();
  const randomEntropy = crypto.randomBytes(24).toString('hex');
  const signature = computeStateHmac(timestamp, randomEntropy, redirectUri);
  const stateToken = `mg_${timestamp}_${randomEntropy}.${signature}`;

  const entry: OAuthStateEntry = {
    stateToken,
    userId: userId || 'usr-admin-01',
    createdAt: timestamp,
    redirectUri,
    consumed: false
  };

  memoryOAuthStates.set(stateToken, entry);
  persistStatesToDisk();

  return entry;
}

export type StateValidationResult =
  | { valid: true; entry: OAuthStateEntry; ageMs: number }
  | { valid: false; reason: 'missing' | 'mismatched' | 'expired' | 'consumed'; ageMs: number | null };

export function validateAndConsumeOAuthState(stateParam: unknown, expectedRedirectUri?: string): StateValidationResult {
  let token: string | null = null;
  if (typeof stateParam === 'string') {
    token = stateParam.trim();
  } else if (Array.isArray(stateParam) && stateParam.length > 0 && typeof stateParam[0] === 'string') {
    token = stateParam[0].trim();
  }

  if (!token) {
    return { valid: false, reason: 'missing', ageMs: null };
  }

  // Refresh from disk cache to survive server restarts and multi-process invocations
  loadStatesFromDisk();

  // 1. Check if token was already consumed (Replay Attack Prevention)
  if (consumedOAuthStates.has(token)) {
    const consumedInfo = consumedOAuthStates.get(token);
    const ageMs = consumedInfo ? (Date.now() - consumedInfo.consumedAt) : null;
    return { valid: false, reason: 'consumed', ageMs };
  }

  // 2. Check pending states in memory / disk
  const entry = memoryOAuthStates.get(token);
  if (entry) {
    const ageMs = Date.now() - entry.createdAt;

    if (entry.consumed) {
      consumedOAuthStates.set(token, { consumedAt: Date.now() });
      memoryOAuthStates.delete(token);
      persistStatesToDisk();
      return { valid: false, reason: 'consumed', ageMs };
    }

    if (ageMs > OAUTH_STATE_TTL_MS) {
      memoryOAuthStates.delete(token);
      persistStatesToDisk();
      return { valid: false, reason: 'expired', ageMs };
    }

    // Atomically mark consumed and delete from pending states
    entry.consumed = true;
    memoryOAuthStates.delete(token);
    consumedOAuthStates.set(token, { consumedAt: Date.now() });
    persistStatesToDisk();

    return { valid: true, entry, ageMs };
  }

  // 3. Fallback: Cryptographic HMAC Verification if process memory was wiped but token is authentic
  if (token.startsWith('mg_')) {
    const dotIndex = token.indexOf('.');
    if (dotIndex > 0) {
      const payload = token.substring(3, dotIndex); // after 'mg_'
      const signature = token.substring(dotIndex + 1);
      const parts = payload.split('_');
      if (parts.length === 2) {
        const timestamp = parseInt(parts[0], 10);
        const entropy = parts[1];
        if (!isNaN(timestamp)) {
          const ageMs = Date.now() - timestamp;
          if (ageMs > OAUTH_STATE_TTL_MS) {
            return { valid: false, reason: 'expired', ageMs };
          }

          // Verify HMAC with expected redirect URI if provided, or default
          const targetUri = expectedRedirectUri || getDefaultRedirectUri();
          const expectedSig = computeStateHmac(timestamp, entropy, targetUri);
          if (signature === expectedSig) {
            // Reconstructed authenticated entry
            const reconstructedEntry: OAuthStateEntry = {
              stateToken: token,
              userId: 'usr-admin-01',
              createdAt: timestamp,
              redirectUri: targetUri,
              consumed: true
            };
            consumedOAuthStates.set(token, { consumedAt: Date.now() });
            persistStatesToDisk();
            return { valid: true, entry: reconstructedEntry, ageMs };
          }
        }
      }
    }
  }

  return { valid: false, reason: 'mismatched', ageMs: null };
}

export function clearOAuthStates(): void {
  memoryOAuthStates.clear();
  consumedOAuthStates.clear();
  try {
    if (fs.existsSync(PRIMARY_STATE_FILE)) fs.unlinkSync(PRIMARY_STATE_FILE);
  } catch {}
  try {
    if (fs.existsSync(SECONDARY_STATE_FILE)) fs.unlinkSync(SECONDARY_STATE_FILE);
  } catch {}
}

export function getPendingStatesCount(): number {
  return memoryOAuthStates.size;
}

export function isOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) return false;
  if (clientId.includes('YOUR_') || clientSecret.includes('YOUR_')) return false;
  return true;
}

export function getDefaultRedirectUri(requestHost?: string): string {
  if (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes('YOUR_')) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  
  if (process.env.APP_URL) {
    const baseUrl = process.env.APP_URL.replace(/\/$/, '');
    return `${baseUrl}/api/gmail/oauth/callback`;
  }

  if (requestHost) {
    const protocol = requestHost.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${requestHost}/api/gmail/oauth/callback`;
  }

  return 'http://localhost:3000/api/gmail/oauth/callback';
}

export function getOAuth2Client(redirectUriOverride?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = redirectUriOverride || getDefaultRedirectUri();

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateAuthUrl(stateToken: string, redirectUriOverride?: string): string {
  if (!isOAuthConfigured()) {
    throw new Error('Google OAuth 2.0 credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in environment variables.');
  }

  const oauth2Client = getOAuth2Client(redirectUriOverride);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: REQUIRED_GMAIL_SCOPES,
    state: stateToken
  });
}

export async function exchangeCodeForTokens(code: string, redirectUriOverride?: string): Promise<StoredTokens> {
  if (!isOAuthConfigured()) {
    throw new Error('Google OAuth credentials not configured on server.');
  }

  const oauth2Client = getOAuth2Client(redirectUriOverride);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens as StoredTokens;
}

export function getMaskedClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  if (!clientId) return 'NOT_CONFIGURED';
  if (clientId.length <= 16) return 'CONFIGURED';
  const prefix = clientId.substring(0, 14);
  const suffix = clientId.substring(clientId.length - 25);
  return `${prefix}...${suffix}`;
}

export function getGoogleProjectNumber(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const match = clientId.match(/^(\d+)-/);
  return match ? match[1] : null;
}

export function getOAuthDiagnostics(requestHost?: string) {
  const redirectUri = getDefaultRedirectUri(requestHost);
  const origin = redirectUri.replace(/\/api\/gmail\/oauth\/callback$/, '');
  return {
    isConfigured: isOAuthConfigured(),
    clientIdMasked: getMaskedClientId(),
    projectNumber: getGoogleProjectNumber(),
    effectiveRedirectUri: redirectUri,
    effectiveOrigin: origin,
    requiredScopes: REQUIRED_GMAIL_SCOPES
  };
}
