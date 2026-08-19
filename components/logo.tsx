import { Send } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-tight text-slate-950">
      <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white shadow-[0_8px_30px_rgba(15,23,42,0.16)]">
        <Send className="size-4.5" strokeWidth={2.2} />
      </span>
      <span className="text-lg">Sendora</span>
    </div>
  );
}
