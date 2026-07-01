import type { SavedEvaluation } from "../types";

interface RecapTableProps {
  savedEvaluations: SavedEvaluation[];
}

function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function RecapTable({ savedEvaluations }: RecapTableProps) {
  if (savedEvaluations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Aucune évaluation enregistrée pour le moment.
      </div>
    );
  }

  // Group by UE + date
  const groups = new Map<string, SavedEvaluation[]>();
  for (const ev of savedEvaluations) {
    const key = `${ev.ue || "—"}|||${ev.date || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }

  // Sort groups by date desc then UE
  const sortedGroups = [...groups.entries()].sort(([keyA], [keyB]) => {
    const [ueA, dateA] = keyA.split("|||");
    const [ueB, dateB] = keyB.split("|||");
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return ueA.localeCompare(ueB, "fr");
  });

  return (
    <div className="space-y-8 p-6">
      {sortedGroups.map(([key, evals]) => {
        const [ue, date] = key.split("|||");
        const sorted = [...evals].sort((a, b) =>
          `${a.student.nom} ${a.student.prenom}`.localeCompare(
            `${b.student.nom} ${b.student.prenom}`,
            "fr",
          ),
        );

        return (
          <div
            key={key}
            className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
          >
            <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-200">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-emerald-900">
                {ue}
              </h2>
              {date && (
                <p className="text-xs text-emerald-700 mt-0.5">{formatDate(date)}</p>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 text-left">Nom</th>
                  <th className="px-5 py-2 text-left">Prénom</th>
                  <th className="px-5 py-2 text-center">Note / 20</th>
                  <th className="px-5 py-2 text-center">Durée réelle</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((ev, idx) => (
                  <tr
                    key={ev.id}
                    className={`border-b border-slate-50 last:border-b-0 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-5 py-2.5 font-semibold text-slate-800">
                      {ev.student.nom}
                    </td>
                    <td className="px-5 py-2.5 text-slate-700">
                      {ev.student.prenom}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span
                        className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                          ev.total20 >= 10
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ev.total20.toFixed(1)} / 20
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center text-slate-600">
                      {formatDuration(ev.evaluationDurationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50">
                  <td colSpan={2} className="px-5 py-2 text-[11px] font-bold uppercase text-slate-400">
                    {sorted.length} étudiant{sorted.length > 1 ? "s" : ""}
                  </td>
                  <td className="px-5 py-2 text-center text-[11px] font-bold text-slate-500">
                    Moy. {(sorted.reduce((s, e) => s + e.total20, 0) / sorted.length).toFixed(1)} / 20
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
