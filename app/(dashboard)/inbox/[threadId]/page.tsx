import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  threads,
  messages,
  suppressions,
  internalNotes,
  user,
  attachments,
} from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { getTeamMembers } from "@/lib/db/team";
import { getTemplates } from "@/lib/email/templates";
import { ThreadComposerTabs } from "@/components/inbox/ThreadComposerTabs";
import { ThreadLiveRefresher } from "@/components/inbox/ThreadLiveRefresher";
import { ThreadWorkflowControls } from "@/components/inbox/ThreadWorkflowControls";
import { DeliveryStatusBadge } from "@/components/inbox/DeliveryStatusBadge";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  Lock,
  Paperclip,
  Download,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

type TimelineItem =
  | {
      type: "message";
      id: string;
      createdAt: Date;
      direction: string;
      fromEmail: string;
      fromName: string | null;
      toEmails: string[];
      status: string;
      textBody: string | null;
      htmlBody: string | null;
      resendEmailId: string | null;
    }
  | {
      type: "note";
      id: string;
      createdAt: Date;
      content: string;
      authorName: string | null;
      authorEmail: string | null;
    };

async function ThreadDetails({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const [thread] = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (!thread) {
    notFound();
  }

  const [suppressedRecord] = await db
    .select({ reason: suppressions.reason })
    .from(suppressions)
    .where(eq(suppressions.email, thread.contactEmail.toLowerCase()))
    .limit(1);

  const [teamMembers, templateList, messageList] = await Promise.all([
    getTeamMembers(),
    getTemplates(),
    db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt)),
  ]);

  const messageIds = messageList.map((m) => m.id);
  const attachmentList =
    messageIds.length > 0
      ? await db
          .select()
          .from(attachments)
          .where(inArray(attachments.messageId, messageIds))
      : [];

  const attachmentMap = new Map<string, typeof attachmentList>();
  for (const att of attachmentList) {
    const existing = attachmentMap.get(att.messageId) || [];
    existing.push(att);
    attachmentMap.set(att.messageId, existing);
  }

  const noteList = await db
    .select({
      id: internalNotes.id,
      content: internalNotes.content,
      createdAt: internalNotes.createdAt,
      authorName: user.name,
      authorEmail: user.email,
    })
    .from(internalNotes)
    .leftJoin(user, eq(internalNotes.authorId, user.id))
    .where(eq(internalNotes.threadId, threadId))
    .orderBy(asc(internalNotes.createdAt));

  // Merge messages and internal notes into a chronological timeline
  const timeline: TimelineItem[] = [
    ...messageList.map((m) => ({
      type: "message" as const,
      id: m.id,
      createdAt: m.createdAt,
      direction: m.direction,
      fromEmail: m.fromEmail,
      fromName: m.fromName,
      toEmails: m.toEmails,
      status: m.status,
      textBody: m.textBody,
      htmlBody: m.htmlBody,
      resendEmailId: m.resendEmailId,
    })),
    ...noteList.map((n) => ({
      type: "note" as const,
      id: n.id,
      createdAt: n.createdAt,
      content: n.content,
      authorName: n.authorName,
      authorEmail: n.authorEmail,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="space-y-6">
      {/* Thread Header Info & Workflow Controls */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-medium">
                {messageList.length}{" "}
                {messageList.length === 1 ? "message" : "messages"}
              </span>
              {noteList.length > 0 && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {noteList.length} {noteList.length === 1 ? "note" : "notes"}
                  </span>
                </>
              )}
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <ThreadLiveRefresher
                threadId={thread.id}
                initialMessageCount={thread.messageCount || messageList.length}
                initialLastMessageAt={thread.lastMessageAt?.toISOString() || null}
                isRead={thread.isRead}
              />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {thread.subject}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5">
              <span>Customer:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {thread.contactEmail}
              </span>
            </p>
          </div>

          <div className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Updated: {thread.lastMessageAt?.toLocaleString() ?? "N/A"}
            </span>
          </div>
        </div>

        {/* Interactive Ticket Workflow Bar (Status, Priority, Assignee) */}
        <ThreadWorkflowControls
          threadId={thread.id}
          currentStatus={thread.status}
          currentPriority={thread.priority}
          currentAssigneeId={thread.assignedTo}
          teamMembers={teamMembers}
        />
      </div>

      {/* Chronological Timeline: Messages + Team Internal Notes */}
      <div className="space-y-4">
        {timeline.map((item) => {
          if (item.type === "note") {
            return (
              <div
                key={item.id}
                className="rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-5 shadow-xs mx-3 sm:mx-8 transition-shadow"
              >
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 dark:border-amber-900/40 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                      <Lock className="h-3 w-3" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-amber-950 dark:text-amber-200">
                        {item.authorName || "Team Member"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">
                        Internal Note
                      </span>
                    </div>
                  </div>
                  <div className="text-amber-700/80 dark:text-amber-400/70">
                    {item.createdAt.toLocaleString()}
                  </div>
                </div>

                <div className="pt-3 text-sm text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-wrap font-sans">
                  {item.content}
                </div>

                <div className="mt-3 pt-2 flex items-center gap-1.5 text-[11px] text-amber-800/70 dark:text-amber-400/70 border-t border-amber-200/50 dark:border-amber-900/30">
                  <Lock className="h-3 w-3" />
                  <span>Private to team — never visible to the customer</span>
                </div>
              </div>
            );
          }

          const isOutbound = item.direction === "outbound";
          const messageAttachments = attachmentMap.get(item.id) || [];

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-5 transition-shadow ${
                isOutbound
                  ? "bg-zinc-50/70 border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800 ml-6 sm:ml-12"
                  : "bg-white border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 mr-6 sm:mr-12"
              }`}
            >
              {/* Message Meta */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isOutbound
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {isOutbound ? "YOU" : "CUST"}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {isOutbound
                        ? item.fromEmail
                        : item.fromName || item.fromEmail}
                    </span>
                    <span className="text-zinc-400 mx-1.5">→</span>
                    <span className="text-zinc-500">
                      {item.toEmails.join(", ")}
                    </span>
                  </div>
                </div>
                <div className="text-zinc-400">
                  {item.createdAt.toLocaleString()}
                </div>
              </div>

              {/* Message Body */}
              <div className="pt-3 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {item.textBody || item.htmlBody || "(No content)"}
              </div>

              {/* Attachments Section */}
              {messageAttachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                    <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Attachments ({messageAttachments.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {messageAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs"
                      >
                        <Paperclip className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                          {att.filename}
                        </span>
                        {att.sizeBytes && (
                          <span className="text-[10px] text-zinc-400">
                            ({(att.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        )}
                        {att.resendUrl && (
                          <a
                            href={att.resendUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status footer for outbound messages */}
              {isOutbound && (
                <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      Resend
                    </span>
                    <DeliveryStatusBadge status={item.status} />
                  </div>
                  {item.resendEmailId && (
                    <span className="font-mono text-[10px]">
                      ID: {item.resendEmailId}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dual Composer: Reply to Customer OR Write Internal Note with Quick Canned Templates */}
      <div className="pt-2">
        <ThreadComposerTabs
          threadId={thread.id}
          contactEmail={thread.contactEmail}
          isSuppressed={Boolean(suppressedRecord)}
          suppressionReason={suppressedRecord?.reason || null}
          templates={templateList.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            textBody: t.textBody,
          }))}
        />
      </div>
    </div>
  );
}

export default function ThreadPage({ params }: PageProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Inbox</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading conversation details...
          </div>
        }
      >
        <ThreadDetails params={params} />
      </Suspense>
    </div>
  );
}
