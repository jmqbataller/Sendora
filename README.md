# Sendora

**Upload. Scan. Share.**

Sendora is a modern file-sharing app for quickly sharing images and videos through expiring links and QR codes.

## v0.1 features

- Drag-and-drop image/video upload
- Configurable expiry: 1 hour, 24 hours, 3 days, or 7 days
- Download limits: 1, 5, 10, 25, or unlimited
- Automatic share links
- Instant QR code generation
- Image and video preview page
- Private Supabase Storage bucket
- Server-generated signed download URLs
- Download counter and expiry enforcement
- Responsive landing page and share experience

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

## Roadmap

- Password-protected shares
- Delete-after-first-download mode
- User accounts and upload history
- File management dashboard
- Virus/malware scanning
- Scheduled cleanup of expired storage objects
- Share analytics
- Custom branded domains
