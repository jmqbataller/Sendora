import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock3,
  Download,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Files,
  Film,
  Music,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { createAdminClient } from "@/lib/supabase/server";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index > -1 && index < name.length - 1 ? name.slice(index + 1).toLowerCase() : "";
}

function fileLabel(name: string, mimeType: string) {
  const extension = extensionOf(name);
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf" || ["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(extension)) return "Document";
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return "Archive";
  if (["html", "css", "js", "jsx", "ts", "tsx", "json", "xml", "py", "php", "java", "c", "cpp", "cs", "go", "rs", "sql"].includes(extension)) return "Code file";
  return extension ? `${extension.toUpperCase()} file` : "File";
}

function isPreviewable(name: string, mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType === "application/pdf" || extensionOf(name) === "pdf";
}

function FileIcon({ name, mimeType, compact = false }: { name: string; mimeType: string; compact?: boolean }) {
  const extension = extensionOf(name);
  const iconClass = compact ? "size-5" : "size-7";
  if (mimeType.startsWith("image/")) return <FileImage className={iconClass} />;
  if (mimeType.startsWith("video/")) return <Film className={iconClass} />;
  if (mimeType.startsWith("audio/")) return <Music className={iconClass} />;
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return <FileArchive className={iconClass} />;
  if (["html", "css", "js", "jsx", "ts", "tsx", "json", "xml", "py", "php", "java", "c", "cpp", "cs", "go", "rs", "sql"].includes(extension)) return <FileCode2 className={iconClass} />;
  if (mimeType === "application/pdf" || ["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(extension)) return <FileText className={iconClass} />;
  return <File className={iconClass} />;
}

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createAdminClient();

  // Files in the same share live under the same storage folder:
  // SHARECODE/001-..., SHARECODE/002-..., etc. This keeps old schemas compatible.
  const { data: sharedFiles, error: filesError } = await supabase
    .from("files")
    .select("code, original_name, mime_type, size_bytes, storage_path, expires_at, max_downloads, download_count")
    .like("storage_path", `${code}/%`)
    .order("storage_path", { ascending: true });

  if (filesError) {
    console.error("Could not load Sendora share:", filesError);
  }

  if (!sharedFiles || sharedFiles.length === 0) notFound();

  const totalBytes = sharedFiles.reduce((sum, file) => sum + Number(file.size_bytes), 0);
  const totalDownloads = sharedFiles.reduce((sum, file) => sum + Number(file.download_count), 0);
  const expiresAt = sharedFiles[0].expires_at;
  const expired = new Date(expiresAt).getTime() <= Date.now();
  const maxDownloads = sharedFiles[0].max_downloads;

  const previewFile = !expired
    ? sharedFiles.find(
        (file) =>
          isPreviewable(file.original_name, file.mime_type) &&
          (file.max_downloads === null || file.download_count < file.max_downloads),
      )
    : undefined;

  let previewUrl: string | null = null;
  if (previewFile) {
    const { data } = await supabase.storage.from("sendora-files").createSignedUrl(previewFile.storage_path, 300);
    previewUrl = data?.signedUrl || null;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between py-3">
          <Link href="/"><Logo /></Link>
          <Link href="/" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950">Send files</Link>
        </header>

        <div className="py-10 lg:py-14">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <ShieldCheck className="size-3.5" /> Shared with Sendora
                </span>
                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {sharedFiles.length} {sharedFiles.length === 1 ? "file" : "files"} shared with you
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">Open or download only the files you trust.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:min-w-[320px]">
                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <p className="text-xs font-medium text-slate-400">Total size</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatBytes(totalBytes)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <p className="text-xs font-medium text-slate-400">Downloads</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{totalDownloads} total</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-slate-500"><Clock3 className="size-4" /> Expires</span>
                    <span className="font-semibold text-slate-700">{new Date(expiresAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {expired ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-700">
                This Sendora share has expired. The files are no longer available for download.
              </div>
            ) : null}
          </div>

          {previewFile && previewUrl ? (
            <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Preview</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{previewFile.original_name}</p>
              </div>
              <div className="flex min-h-[300px] items-center justify-center bg-slate-100 p-4 sm:min-h-[420px]">
                {previewFile.mime_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={previewFile.original_name} className="max-h-[620px] max-w-full rounded-2xl object-contain shadow-sm" />
                ) : previewFile.mime_type.startsWith("video/") ? (
                  <video controls preload="metadata" className="max-h-[620px] w-full rounded-2xl bg-black shadow-sm">
                    <source src={previewUrl} type={previewFile.mime_type} />
                  </video>
                ) : previewFile.mime_type.startsWith("audio/") ? (
                  <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600"><Music className="size-5" /></div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{previewFile.original_name}</p><p className="mt-0.5 text-xs text-slate-400">Audio preview</p></div>
                    </div>
                    <audio controls preload="metadata" className="w-full"><source src={previewUrl} type={previewFile.mime_type} /></audio>
                  </div>
                ) : (
                  <iframe src={previewUrl} title={previewFile.original_name} className="h-[520px] w-full rounded-2xl bg-white shadow-sm" />
                )}
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Files className="size-4.5 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Files in this share</h2>
              </div>
              <span className="text-xs font-medium text-slate-400">{sharedFiles.length} / 100</span>
            </div>

            <div className="divide-y divide-slate-100">
              {sharedFiles.map((file, index) => {
                const limitReached = file.max_downloads !== null && file.download_count >= file.max_downloads;
                const unavailable = expired || limitReached;

                return (
                  <div key={file.code} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <FileIcon name={file.original_name} mimeType={file.mime_type} compact />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-xs font-semibold text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                          <p className="truncate text-sm font-semibold text-slate-800">{file.original_name}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {fileLabel(file.original_name, file.mime_type)} · {formatBytes(Number(file.size_bytes))} · {file.download_count}{file.max_downloads === null ? " / ∞" : ` / ${file.max_downloads}`} downloads
                        </p>
                      </div>
                    </div>

                    {unavailable ? (
                      <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-400 sm:min-w-28">
                        {expired ? "Expired" : "Limit reached"}
                      </span>
                    ) : (
                      <a
                        href={`/api/files/${file.code}/download`}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600 sm:min-w-28"
                      >
                        <Download className="size-4" /> Download
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Download limit is applied per file{maxDownloads === null ? " and is currently unlimited." : ` and is currently ${maxDownloads} per file.`}
          </p>
        </div>
      </div>
    </main>
  );
}
