import { NormalizedEmail } from '../../src/types.js';

export const DEMO_EMAILS: NormalizedEmail[] = [
  {
    id: 'demo-email-001',
    messageId: 'msg-exec-safe-101@company.com',
    threadId: 'thread-101',
    sender: {
      name: 'Sarah Jenkins',
      email: 's.jenkins@enterprise.com',
      domain: 'enterprise.com',
      isDomainVerified: true
    },
    recipients: ['team@enterprise.com'],
    subject: 'Q3 Engineering Architecture & Sprint Planning Notes',
    snippet: 'Hi team, here is the summary of our architecture review and upcoming milestone deadlines for Q3.',
    bodyText: `Hi Team,

I've attached the summary of our architecture review session today. 

Key Action Items:
1. Complete API schema reviews by Friday.
2. Ensure test coverage remains above 85%.
3. Final project review meeting is scheduled for next Tuesday at 10 AM PST.

Please reply if you have any questions or need updates on the timeline.

Best regards,
Sarah Jenkins
Director of Engineering
Enterprise Systems Inc.`,
    urls: [
      {
        url: 'https://docs.enterprise.com/arch-notes-2026',
        domain: 'docs.enterprise.com',
        isHttps: true,
        isShortened: false,
        hasIpAddress: false,
        suspiciousKeywords: [],
        riskScore: 0,
        indicators: []
      }
    ],
    attachments: [
      {
        filename: 'Sprint_Planning_Q3.pdf',
        fileExtension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        isExecutableOrScript: false,
        isArchive: false,
        hasDoubleExtension: false,
        indicators: [],
        riskScore: 0
      }
    ],
    headers: {
      'SPF': 'pass',
      'DKIM': 'pass',
      'DMARC': 'pass'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isDemo: true,
    source: 'INBOX'
  },
  {
    id: 'demo-email-002',
    messageId: 'msg-phish-it-202@account-security-alert.net',
    threadId: 'thread-202',
    sender: {
      name: 'IT Helpdesk Support',
      email: 'admin@account-security-alert.net',
      domain: 'account-security-alert.net',
      replyTo: 'secure-login-collector@phishnet.xyz',
      isDomainVerified: false
    },
    recipients: ['user@company.com'],
    subject: 'URGENT: Your Office365 Password Will Expire in 2 Hours - Action Required Immediately',
    snippet: 'CRITICAL SECURITY ALERT: Your password has expired. Click here immediately to verify your account to prevent permanent locking.',
    bodyText: `DEAR USER,

YOUR OFFICE365 CORPORATE ACCOUNT PASSWORD IS SET TO EXPIRE IN 2 HOURS!

If you do not update your login credentials immediately, your mailbox and corporate access will be permanently suspended by the Global Administrator.

CLICK THE SECURE LINK BELOW TO VERIFY YOUR PASSWORD:
http://192.168.1.105/login/office365-verify.php?user=user@company.com

Failure to respond within 2 hours will result in immediate termination of account privileges.

Global Security Team
Microsoft Partner Security`,
    urls: [
      {
        url: 'http://192.168.1.105/login/office365-verify.php?user=user@company.com',
        domain: '192.168.1.105',
        isHttps: false,
        isShortened: false,
        hasIpAddress: true,
        suspiciousKeywords: ['login', 'verify', 'office365'],
        riskScore: 95,
        indicators: ['Raw IP host in URL', 'HTTP non-secure protocol', 'Impersonating Microsoft Office365 credential page']
      }
    ],
    attachments: [],
    headers: {
      'SPF': 'fail',
      'DKIM': 'fail',
      'DMARC': 'fail'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isDemo: true,
    source: 'INBOX'
  },
  {
    id: 'demo-email-003',
    messageId: 'msg-spam-lottery-303@global-win-claims.com',
    threadId: 'thread-303',
    sender: {
      name: 'International Lottery Promo',
      email: 'claims@global-win-claims.com',
      domain: 'global-win-claims.com',
      isDomainVerified: false
    },
    recipients: ['user@company.com'],
    subject: 'CONGRATULATIONS! You Have Won $2,500,000 USD in International Mega Draw',
    snippet: 'You are the lucky winner of 2.5 Million USD! Claim your prize cash immediately.',
    bodyText: `Dear Lucky Winner,

Your email address was randomly selected in our 2026 Global Mega Millions Cash Promotion.

Winning Details:
Ref No: WIN-88219904
Cash Prize: $2,500,000.00 USD

To claim your fund immediately, send your Full Name, Phone Number, Home Address, and Bank Account details to our claim officer at claims-dept@global-win-claims.com.

Hurry! Unclaimed funds will be donated to charity in 48 hours!`,
    urls: [
      {
        url: 'http://bit.ly/claim-mega-cash-now',
        domain: 'bit.ly',
        isHttps: false,
        isShortened: true,
        hasIpAddress: false,
        suspiciousKeywords: ['claim', 'cash'],
        riskScore: 80,
        indicators: ['Shortened URL hiding target destination', 'Promotional spam indicators']
      }
    ],
    attachments: [],
    headers: {
      'SPF': 'softfail',
      'DKIM': 'none'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isDemo: true,
    source: 'SPAM'
  },
  {
    id: 'demo-email-004',
    messageId: 'msg-job-scam-404@hr-global-remote.top',
    threadId: 'thread-404',
    sender: {
      name: 'Global HR Talent Acquisition',
      email: 'careers@hr-global-remote.top',
      domain: 'hr-global-remote.top',
      replyTo: 'payment-desk@wire-transfer-gateway.cc',
      isDomainVerified: false
    },
    recipients: ['candidate@company.com'],
    subject: 'Remote Data Analyst Offer ($85/hr) - Advance Check Payment for Home Office Setup',
    snippet: 'Congratulations on your selection for the Data Analyst role! We are sending a $3,500 check for equipment purchasing.',
    bodyText: `Hello Applicant,

We are pleased to inform you that after reviewing your profile, you have been selected for the position of Remote AI & Data Analyst at $85/hour.

As part of our onboarding process, we will mail you a corporate cashier's check of $3,500. You must deposit this check into your personal bank account, keep $500 as your sign-on bonus, and wire transfer the remaining $3,000 via Zelle/Wire to our authorized hardware vendor.

Reply immediately with your Bank Name and Routing Number to receive your check shipment tracking number.`,
    urls: [
      {
        url: 'https://hr-global-remote.top/accept-offer-form',
        domain: 'hr-global-remote.top',
        isHttps: true,
        isShortened: false,
        hasIpAddress: false,
        suspiciousKeywords: ['accept', 'offer'],
        riskScore: 88,
        indicators: ['High-risk domain extension (.top)', 'Overpaid equipment check advance scam signature']
      }
    ],
    attachments: [],
    headers: {
      'SPF': 'fail',
      'DKIM': 'fail'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    isDemo: true,
    source: 'SPAM'
  },
  {
    id: 'demo-email-005',
    messageId: 'msg-crypto-505@wallet-security-desk.io',
    threadId: 'thread-505',
    sender: {
      name: 'MetaMask Security Team',
      email: 'no-reply@wallet-security-desk.io',
      domain: 'wallet-security-desk.io',
      isDomainVerified: false
    },
    recipients: ['crypto.holder@company.com'],
    subject: 'CRITICAL WARNING: Your Web3 Wallet Will Be Blocked - Restore 12-Word Seed Phrase',
    snippet: 'Unusual transaction attempt detected on Ethereum mainnet. Restore your 12-word seed phrase now to prevent asset freeze.',
    bodyText: `ATTENTION METAMASK USER,

Our automated Web3 node detected an unauthorized contract signature on your wallet address.

To secure your ETH and ERC-20 tokens, you must re-synchronize your Secret Recovery Phrase with our decentralized vault immediately.

SYNC WALLET SEED PHRASE HERE:
https://metamask-restore-phrase-auth.com/sync?vault=eth

WARNING: If you do not verify your seed phrase within 1 hour, your wallet address will be permanently blacklisted on the Ethereum blockchain.`,
    urls: [
      {
        url: 'https://metamask-restore-phrase-auth.com/sync?vault=eth',
        domain: 'metamask-restore-phrase-auth.com',
        isHttps: true,
        isShortened: false,
        hasIpAddress: false,
        suspiciousKeywords: ['metamask', 'restore', 'phrase', 'sync'],
        riskScore: 98,
        indicators: ['Brand impersonation of MetaMask', 'Credential theft targeting 12-word recovery seed', 'Typosquatted domain']
      }
    ],
    attachments: [],
    headers: {
      'SPF': 'fail',
      'DKIM': 'fail'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    isDemo: true,
    source: 'INBOX'
  },
  {
    id: 'demo-email-006',
    messageId: 'msg-malware-606@vendor-accounts-pay.biz',
    threadId: 'thread-606',
    sender: {
      name: 'Accounting & Payroll Desk',
      email: 'billing@vendor-accounts-pay.biz',
      domain: 'vendor-accounts-pay.biz',
      isDomainVerified: false
    },
    recipients: ['accounts@company.com'],
    subject: 'Overdue Vendor Invoice #INV-2026-9041 - Immediate Payment Required',
    snippet: 'Please find attached the overdue invoice for your software subscription. Open the PDF to view details.',
    bodyText: `Dear Finance Department,

Please find attached our overdue invoice #INV-2026-9041.

Our previous payment reminder on August 1st remains unpaid. Please review the attached document and process payment today to avoid late interest charges.

Attachment: Q3_Invoice_2026.pdf.exe

Sincerely,
Accounts Payable Department`,
    urls: [],
    attachments: [
      {
        filename: 'Q3_Invoice_2026.pdf.exe',
        fileExtension: 'exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 2458000,
        isExecutableOrScript: true,
        isArchive: false,
        hasDoubleExtension: true,
        indicators: ['Double extension (.pdf.exe) obfuscating executable', 'Executable binary disguised as document attachment'],
        riskScore: 100
      }
    ],
    headers: {
      'SPF': 'softfail',
      'DKIM': 'none'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 450).toISOString(),
    isDemo: true,
    source: 'SPAM'
  },
  {
    id: 'demo-email-007',
    messageId: 'msg-gcp-impersonate-707@cloud-alert-service.org',
    threadId: 'thread-707',
    sender: {
      name: 'Google Cloud Platform Billing',
      email: 'no-reply@cloud-alert-service.org',
      domain: 'cloud-alert-service.org',
      replyTo: 'credential-harvester@gcp-fake.info',
      isDomainVerified: false
    },
    recipients: ['cloud-admin@company.com'],
    subject: 'Google Cloud Platform: Project Deletion Notice Due to Payment Failure',
    snippet: 'Your GCP project cloud-prod-backend-918 will be permanently deleted in 24 hours due to credit card rejection.',
    bodyText: `Google Cloud Alert:

Your primary payment method for Google Cloud Billing Account #0192A-4819-FFF was declined.

Affected Resource:
Project: cloud-prod-backend-918

If payment details are not updated within 24 hours, all associated Compute Engine instances, Cloud SQL databases, and Cloud Storage buckets will be permanently purged.

UPDATE BILLING METHOD NOW:
https://console.cloud-google-billing-fix.com/settings/billing/update

Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043`,
    urls: [
      {
        url: 'https://console.cloud-google-billing-fix.com/settings/billing/update',
        domain: 'console.cloud-google-billing-fix.com',
        isHttps: true,
        isShortened: false,
        hasIpAddress: false,
        suspiciousKeywords: ['cloud', 'google', 'billing', 'update'],
        riskScore: 94,
        indicators: ['Brand impersonation of Google Cloud Platform', 'Typosquatted domain mimicking Google Cloud Console', 'Reply-To mismatch']
      }
    ],
    attachments: [],
    headers: {
      'SPF': 'fail',
      'DKIM': 'fail',
      'DMARC': 'fail'
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    isDemo: true,
    source: 'SPAM'
  }
];

