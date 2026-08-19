"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  FileImage,
  Film,
  Link2,
  LoaderCircle,
  QrCode,
  UploadCloud,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";

type UploadResult = {
  code: string;
  url: string;
};

const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB || 200);

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(8));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function UploadCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [expiresIn, setExpiresIn] = useState("3d");
  const [downloadLimit, setDownloadLimit] = useState("10");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const fileTypeLabel = useMemo(() => {
    if (!file) return "";
    return file.type.startsWith("video/") ? "Video" : "Image";
  }, [file]);

  function chooseFile(nextFile?: File) {
    setError("");
    setResult(null);
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/") && !nextFile.type.startsWith("video/")) {
      setError("Sendora currently accepts image and video files.");
      return;
    }

    if (nextFile.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is larger than the ${MAX_FILE_MB} MB upload limit.`);
      return;
    }

    setFile(nextFile);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  function expiryDate() {
    const now = new Date();
    const hours = expiresIn === "1h" ? 1 : expiresIn === "24h" ? 24 : expiresIn === "3d" ? 72 : 168;
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  }

  async function upload() {
    if (!file) return;
    setError("");
    setUploading(true);
    setProgress(12);

    try {
      if (!isConfigured) {
        throw new Error("Storage is not configured yet. Add the Supabase environment variables first.");
      }

      const supabase = createClient();
      const code = randomCode();
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const storagePath = `${code}/${crypto.randomUUID()}.${extension}`;

      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("sendora-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setProgress(76);

      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath,
          expiresAt: expiryDate(),
          maxDownloads: downloadLimit === "unlimited" ? null : Number(downloadLimit),
        }),
      });

      if (!response.ok) {
        await supabase.storage.from("sendora-files").remove([storagePath]);
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not create the share link.");
      }

      const siteUrl = window.location.origin;
      const url = `${siteUrl}/s/${code}`;
      setProgress(100);
      setResult({ code, url });
    } catch (uploadError) {
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
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Ready to share</h3>
              <p className="mt-1 text-sm text-slate-500">Anyone with this link or QR code can open your file.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResult(null);
                setProgress(0);
              }}
              className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Upload another file"
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
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">Expires: {expiresIn}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">
                  Downloads: {downloadLimit === "unlimited" ? "Unlimited" : downloadLimit}
                </span>
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
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-[22px] border border-dashed p-7 text-center transition sm:p-10 ${
          dragging
            ? "border-blue-500 bg-blue-50/70"
            : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/40"
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={onInput} className="hidden" />
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition group-hover:-translate-y-1 group-hover:shadow-md">
          <UploadCloud className="size-6" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">Drop a file here</h3>
        <p className="mt-1.5 text-sm text-slate-500">or click to browse from your device</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Images & videos</span>
          <span className="size-1 rounded-full bg-slate-300" />
          <span>Up to {MAX_FILE_MB} MB</span>
        </div>
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            {file.type.startsWith("video/") ? <Film className="size-5" /> : <FileImage className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{fileTypeLabel} · {formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setFile(null);
            }}
            className="grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Remove selected file"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Expires after</span>
          <div className="relative">
            <select
              value={expiresIn}
              onChange={(event) => setExpiresIn(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Download limit</span>
          <div className="relative">
            <select
              value={downloadLimit}
              onChange={(event) => setDownloadLimit(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{error}</p>}

      {uploading && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Uploading securely…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={!file || uploading}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {uploading ? <LoaderCircle className="size-4.5 animate-spin" /> : <UploadCloud className="size-4.5" />}
        {uploading ? "Uploading…" : "Upload & create link"}
      </button>

      <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
        Files are private by default and expire automatically based on your settings.
      </p>
    </div>
  );
}
