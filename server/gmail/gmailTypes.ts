export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface StoredTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string;
  expiry_date?: number | null;
}

export interface GmailAccountRecord {
  id: string;
  userId: string;
  emailAddress: string;
  provider: 'google';
  status: 'ACTIVE' | 'DISCONNECTED';
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
  tokens?: StoredTokens;
}

export interface GmailFetchOptions {
  maxResults?: number;
  query?: string;
}
