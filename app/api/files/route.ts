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

type DbError = {
  code?: string;
  message?: string;
};

const MAX_FILES_PER_SHARE = 100;

function mentionsColumn(error: DbError | null, column: string) {
  return Boolean(error?.message?.toLowerCase().includes(column.toLowerCase()));
}

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
    const expectedPrefix = `${shareCode}/`;

    for (const file of files) {
      if (!file.code || !file.originalName || !file.sizeBytes || !file.storagePath) {
        return NextResponse.json({ error: "One or more files have incomplete metadata." }, { status: 400 });
      }

      if (!file.storagePath.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: "Invalid storage path for this share." }, { status: 400 });
      }

      if (file.sizeBytes > maxBytes) {
        return NextResponse.json(
          { error: `${file.originalName} exceeds the ${maxMb} MB per-file limit.` },
          { status: 400 },
        );
      }
    }

    const supabase = createAdminClient();

    // A share is identified by its private storage folder. This works with both
    // the original Sendora schema and the newer optional share_code columns.
    const { data: existing, error: existingError } = await supabase
      .from("files")
      .select("id")
      .like("storage_path", `${shareCode}/%`)
      .limit(1);

    if (existingError) throw existingError;

    if (existing?.length) {
      return NextResponse.json({ error: "That share code is already in use. Please try again." }, { status: 409 });
    }

    const legacyRows = files.map((file) => ({
      code: file.code,
      original_name: file.originalName,
      mime_type: file.mimeType || "application/octet-stream",
      size_bytes: file.sizeBytes,
      storage_path: file.storagePath,
      expires_at: expiresAt,
      max_downloads: maxDownloads ?? null,
    }));

    const extendedRows = files.map((file, index) => ({
      ...legacyRows[index],
      share_code: shareCode,
      position: typeof file.position === "number" && Number.isInteger(file.position) ? file.position : index,
    }));

    let { error: insertError } = await supabase.from("files").insert(extendedRows);

    // Backward compatibility: older projects do not have share_code/position.
    // Retry against the original table shape instead of forcing a migration.
    if (insertError && (mentionsColumn(insertError, "share_code") || mentionsColumn(insertError, "position") || insertError.code === "PGRST204")) {
      const legacyAttempt = await supabase.from("files").insert(legacyRows);
      insertError = legacyAttempt.error;
    }

    if (insertError) {
      console.error("Sendora share insert failed:", insertError);
      return NextResponse.json(
        { error: "Could not save the share metadata. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, shareCode, fileCount: legacyRows.length });
  } catch (error) {
    console.error("Sendora share creation failed:", error);
    return NextResponse.json({ error: "Could not create the share record." }, { status: 500 });
  }
}
