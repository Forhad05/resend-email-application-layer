"use client";

import { useState, useRef } from "react";
import { Paperclip, X, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { formatFileSize, MAX_ATTACHMENTS_TOTAL_BYTES } from "@/lib/email/attachment-utils";

interface AttachmentUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  compact?: boolean;
}

export function AttachmentUploader({
  files,
  onFilesChange,
  compact = false,
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  const handleAddFiles = (newFilesList: FileList | File[]) => {
    setError(null);
    const added: File[] = [];
    let currentTotal = totalBytes;

    for (let i = 0; i < newFilesList.length; i++) {
      const f = newFilesList[i];
      if (currentTotal + f.size > MAX_ATTACHMENTS_TOTAL_BYTES) {
        setError(
          `Adding "${f.name}" exceeds the maximum 25 MB total attachment limit.`
        );
        break;
      }
      added.push(f);
      currentTotal += f.size;
    }

    if (added.length > 0) {
      onFilesChange([...files, ...added]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setError(null);
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4 text-purple-500 shrink-0" />;
    }
    return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Drag & Drop Zone / Compact Attach Button */}
      {compact ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span>Attach files</span>
          </button>
          {files.length > 0 && (
            <span className="text-[11px] text-zinc-400">
              {files.length} {files.length === 1 ? "file" : "files"} (
              {formatFileSize(totalBytes)} / 25 MB)
            </span>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleAddFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
            isDragging
              ? "border-black dark:border-white bg-zinc-100/70 dark:bg-zinc-800/50"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30"
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <Paperclip className="h-4 w-4" />
            <span>
              Drag & drop attachments here, or{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 underline underline-offset-2">
                browse files
              </span>
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Supports PDFs, images, docs, and spreadsheets up to 25 MB total
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Attached Files List */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 shadow-xs"
            >
              {getFileIcon(file)}
              <span className="font-medium truncate max-w-[180px]">
                {file.name}
              </span>
              <span className="text-[10px] text-zinc-400">
                ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(idx);
                }}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
