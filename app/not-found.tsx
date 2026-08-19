import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8fafc] px-5 py-10">
      <div className="w-full max-w-lg text-center">
        <div className="mb-10 flex justify-center"><Logo /></div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><FileQuestion className="size-6" /></div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">This file isn&apos;t here.</h1>
          <p className="mt-2 leading-7 text-slate-500">The link may be incorrect, expired, or the file may have been removed.</p>
          <Link href="/" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-blue-600"><ArrowLeft className="size-4" /> Back to Sendora</Link>
        </div>
      </div>
    </main>
  );
}
