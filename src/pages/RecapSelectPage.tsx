import { useState } from "react";
import { ArrowLeft, BarChart2, Download } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { RecapTable } from "../components/RecapTable";
import { buildRecapXlsxBuffer } from "../utils/recapXlsx";
import { buildNotesPath, buildXlsxFileName, saveFileToFolder } from "../utils/exportFolder";
import { useDialogs } from "../hooks/useDialogs";

interface Props {
  onNavigate: (route: AppRoute) => void;
}

export function RecapSelectPage({ onNavigate }: Props) {
  const { configs, promotionsAvailable, getSessionForConfig } = useEvalStore();
  const { notify } = useDialogs();

  const [selectedPromo, setSelectedPromo] = useState<string>(promotionsAvailable[0] ?? "");

  const configsForPromo = configs.filter(c => !selectedPromo || c.promotion === selectedPromo);

  const [selectedEvalId, setSelectedEvalId] = useState<string>(configsForPromo[0]?.id ?? "");

  const selectedConfig = configs.find(c => c.id === selectedEvalId);
  const evals = selectedConfig?.savedEvaluations ?? [];

  const handleExport = async () => {
    if (evals.length === 0) { notify("Aucune évaluation à exporter.", "error"); return; }
    try {
      const buffer = await buildRecapXlsxBuffer(evals);
      const promo = selectedConfig?.promotion ?? "inconnu";
      const ue = selectedConfig?.ue ?? "recap";
      const date = evals[0]?.date ?? new Date().toISOString().split("T")[0];
      const sessionDate = selectedEvalId
        ? (getSessionForConfig(selectedEvalId)?.date ?? date)
        : date;
      const notesDir = buildNotesPath(promo, sessionDate, ue);
      const fileName = buildXlsxFileName(ue, promo, sessionDate);

      // Sauvegarde sur la clé USB via Tauri (non-bloquant si hors Tauri)
      try {
        await saveFileToFolder(notesDir, fileName, buffer);
        notify(`Récap exporté dans le dossier "${notesDir}" sur la clé.`, "success");
        return;
      } catch { /* hors Tauri — fallback navigateur */ }

      // Fallback : téléchargement navigateur
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${notesDir}_${fileName}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch {
      notify("Erreur lors de la génération du fichier Excel.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-800 px-6 py-3">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <div className="flex items-center gap-3">
          <img src={logoDataUri} alt="" className="h-7 w-auto brightness-0 invert opacity-70" />
          <span className="text-sm font-black uppercase tracking-wide text-white/70">Récapitulatif des notes</span>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={evals.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-400 disabled:opacity-40"
        >
          <Download size={13} /> Export .xlsx
        </button>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {/* Filtres */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Promotion</label>
            <select
              value={selectedPromo}
              onChange={e => {
                setSelectedPromo(e.target.value);
                const first = configs.find(c => !e.target.value || c.promotion === e.target.value);
                setSelectedEvalId(first?.id ?? "");
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            >
              <option value="">Toutes les promotions</option>
              {promotionsAvailable.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Unité d'enseignement</label>
            <select
              value={selectedEvalId}
              onChange={e => setSelectedEvalId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            >
              {configsForPromo.length === 0 && <option value="">Aucune évaluation</option>}
              {configsForPromo.map(c => (
                <option key={c.id} value={c.id}>
                  {c.promotion} — {c.ue || "U.E. sans nom"} ({c.savedEvaluations.length} notes)
                </option>
              ))}
            </select>
          </div>
        </div>

        {evals.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <BarChart2 size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400">
              {configs.length === 0
                ? "Aucune évaluation configurée."
                : "Aucune note enregistrée pour cette U.E."}
            </p>
          </div>
        ) : (
          <RecapTable savedEvaluations={evals} />
        )}
      </div>
    </div>
  );
}
