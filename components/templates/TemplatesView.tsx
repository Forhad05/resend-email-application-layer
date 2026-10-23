"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Plus,
  Send,
  Edit2,
  Trash2,
  X,
  Loader2,
  Eye,
  Code,
} from "lucide-react";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  sendTestTemplateEmailAction,
} from "@/app/(dashboard)/templates/actions";
import { interpolateTemplate } from "@/lib/email/template-utils";

export interface TemplateRecord {
  id: string;
  name: string;
  slug: string;
  subject: string;
  description: string | null;
  textBody: string | null;
  htmlBody: string | null;
  isActive: boolean;
}

interface TemplatesViewProps {
  initialTemplates: TemplateRecord[];
}

export function TemplatesView({ initialTemplates }: TemplatesViewProps) {
  const [templatesList] = useState<TemplateRecord[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states for Create Template
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [textBody, setTextBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();

  // Form states for Edit Template
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTextBody, setEditTextBody] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  // Test Send state
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestPending, startTestTransition] = useTransition();

  const openEdit = (tpl: TemplateRecord) => {
    setSelectedTemplate(tpl);
    setEditName(tpl.name);
    setEditSubject(tpl.subject);
    setEditDescription(tpl.description || "");
    setEditTextBody(tpl.textBody || "");
    setEditError(null);
  };

  const openPreview = (tpl: TemplateRecord) => {
    setPreviewTemplate(tpl);
    setTestStatus(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !subject.trim() || !textBody.trim()) {
      setCreateError("Please fill in all required fields.");
      return;
    }
    setCreateError(null);

    startCreateTransition(async () => {
      const res = await createTemplateAction({
        name,
        slug,
        subject,
        description,
        textBody,
      });

      if (res.success) {
        setIsCreateOpen(false);
        setName("");
        setSlug("");
        setSubject("");
        setDescription("");
        setTextBody("");
      } else {
        setCreateError(res.error || "Failed to create template.");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setEditError(null);

    startEditTransition(async () => {
      const res = await updateTemplateAction(selectedTemplate.id, {
        name: editName,
        subject: editSubject,
        description: editDescription,
        textBody: editTextBody,
      });

      if (res.success) {
        setSelectedTemplate(null);
      } else {
        setEditError(res.error || "Failed to update template.");
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    startEditTransition(async () => {
      await deleteTemplateAction(id);
    });
  };

  const handleTestSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewTemplate || !testEmail.trim()) return;
    setTestStatus(null);

    startTestTransition(async () => {
      const res = await sendTestTemplateEmailAction(previewTemplate.slug, testEmail);
      if (res.success) {
        setTestStatus("✅ Test email delivered successfully!");
      } else {
        setTestStatus(`❌ ${res.error || "Delivery failed"}`);
      }
    });
  };

  // Sample interpolated variables for preview
  const sampleVariables = {
    customer_name: "Mahafuzul Haq",
    company: "SystemDevify",
    ticket_id: "TICK-4029",
    agent_name: "Sarah Jenkins",
    support_email: "support@mail.systemdevify.com",
    reset_link: "https://mail.systemdevify.com/auth/reset?token=demo_token_123",
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Email Templates
          </h1>
          <p className="text-sm text-zinc-500">
            Reusable canned responses and transactional templates with dynamic variable interpolation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid gap-4 sm:grid-cols-2">
        {templatesList.map((tpl) => (
          <div
            key={tpl.id}
            className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>{tpl.name}</span>
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {tpl.slug}
                </span>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                {tpl.description || "Reusable template."}
              </p>

              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">Subject: </span>
                <span className="text-zinc-900 dark:text-zinc-100">{tpl.subject}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                <Code className="h-3 w-3" />
                Variables supported
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openPreview(tpl)}
                  className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                  title="Preview & Test Send"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(tpl)}
                  className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                  title="Edit Template"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tpl.id, tpl.name)}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete Template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview & Test Send Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Template Preview: {previewTemplate.name}
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  Slug: {previewTemplate.slug}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Interpolated Subject Preview */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs">
              <span className="font-bold text-zinc-500">Subject: </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {interpolateTemplate(previewTemplate.subject, sampleVariables)}
              </span>
            </div>

            {/* Body Preview */}
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
              {interpolateTemplate(previewTemplate.textBody || "", sampleVariables)}
            </div>

            {/* Test Send Form */}
            <form onSubmit={handleTestSend} className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Send a Live Test to:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
                <button
                  type="submit"
                  disabled={isTestPending || !testEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  {isTestPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Send Test</span>
                </button>
              </div>

              {testStatus && (
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pt-1">
                  {testStatus}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Edit Template
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Subject Line * (supports {"{{variable}}"})
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Body * (supports {"{{customer_name}}"}, {"{{company}}"}, {"{{ticket_id}}"})
                </label>
                <textarea
                  rows={6}
                  required
                  value={editTextBody}
                  onChange={(e) => setEditTextBody(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-y font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isEditPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create New Email Template
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                      }
                    }}
                    placeholder="e.g. Account Verification"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Slug * (unique identifier)
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="account-verification"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Please verify your {{company}} account"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief explanation of when to use this template"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Body *
                </label>
                <textarea
                  rows={6}
                  required
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Hi {{customer_name}},\n\nWelcome to {{company}}!\n\nBest regards,\n{{agent_name}}"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-y font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatePending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isCreatePending && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Create Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
