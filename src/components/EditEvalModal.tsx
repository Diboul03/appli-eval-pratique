import { useState } from "react";
import { X, Save } from "lucide-react";
import { computeTotal20 } from "../utils/scoring";
import type { SavedEvaluation, SubStatus } from "../types";

interface Props {
  ev: SavedEvaluation;
  onSave: (updated: SavedEvaluation) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: SubStatus; label: string; color: string }[] = [
  { value: "ACQUIS", label: "✓ Acquis", color: "bg-emerald-500 text-white" },
  { value: "EN_COURS", label: "~ En cours", color: "bg-amber-500 text-white" },
  { value: "NON_ACQUIS", label: "✗ Non acquis", color: "bg-red-500 text-white" },
];

export function EditEvalModal({ ev, onSave, onClose }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({ ...ev.scores });
  const [subChecks, setSubChecks] = useState<Record<string, Record<string, SubStatus>>>(
    JSON.parse(JSON.stringify(ev.subChecks ?? {}))
  );
  const [remarksPositive, setRemarksPositive] = useState(ev.remarksPositive ?? "");
  const [remarksImprovement, setRemarksImprovement] = useState(ev.remarksImprovement ?? "");

  const total20 = computeTotal20(ev.axes, scores);

  const handleSave = () => {
    const combined = [remarksPositive, remarksImprovement].filter(Boolean).join("\n\n");
    onSave({
      ...ev,
      scores,
      subChecks,
      total20,
      remarksPositive,
      remarksImprovement,
      remarks: combined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modifier l'évaluation</p>
            <p className="font-black uppercase text-slate-800">
              {ev.student.civilite} {ev.student.nom} {ev.student.prenom}
            </p>
            <p className="text-xs text-slate-400">{ev.ue}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Note live */}
        <div className={`mx-5 mt-4 rounded-xl px-4 py-2.5 text-center font-black text-lg ${total20 >= 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          Note : {total20.toFixed(2)} / 20
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Scores par axe */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes par axe</p>
            {ev.axes.map(axis => {
              const score = scores[axis.id] ?? 0;
              return (
                <div key={axis.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">{axis.label}</p>
                    <span className="text-xs font-bold text-indigo-600">{score} / {axis.max}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={axis.max}
                    step={0.5}
                    value={score}
                    onChange={e => setScores(prev => ({ ...prev, [axis.id]: parseFloat(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                  {/* Sous-indicateurs */}
                  {(axis.subItems ?? []).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(axis.subItems ?? []).map(si => {
                        const current = subChecks[axis.id]?.[si.id] ?? "";
                        return (
                          <div key={si.id}>
                            <p className="mb-1 text-[10px] text-slate-500">{si.label}</p>
                            <div className="flex gap-1">
                              {STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setSubChecks(prev => ({
                                    ...prev,
                                    [axis.id]: { ...(prev[axis.id] ?? {}), [si.id]: opt.value },
                                  }))}
                                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-opacity ${
                                    current === opt.value ? opt.color : "bg-slate-100 text-slate-400"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Commentaires */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Commentaires</p>
            <div>
              <label className="mb-1 block text-[10px] text-emerald-600 font-semibold">Points positifs</label>
              <textarea
                value={remarksPositive}
                onChange={e => setRemarksPositive(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-amber-600 font-semibold">Axes d'amélioration</label>
              <textarea
                value={remarksImprovement}
                onChange={e => setRemarksImprovement(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
            Annuler
          </button>
          <button type="button" onClick={handleSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500">
            <Save size={15} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
