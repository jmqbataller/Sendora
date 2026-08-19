import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const supabase = createAdminClient();

    const { data: file, error } = await supabase
      .from("files")
      .select("id, storage_path, expires_at, max_downloads, download_count")
      .eq("code", code)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (new Date(file.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This share link has expired." }, { status: 410 });
    }

    if (file.max_downloads !== null && file.download_count >= file.max_downloads) {
      return NextResponse.json({ error: "The download limit has been reached." }, { status: 410 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("sendora-files")
      .createSignedUrl(file.storage_path, 60, { download: true });

    if (signedError || !signed?.signedUrl) throw signedError || new Error("Could not create download URL.");

    const { error: updateError } = await supabase
      .from("files")
      .update({ download_count: file.download_count + 1 })
      .eq("id", file.id)
      .eq("download_count", file.download_count);

    if (updateError) throw updateError;
    return NextResponse.redirect(signed.signedUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Download unavailable." }, { status: 500 });
  }
}
