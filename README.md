# 📨 Resend Internal Email Application

> A production-grade, bidirectional support inbox and transactional email platform built with **Next.js 16 (Turbopack)**, **Resend**, **PostgreSQL (Drizzle ORM)**, and **Better Auth**.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.4-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Resend](https://img.shields.io/badge/Resend-API-black?style=flat-square)](https://resend.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

---

## 🌟 Key Features

### 📥 Real-Time Support Inbox
* **No-Reload Live Timeline**: Background synchronization detects incoming customer replies and delivery updates via tab focus and non-blocking polling, invoking Next.js router refresh with live toast notifications.
* **Unread Indicators & Counters**: Dynamic unread counter badges on the sidebar and visual blue indicator dots on threads. Opening a conversation automatically marks it as read.

### 🧵 Smart RFC 822 Inbound Threading
* **Native MIME Stream Parsing**: Integrates server-side RFC 822 MIME parsing (`postal-mime`) allowing Cloudflare Email Workers or webhooks to transmit raw streams without external dependencies.
* **Header Matching**: Automatically resolves conversations using `In-Reply-To` and `References` header chains, falling back to cleaned subject token matching.

### 📮 Multi-Identity & Multi-Domain Outbound
* **Dynamic Verified Domain Discovery**: Automatically queries verified Resend domains (`mail.yourdomain.com`, `outbound.yourdomain.com`).
* **Identity Registry**: Send outbound emails from any alias (`support@`, `contracts@`, `security@`, etc.) with customized display names.
* **Dynamic Reply Resolution**: In-thread replies automatically route through the exact mailbox address the customer messaged.

### 🛡️ Automated Suppression Protection
* **Reputation Defense**: Proactive debounced email checks in `/compose` and `/inbox/[threadId]` warn agents and disable send actions if an address has hard-bounced or filed a spam complaint.
* **Server-Side Enforcement**: Backend actions explicitly reject sends to suppressed addresses before network transmission.

### 👥 Ticket Workflows & Team Assignment
* **Status Transitions**: One-click segmented controls for `Open` $\leftrightarrow$ `Pending` $\leftrightarrow$ `Resolved` $\leftrightarrow$ `Closed` with live filter tabs.
* **Priority Management**: Color-coded badges for `Low`, `Normal`, `High`, and `Urgent` tickets.
* **Agent Assignment**: Assign tickets to team members or unassign with an interactive selector.

### 🔒 Private Team Internal Notes
* **Dual-Mode Composer**: 1-click toggle between public customer email replies and private internal team notes.
* **Interleaved Chronological Timeline**: Internal notes render with warm amber cards, author attribution, and privacy notices, stored in `internal_notes` and never exposed to customers.

### 📋 Reusable Canned Templates & Transactional Engine
* **Template Manager (`/templates`)**: Full management interface with dynamic variable interpolation (`{{customer_name}}`, `{{ticket_id}}`, `{{company}}`), live preview, and test delivery.
* **Quick Canned Insertion**: 1-click template insertion dropdowns in both `/compose` and `/inbox/[threadId]`.
* **Transactional Helper (`lib/email/transactional.ts`)**: Programmatic sending with template slug resolution, variable substitution, and `Idempotency-Key` duplicate protection.

### 📇 Customer CRM Directory (`/contacts`)
* **Customer Registry**: Tracks client profiles, organizations, phone numbers, and total conversation counts.
* **Quick Actions**: One-click compose shortcut and modal contact editor.

### 🛡️ Zero-Day Ingress Shield
* **Middleware Ingress Defense**: Intercepts and blocks incoming HTTP requests containing `Content-Encoding: br` with `415 Unsupported Media Type`, neutralizing CVE-2026-111497 before native decompressors execute.

---

## 📐 Architecture & Routing Topology

```mermaid
flowchart TD
    subgraph Outbound ["Outbound Pipeline"]
        Agent["Support Agent / App"] -->|Compose / Reply| AppSend["lib/email/send.ts"]
        AppSend -->|Check Suppressions| DB[(PostgreSQL)]
        AppSend -->|Send API Call| ResendAPI["Resend API"]
        ResendAPI -->|Deliver Email| CustomerInbox["Customer Inbox (Gmail/Outlook)"]
    end

    subgraph Inbound ["Inbound Dual-Routing Pipeline"]
        CustomerInbox -->|Customer Replies| CFRoute["Cloudflare Email Routing"]
        CFRoute -->|Triggers| Worker["Cloudflare Worker (email-dual-router)"]
        Worker -->|message.raw.tee()| Split{Stream Split}
        Split -->|Forward Original| ForwardMail["Backup Inbox (e.g. Gmail)"]
        Split -->|POST /api/webhooks/resend| AppWebhook["App Webhook Handler"]
        AppWebhook -->|MIME Parse & Thread Match| DB
        DB -->|Auto-Refresh UI| Agent
    end
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: `v20.x` or later
* **Docker**: For running local PostgreSQL
* **Resend Account**: [resend.com](https://resend.com) with a verified domain

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

Configure the variables in `.env.local`:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/email_tool"

# Resend API Key & Webhook Secret
RESEND_API_KEY="re_your_api_key_here"
RESEND_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
EMAIL_FROM="Support <support@yourdomain.com>"

# Better Auth
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your_generated_random_secret_here"
```

> Generate a random secret for Better Auth:
> ```bash
> openssl rand -hex 32
> ```

### 4. Database Setup

Start the PostgreSQL Docker container:
```bash
docker run -d \
  --name email-tool-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=email_tool \
  -p 5432:5432 \
  postgres:16
```

Apply database migrations:
```bash
npx drizzle-kit push
```

### 5. Start Development Server

Run the orchestrated development script:
```bash
npm run dev
```

Or run with automatic Docker startup and Cloudflare tunnel orchestration:
```bash
npm run dev:all
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with Turbopack. |
| `npm run dev:all` | Starts Docker database, Next.js dev server, and Cloudflare tunnel concurrently. |
| `npm run db:start` | Starts the `email-tool-postgres` Docker container. |
| `npm run db:stop` | Stops the `email-tool-postgres` Docker container. |
| `npm run build` | Compiles an optimized production build with Next.js 16 Partial Prerendering. |
| `npm run lint` | Runs ESLint across all files. |

---

## 🗄️ Database Schema Overview

* **`user` / `session` / `account`**: Authentication management powered by Better Auth.
* **`sender_identities`**: Configured outbound sending aliases across verified domains.
* **`contacts`**: Customer directory with company info, phone, and metadata.
* **`threads`**: Conversations with status (`open`, `pending`, `resolved`, `closed`), priority (`low`, `normal`, `high`, `urgent`), assignee, and unread flags.
* **`messages`**: Inbound and outbound emails with RFC headers (`Message-ID`, `In-Reply-To`, `References`) and delivery status tracking.
* **`attachments`**: Extracted MIME file attachments and secure storage URLs.
* **`internal_notes`**: Private team notes associated with conversation threads.
* **`templates`**: Reusable email templates with subject, body, and slug.
* **`suppressions`**: Hard bounce and spam complaint blocklist.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
