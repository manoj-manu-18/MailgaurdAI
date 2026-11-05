import { gmail_v1 } from 'googleapis';
import { parseGmailMessage } from './gmailParser.js';
import { NormalizedEmail, EmailSource } from '../../src/types.js';

/**
 * Configurable analysis limits per user requirement:
 * - Latest 30 Inbox messages
 * - Latest 30 Spam messages
 * - Maximum 60 messages per complete analysis run
 */
export const INBOX_ANALYSIS_LIMIT = 30;
export const SPAM_ANALYSIS_LIMIT = 30;
export const MAX_RUN_ANALYSIS_LIMIT = 60;
export const DEFAULT_SOURCE_ANALYSIS_LIMIT = 30;

export async function getGmailProfile(gmailClient: gmail_v1.Gmail) {
  const response = await gmailClient.users.getProfile({ userId: 'me' });
  return {
    emailAddress: response.data.emailAddress || 'connected-user@gmail.com',
    messagesTotal: response.data.messagesTotal || 0,
    threadsTotal: response.data.threadsTotal || 0,
    historyId: response.data.historyId || '0'
  };
}

export async function getRecentMessageSummaries(gmailClient: gmail_v1.Gmail, maxResults = 30) {
  const listResponse = await gmailClient.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    q: 'in:inbox',
    maxResults
  });

  return listResponse.data.messages || [];
}

/**
 * Retrieves message IDs for a specific Gmail label with pagination support up to `limit`.
 * Specifically uses 'in:inbox' for INBOX and 'in:spam' with includeSpamTrash: true for SPAM.
 */
export async function getMessagesByLabel(
  gmailClient: gmail_v1.Gmail,
  labelId: 'INBOX' | 'SPAM',
  limit = 30
): Promise<gmail_v1.Schema$Message[]> {
  const collected: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined = undefined;

  while (collected.length < limit) {
    const fetchBatchSize = Math.min(limit - collected.length, 30);
    const listParams: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me',
      labelIds: [labelId],
      maxResults: fetchBatchSize,
      pageToken
    };

    if (labelId === 'INBOX') {
      listParams.q = 'in:inbox';
    } else if (labelId === 'SPAM') {
      listParams.includeSpamTrash = true;
      listParams.q = 'in:spam';
    }

    const response = await gmailClient.users.messages.list(listParams);
    const messages = response.data.messages || [];

    if (messages.length === 0) {
      break;
    }

    collected.push(...messages);
    pageToken = response.data.nextPageToken || undefined;

    if (!pageToken) {
      break;
    }
  }

  return collected.slice(0, limit);
}

export async function getNormalizedMessageById(
  gmailClient: gmail_v1.Gmail,
  messageId: string,
  explicitSource?: EmailSource
): Promise<NormalizedEmail> {
  const messageResponse = await gmailClient.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  return parseGmailMessage(messageResponse.data, explicitSource);
}

export async function getRecentNormalizedMessages(
  gmailClient: gmail_v1.Gmail,
  maxResults = 30
): Promise<NormalizedEmail[]> {
  const { emails } = await fetchMessagesForSource(gmailClient, 'INBOX', maxResults);
  return emails;
}

/**
 * Fetches and normalizes messages for a specific source (INBOX or SPAM) up to `limit`.
 * Obtains each message's actual internalDate, sorts them in descending order (newest first),
 * and handles fewer than `limit` messages gracefully.
 */
export async function fetchMessagesForSource(
  gmailClient: gmail_v1.Gmail,
  source: EmailSource,
  limit = 30
): Promise<{ source: EmailSource; emails: NormalizedEmail[]; failedCount: number; failedIds: string[] }> {
  // Retrieve message summaries using pagination (fetching a small buffer if available)
  const fetchTarget = Math.max(limit, 30);
  const summaries = await getMessagesByLabel(gmailClient, source, fetchTarget);
  const emails: NormalizedEmail[] = [];
  let failedCount = 0;
  const failedIds: string[] = [];

  for (const item of summaries) {
    if (item.id) {
      try {
        const email = await getNormalizedMessageById(gmailClient, item.id, source);
        emails.push(email);
      } catch (err) {
        failedCount++;
        failedIds.push(item.id);
        console.warn(`[GmailService] Failed fetching individual message ID ${item.id} from ${source}:`, err);
      }
    }
  }

  // Sort strictly by actual Gmail internalDate in descending order (newest received first)
  emails.sort((a, b) => {
    const timeA = a.internalDate ?? (a.receivedAt ? new Date(a.receivedAt).getTime() : 0);
    const timeB = b.internalDate ?? (b.receivedAt ? new Date(b.receivedAt).getTime() : 0);
    return timeB - timeA;
  });

  // Select up to the requested limit (or all available if fewer exist)
  const selectedEmails = emails.slice(0, limit);

  return { source, emails: selectedEmails, failedCount, failedIds };
}

/**
 * Fetches real messages for Inbox, Spam, or combined (Inbox + Spam).
 * - INBOX: up to 30 latest Inbox messages sorted by internalDate descending
 * - SPAM: up to 30 latest Spam messages sorted by internalDate descending
 * - ALL: up to 30 Inbox + up to 30 Spam messages (max 60 total)
 */
export async function fetchRealGmailMessages(
  gmailClient: gmail_v1.Gmail,
  options: {
    inboxLimit?: number;
    spamLimit?: number;
    scope?: 'INBOX' | 'SPAM' | 'ALL';
  } = {}
): Promise<{
  inbox: { source: EmailSource; emails: NormalizedEmail[]; failedCount: number; failedIds: string[] };
  spam: { source: EmailSource; emails: NormalizedEmail[]; failedCount: number; failedIds: string[] };
  totalRetrieved: number;
  totalFailed: number;
  scope: 'INBOX' | 'SPAM' | 'ALL';
}> {
  const scope = options.scope ?? 'ALL';
  const inboxLimit = options.inboxLimit ?? INBOX_ANALYSIS_LIMIT;
  const spamLimit = options.spamLimit ?? SPAM_ANALYSIS_LIMIT;

  let inboxResult = { source: 'INBOX' as EmailSource, emails: [] as NormalizedEmail[], failedCount: 0, failedIds: [] as string[] };
  let spamResult = { source: 'SPAM' as EmailSource, emails: [] as NormalizedEmail[], failedCount: 0, failedIds: [] as string[] };

  if (scope === 'INBOX') {
    inboxResult = await fetchMessagesForSource(gmailClient, 'INBOX', inboxLimit);
  } else if (scope === 'SPAM') {
    spamResult = await fetchMessagesForSource(gmailClient, 'SPAM', spamLimit);
  } else {
    // Both INBOX and SPAM concurrently
    const [inboxRes, spamRes] = await Promise.all([
      fetchMessagesForSource(gmailClient, 'INBOX', inboxLimit),
      fetchMessagesForSource(gmailClient, 'SPAM', spamLimit)
    ]);
    inboxResult = inboxRes;
    spamResult = spamRes;
  }

  return {
    inbox: inboxResult,
    spam: spamResult,
    totalRetrieved: inboxResult.emails.length + spamResult.emails.length,
    totalFailed: inboxResult.failedCount + spamResult.failedCount,
    scope
  };
}

/**
 * Moves a message to Spam/Quarantine in Gmail by adding SPAM label and removing INBOX label.
 */
export async function moveGmailMessageToSpam(gmailClient: gmail_v1.Gmail, rawMessageId: string) {
  const response = await gmailClient.users.messages.modify({
    userId: 'me',
    id: rawMessageId,
    requestBody: {
      addLabelIds: ['SPAM'],
      removeLabelIds: ['INBOX']
    }
  });
  return response.data;
}

/**
 * Moves a message from Spam back to Inbox in Gmail by adding INBOX label and removing SPAM label.
 */
export async function moveGmailMessageToInbox(gmailClient: gmail_v1.Gmail, rawMessageId: string) {
  const response = await gmailClient.users.messages.modify({
    userId: 'me',
    id: rawMessageId,
    requestBody: {
      addLabelIds: ['INBOX'],
      removeLabelIds: ['SPAM']
    }
  });
  return response.data;
}

/**
 * Marks a message safe in Gmail by removing SPAM label and ensuring INBOX label is present.
 */
export async function markGmailMessageSafe(gmailClient: gmail_v1.Gmail, rawMessageId: string) {
  return moveGmailMessageToInbox(gmailClient, rawMessageId);
}


