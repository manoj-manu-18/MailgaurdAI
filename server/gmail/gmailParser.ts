import { gmail_v1 } from 'googleapis';
import { NormalizedEmail, SenderInfo, URLMetadata, AttachmentMetadata } from '../../src/types.js';

function decodeBase64Url(str: string): string {
  try {
    const cleanStr = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(cleanStr, 'base64').toString('utf-8');
  } catch (err) {
    return '';
  }
}

function parseSenderHeader(fromHeader: string): SenderInfo {
  let name = 'Unknown Sender';
  let email = 'unknown@external.org';

  if (!fromHeader) {
    return { name, email, domain: 'external.org', isDomainVerified: false };
  }

  const matchWithAngle = fromHeader.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/);
  if (matchWithAngle) {
    name = (matchWithAngle[1] || matchWithAngle[2]).trim();
    email = matchWithAngle[2].trim().toLowerCase();
  } else if (fromHeader.includes('@')) {
    email = fromHeader.trim().toLowerCase();
    name = email.split('@')[0];
  } else {
    name = fromHeader.trim();
  }

  const domain = email.includes('@') ? email.split('@')[1] : 'external.org';

  return {
    name,
    email,
    domain,
    isDomainVerified: false
  };
}

function extractBodyAndAttachmentsParts(
  parts: gmail_v1.Schema$MessagePart[] | undefined,
  bodyContainer: { text: string; html: string },
  attachmentsContainer: AttachmentMetadata[]
) {
  if (!parts) return;

  for (const part of parts) {
    const mimeType = part.mimeType || '';
    const filename = part.filename || '';

    if (filename && part.body) {
      const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() || 'dat' : 'dat';
      const sizeBytes = part.body.size || 0;
      
      const isExecutableOrScript = ['exe', 'bat', 'vbs', 'ps1', 'js', 'jar', 'cmd', 'scr', 'vbe'].includes(ext);
      const isArchive = ['zip', 'rar', '7z', 'tar', 'gz', 'iso'].includes(ext);
      const hasDoubleExtension = (filename.match(/\./g) || []).length > 1;

      const indicators: string[] = [];
      let riskScore = 10;

      if (isExecutableOrScript) {
        indicators.push('Executable or script file type detected');
        riskScore += 80;
      }
      if (isArchive) {
        indicators.push('Archive file (zip/rar) attached');
        riskScore += 30;
      }
      if (hasDoubleExtension) {
        indicators.push('Double extension detected in attachment filename');
        riskScore += 50;
      }

      attachmentsContainer.push({
        filename,
        fileExtension: ext,
        mimeType: mimeType || 'application/octet-stream',
        sizeBytes,
        isExecutableOrScript,
        isArchive,
        hasDoubleExtension,
        indicators,
        riskScore: Math.min(riskScore, 100)
      });
    } else if (mimeType === 'text/plain' && part.body?.data && !bodyContainer.text) {
      bodyContainer.text = decodeBase64Url(part.body.data);
    } else if (mimeType === 'text/html' && part.body?.data && !bodyContainer.html) {
      bodyContainer.html = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      extractBodyAndAttachmentsParts(part.parts, bodyContainer, attachmentsContainer);
    }
  }
}

function extractUrlsFromBody(text: string, html: string): URLMetadata[] {
  const combined = `${text}\n${html}`;
  const urlRegex = /(https?:\/\/[^\s<"'>]+)/gi;
  const rawMatches = combined.match(urlRegex) || [];
  
  const uniqueUrls = Array.from(new Set(rawMatches.map(u => u.replace(/[.,;!?)]$/, ''))));

  return uniqueUrls.map(urlStr => {
    let domain = 'external-link.com';
    let isHttps = urlStr.startsWith('https://');
    let hasIpAddress = false;
    let isShortened = false;

    try {
      const parsed = new URL(urlStr);
      domain = parsed.hostname;
      hasIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(parsed.hostname);
      isShortened = ['bit.ly', 't.co', 'tinyurl.com', 'is.gd', 'rb.gy', 'cutt.ly', 'ow.ly'].includes(parsed.hostname.toLowerCase());
    } catch (e) {
      domain = urlStr.replace(/^https?:\/\//, '').split('/')[0];
    }

    const suspiciousKeywords: string[] = [];
    const lower = urlStr.toLowerCase();
    ['login', 'verify', 'account', 'banking', 'update', 'password', 'secure', 'confirm', 'wallet', 'token'].forEach(kw => {
      if (lower.includes(kw)) suspiciousKeywords.push(kw);
    });

    let riskScore = 15;
    const indicators: string[] = [];

    if (!isHttps) {
      indicators.push('Insecure HTTP link');
      riskScore += 25;
    }
    if (hasIpAddress) {
      indicators.push('URL points directly to raw IP address');
      riskScore += 65;
    }
    if (isShortened) {
      indicators.push('Shortened URL hides actual destination domain');
      riskScore += 35;
    }
    if (suspiciousKeywords.length > 0) {
      indicators.push(`Contains high-risk credential phishing keywords: ${suspiciousKeywords.join(', ')}`);
      riskScore += 30;
    }

    return {
      url: urlStr,
      domain,
      isHttps,
      isShortened,
      hasIpAddress,
      suspiciousKeywords,
      riskScore: Math.min(riskScore, 100),
      indicators
    };
  });
}

export function parseGmailMessage(message: gmail_v1.Schema$Message, explicitSource?: 'INBOX' | 'SPAM'): NormalizedEmail {
  const payload = message.payload || {};
  const headersList = payload.headers || [];

  const headersMap: Record<string, string> = {};
  for (const h of headersList) {
    if (h.name && h.value) {
      headersMap[h.name.toLowerCase()] = h.value;
      headersMap[h.name] = h.value;
    }
  }

  const subject = headersMap['subject'] || '(No Subject)';
  const fromHeader = headersMap['from'] || '';
  const toHeader = headersMap['to'] || '';
  const dateHeader = headersMap['date'] || new Date().toISOString();

  const sender = parseSenderHeader(fromHeader);
  const recipients = toHeader.split(',').map(s => s.trim()).filter(Boolean);

  const bodyContainer = { text: '', html: '' };
  const attachments: AttachmentMetadata[] = [];

  if (payload.body?.data) {
    if (payload.mimeType === 'text/html') {
      bodyContainer.html = decodeBase64Url(payload.body.data);
    } else {
      bodyContainer.text = decodeBase64Url(payload.body.data);
    }
  }

  if (payload.parts) {
    extractBodyAndAttachmentsParts(payload.parts, bodyContainer, attachments);
  }

  const bodyText = bodyContainer.text || bodyContainer.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || message.snippet || '';
  const bodyHtml = bodyContainer.html || undefined;

  const urls = extractUrlsFromBody(bodyText, bodyContainer.html || '');
  const labelIds = message.labelIds || [];
  
  let source: 'INBOX' | 'SPAM' = 'INBOX';
  if (explicitSource) {
    source = explicitSource;
  } else if (labelIds.includes('SPAM')) {
    source = 'SPAM';
  } else if (labelIds.includes('INBOX')) {
    source = 'INBOX';
  } else {
    source = 'INBOX';
  }

  // Obtain Gmail internalDate (epoch milliseconds string from Gmail API)
  const internalDateMs = message.internalDate ? parseInt(message.internalDate, 10) : undefined;
  const validInternalDate = internalDateMs && !isNaN(internalDateMs) && internalDateMs > 0 ? internalDateMs : undefined;

  let receivedAtStr = new Date().toISOString();
  if (validInternalDate) {
    receivedAtStr = new Date(validInternalDate).toISOString();
  } else if (dateHeader && new Date(dateHeader).toString() !== 'Invalid Date') {
    receivedAtStr = new Date(dateHeader).toISOString();
  }

  return {
    id: `gmail-${message.id}`,
    rawGmailId: message.id || undefined,
    messageId: headersMap['message-id'] || `msg-${message.id}@gmail.com`,
    threadId: message.threadId || `thread-${message.id}`,
    sender,
    recipients: recipients.length > 0 ? recipients : ['protected-user@gmail.com'],
    subject,
    snippet: message.snippet || bodyText.slice(0, 120),
    bodyText,
    bodyHtml,
    urls,
    attachments,
    headers: headersMap,
    receivedAt: receivedAtStr,
    internalDate: validInternalDate,
    isDemo: false,
    source
  };
}

