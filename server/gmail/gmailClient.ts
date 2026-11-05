import { google, gmail_v1 } from 'googleapis';
import { getOAuth2Client } from './gmailAuth.js';
import { StoredTokens } from './gmailTypes.js';

export function getAuthenticatedGmailClient(tokens: StoredTokens, redirectUriOverride?: string): gmail_v1.Gmail {
  if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
    throw new Error('No valid OAuth tokens available to create Gmail client.');
  }

  const oauth2Client = getOAuth2Client(redirectUriOverride);
  oauth2Client.setCredentials(tokens);

  // Automatically capture refreshed access tokens emitted by google-auth-library
  oauth2Client.on('tokens', (newTokens) => {
    if (tokens) {
      Object.assign(tokens, newTokens);
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}
