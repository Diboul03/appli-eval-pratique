import { MessageSquareMore, ThumbsUp, TrendingUp } from "lucide-react";

interface RemarksStepProps {
  positive: string;
  improvement: string;
  onChangePositive: (value: string) => void;
  onChangeImprovement: (value: string) => void;
}

export function RemarksStep({
  positive,
  improvement,
  onChangePositive,
  onChangeImprovement,
}: RemarksStepProps) {
  const positiveOk = positive.trim().length > 0;
  const improvementOk = improvement.trim().length > 0;

  return (
    <>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
        <MessageSquareMore size={16} /> Étape 4 — Commentaires (obligatoire)
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-slate-600">
            <ThumbsUp size={14} /> Points positifs
          </label>
          <textarea
            value={positive}
            onChange={e => onChangePositive(e.target.value)}
            placeholder="Points forts, réussites, éléments particulièrement satisfaisants..."
            className={`h-28 w-full rounded-xl border-2 p-3 text-sm ${
              positiveOk
                ? "border-slate-100 bg-slate-100"
                : "border-red-300 bg-emerald-100"
            }`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-slate-600">
            <TrendingUp size={14} /> Axes d'amélioration
          </label>
          <textarea
            value={improvement}
            onChange={e => onChangeImprovement(e.target.value)}
            placeholder="Ce qui reste à travailler, pistes de progression, recommandations..."
            className={`h-28 w-full rounded-xl border-2 p-3 text-sm ${
              improvementOk
                ? "border-slate-100 bg-slate-100"
                : "border-red-300 bg-emerald-100"
            }`}
          />
        </div>
      </div>
    </>
  );
}
