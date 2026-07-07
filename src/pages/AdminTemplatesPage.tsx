import { useRef, useState } from "react";
import { ArrowLeft, Download, Upload, Trash2, Pencil, Check, X, FileText } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute, EvalTemplate } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { useDialogs } from "../hooks/useDialogs";
import { generateId } from "../utils";
import { saveFileToFolder, sanitizeFolder } from "../utils/exportFolder";

interface Props {
  onNavigate: (route: AppRoute) => void;
}

function validateTemplate(raw: unknown): raw is EvalTemplate {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return typeof r.ue === "string" && Array.isArray(r.axes);
}

function normalizeTemplate(raw: Record<string, unknown>): EvalTemplate {
  return {
    id: generateId(),
    name: typeof raw.name === "string" && raw.name ? raw.name : `Modèle ${raw.ue}`,
    ue: raw.ue as string,
    axes: raw.axes as EvalTemplate["axes"],
    drawEnabled: (raw.drawEnabled as boolean) ?? false,
    drawMode: (raw.drawMode as EvalTemplate["drawMode"]) ?? "single",
    drawGroups: (raw.drawGroups as EvalTemplate["drawGroups"]) ?? [],
    drawSingles: (raw.drawSingles as string[]) ?? [],
    examDurationMinutes: (raw.examDurationMinutes as number) ?? 15,
    showFinalNoteToEvaluator: (raw.showFinalNoteToEvaluator as boolean) ?? false,
    showBaremeToEvaluator: (raw.showBaremeToEvaluator as boolean) ?? false,
    showPercentToEvaluator: (raw.showPercentToEvaluator as boolean) ?? false,
    createdAt: new Date().toISOString(),
  };
}

export function AdminTemplatesPage({ onNavigate }: Props) {
  const store = useEvalStore();
  const { notify } = useDialogs();
  const importInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(store.templates.map(t => t.id)));
  const clearSelection = () => setSelected(new Set());

  const startEdit = (tpl: EvalTemplate) => {
    setEditingId(tpl.id);
    setEditName(tpl.name);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const tpl = store.getTemplate(editingId);
    if (!tpl) return;
    store.createTemplateRaw({ ...tpl, name: editName.trim() });
    store.deleteTemplate(editingId);
    setEditingId(null);
  };

  const handleExportSelected = async () => {
    const toExport = store.templates.filter(t => selected.has(t.id));
    if (toExport.length === 0) return;
    const content = JSON.stringify(toExport.length === 1 ? toExport[0] : toExport, null, 2);
    const fileName = toExport.length === 1
      ? `Modèle ${sanitizeFolder(toExport[0].ue)}.json`
      : `Modèles Praxie (${toExport.length}).json`;
    await saveFileToFolder("Modèles d'U.E.", fileName, content);
    notify(`${toExport.length === 1 ? "Modèle exporté" : `${toExport.length} modèles exportés`}.`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (importInputRef.current) importInputRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        const items: unknown[] = Array.isArray(raw) ? raw : [raw];
        let count = 0;
        for (const item of items) {
          if (validateTemplate(item)) {
            store.createTemplateRaw(normalizeTemplate(item as unknown as Record<string, unknown>));
            count++;
          }
        }
        if (count === 0) throw new Error("Aucun modèle valide");
        notify(`${count} modèle${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""}.`);
      } catch {
        notify("Fichier invalide — ce n'est pas un modèle Praxie.", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <img src={praxieLogoDataUri} alt="Praxie" className="h-8 w-auto" />
        <div className="w-24" />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Modèles d'U.E.</h1>
            <p className="mt-0.5 text-xs text-slate-400">Bibliothèque de configurations réutilisables</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50"
            >
              <Upload size={13} /> Importer
            </button>
          </div>
        </div>

        {store.templates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            <FileText size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">Aucun modèle enregistré</p>
            <p className="mt-1 text-xs">Créez un modèle depuis la configuration d'une UE, ou importez un fichier .json.</p>
          </div>
        ) : (
          <>
            {/* Barre de sélection / export */}
            <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selected.size === store.templates.length ? clearSelection : selectAll}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  {selected.size === store.templates.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
                {selected.size > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                    {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={handleExportSelected}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-30"
              >
                <Download size={13} />
                Exporter {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>

            <div className="space-y-2">
              {store.templates.map(tpl => (
                <div
                  key={tpl.id}
                  className={`flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                    selected.has(tpl.id) ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(tpl.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      selected.has(tpl.id)
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected.has(tpl.id) && <Check size={11} strokeWidth={3} />}
                  </button>

                  {/* Icône */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <FileText size={16} />
                  </div>

                  {/* Nom + infos */}
                  <div className="min-w-0 flex-1">
                    {editingId === tpl.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          className="flex-1 rounded-lg border border-indigo-300 px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          autoFocus
                        />
                        <button type="button" onClick={saveEdit} className="rounded-lg bg-indigo-500 p-1.5 text-white hover:bg-indigo-400"><Check size={12} /></button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={12} /></button>
                      </div>
                    ) : (
                      <p className="truncate text-sm font-bold text-slate-800">{tpl.name}</p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {tpl.axes.length} axe{tpl.axes.length !== 1 ? "s" : ""} · {tpl.examDurationMinutes} min
                      {tpl.drawEnabled ? " · Tirage ✓" : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  {editingId !== tpl.id && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Renommer"
                        onClick={() => startEdit(tpl)}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Pencil size={14} />
                      </button>
                      {confirmDeleteId === tpl.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { store.deleteTemplate(tpl.id); setConfirmDeleteId(null); setSelected(prev => { const n = new Set(prev); n.delete(tpl.id); return n; }); }}
                            className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-400"
                          >Confirmer</button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-100"
                          >Annuler</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="Supprimer"
                          onClick={() => setConfirmDeleteId(tpl.id)}
                          className="rounded-lg p-2 text-slate-300 hover:bg-red-100 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
