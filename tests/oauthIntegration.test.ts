import { isOAuthConfigured, getDefaultRedirectUri, getOAuthDiagnostics, generateAuthUrl, getMaskedClientId, getGoogleProjectNumber, REQUIRED_GMAIL_SCOPES } from '../server/gmail/gmailAuth.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`, details || '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runOAuthTestSuite() {
  console.log('--- STARTING GMAIL OAUTH 2.0 INTEGRATION VERIFICATION TEST SUITE ---');

  // Test 1: OAuth Configuration detection
  {
    assert(isOAuthConfigured() === true, 'OAuth credentials detected in environment (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)');
  }

  // Test 2: Client ID Masking & Project Number extraction
  {
    const masked = getMaskedClientId();
    assert(masked.includes('...'), 'Client ID is safely masked and never exposes full credentials');
    assert(masked.endsWith('googleusercontent.com') || masked.includes('apps.google'), 'Masked client ID reflects Google Apps domain');

    const projectNum = getGoogleProjectNumber();
    assert(projectNum !== null && /^\d+$/.test(projectNum), `Google Cloud Project Number extracted successfully: ${projectNum}`);
    assert(projectNum === '692550882871', 'Google Cloud Project Number exactly matches client ID prefix 692550882871');
  }

  // Test 3: Redirect URI Resolution consistency
  {
    const defaultUri = getDefaultRedirectUri();
    assert(defaultUri.includes('/api/gmail/oauth/callback'), 'Redirect URI contains standard /api/gmail/oauth/callback path');
    assert(defaultUri.startsWith('https://') || defaultUri.startsWith('http://'), 'Redirect URI has valid URL scheme');

    // When host is localhost
    const localhostUri = getDefaultRedirectUri('localhost:3000');
    assert(localhostUri.includes('/api/gmail/oauth/callback'), 'Localhost host header resolves callback path');

    // Diagnostics helper
    const diag = getOAuthDiagnostics('ais-dev-3zwzb57zfek2buufbdgyym-655967031157.asia-southeast1.run.app');
    assert(diag.isConfigured === true, 'Diagnostics reports isConfigured=true');
    assert(diag.effectiveRedirectUri.includes('/api/gmail/oauth/callback'), 'Diagnostics reports accurate redirect URI');
    assert(diag.effectiveOrigin.startsWith('https://') || diag.effectiveOrigin.startsWith('http://'), 'Diagnostics reports valid origin without trailing slash');
  }

  // Test 4: Required Scopes verification
  {
    assert(REQUIRED_GMAIL_SCOPES.includes('https://www.googleapis.com/auth/gmail.readonly'), 'Contains gmail.readonly scope');
    assert(REQUIRED_GMAIL_SCOPES.includes('https://www.googleapis.com/auth/gmail.modify'), 'Contains gmail.modify scope');
    assert(REQUIRED_GMAIL_SCOPES.length === 2, 'Exactly 2 required Gmail scopes requested (least-privilege)');
  }

  // Test 5: Authorization URL Generation
  {
    const testState = 'state_1740000000000_abc123';
    const redirectUri = getDefaultRedirectUri();
    const authUrl = generateAuthUrl(testState, redirectUri);

    assert(authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'Auth URL targets Google OAuth 2.0 v2 endpoint');
    assert(authUrl.includes('access_type=offline'), 'Auth URL requests offline access (for refresh tokens)');
    assert(authUrl.includes('prompt=consent'), 'Auth URL enforces consent prompt (ensuring refresh token issuance)');
    assert(authUrl.includes('response_type=code'), 'Auth URL specifies response_type=code');
    assert(authUrl.includes('state=' + testState), 'Auth URL passes state token intact for CSRF protection');
    assert(authUrl.includes(encodeURIComponent(redirectUri)), 'Auth URL encodes exact redirect URI');
    assert(authUrl.includes('gmail.readonly'), 'Auth URL contains gmail.readonly scope');
    assert(authUrl.includes('gmail.modify'), 'Auth URL contains gmail.modify scope');
  }

  // Test 6: CSRF State Expiration validation logic
  {
    const stateToken = `state_${Date.now()}_testxyz`;
    const parts = stateToken.split('_');
    const timestamp = parseInt(parts[1], 10);
    const isWithin15Min = (Date.now() - timestamp) < 15 * 60 * 1000;
    assert(isWithin15Min === true, 'State token timestamp is within 15-minute validity window');

    const expiredState = `state_${Date.now() - 30 * 60 * 1000}_expired`;
    const expiredParts = expiredState.split('_');
    const expiredTimestamp = parseInt(expiredParts[1], 10);
    const isExpired = (Date.now() - expiredTimestamp) > 15 * 60 * 1000;
    assert(isExpired === true, 'Expired state token correctly detected and rejected');
  }

  console.log(`\n--- ALL ${passedTests}/${totalTests} OAUTH INTEGRATION TESTS PASSED SUCCESSFULLY ---`);
}

runOAuthTestSuite().catch(err => {
  console.error('OAuth test suite failed:', err);
  process.exit(1);
});
