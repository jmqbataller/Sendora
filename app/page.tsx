import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Download,
  FileUp,
  Gauge,
  LockKeyhole,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { UploadCard } from "@/components/upload-card";

const steps = [
  { icon: FileUp, number: "01", title: "Choose your files", body: "Drop one file or a batch of up to 100 files and Sendora handles the rest." },
  { icon: Gauge, number: "02", title: "Set the limits", body: "Pick an expiry window and how many downloads are allowed for each file." },
  { icon: ScanLine, number: "03", title: "Share instantly", body: "One secure link and QR code opens the entire file collection." },
];

const features = [
  { icon: Clock3, title: "Auto-expiring shares", body: "Your whole share stops being available automatically after the window you choose." },
  { icon: Download, title: "Download controls", body: "Set a download cap per file or keep files available for your whole team." },
  { icon: QrCode, title: "Instant QR codes", body: "Every share gets a QR code so moving files from screen to phone takes seconds." },
  { icon: ShieldCheck, title: "Private by default", body: "Uploads live in private storage and are served through controlled share routes." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950">
      <header className="relative z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
            <a href="#how-it-works" className="transition hover:text-slate-950">How it works</a>
            <a href="#features" className="transition hover:text-slate-950">Features</a>
            <a href="#security" className="transition hover:text-slate-950">Security</a>
          </nav>
          <a
            href="#upload"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
          >
            Send files <ArrowRight className="size-4" />
          </a>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[4%] top-16 size-72 rounded-full bg-blue-200/35 blur-[110px]" />
          <div className="absolute right-[3%] top-24 size-80 rounded-full bg-indigo-200/30 blur-[120px]" />
          <div className="absolute left-1/2 top-0 h-px w-[88%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300/50 to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <Sparkles className="size-3.5" /> Up to 100 files in one share
            </div>
            <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[72px] lg:leading-[0.98]">
              Send files without the friction.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-500 sm:text-xl">
              Upload virtually any file type, bundle up to 100 files together, choose your limits, and share everything with one clean link or instant QR code.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-blue-600" /> Private storage</span>
              <span className="flex items-center gap-2"><Clock3 className="size-4 text-blue-600" /> Auto expiry</span>
              <span className="flex items-center gap-2"><QrCode className="size-4 text-blue-600" /> QR included</span>
            </div>
          </div>

          <div id="upload" className="relative scroll-mt-28">
            <div className="absolute -left-8 -top-8 hidden rounded-2xl border border-white bg-white/90 p-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:block float-soft">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="size-4.5" /></div>
                <div><p className="text-xs font-semibold text-slate-800">Private upload</p><p className="text-[11px] text-slate-400">Controlled access</p></div>
              </div>
            </div>
            <UploadCard />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200/70 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Simple by design</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">From your device to theirs in three steps.</h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {steps.map(({ icon: Icon, number, title, body }) => (
              <article key={number} className="group rounded-3xl border border-slate-200 bg-slate-50/60 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between">
                  <div className="grid size-11 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"><Icon className="size-5" /></div>
                  <span className="font-mono text-xs font-semibold text-slate-300">{number}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 leading-7 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <div className="sticky top-28">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Built for sharing</p>
              <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">The controls you need. Nothing you don&apos;t.</h2>
              <p className="mt-5 max-w-md leading-7 text-slate-500">Sendora keeps the workflow intentionally small so you can share one file or an entire batch without setting up a complicated workspace.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-10 grid size-11 place-items-center rounded-2xl bg-slate-950 text-white"><Icon className="size-5" /></div>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 leading-7 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32">
        <div className="relative overflow-hidden rounded-[36px] bg-slate-950 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute right-0 top-0 size-80 translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300"><ShieldCheck className="size-4" /> Share with control</p>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Your files don&apos;t need to live online forever.</h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-300">Set an expiry and a per-file download cap before you share. When a file reaches its limit, Sendora stops serving it.</p>
            </div>
            <a href="#upload" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50">
              Upload files <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <Logo />
          <p className="text-sm text-slate-400">Fast, private file sharing with limits built in.</p>
          <a href="https://github.com/jmqbataller/Sendora" className="text-sm font-medium text-slate-500 transition hover:text-slate-950">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
