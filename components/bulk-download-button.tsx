"use client";

import { useState } from "react";
import { Archive, Download, LoaderCircle } from "lucide-react";
import { zip } from "fflate";

type BulkFile = {
  code: string;
  name: string;
  sizeBytes: number;
};

type BulkDownloadButtonProps = {
  files: BulkFile[];
  shareCode: string;
  totalBytes: number;
};

function uniqueName(name: string, used: Set<string>) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let counter = 2;
  let candidate = `${base} (${counter})${extension}`;

  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${extension}`;
  }

  used.add(candidate);
  return candidate;
}

export function BulkDownloadButton({ files, shareCode, totalBytes }: BulkDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState("");

  if (files.length < 2) return null;

  async function downloadAll() {
    setDownloading(true);
    setCompleted(0);
    setError("");

    try {
      const archiveFiles: Record<string, Uint8Array> = {};
      const usedNames = new Set<string>();

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const response = await fetch(`/api/files/${encodeURIComponent(file.code)}/download`, {
          method: "GET",
          redirect: "follow",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Could not download ${file.name}.`);
        }

        const data = new Uint8Array(await response.arrayBuffer());
        archiveFiles[uniqueName(file.name, usedNames)] = data;
        setCompleted(index + 1);
      }

      const zipped = await new Promise<Uint8Array>((resolve, reject) => {
        zip(archiveFiles, { level: 0 }, (zipError, data) => {
          if (zipError) reject(zipError);
          else resolve(data);
        });
      });

      const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Sendora-${shareCode}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Bulk download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const isLarge = totalBytes > 500 * 1024 * 1024;

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={downloadAll}
        disabled={downloading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {downloading ? <LoaderCircle className="size-4 animate-spin" /> : <Archive className="size-4" />}
        {downloading ? `Preparing ZIP ${completed}/${files.length}` : `Download all ${files.length} as ZIP`}
        {!downloading ? <Download className="size-4" /> : null}
      </button>

      {isLarge ? (
        <p className="mt-2 max-w-sm text-xs leading-5 text-amber-600">
          Large ZIP: your browser may need significant memory while preparing this download.
        </p>
      ) : null}

      {error ? <p className="mt-2 max-w-sm text-xs font-medium leading-5 text-rose-600">{error}</p> : null}
    </div>
  );
}
