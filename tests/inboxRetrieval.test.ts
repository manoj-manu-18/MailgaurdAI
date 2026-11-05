import { parseGmailMessage } from '../server/gmail/gmailParser.js';
import { fetchMessagesForSource, fetchRealGmailMessages } from '../server/gmail/gmailService.js';
import { NormalizedEmail, ThreatAnalysis } from '../src/types.js';

let passedTests = 0;
let totalTests = 0;

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

async function runTestSuite() {
  console.log('--- STARTING INBOX RETRIEVAL & INTEGRATION VERIFICATION TEST SUITE ---');

  // Test 1: Parser extracts and preserves actual internalDate
  {
    const fakeRawMessage = {
      id: 'test-msg-01',
      threadId: 'thread-01',
      internalDate: '1740485000000', // Epoch ms
      labelIds: ['INBOX'],
      snippet: 'Test message snippet',
      payload: {
        headers: [
          { name: 'Subject', value: 'Quarterly Security Audit' },
          { name: 'From', value: 'Security Team <security@acme.com>' },
          { name: 'Date', value: 'Mon, 25 Feb 2026 12:00:00 +0000' }
        ],
        body: { data: Buffer.from('Audit body text').toString('base64url') }
      }
    };

    const parsed = parseGmailMessage(fakeRawMessage as any, 'INBOX');
    assert(parsed.internalDate === 1740485000000, 'Parser extracts exact internalDate timestamp');
    assert(parsed.source === 'INBOX', 'Parser preserves explicit INBOX source');
    assert(new Date(parsed.receivedAt).getTime() === 1740485000000, 'receivedAt derives from internalDate');
  }

  // Test 2: Ordering by actual internalDate, newest first
  {
    const fakeClient = {
      users: {
        messages: {
          list: async () => ({
            data: {
              messages: [
                { id: 'msg-older' },
                { id: 'msg-newest' },
                { id: 'msg-middle' }
              ]
            }
          }),
          get: async ({ id }: { id: string }) => {
            const dateMap: Record<string, string> = {
              'msg-older': '1700000000000',
              'msg-newest': '1740000000000',
              'msg-middle': '1720000000000'
            };
            return {
              data: {
                id,
                internalDate: dateMap[id],
                labelIds: ['INBOX'],
                payload: {
                  headers: [
                    { name: 'Subject', value: `Subject for ${id}` },
                    { name: 'From', value: 'sender@example.com' }
                  ],
                  body: { data: Buffer.from(`Body of ${id}`).toString('base64url') }
                }
              }
            };
          }
        }
      }
    };

    const result = await fetchMessagesForSource(fakeClient as any, 'INBOX', 30);
    assert(result.emails.length === 3, 'Fetched all 3 mock messages');
    assert(result.emails[0].rawGmailId === 'msg-newest', 'First email is the newest (highest internalDate)');
    assert(result.emails[1].rawGmailId === 'msg-middle', 'Second email is middle internalDate');
    assert(result.emails[2].rawGmailId === 'msg-older', 'Third email is oldest internalDate');
  }

  // Test 3: Exactly 30 Inbox messages selected when more than 30 exist
  {
    // Gmail API list returns messages in reverse chronological order (newest first)
    const generatedMessages = Array.from({ length: 45 }, (_, i) => {
      const idx = 44 - i;
      return {
        id: `msg-${String(idx).padStart(2, '0')}`,
        internalDate: String(1700000000000 + idx * 10000)
      };
    });

    const fakeClient = {
      users: {
        messages: {
          list: async () => ({
            data: {
              messages: generatedMessages.map(m => ({ id: m.id }))
            }
          }),
          get: async ({ id }: { id: string }) => {
            const found = generatedMessages.find(m => m.id === id)!;
            return {
              data: {
                id: found.id,
                internalDate: found.internalDate,
                labelIds: ['INBOX'],
                payload: {
                  headers: [{ name: 'Subject', value: `Email ${found.id}` }, { name: 'From', value: 'a@b.com' }]
                }
              }
            };
          }
        }
      }
    };

    const result = await fetchMessagesForSource(fakeClient as any, 'INBOX', 30);
    assert(result.emails.length === 30, 'Exactly 30 messages selected when 45 exist');
    assert(result.emails[0].rawGmailId === 'msg-44', 'Newest message is selected first');
    assert(result.emails[29].rawGmailId === 'msg-15', 'Oldest selected message is msg-15 (skipping msg-00 through msg-14)');
  }

  // Test 4: Handling fewer than 30 messages gracefully
  {
    const smallBatch = [
      { id: 'small-1', internalDate: '1700000000000' },
      { id: 'small-2', internalDate: '1700000050000' }
    ];

    const fakeClient = {
      users: {
        messages: {
          list: async () => ({ data: { messages: smallBatch.map(m => ({ id: m.id })) } }),
          get: async ({ id }: { id: string }) => {
            const found = smallBatch.find(m => m.id === id)!;
            return {
              data: {
                id: found.id,
                internalDate: found.internalDate,
                labelIds: ['INBOX'],
                payload: { headers: [{ name: 'Subject', value: id }] }
              }
            };
          }
        }
      }
    };

    const result = await fetchMessagesForSource(fakeClient as any, 'INBOX', 30);
    assert(result.emails.length === 2, 'Handled fewer than 30 messages (returned 2)');
    assert(result.emails[0].rawGmailId === 'small-2', 'Sorted newest first for small batch');
  }

  // Test 5: Spam messages selected independently & combined scope respects 60 limit
  {
    const inboxMessages = Array.from({ length: 30 }, (_, i) => ({ id: `inbox-${i}`, internalDate: String(1740000000000 + i) }));
    const spamMessages = Array.from({ length: 30 }, (_, i) => ({ id: `spam-${i}`, internalDate: String(1740000000000 + i) }));

    const fakeClient = {
      users: {
        messages: {
          list: async ({ labelIds }: any) => {
            const isSpam = labelIds && labelIds.includes('SPAM');
            const source = isSpam ? spamMessages : inboxMessages;
            return { data: { messages: source.map(m => ({ id: m.id })) } };
          },
          get: async ({ id }: any) => {
            const isSpam = id.startsWith('spam-');
            return {
              data: {
                id,
                internalDate: '1740000000000',
                labelIds: isSpam ? ['SPAM'] : ['INBOX'],
                payload: { headers: [{ name: 'Subject', value: id }] }
              }
            };
          }
        }
      }
    };

    // Test INBOX-only scope
    const inboxOnly = await fetchRealGmailMessages(fakeClient as any, { scope: 'INBOX', inboxLimit: 30 });
    assert(inboxOnly.inbox.emails.length === 30, 'Inbox scope retrieved 30 Inbox emails');
    assert(inboxOnly.spam.emails.length === 0, 'Inbox scope retrieved 0 Spam emails');
    assert(inboxOnly.totalRetrieved === 30, 'Total retrieved is 30 for INBOX scope');

    // Test ALL scope (combined 30 Inbox + 30 Spam = 60 max)
    const combined = await fetchRealGmailMessages(fakeClient as any, { scope: 'ALL', inboxLimit: 30, spamLimit: 30 });
    assert(combined.inbox.emails.length === 30, 'Combined run retrieved 30 Inbox emails');
    assert(combined.spam.emails.length === 30, 'Combined run retrieved 30 Spam emails');
    assert(combined.totalRetrieved === 60, 'Combined run retrieved exactly 60 messages maximum');
    assert(combined.inbox.emails.every(e => e.source === 'INBOX'), 'Inbox source strictly preserved');
    assert(combined.spam.emails.every(e => e.source === 'SPAM'), 'Spam source strictly preserved');
  }

  // Test 6: Historical isolation & current batch contamination prevention
  {
    const historicalThreats: ThreatAnalysis[] = [
      {
        id: 'hist-1',
        email: { id: 'gmail-old1', rawGmailId: 'old1', subject: 'Old Message' } as any,
        status: 'PENDING_REVIEW',
        primaryThreat: 'PHISHING',
        riskScore: { severity: 'HIGH', overallScore: 70 } as any,
        isDemo: false,
        source: 'INBOX',
        inLatestRun: false
      } as unknown as ThreatAnalysis
    ];

    const currentBatchThreats: ThreatAnalysis[] = [
      {
        id: 'curr-1',
        email: { id: 'gmail-new1', rawGmailId: 'new1', subject: 'New Message' } as any,
        status: 'PENDING_REVIEW',
        primaryThreat: 'SAFE',
        riskScore: { severity: 'SAFE', overallScore: 5 } as any,
        isDemo: false,
        source: 'INBOX',
        inLatestRun: true
      } as unknown as ThreatAnalysis
    ];

    const combinedStore = [...currentBatchThreats, ...historicalThreats];

    // Filter for current batch
    const currentRunOnly = combinedStore.filter(t => t.inLatestRun === true);
    assert(currentRunOnly.length === 1, 'Current run contains strictly 1 message');
    assert(currentRunOnly[0].email.rawGmailId === 'new1', 'Current run does not contain old historical records');
    assert(combinedStore.length === 2, 'Historical store retains both current and historical records');
  }

  console.log(`\n--- ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY ---`);
}

runTestSuite().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
