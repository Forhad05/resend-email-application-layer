"use client";

import { useState, useTransition } from "react";
import {
  addSenderIdentityAction,
  deleteSenderIdentityAction,
  setDefaultSenderIdentityAction,
} from "./actions";
import {
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  Star,
  Loader2,
  AlertCircle,
  Globe,
} from "lucide-react";

interface SenderIdentity {
  id: string;
  name: string;
  email: string;
  domain: string;
  isDefault: boolean;
}

interface ResendDomain {
  id: string;
  name: string;
  status: string;
  region: string;
  sendingEnabled: boolean;
}

export function SenderManager({
  senders,
  domains,
}: {
  senders: SenderIdentity[];
  domains: ResendDomain[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [selectedDomain, setSelectedDomain] = useState(
    domains.length > 0 ? domains[0].name : "mail.systemdevify.com"
  );
  const [isDefault, setIsDefault] = useState(false);

  const handleAddSender = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("prefix", prefix);
    formData.append("domain", selectedDomain);
    if (isDefault) formData.append("isDefault", "on");

    startTransition(async () => {
      const res = await addSenderIdentityAction(formData);
      if (res.success) {
        setName("");
        setPrefix("");
        setIsDefault(false);
        setShowAddModal(false);
      } else {
        setError(res.error || "Failed to add sender identity.");
      }
    });
  };

  const handleDelete = (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteSenderIdentityAction(id);
      if (!res.success) {
        setError(res.error || "Failed to delete sender.");
      }
    });
  };

  const handleSetDefault = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await setDefaultSenderIdentityAction(id);
      if (!res.success) {
        setError(res.error || "Failed to set default sender.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:opacity-75"
          >
            ×
          </button>
        </div>
      )}

      {/* Senders Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Mail className="h-5 w-5 text-zinc-500" />
            Configured Mailbox Identities ({senders.length})
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            These mailboxes appear in your &quot;From:&quot; dropdown when composing emails.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>Add Mailbox</span>
        </button>
      </div>

      {/* Senders Table/List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
        {senders.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No sender identities configured yet. Click &quot;Add Mailbox&quot; to configure your first alias.
          </div>
        ) : (
          senders.map((sender) => (
            <div
              key={sender.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {sender.name}
                  </span>
                  {sender.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Default
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <Globe className="h-3 w-3" />
                    {sender.domain}
                  </span>
                </div>
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {sender.email}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {!sender.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(sender.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Star className="h-3.5 w-3.5" />
                    <span>Set Default</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(sender.id, sender.email)}
                  disabled={isPending}
                  className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                  title="Delete Mailbox"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Sender Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Add Sender Mailbox
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSender} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Sender / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal & Contracts, Support Team"
                  className="w-full text-sm px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Mailbox Prefix & Verified Domain
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    placeholder="e.g. contracts"
                    className="flex-1 text-sm px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white font-mono"
                  />
                  <span className="text-zinc-400 font-mono">@</span>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="text-sm px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none font-mono"
                  >
                    {domains.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                    {domains.length === 0 && (
                      <>
                        <option value="mail.systemdevify.com">mail.systemdevify.com</option>
                        <option value="outbound.systemdevify.com">outbound.systemdevify.com</option>
                      </>
                    )}
                  </select>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Preview: <span className="font-mono text-zinc-700 dark:text-zinc-300">{prefix || "name"}@{selectedDomain}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalIsDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-black focus:ring-black"
                />
                <label
                  htmlFor="modalIsDefault"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Set as default sender in compose form
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim() || !prefix.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Mailbox</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

