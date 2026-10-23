import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==============================================================================
// AUTHENTICATION TABLES (Better Auth compatible)
// ==============================================================================

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("agent"), // 'admin' | 'agent'
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_user_email").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_session_user_id").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_account_user_id").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)]
);

// ==============================================================================
// CORE APPLICATION TABLES
// ==============================================================================

// Sender identities / mailboxes for outbound emails
export const senderIdentities = pgTable(
  "sender_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(), // e.g. "Contracts", "Support", "Mahafuzul"
    email: text("email").notNull().unique(), // e.g. "contracts@mail.yourdomain.com"
    domain: text("domain").notNull(), // e.g. "mail.yourdomain.com"
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sender_identities_email").on(table.email),
    index("idx_sender_identities_domain").on(table.domain),
  ]
);

// External contacts / customers
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    company: text("company"),
    phone: text("phone"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_contacts_email").on(table.email)]
);

// Email threads / conversations
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("open"), // 'open' | 'pending' | 'resolved' | 'closed'
    priority: text("priority").notNull().default("normal"), // 'low' | 'normal' | 'high' | 'urgent'

    // Assignment & Contact
    assignedTo: text("assigned_to").references(() => user.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    contactEmail: text("contact_email").notNull(),

    // Counters & State
    messageCount: integer("message_count").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    isRead: boolean("is_read").notNull().default(false),

    // Labels / Tags
    labels: text("labels").array().default([]),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_threads_status").on(table.status),
    index("idx_threads_assigned_to").on(table.assignedTo),
    index("idx_threads_last_message_at").on(table.lastMessageAt),
    index("idx_threads_contact_email").on(table.contactEmail),
  ]
);

// Individual emails inside a thread
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),

    direction: text("direction").notNull(), // 'inbound' | 'outbound'

    // Threading headers
    messageId: text("message_id"), // <unique@domain.com>
    inReplyTo: text("in_reply_to"),
    referencesHeader: text("references_header"),

    // Resend reference
    resendEmailId: text("resend_email_id"),

    // Addresses
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name"),
    toEmails: text("to_emails").array().notNull(),
    ccEmails: text("cc_emails").array().default([]),
    bccEmails: text("bcc_emails").array().default([]),
    replyTo: text("reply_to"),

    // Content
    subject: text("subject"),
    htmlBody: text("html_body"),
    textBody: text("text_body"),

    // Status
    status: text("status").notNull().default("received"),
    // 'received' | 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'

    // Metadata
    hasAttachments: boolean("has_attachments").notNull().default(false),
    isDraft: boolean("is_draft").notNull().default(false),

    // Who sent it (for outbound messages)
    sentBy: text("sent_by").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_messages_thread_id").on(table.threadId),
    index("idx_messages_message_id").on(table.messageId),
    index("idx_messages_resend_email_id").on(table.resendEmailId),
    index("idx_messages_created_at").on(table.createdAt),
    index("idx_messages_status").on(table.status),
  ]
);

// Attachments metadata
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    filename: text("filename").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),

    storagePath: text("storage_path"),
    resendUrl: text("resend_url"),

    contentId: text("content_id"),
    isInline: boolean("is_inline").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_attachments_message_id").on(table.messageId)]
);

// Suppressions list (hard bounces, complaints, unsubscribes)
export const suppressions = pgTable(
  "suppressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    reason: text("reason").notNull(), // 'hard_bounce' | 'complaint' | 'manual' | 'unsubscribe'
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_suppressions_email").on(table.email)]
);

// Reusable transactional templates
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // e.g. "password-reset"
    subject: text("subject").notNull(),
    description: text("description"),

    htmlBody: text("html_body"),
    textBody: text("text_body"),

    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_templates_slug").on(table.slug)]
);

// Internal notes on threads (private to team)
export const internalNotes = pgTable(
  "internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_internal_notes_thread_id").on(table.threadId)]
);

// ==============================================================================
// DRIZZLE RELATIONS
// ==============================================================================

export const userRelations = relations(user, ({ many }) => ({
  assignedThreads: many(threads),
  sentMessages: many(messages),
  internalNotes: many(internalNotes),
  createdTemplates: many(templates),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  threads: many(threads),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [threads.contactId],
    references: [contacts.id],
  }),
  assignee: one(user, {
    fields: [threads.assignedTo],
    references: [user.id],
  }),
  messages: many(messages),
  internalNotes: many(internalNotes),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
  sender: one(user, {
    fields: [messages.sentBy],
    references: [user.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));

export const internalNotesRelations = relations(internalNotes, ({ one }) => ({
  thread: one(threads, {
    fields: [internalNotes.threadId],
    references: [threads.id],
  }),
  author: one(user, {
    fields: [internalNotes.authorId],
    references: [user.id],
  }),
}));

