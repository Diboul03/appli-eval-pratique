import { UserCircle } from "lucide-react";

interface ExaminerStepProps {
  evaluatorFullName: string;
  total20: number;
  showFinalNote: boolean;
}

export function ExaminerStep({ evaluatorFullName, total20, showFinalNote }: ExaminerStepProps) {
  return (
    <>
      <h3 className="mb-2 flex items-center gap-1 text-xs font-extrabold uppercase text-slate-500">
        <UserCircle size={14} /> Formateur évaluateur
      </h3>
      <input
        readOnly
        value={evaluatorFullName}
        placeholder="Défini par admin"
        className="w-full rounded-lg border-2 border-slate-200 bg-slate-100 px-3 py-2 font-bold"
      />

      {showFinalNote && (
        <div
          className={`mt-4 rounded-xl border-2 px-4 py-2 text-center ${
            total20 < 10
              ? "border-red-500 bg-red-900/20 text-red-500"
              : "border-green-500 bg-green-900/20 text-green-500"
          }`}
        >
          <span className="block text-[10px] font-bold uppercase">Note Finale</span>
          <span className="text-3xl font-black">
            {total20.toFixed(1)} <small className="text-sm">/ 20</small>
          </span>
        </div>
      )}
    </>
  );
}
