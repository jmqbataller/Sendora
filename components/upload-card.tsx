"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Film,
  Link2,
  LoaderCircle,
  Music,
  QrCode,
  UploadCloud,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";

type UploadResult = {
  shareCode: string;
  url: string;
  fileCount: number;
  totalBytes: number;
};

type UploadedFileRecord = {
  code: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  position: number;
};

const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB || 200);
const MAX_FILES = 100;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(8));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index > -1 && index < name.length - 1 ? name.slice(index + 1).toLowerCase() : "";
}

function fileKind(file: File) {
  const extension = extensionOf(file.name);
  if (file.type.startsWith("image/")) return "Image";
  if (file.type.startsWith("video/")) return "Video";
  if (file.type.startsWith("audio/")) return "Audio";
  if (file.type === "application/pdf" || ["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(extension)) return "Document";
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return "Archive";
  if (["html", "css", "js", "jsx", "ts", "tsx", "json", "xml", "py", "php", "java", "c", "cpp", "cs", "go", "rs", "sql"].includes(extension)) return "Code file";
  return extension ? `${extension.toUpperCase()} file` : "File";
}

function fileIdentity(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function FileTypeIcon({ file }: { file: File }) {
  const extension = extensionOf(file.name);
  if (file.type.startsWith("image/")) return <FileImage className="size-5" />;
  if (file.type.startsWith("video/")) return <Film className="size-5" />;
  if (file.type.startsWith("audio/")) return <Music className="size-5" />;
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return <FileArchive className="size-5" />;
  if (["html", "css", "js", "jsx", "ts", "tsx", "json", "xml", "py", "php", "java", "c", "cpp", "cs", "go", "rs", "sql"].includes(extension)) return <FileCode2 className="size-5" />;
  if (file.type === "application/pdf" || ["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(extension)) return <FileText className="size-5" />;
  return <File className="size-5" />;
}

export function UploadCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [expiresIn, setExpiresIn] = useState("3d");
  const [downloadLimit, setDownloadLimit] = useState("10");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function addFiles(nextFiles: File[]) {
    setError("");
    setResult(null);
    if (nextFiles.length === 0) return;

    const existing = new Set(files.map(fileIdentity));
    const unique = nextFiles.filter((file) => !existing.has(fileIdentity(file)));
    const oversized = unique.filter((file) => file.size > MAX_FILE_MB * 1024 * 1024);
    const valid = unique.filter((file) => file.size <= MAX_FILE_MB * 1024 * 1024);
    const availableSlots = Math.max(0, MAX_FILES - files.length);
    const accepted = valid.slice(0, availableSlots);
    const skippedForLimit = Math.max(0, valid.length - accepted.length);

    if (accepted.length > 0) {
      setFiles((current) => [...current, ...accepted]);
    }

    const messages: string[] = [];
    if (oversized.length > 0) messages.push(`${oversized.length} file${oversized.length === 1 ? " was" : "s were"} over ${MAX_FILE_MB} MB and skipped.`);
    if (skippedForLimit > 0) messages.push(`Sendora allows a maximum of ${MAX_FILES} files per share.`);
    if (unique.length === 0) messages.push("Those files are already in this share.");
    if (messages.length > 0) setError(messages.join(" "));
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function removeFile(index: number) {
    if (uploading) return;
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setError("");
  }

  function resetShare() {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setUploadedCount(0);
    setError("");
  }

  function expiryDate() {
    const now = new Date();
    const hours = expiresIn === "1h" ? 1 : expiresIn === "24h" ? 24 : expiresIn === "3d" ? 72 : 168;
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  }

  async function upload() {
    if (files.length === 0) return;

    setError("");
    setUploading(true);
    setProgress(2);
    setUploadedCount(0);

    const uploadedPaths: string[] = [];
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      if (!isConfigured) {
        throw new Error("Storage is not configured yet. Add the Supabase environment variables first.");
      }

      supabase = createClient();
      const shareCode = randomCode();
      const records: UploadedFileRecord[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const fileCode = randomCode();
        const rawExtension = extensionOf(file.name);
        const safeExtension = rawExtension.replace(/[^a-z0-9]/gi, "").slice(0, 24);
        const storagePath = `${shareCode}/${String(index + 1).padStart(3, "0")}-${crypto.randomUUID()}${safeExtension ? `.${safeExtension}` : ""}`;
        const mimeType = file.type || "application/octet-stream";

        const { error: uploadError } = await supabase.storage
          .from("sendora-files")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`);

        uploadedPaths.push(storagePath);
        records.push({
          code: fileCode,
          originalName: file.name,
          mimeType,
          sizeBytes: file.size,
          storagePath,
          position: index,
        });

        const completed = index + 1;
        setUploadedCount(completed);
        setProgress(Math.max(4, Math.round((completed / files.length) * 86)));
      }

      setProgress(92);
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareCode,
          files: records,
          expiresAt: expiryDate(),
          maxDownloads: downloadLimit === "unlimited" ? null : Number(downloadLimit),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not create the share link.");
      }

      const url = `${window.location.origin}/s/${shareCode}`;
      setProgress(100);
      setResult({ shareCode, url, fileCount: files.length, totalBytes });
    } catch (uploadError) {
      if (supabase && uploadedPaths.length > 0) {
        await supabase.storage.from("sendora-files").remove(uploadedPaths).catch(() => undefined);
      }
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (result) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-blue-100 blur-3xl" />
        <div className="relative">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Check className="size-3.5" /> Upload complete
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">{result.fileCount} {result.fileCount === 1 ? "file" : "files"} ready to share</h3>
              <p className="mt-1 text-sm text-slate-500">One link and QR code opens the entire Sendora share.</p>
            </div>
            <button
              type="button"
              onClick={resetShare}
              className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Create another share"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <Link2 className="size-3.5" /> Share link
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate rounded-xl bg-white px-3.5 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                  {result.url}
                </div>
                <button
                  type="button"
                  onClick={copyLink}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
                  aria-label="Copy share link"
                >
                  {copied ? <Check className="size-4.5" /> : <Copy className="size-4.5" />}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">{result.fileCount} {result.fileCount === 1 ? "file" : "files"}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">{formatBytes(result.totalBytes)}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">Expires: {expiresIn}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">Downloads/file: {downloadLimit === "unlimited" ? "Unlimited" : downloadLimit}</span>
              </div>
            </div>

            <div className="flex min-w-40 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-center">
                <QRCodeSVG value={result.url} size={112} level="M" />
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
                  <QrCode className="size-3.5" /> Scan to open
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-6">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-[22px] border border-dashed p-7 text-center transition sm:p-10 ${
          dragging
            ? "border-blue-500 bg-blue-50/70"
            : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/40"
        }`}
      >
        <input ref={inputRef} type="file" multiple onChange={onInput} className="hidden" />
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition group-hover:-translate-y-1 group-hover:shadow-md">
          <UploadCloud className="size-6" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">Drop up to 100 files here</h3>
        <p className="mt-1.5 text-sm text-slate-500">or click to select multiple files from your device</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span>Any file extension</span>
          <span className="size-1 rounded-full bg-slate-300" />
          <span>Max {MAX_FILES} files</span>
          <span className="size-1 rounded-full bg-slate-300" />
          <span>Up to {MAX_FILE_MB} MB each</span>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{files.length} / {MAX_FILES} files selected</p>
              <p className="mt-0.5 text-xs text-slate-400">{formatBytes(totalBytes)} total</p>
            </div>
            {!uploading ? (
              <button type="button" onClick={() => setFiles([])} className="text-xs font-semibold text-slate-500 transition hover:text-rose-600">
                Clear all
              </button>
            ) : null}
          </div>

          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {files.map((file, index) => (
              <div key={`${fileIdentity(file)}:${index}`} className="flex items-center gap-3 px-3.5 py-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <FileTypeIcon file={file} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{fileKind(file)} · {formatBytes(file.size)}</p>
                </div>
                {!uploading ? (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Expires after</span>
          <div className="relative">
            <select
              value={expiresIn}
              disabled={uploading}
              onChange={(event) => setExpiresIn(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
            >
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="3d">3 days</option>
              <option value="7d">7 days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Download limit per file</span>
          <div className="relative">
            <select
              value={downloadLimit}
              disabled={uploading}
              onChange={(event) => setDownloadLimit(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
            >
              <option value="1">1 download</option>
              <option value="5">5 downloads</option>
              <option value="10">10 downloads</option>
              <option value="25">25 downloads</option>
              <option value="unlimited">Unlimited</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
      </div>

      {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{error}</p> : null}

      {uploading ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <span>{uploadedCount < files.length ? `Uploading file ${uploadedCount + 1} of ${files.length}…` : "Creating share link…"}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={upload}
        disabled={files.length === 0 || uploading}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {uploading ? <LoaderCircle className="size-4.5 animate-spin" /> : <UploadCloud className="size-4.5" />}
        {uploading ? "Uploading…" : files.length === 1 ? "Upload file & create link" : `Upload ${files.length || ""} files & create link`}
      </button>

      <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
        Up to 100 files per share. Files stay private and expire automatically based on your settings.
      </p>
    </div>
  );
}
