import { HelpCircle } from "lucide-react";

interface ContextHelpProps {
  title?: string;
  lines: string[];
}

export function ContextHelp({ title, lines }: ContextHelpProps) {
  return (
    <div className="relative inline-flex items-center">
      <div className="group ml-1 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 hover:bg-slate-100">
        <HelpCircle size={12} />
        <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-50 shadow-lg group-hover:block">
          {title && <div className="mb-1 font-semibold text-slate-50">{title}</div>}
          <ul className="list-disc space-y-1 pl-4">
            {lines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
