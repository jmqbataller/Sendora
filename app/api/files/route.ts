import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type ShareFileInput = {
  code?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storagePath?: string;
  position?: number;
};

type CreateShareBody = {
  shareCode?: string;
  files?: ShareFileInput[];
  expiresAt?: string;
  maxDownloads?: number | null;
};

const MAX_FILES_PER_SHARE = 100;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateShareBody;
    const { shareCode, files, expiresAt, maxDownloads } = body;

    if (!shareCode || !expiresAt || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "Missing required share metadata." }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_SHARE) {
      return NextResponse.json(
        { error: `A Sendora share can contain up to ${MAX_FILES_PER_SHARE} files.` },
        { status: 400 },
      );
    }

    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Invalid expiration date." }, { status: 400 });
    }

    if (maxDownloads !== null && maxDownloads !== undefined && (!Number.isInteger(maxDownloads) || maxDownloads < 1)) {
      return NextResponse.json({ error: "Invalid download limit." }, { status: 400 });
    }

    const maxMb = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB || 200);
    const maxBytes = maxMb * 1024 * 1024;

    for (const file of files) {
      if (!file.code || !file.originalName || !file.sizeBytes || !file.storagePath) {
        return NextResponse.json({ error: "One or more files have incomplete metadata." }, { status: 400 });
      }

      if (file.sizeBytes > maxBytes) {
        return NextResponse.json(
          { error: `${file.originalName} exceeds the ${maxMb} MB per-file limit.` },
          { status: 400 },
        );
      }
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("files")
      .select("id")
      .eq("share_code", shareCode)
      .limit(1);

    if (existing?.length) {
      return NextResponse.json({ error: "That share code is already in use. Please try again." }, { status: 409 });
    }

    const rows = files.map((file, index) => ({
      code: file.code,
      share_code: shareCode,
      position: Number.isInteger(file.position) ? file.position : index,
      original_name: file.originalName,
      mime_type: file.mimeType || "application/octet-stream",
      size_bytes: file.sizeBytes,
      storage_path: file.storagePath,
      expires_at: expiresAt,
      max_downloads: maxDownloads ?? null,
    }));

    const { error } = await supabase.from("files").insert(rows);
    if (error) throw error;

    return NextResponse.json({ ok: true, shareCode, fileCount: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create the share record." }, { status: 500 });
  }
}
