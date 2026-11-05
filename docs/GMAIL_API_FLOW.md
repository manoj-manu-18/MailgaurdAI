# Gmail API & Threat Analysis Pipeline Flow

This document details how real emails retrieved via the Gmail API are normalized and processed through MailGuard AI's Multi-Agent Security Orchestrator and Gemini Reasoning Engine.

---

## Threat Pipeline Flow Diagram

```mermaid
graph TD
    User([User]) -->|Clicks 'Analyze Recent Emails'| Frontend[Connected Accounts Page]
    Frontend -->|POST /api/gmail/analyze-recent| Backend[Express Backend / API]
    Backend -->|Retrieve Tokens| SessionStore[(Server Token Store)]
    Backend -->|Request Recent Messages| GmailAPI[Gmail API v1]
    GmailAPI -->|Raw Message JSON| Parser[Gmail Parser Module]
    Parser -->|Normalized Email Object| Orchestrator[5-Agent Security Orchestrator]
    
    subgraph Multi-Agent Security Pipeline
        Orchestrator --> Agent1[Content Agent]
        Orchestrator --> Agent2[Sender & Impersonation Agent]
        Orchestrator --> Agent3[URL Security Agent]
        Orchestrator --> Agent4[Attachment Risk Agent]
        Orchestrator --> Agent5[Scam & Fraud Agent]
    end

    Agent1 --> RiskEngine[Risk Engine & Score Matrix]
    Agent2 --> RiskEngine
    Agent3 --> RiskEngine
    Agent4 --> RiskEngine
    Agent5 --> RiskEngine

    RiskEngine --> GenAI[Gemini GenAI Reasoning Engine]
    GenAI --> ThreatDatabase[(Threat Store Database)]
    ThreatDatabase -->|Analyzed Threat Results| Frontend
```

---

## Email Normalization Mapping
Raw Gmail messages (`gmail_v1.Schema$Message`) are converted into a standardized `NormalizedEmail` structure:

| Raw Gmail Field | Normalized Internal Field | Purpose |
|-----------------|--------------------------|---------|
| `id` / `threadId` | `messageId` / `threadId` | Unique message tracking |
| `headers.From` | `sender.name`, `sender.email`, `sender.domain` | Sender analysis & impersonation checks |
| `headers.Subject` | `subject` | Subject line sentiment & urgency parsing |
| `payload.parts` / `body` | `bodyText` / `bodyHtml` | Plaintext decoding and link extraction |
| Decoded Links | `urls[]` | Domain verification, IP detection, keyword checks |
| Decoded Attachments | `attachments[]` | File extension, script, and archive risk checks |

---

## Controlled Retrieval Rules
- **Batch Limit**: Manual analysis fetches a maximum of 5 recent emails by default.
- **No Mass Scanning**: MailGuard AI does not download or index the full user mailbox.
- **User Control**: Analysis is initiated manually by the user or via scheduled checks.
