# Sendora

**Upload. Scan. Share.**

Sendora is a modern file-sharing app for sharing virtually any file type through expiring links and QR codes.

## v0.3 features

- Upload up to 100 files in one Sendora share
- One share link and QR code for the whole batch
- Drag-and-drop and multi-select upload for any file extension
- Images, videos, audio, PDFs, documents, archives, code files, installers, and more
- Configurable expiry: 1 hour, 24 hours, 3 days, or 7 days
- Download limits: 1, 5, 10, 25, or unlimited per file
- Automatic share links
- Instant QR code generation
- Batch recipient page with file count, total size, and individual downloads
- Browser previews for images, videos, audio, and PDFs
- Download-only handling for unsupported or executable formats
- Private Supabase Storage bucket
- Server-generated signed download URLs
- Original filenames preserved on download
- Download counter and expiry enforcement
- Responsive landing page and share experience
- Default 200 MB per-file limit, configurable with an environment variable

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase Database + Storage
- qrcode.react
- Lucide icons
- Vercel-ready

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. Open the Supabase SQL Editor and run `supabase/schema.sql`.

   Multi-file sharing does **not** require extra database columns. Sendora groups batch files using their private Storage folder, so projects created with the original `files` table remain compatible. Re-running the current schema is still recommended if your Storage bucket has the old image/video MIME allowlist.

4. Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_MAX_FILE_MB=200
```

5. Start Sendora:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

Import this repository into Vercel, add the same environment variables, and deploy.

> Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it with a `NEXT_PUBLIC_` prefix.

## Upload limits

- Maximum files per share: **100**
- Default maximum size per file: **200 MB**
- There is no app-level total batch-size cap, so your effective total upload capacity depends on your Supabase Storage quota, browser/network reliability, and hosting plan.

## Security note

Sendora accepts arbitrary file extensions, but unsupported or executable formats are not rendered as browser previews. Recipients should only download files they trust. For a public production service, malware scanning and abuse controls should be added before allowing unrestricted anonymous uploads at scale.

## Roadmap

- Download all files as ZIP
- Password-protected shares
- Delete-after-first-download mode
- User accounts and upload history
- File management dashboard
- Virus/malware scanning
- Scheduled cleanup of expired storage objects
- Share analytics
- Custom branded domains
