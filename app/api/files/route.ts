import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type CreateFileBody = {
  code?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storagePath?: string;
  expiresAt?: string;
  maxDownloads?: number | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateFileBody;
    const { code, originalName, mimeType, sizeBytes, storagePath, expiresAt, maxDownloads } = body;

    if (!code || !originalName || !mimeType || !sizeBytes || !storagePath || !expiresAt) {
      return NextResponse.json({ error: "Missing required file metadata." }, { status: 400 });
    }

    if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const maxMb = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB || 200);
    if (sizeBytes > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds the ${maxMb} MB limit.` }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("files").insert({
      code,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      storage_path: storagePath,
      expires_at: expiresAt,
      max_downloads: maxDownloads,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create the share record." }, { status: 500 });
  }
}
