import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Download, File, FileArchive, FileCode2, FileImage, FileText, Film, Music, ShieldCheck } from "lucide-react";
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

function FileIcon({ name, mimeType }: { name: string; mimeType: string }) {
  const extension = extensionOf(name);
  if (mimeType.startsWith("image/")) return <FileImage className="size-7" />;
  if (mimeType.startsWith("video/")) return <Film className="size-7" />;
  if (mimeType.startsWith("audio/")) return <Music className="size-7" />;
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return <FileArchive className="size-7" />;
  if (["html", "css", "js", "jsx", "ts", "tsx", "json", "xml", "py", "php", "java", "c", "cpp", "cs", "go", "rs", "sql"].includes(extension)) return <FileCode2 className="size-7" />;
  if (mimeType === "application/pdf" || ["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(extension)) return <FileText className="size-7" />;
  return <File className="size-7" />;
}

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createAdminClient();

  const { data: file } = await supabase
    .from("files")
    .select("original_name, mime_type, size_bytes, storage_path, expires_at, max_downloads, download_count")
    .eq("code", code)
    .single();

  if (!file) notFound();

  const expired = new Date(file.expires_at).getTime() <= Date.now();
  const limitReached = file.max_downloads !== null && file.download_count >= file.max_downloads;
  const unavailable = expired || limitReached;
  const canPreview = file.mime_type.startsWith("image/") || file.mime_type.startsWith("video/") || file.mime_type.startsWith("audio/") || file.mime_type === "application/pdf";

  let previewUrl: string | null = null;
  if (!unavailable && canPreview) {
    const { data } = await supabase.storage.from("sendora-files").createSignedUrl(file.storage_path, 300);
    previewUrl = data?.signedUrl || null;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between py-3">
          <Link href="/"><Logo /></Link>
          <Link href="/" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950">Send a file</Link>
        </header>

        <div className="grid gap-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start lg:py-16">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex min-h-[360px] items-center justify-center bg-slate-100 p-5 sm:min-h-[460px]">
              {previewUrl && file.mime_type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={file.original_name} className="max-h-[620px] max-w-full rounded-2xl object-contain shadow-sm" />
              ) : previewUrl && file.mime_type.startsWith("video/") ? (
                <video controls preload="metadata" className="max-h-[620px] w-full rounded-2xl bg-black shadow-sm">
                  <source src={previewUrl} type={file.mime_type} />
                </video>
              ) : previewUrl && file.mime_type.startsWith("audio/") ? (
                <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                  <Music className="mx-auto mb-5 size-12 text-blue-600" />
                  <audio controls preload="metadata" className="w-full">
                    <source src={previewUrl} type={file.mime_type} />
                  </audio>
                </div>
              ) : previewUrl && file.mime_type === "application/pdf" ? (
                <iframe src={previewUrl} title={file.original_name} className="h-[620px] w-full rounded-2xl bg-white" />
              ) : (
                <div className="max-w-md text-center">
                  <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                    <FileIcon name={file.original_name} mimeType={file.mime_type} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">{fileLabel(file.original_name, file.mime_type)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Browser preview isn&apos;t available for this format. You can still download the original file below.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><ShieldCheck className="size-3.5" /> Shared with Sendora</span>
            <h1 className="mt-5 break-words text-2xl font-semibold tracking-[-0.03em]">{file.original_name}</h1>
            <p className="mt-2 text-sm text-slate-500">{formatBytes(file.size_bytes)} · {fileLabel(file.original_name, file.mime_type)}</p>

            <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-slate-500"><Clock3 className="size-4" /> Expires</span><span className="font-semibold text-slate-700">{new Date(file.expires_at).toLocaleString()}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-slate-500"><Download className="size-4" /> Downloads</span><span className="font-semibold text-slate-700">{file.download_count}{file.max_downloads === null ? " / ∞" : ` / ${file.max_downloads}`}</span></div>
            </div>

            {unavailable ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-700">
                {expired ? "This share link has expired." : "This file has reached its download limit."}
              </div>
            ) : (
              <a href={`/api/files/${code}/download`} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600">
                <Download className="size-4.5" /> Download original file
              </a>
            )}

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">Only download files you trust. Unknown and executable formats are never previewed by Sendora.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
