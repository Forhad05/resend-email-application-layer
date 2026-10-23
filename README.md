# 📨 Resend Internal Email Application

> A production-grade, bidirectional support inbox and transactional email platform built with **Next.js 16 (Turbopack + PPR)**, **Resend**, **PostgreSQL 16 (Drizzle ORM)**, and **Better Auth**.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.4-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Resend](https://img.shields.io/badge/Resend-API-black?style=flat-square)](https://resend.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

---

## 📑 Table of Contents

- [🌟 Key Capabilities](#-key-capabilities)
- [📐 Architectural Blueprints](#-architectural-blueprints)
  - [1. System Core & Edge Topology](#1-system-core--edge-topology)
  - [2. Inbound Dual-Routing & MIME Stream Parsing](#2-inbound-dual-routing--mime-stream-parsing)
  - [3. Outbound Multi-Identity & Suppression Protection](#3-outbound-multi-identity--suppression-protection)
  - [4. Ticket Workflows & Team Collaboration State Machine](#4-ticket-workflows--team-collaboration-state-machine)
  - [5. Transactional Engine & Variable Interpolation](#5-transactional-engine--variable-interpolation)
  - [6. Relational Database Entity-Relationship Blueprint (ERD)](#6-relational-database-entity-relationship-blueprint-erd)
- [🗄️ Database Schema (PostgreSQL DDL)](#️-database-schema-postgresql-ddl)
  - [Core Support & Email Tables](#core-support--email-tables)
  - [Authentication Tables (Better Auth)](#authentication-tables-better-auth)
- [🏗️ Directory & Module Architecture](#️-directory--module-architecture)
- [🚀 Getting Started](#-getting-started)
- [🛠️ Available Scripts](#️-available-scripts)
- [🔒 Security & Reliability Architecture](#-security--reliability-architecture)
- [📜 License](#-license)

---

## 🌟 Key Capabilities

### 📥 Real-Time Support Inbox

- **Zero-Reload Live Timeline**: Background synchronization detects incoming customer replies and delivery updates via tab focus and non-blocking polling, invoking Next.js router refresh with live toast notifications.
- **Unread Indicators & Counters**: Dynamic unread counter badges on the sidebar and visual blue indicator dots on threads. Opening a conversation automatically marks it as read.

### 🧵 Smart RFC 822 Inbound Threading

- **Native MIME Stream Parsing**: Integrates server-side RFC 822 MIME parsing (`postal-mime`) allowing Cloudflare Email Workers or webhooks to transmit raw streams without external dependencies.
- **Header Chain Matching**: Automatically resolves conversations using `In-Reply-To` and `References` header chains, falling back to cleaned subject token matching.

### 📮 Multi-Identity & Multi-Domain Outbound

- **Dynamic Verified Domain Discovery**: Automatically queries verified Resend domains (`mail.yourdomain.com`, `outbound.yourdomain.com`).
- **Identity Registry**: Send outbound emails from any alias (`support@`, `contracts@`, `security@`, etc.) with customized display names.
- **Dynamic Reply Resolution**: In-thread replies automatically route through the exact mailbox address the customer messaged.

### 🛡️ Automated Suppression Protection

- **Reputation Defense**: Proactive debounced email checks in `/compose` and `/inbox/[threadId]` warn agents and disable send actions if an address has hard-bounced or filed a spam complaint.
- **Server-Side Enforcement**: Backend actions explicitly reject sends to suppressed addresses before network transmission.

### 👥 Ticket Workflows & Team Assignment

- **Status Transitions**: One-click segmented controls for `Open` $\leftrightarrow$ `Pending` $\leftrightarrow$ `Resolved` $\leftrightarrow$ `Closed` with live filter tabs.
- **Priority Management**: Color-coded badges for `Low`, `Normal`, `High`, and `Urgent` tickets.
- **Agent Assignment**: Assign tickets to team members or unassign with an interactive selector.

### 🔒 Private Team Internal Notes

- **Dual-Mode Composer**: 1-click toggle between public customer email replies and private internal team notes.
- **Interleaved Chronological Timeline**: Internal notes render with warm amber cards, author attribution, and privacy notices, stored in `internal_notes` and never exposed to customers.

### 📋 Reusable Canned Templates & Transactional Engine

- **Template Manager (`/templates`)**: Full management interface with dynamic variable interpolation (`{{customer_name}}`, `{{ticket_id}}`, `{{company}}`), live preview, and test delivery.
- **Quick Canned Insertion**: 1-click template insertion dropdowns in both `/compose` and `/inbox/[threadId]`.
- **Transactional Helper (`lib/email/transactional.ts`)**: Programmatic sending with template slug resolution, variable substitution, and `Idempotency-Key` duplicate protection.

### 📇 Customer CRM Directory (`/contacts`)

- **Customer Registry**: Tracks client profiles, organizations, phone numbers, and total conversation counts.
- **Quick Actions**: One-click compose shortcut and modal contact editor.

### 🛡️ Zero-Day Ingress Shield

- **Middleware Ingress Defense**: Intercepts and blocks incoming HTTP requests containing `Content-Encoding: br` with `415 Unsupported Media Type`, neutralizing CVE-2026-111497 before native decompressors execute.

---

## 📐 Architectural Blueprints

### 1. System Core & Edge Topology

This blueprint maps all physical boundaries, runtime components, edge services, and network channels connecting the Next.js 16 application, PostgreSQL, Cloudflare edge infrastructure, and Resend.

```mermaid
flowchart TB
    subgraph CLIENT["🧑‍💻 User / Support Agent Browser"]
        CLIENT_UI["Dashboard Client UI\n(React 19 Server/Client Components)"]
        CLIENT_REFRESH["Live Timeline Refresher\n(Visibility API + Non-blocking Polling)"]
    end

    subgraph APP["⚡ Next.js 16 App Router (Node.js 20+ / Turbopack)"]
        MW["Security Middleware (middleware.ts)\n• Content-Encoding: br Ingress Shield"]
        PPR["Partial Prerendering (PPR) Engine"]
        
        subgraph ROUTES["Route Handlers & Server Actions"]
            ACT_SEND["Outbound Actions (sendEmailAction, sendReplyAction)"]
            ACT_WORKFLOW["Workflow Actions (updateThreadStatus, assignThread)"]
            ACT_NOTES["Internal Notes Actions (createInternalNoteAction)"]
            ROUTE_WEBHOOK["POST /api/webhooks/resend (Svix Verification)"]
            ROUTE_AUTH["Better Auth API (/api/auth/[...all])"]
        end

        subgraph CORE_LIBS["Internal Core Engines (lib/email)"]
            SUPP_CHECK["Suppression Validator (lib/email/send.ts)"]
            ID_ROUTER["Sender Identity Resolver (lib/email/senders.ts)"]
            MIME_PARSER["PostalMime RFC 822 Engine (lib/email/inbound.ts)"]
            THREAD_MATCHER["Smart Threading Matcher (In-Reply-To & References)"]
            TMPL_ENGINE["Template Interpolation Engine (lib/email/template-utils.ts)"]
            TX_ENGINE["Transactional Mail Dispatcher (lib/email/transactional.ts)"]
        end
    end

    subgraph STORAGE["🗄️ Relational Database (Docker / PostgreSQL 16)"]
        DB_ORM["Drizzle ORM (lib/db)"]
        T_THREADS[("threads")]
        T_MSGS[("messages")]
        T_ATTACH[("attachments")]
        T_NOTES[("internal_notes")]
        T_TEMPLATES[("templates")]
        T_CONTACTS[("contacts")]
        T_SUPP[("suppressions")]
        T_IDENT[("sender_identities")]
        T_AUTH[("user / session / account")]
    end

    subgraph RESEND["✉️ Resend Cloud Infrastructure"]
        RESEND_API["Resend REST API (api.resend.com)"]
        RESEND_EVENTS["Resend Event Webhooks (Svix)"]
        VERIFIED_DOMAINS["Verified Subdomains\n• mail.yourdomain.com\n• outbound.yourdomain.com"]
    end

    subgraph CLOUDFLARE["☁️ Cloudflare Edge Infrastructure"]
        CF_MX["Cloudflare Email Routing (MX)"]
        CF_WORKER["Cloudflare Worker: email-dual-router"]
        CF_TUNNEL["Cloudflare Zero-Trust Tunnel (cloudflared)"]
    end

    subgraph CUSTOMERS["👤 External Customers"]
        CUSTOMER_INBOX["Customer Inboxes (Gmail / Outlook / Apple Mail)"]
    end

    %% Client Interactions
    CLIENT_UI --> MW
    MW --> PPR
    PPR --> ROUTES
    CLIENT_REFRESH -.->|Background Poll & Revalidate| ROUTES

    %% Outbound Flow
    ACT_SEND --> SUPP_CHECK
    SUPP_CHECK --> ID_ROUTER
    ID_ROUTER --> RESEND_API
    TX_ENGINE --> TMPL_ENGINE
    TMPL_ENGINE --> RESEND_API
    RESEND_API --> VERIFIED_DOMAINS
    VERIFIED_DOMAINS -->|SMTP Delivery| CUSTOMER_INBOX

    %% Inbound Flow
    CUSTOMER_INBOX -->|Reply or New Email| CF_MX
    CF_MX --> CF_WORKER
    CF_WORKER -->|POST Raw Stream| CF_TUNNEL
    CF_TUNNEL --> MW
    MW --> ROUTE_WEBHOOK
    ROUTE_WEBHOOK --> MIME_PARSER
    MIME_PARSER --> THREAD_MATCHER
    THREAD_MATCHER --> DB_ORM

    %% Resend Delivery Lifecycle
    RESEND_API --> RESEND_EVENTS
    RESEND_EVENTS --> CF_TUNNEL

    %% Database Operations
    ROUTES --> DB_ORM
    DB_ORM --> STORAGE
```

---

### 2. Inbound Dual-Routing & MIME Stream Parsing

This blueprint illustrates the lifecycle of incoming customer emails: stream bifurcation at Cloudflare Worker edge, secure tunnel transmission, RFC 822 decoding, header matching, and zero-reload timeline updates.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 Customer (Gmail / Outlook)
    participant CF_MX as ☁️ Cloudflare MX
    participant Worker as ⚡ Worker (email-dual-router)
    participant Backup as 📥 Backup Mailbox (Personal Gmail)
    participant Tunnel as 🚇 Cloudflare Tunnel
    participant Shield as 🛡️ Middleware Ingress Shield
    participant Webhook as 📬 POST /api/webhooks/resend
    participant Parser as 🧩 PostalMime RFC 822 Engine
    participant DB as 🐘 PostgreSQL (Drizzle ORM)
    actor Agent as 🧑‍💻 Agent (Next.js Inbox UI)

    Customer->>CF_MX: Send Email / Reply to support@mail.yourdomain.com
    CF_MX->>Worker: Trigger email(message, env, ctx)
    
    Note over Worker: Bifurcate Single-Use Stream:<br/>const [streamA, streamB] = message.raw.tee()
    
    par Stream Branch A: Native Forward
        Worker->>Backup: await message.forward("backup@example.com")
        Backup-->>Worker: Delivered ✅
    and Stream Branch B: Webhook Dispatch
        Worker->>Tunnel: POST /api/webhooks/resend (Raw MIME + Envelope)
    end

    Tunnel->>Shield: Ingress Request
    Note over Shield: Verify Content-Encoding != 'br'<br/>Pass through to Route Handler
    Shield->>Webhook: Forward HTTP Request
    
    Webhook->>Parser: Parse raw MIME bytes with PostalMime
    Parser-->>Webhook: Extract { messageId, inReplyTo, references, subject, text, html, attachments }
    
    alt In-Reply-To or References Header Found
        Webhook->>DB: Query 'messages' matching message_id
        DB-->>Webhook: Matched existing thread_id
        Webhook->>DB: INSERT into 'messages' (direction: 'inbound')
        Webhook->>DB: UPDATE 'threads' (is_read: false, message_count + 1, status: 'open')
    else Fallback Subject Matching
        Webhook->>DB: Query 'threads' by cleaned subject + sender
        DB-->>Webhook: Matched thread or Create new 'threads' record
        Webhook->>DB: INSERT into 'messages'
    end

    Webhook->>DB: UPSERT customer into 'contacts' table
    Webhook-->>Tunnel: HTTP 200 { success: true }
    
    Note over Agent: Client Live Refresher polls /api/inbox/[threadId]<br/>Detects new message count
    Agent->>Agent: Trigger router.refresh() & display slide-in notification toast
```

---

### 3. Outbound Multi-Identity & Suppression Protection

This blueprint details outbound message preparation: dynamic sender identity selection, pre-flight suppression validation, server-side enforcement, Resend API transmission, and delivery lifecycle webhook synchronization.

```mermaid
flowchart TD
    START(["Agent clicks 'Send Email' or 'Send Reply'"]) --> RESOLVE_SENDER["Resolve Outbound Identity\n• Check thread parent recipient address\n• Fallback to default sender_identities record"]
    
    RESOLVE_SENDER --> DOMAIN_CHECK{"Is domain verified in Resend?\n(e.g. mail.yourdomain.com)"}
    DOMAIN_CHECK -->|No| REJECT_DOMAIN["Raise Invalid Domain Error"]
    DOMAIN_CHECK -->|Yes| PRE_CHECK["Pre-Flight Suppression Check\nQuery 'suppressions' for recipient email"]

    PRE_CHECK --> IS_SUPPRESSED{"Is Recipient Suppressed?"}
    IS_SUPPRESSED -->|Yes (hard_bounce / complaint)| BLOCK_SEND["Block Send Action\nDisplay Alert Banner to Agent\nAbort Resend API Call"]
    
    IS_SUPPRESSED -->|No| COMPOSE_PAYLOAD["Build Resend API Payload\n• From: Name <alias@domain>\n• To: Recipient\n• Headers: In-Reply-To, References\n• Idempotency-Key Header"]

    COMPOSE_PAYLOAD --> RESEND_CALL["Call resend.emails.send(payload)"]
    
    RESEND_CALL --> RESEND_RESP{"Resend Response"}
    RESEND_RESP -->|Failure / Rate Limit| LOG_ERROR["Record Failure Status\nNotify Agent in UI"]
    RESEND_RESP -->|Success (id: resend_id)| SAVE_DB["Write Outbound Record to PostgreSQL\n• INSERT into 'messages' (direction: 'outbound', status: 'sent')\n• UPDATE 'threads' (last_message_at: now())"]
    
    SAVE_DB --> WEBHOOK_WAIT["Wait for Asynchronous Delivery Webhooks"]
    
    WEBHOOK_WAIT --> EVENT_TYPE{"Svix Webhook Event"}
    EVENT_TYPE -->|email.delivered| SET_DELIVERED["UPDATE 'messages' status = 'delivered'"]
    EVENT_TYPE -->|email.opened| SET_OPENED["UPDATE 'messages' status = 'opened'"]
    EVENT_TYPE -->|email.bounced| HANDLE_BOUNCE["UPDATE 'messages' status = 'bounced'\nINSERT into 'suppressions' (reason: 'hard_bounce')"]
    EVENT_TYPE -->|email.complained| HANDLE_COMPLAINT["UPDATE 'messages' status = 'complained'\nINSERT into 'suppressions' (reason: 'complaint')"]
```

---

### 4. Ticket Workflows & Team Collaboration State Machine

This state machine blueprint depicts how customer conversations transition through states, priorities, agent assignments, and private team internal notes.

```mermaid
stateDiagram-v2
    [*] --> Open: Customer sends new email / Inbound webhook

    state Open {
        [*] --> Unassigned
        Unassigned --> Assigned: Agent claims or assigns ticket
        Assigned --> Unassigned: Agent unassigns ticket
    }

    Open --> Pending: Agent replies to customer (awaiting customer response)
    Open --> Resolved: Issue resolved directly
    Open --> Closed: Manually closed by agent

    state Pending {
        note right of Pending: Ticket awaits customer action or external info
    }

    Pending --> Open: Customer replies (Auto-reopens thread & unsets is_read)
    Pending --> Resolved: Agent marks resolved
    Pending --> Closed: Closed due to inactivity

    state Resolved {
        note right of Resolved: Customer issue fixed
    }

    Resolved --> Open: Customer replies with follow-up (Auto-reopens)
    Resolved --> Closed: Archived after retention window

    state Closed {
        note right of Closed: Ticket completed & locked
    }

    Closed --> Open: Customer sends new message to thread

    %% Priority Matrix
    state PriorityMatrix {
        Low --> Normal
        Normal --> High
        High --> Urgent
    }

    %% Internal Team Notes Interleaving
    state CollaborationLayer {
        PublicReply: Public Customer Reply (Sent via Resend SMTP)
        InternalNote: Private Team Note (Stored in internal_notes table)
        PublicReply --> InternalNote: 1-Click Tab Switch in Composer
        InternalNote --> PublicReply: Never visible to customer
    }
```

---

### 5. Transactional Engine & Variable Interpolation

This blueprint diagrams the programmatic transactional sending workflow, template resolution, dynamic token replacement, and duplicate prevention.

```mermaid
flowchart LR
    APP_CALL["Application / Service Call\nsendTransactionalEmail({\n  slug: 'password-reset',\n  to: 'user@example.com',\n  variables: { name, url },\n  idempotencyKey: 'tx_abc123'\n})"]

    APP_CALL --> FIND_TEMPLATE["Lookup in 'templates' table\nWHERE slug = :slug AND is_active = true"]
    
    FIND_TEMPLATE --> FOUND{"Template Found?"}
    FOUND -->|No| ERR_404["Throw TemplateNotFoundError"]
    FOUND -->|Yes| CHECK_SUPP["Query 'suppressions' table\nCheck recipient address"]

    CHECK_SUPP --> SUPP_VALID{"Suppressed?"}
    SUPP_VALID -->|Yes| ERR_SUPP["Abort: Recipient on blocklist"]
    SUPP_VALID -->|No| INTERPOLATE["Regex Token Interpolation Engine\n(lib/email/template-utils.ts)\nReplace {{key}} with values"]

    INTERPOLATE --> DISPATCH["Resend API Outbound Call\n• Headers: { 'Idempotency-Key': idempotencyKey }\n• From: Default Verified Sender\n• To, Subject, HTML, Text"]

    DISPATCH --> PERSIST["PostgreSQL Audit Trail\n• INSERT into 'messages'\n• Link to 'threads' conversation"]
    
    PERSIST --> DONE["Return { success: true, emailId }"]
```

---

### 6. Relational Database Entity-Relationship Blueprint (ERD)

This diagram details all 9 core application tables, Better Auth tables, foreign key constraints, and relational cardinatlities implemented in Drizzle ORM ([`lib/db/schema.ts`](file:///home/apon/Projects/email-application/lib/db/schema.ts)).

```mermaid
erDiagram
    user ||--o{ session : "owns"
    user ||--o{ account : "links"
    user ||--o{ threads : "assigned_to"
    user ||--o{ messages : "sent_by"
    user ||--o{ internal_notes : "authors"
    user ||--o{ templates : "creates"

    contacts ||--o{ threads : "participates_in"
    
    threads ||--|{ messages : "contains"
    threads ||--o{ internal_notes : "annotated_with"
    
    messages ||--o{ attachments : "includes"

    user {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        text role "admin | agent"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    session {
        text id PK
        text user_id FK
        text token UK
        timestamp expires_at
        text ip_address
        text user_agent
        timestamp created_at
        timestamp updated_at
    }

    account {
        text id PK
        text user_id FK
        text account_id
        text provider_id
        text access_token
        text refresh_token
        timestamp created_at
        timestamp updated_at
    }

    sender_identities {
        uuid id PK
        text name "e.g. Support"
        text email UK "e.g. support@mail.yourdomain.com"
        text domain "e.g. mail.yourdomain.com"
        boolean is_default
        timestamp created_at
        timestamp updated_at
    }

    contacts {
        uuid id PK
        text email UK
        text name
        text company
        text phone
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    threads {
        uuid id PK
        text subject
        text status "open | pending | resolved | closed"
        text priority "low | normal | high | urgent"
        text assigned_to FK
        uuid contact_id FK
        text contact_email
        integer message_count
        timestamp last_message_at
        boolean is_read
        text_array labels
        timestamp created_at
        timestamp updated_at
    }

    messages {
        uuid id PK
        uuid thread_id FK
        text direction "inbound | outbound"
        text message_id UK
        text in_reply_to
        text references_header
        text resend_email_id UK
        text from_email
        text from_name
        text_array to_emails
        text_array cc_emails
        text_array bcc_emails
        text reply_to
        text subject
        text html_body
        text text_body
        text status "received | queued | sent | delivered | opened | clicked | bounced | complained | failed"
        boolean has_attachments
        boolean is_draft
        text sent_by FK
        timestamp created_at
        timestamp updated_at
    }

    attachments {
        uuid id PK
        uuid message_id FK
        text filename
        text content_type
        integer size_bytes
        text storage_path
        text resend_url
        text content_id
        boolean is_inline
        timestamp created_at
    }

    suppressions {
        uuid id PK
        text email UK
        text reason "hard_bounce | complaint | manual | unsubscribe"
        text source
        timestamp created_at
    }

    templates {
        uuid id PK
        text name
        text slug UK
        text subject
        text description
        text html_body
        text text_body
        boolean is_active
        text created_by FK
        timestamp created_at
        timestamp updated_at
    }

    internal_notes {
        uuid id PK
        uuid thread_id FK
        text author_id FK
        text content
        timestamp created_at
        timestamp updated_at
    }
```

---

## 🗄️ Database Schema (PostgreSQL DDL)

The application manages data through **Drizzle ORM** targeting **PostgreSQL 16**. Below is the complete SQL DDL schema corresponding to [`lib/db/schema.ts`](lib/db/schema.ts):

### Core Support & Email Tables

```sql
-- Sender identities / mailboxes across verified domains
CREATE TABLE sender_identities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  domain          TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sender_identities_email ON sender_identities(email);
CREATE INDEX idx_sender_identities_domain ON sender_identities(domain);

-- Contacts (external customers)
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  company         TEXT,
  phone           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_email ON contacts(email);

-- Threads (conversations)
CREATE TABLE threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' 
                  CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority        TEXT NOT NULL DEFAULT 'normal' 
                  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to     TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_email   TEXT NOT NULL,
  message_count   INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  labels          TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_threads_status ON threads(status);
CREATE INDEX idx_threads_assigned_to ON threads(assigned_to);
CREATE INDEX idx_threads_last_message_at ON threads(last_message_at DESC);
CREATE INDEX idx_threads_contact_email ON threads(contact_email);

-- Messages (inbound and outbound emails)
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  direction         TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_id        TEXT,
  in_reply_to       TEXT,
  references_header TEXT,
  resend_email_id   TEXT,
  from_email        TEXT NOT NULL,
  from_name         TEXT,
  to_emails         TEXT[] NOT NULL,
  cc_emails         TEXT[] DEFAULT '{}',
  bcc_emails        TEXT[] DEFAULT '{}',
  reply_to          TEXT,
  subject           TEXT,
  html_body         TEXT,
  text_body         TEXT,
  status            TEXT NOT NULL DEFAULT 'received'
                    CHECK (status IN (
                      'received', 'queued', 'sent', 'delivered', 
                      'opened', 'clicked', 'bounced', 'complained', 'failed'
                    )),
  has_attachments   BOOLEAN NOT NULL DEFAULT false,
  is_draft          BOOLEAN NOT NULL DEFAULT false,
  sent_by           TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_message_id ON messages(message_id);
CREATE INDEX idx_messages_resend_email_id ON messages(resend_email_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_status ON messages(status);

-- Attachments
CREATE TABLE attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  content_type    TEXT,
  size_bytes      INTEGER,
  storage_path    TEXT,
  resend_url      TEXT,
  content_id      TEXT,
  is_inline       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_message_id ON attachments(message_id);

-- Suppressions blocklist
CREATE TABLE suppressions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  reason          TEXT NOT NULL CHECK (reason IN (
                    'hard_bounce', 'complaint', 'manual', 'unsubscribe'
                  )),
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppressions_email ON suppressions(email);

-- Reusable templates
CREATE TABLE templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  subject         TEXT NOT NULL,
  description     TEXT,
  html_body       TEXT,
  text_body       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_slug ON templates(slug);

-- Internal private team notes
CREATE TABLE internal_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_notes_thread_id ON internal_notes(thread_id);
```

### Authentication Tables (Better Auth)

```sql
CREATE TABLE "user" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  image           TEXT,
  role            TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_email ON "user"(email);

CREATE TABLE "session" (
  id              TEXT PRIMARY KEY,
  expires_at      TIMESTAMPTZ NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  ip_address      TEXT,
  user_agent      TEXT,
  user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_user_id ON "session"(user_id);

CREATE TABLE "account" (
  id                      TEXT PRIMARY KEY,
  account_id              TEXT NOT NULL,
  provider_id             TEXT NOT NULL,
  user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token            TEXT,
  refresh_token           TEXT,
  id_token                TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                   TEXT,
  password                TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_user_id ON "account"(user_id);

CREATE TABLE "verification" (
  id              TEXT PRIMARY KEY,
  identifier      TEXT NOT NULL,
  value           TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_identifier ON "verification"(identifier);
```

---

## 🏗️ Directory & Module Architecture

```text
email-application/
├── app/
│   ├── (dashboard)/                     # Protected Agent Dashboard Layout
│   │   ├── layout.tsx                   # Sidebar & Topbar Shell with Unread Badges
│   │   ├── inbox/                       # Support Inbox View
│   │   │   ├── page.tsx                 # Thread List (Partial Prerendering)
│   │   │   └── [threadId]/
│   │   │       ├── page.tsx             # Interleaved Conversation Timeline
│   │   │       └── actions.ts           # Thread Reply & Note Server Actions
│   │   ├── compose/                     # Multi-Identity Outbound Composer
│   │   │   ├── page.tsx                 # Server Shell with <Suspense>
│   │   │   ├── ComposeForm.tsx          # Dynamic From Selector & Suppression Warning
│   │   │   └── actions.ts               # Outbound Send Server Action
│   │   ├── templates/                   # Reusable Templates & Canned Responses
│   │   │   ├── page.tsx                 # Template Grid with Live Test Send
│   │   │   └── actions.ts               # Template CRUD Server Actions
│   │   ├── contacts/                    # Customer CRM Directory
│   │   │   ├── page.tsx                 # Customer Registry with Volume Counts
│   │   │   └── actions.ts               # Contact Create & Edit Server Actions
│   │   ├── analytics/                   # Delivery & Volume Analytics
│   │   │   └── page.tsx                 # Performance Metrics
│   │   └── settings/                    # Domain & Identity Management
│   │       ├── page.tsx                 # Resend Verified Domains Status
│   │       ├── SenderManager.tsx        # Mailbox Creation & Default Aliases
│   │       └── actions.ts               # Sender Identity Server Actions
│   ├── api/
│   │   ├── auth/[...all]/route.ts       # Better Auth API Route Endpoints
│   │   └── webhooks/resend/route.ts     # Inbound Email & Delivery Status Receiver
│   ├── globals.css                      # Tailwind CSS v4 Styling
│   ├── layout.tsx                       # Root Layout
│   └── page.tsx                         # Prerenderable Shell with Fast Client Redirect
├── components/
│   ├── inbox/                           # Support Inbox Interactive Widgets
│   │   ├── ThreadComposerTabs.tsx       # Dual-Mode Public Reply / Internal Note Composer
│   │   ├── ThreadWorkflowControls.tsx   # Status & Priority Controls + Agent Assignment
│   │   ├── DeliveryStatusBadge.tsx      # Real-Time Message Delivery Pills
│   │   ├── ThreadLiveRefresher.tsx      # Zero-Reload In-Thread Background Sync
│   │   ├── InboxLiveRefresher.tsx       # Zero-Reload Inbox List Background Sync
│   │   └── InboxThreadView.tsx          # Status Tabs, Agent Filter & Live Search
│   ├── templates/
│   │   └── TemplatesView.tsx            # Template Modal Manager & Variable Preview
│   ├── contacts/
│   │   └── ContactsView.tsx             # CRM Directory Table & Modal Editor
│   └── layout/
│       ├── Sidebar.tsx                  # Sidebar Navigation with Live Unread Counters
│       └── Topbar.tsx                   # Topbar Header Shell
├── lib/
│   ├── db/
│   │   ├── index.ts                     # PostgreSQL Connection Pool (pg + Drizzle)
│   │   ├── schema.ts                    # Complete Drizzle Relational Schema (9 Tables)
│   │   └── team.ts                      # Team Roster Seeding & Query Helpers
│   ├── email/
│   │   ├── send.ts                      # Outbound Send Action with Suppression Shield
│   │   ├── reply.ts                     # In-Thread Reply Engine with RFC 822 Headers
│   │   ├── senders.ts                   # Resend Domain Discovery & Identity Seeders
│   │   ├── inbound.ts                   # PostalMime Parsing & Smart Thread Matcher
│   │   ├── template-utils.ts            # Client-Safe Dynamic Regex Variable Interpolation
│   │   ├── templates.ts                 # Template Seeders & Database Queries
│   │   ├── transactional.ts             # Programmatic Transactional Dispatcher
│   │   └── inbox-actions.ts             # Status Transitions & Agent Assignment Actions
│   ├── auth.ts                          # Better Auth Configuration & Client
│   ├── resend.ts                        # Resend SDK Client Initialization
│   └── utils.ts                         # Tailwind CSS Utility Class Merging (clsx + twMerge)
├── middleware.ts                        # Edge Ingress Defense Shield (CVE-2026-111497)
├── docker-compose.yml                   # Multi-Service Docker Compose (Postgres + Web)
├── Dockerfile                           # Production Multi-Stage Standalone Dockerfile
├── .dockerignore                        # Docker Build Context Exclusions
├── drizzle.config.ts                    # Drizzle Kit Configuration
├── next.config.ts                       # Next.js 16 Configuration (PPR & Route Redirects)
├── package.json                         # Dependencies & Orchestration Scripts
└── tsconfig.json                        # TypeScript Configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: `v20.x` or later
- **Docker**: For running local PostgreSQL
- **Resend Account**: [resend.com](https://resend.com) with at least one verified domain

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/email-application.git
cd email-application
npm install
```

### 3. Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env.local
```

Configure your credentials in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/email_tool"

# Resend API Key & Webhook Secret
RESEND_API_KEY="re_your_api_key_here"
RESEND_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
EMAIL_FROM="Support <support@yourdomain.com>"

# Better Auth Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your_generated_random_secret_here"
```

> [!TIP]
> Generate a cryptographically secure secret for Better Auth via `openssl rand -hex 32`.

### 4. Database Setup & Docker Execution

#### Option A: Quickstart Full Stack with Docker Compose

Run the entire application (Next.js web app + PostgreSQL database) with a single command:

```bash
docker compose up -d
# or using the package.json shortcut:
npm run docker:up
```

#### Option B: Run Database Only for Local Development

Start just the PostgreSQL container:

```bash
docker compose up -d postgres
# or using the package.json shortcut:
npm run db:start
```

Apply database migrations:

```bash
npx drizzle-kit push
```

### 5. Start Development Server

Run the development server with Next.js Turbopack on your host:

```bash
npm run dev
```

Or run the fully automated stack (Docker Postgres + Next.js Turbopack + Cloudflare Tunnel):

```bash
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Default templates, sender identities, and team members will be seeded automatically.

---

## 🛠️ Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with Turbopack. |
| `npm run dev:all` | Concurrently starts Docker Postgres, Next.js dev server, and Cloudflare tunnel. |
| `npm run db:start` | Starts PostgreSQL container via `docker compose up -d postgres`. |
| `npm run db:stop` | Stops PostgreSQL container via `docker compose stop postgres`. |
| `npm run docker:up` | Boots the entire application stack (Next.js + Postgres) with Docker Compose. |
| `npm run docker:down` | Stops and removes Docker Compose containers and networks. |
| `npm run docker:build` | Rebuilds the production Next.js Docker image. |
| `npm run build` | Compiles an optimized production build with Next.js 16 Partial Prerendering. |
| `npm run start` | Boots the compiled production application on the host. |
| `npm run lint` | Runs ESLint across all codebase files. |

---

## 🔒 Security & Reliability Architecture

1. **Ingress Protection (Brotli Shield)**:
   [`middleware.ts`](file:///home/apon/Projects/email-application/middleware.ts) inspects inbound HTTP requests and rejects `Content-Encoding: br` with `415 Unsupported Media Type`, neutralizing potential Brotli decompressor buffer overflows (CVE-2026-111497) before payloads touch Node.js.
2. **Reputation Defense (Automated Suppression List)**:
   Every outbound send action checks the `suppressions` table. Addresses that generate hard bounces or spam complaints are flagged automatically via Resend webhooks and permanently blocked from future sends.
3. **MIME Parsing Isolation**:
   Inbound stream parsing uses `postal-mime` running in a dedicated server context, preventing raw email streams from polluting or breaking client bundles.
4. **Zero-Trust Inbound Tunneling**:
   Cloudflare Email Worker `email-dual-router` bifurcates incoming emails at the edge using `message.raw.tee()`, forwarding a copy to a backup Gmail inbox while simultaneously transmitting the raw MIME body to the Next.js webhook receiver over an encrypted tunnel.

---

## 📜 License

This project is open-source software licensed under the [MIT License](LICENSE).
