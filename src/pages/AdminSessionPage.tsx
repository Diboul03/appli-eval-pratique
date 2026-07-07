import { useState, useRef, useEffect } from "react";
import { ArrowLeft, PlusCircle, Pencil, Trash2, BookOpen, Users, CheckCircle2, RotateCcw, Send, Database, FileText, X, Download, Upload } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute, EvalTemplate, SavedEvaluation } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { useDialogs } from "../hooks/useDialogs";
import { auditLog } from "../utils/auditLog";
import { generateId } from "../utils";
import { saveFileToFolder, sanitizeFolder } from "../utils/exportFolder";
import { EditEvalModal } from "../components/EditEvalModal";
import { RecapTable } from "../components/RecapTable";

interface Props {
  sessionId: string;
  onNavigate: (route: AppRoute) => void;
}

export function AdminSessionPage({ sessionId, onNavigate }: Props) {
  const store = useEvalStore();
  const { confirm, notify } = useDialogs();
  const session = store.getSession(sessionId);
  const configs = store.getConfigsForSession(sessionId);
  const templates = store.templates;

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(session?.name ?? "");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [editingEval, setEditingEval] = useState<SavedEvaluation | null>(null);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const importEvalRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showAddMenu]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Session introuvable.{" "}
        <button className="ml-2 underline" onClick={() => onNavigate({ page: "admin-home" })}>Retour</button>
      </div>
    );
  }

  const dateLabel = new Date(session.date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const totalEvals = configs.reduce((s, c) => s + c.savedEvaluations.length, 0);
  const hasOngoingEvals = totalEvals > 0;
  const publishedCount = configs.filter(c => c.published).length;

  const handleAddConfig = () => {
    setShowAddMenu(v => !v);
  };

  const handleNewBlank = () => {
    setShowAddMenu(false);
    auditLog("Ajouter UE dans session (nouveau)", session.name);
    onNavigate({ page: "admin-create", sessionId });
  };

  const handleFromTemplate = (templateId: string, templateName: string) => {
    setShowAddMenu(false);
    auditLog("Ajouter UE depuis modèle", `${session.name} → ${templateName}`);
    onNavigate({ page: "admin-create", sessionId, templateId });
  };

  const handleExportTemplate = async (tpl: EvalTemplate) => {
    const fileName = `Modèle ${sanitizeFolder(tpl.ue)}.json`;
    await saveFileToFolder("Modèles d'U.E.", fileName, JSON.stringify(tpl, null, 2));
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!importInputRef.current) return;
    importInputRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (!raw.ue || !Array.isArray(raw.axes)) throw new Error("Format invalide");
        const tpl: EvalTemplate = {
          id: generateId(),
          name: raw.name || raw.ue,
          ue: raw.ue,
          axes: raw.axes,
          drawEnabled: raw.drawEnabled ?? false,
          drawMode: raw.drawMode ?? "single",
          drawGroups: raw.drawGroups ?? [],
          drawSingles: raw.drawSingles ?? [],
          examDurationMinutes: raw.examDurationMinutes ?? 15,
          showFinalNoteToEvaluator: raw.showFinalNoteToEvaluator ?? false,
          showBaremeToEvaluator: raw.showBaremeToEvaluator ?? false,
          showPercentToEvaluator: raw.showPercentToEvaluator ?? false,
          createdAt: new Date().toISOString(),
        };
        store.createTemplateRaw(tpl);
        notify(`Modèle « ${tpl.name} » importé.`);
      } catch {
        notify("Fichier invalide — ce n'est pas un modèle Praxie.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveName = () => {
    if (nameValue.trim()) {
      store.updateSession(sessionId, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleToggleUePublished = async (cfg: ReturnType<typeof store.getConfigsForSession>[number]) => {
    const willPublish = !cfg.published;
    if (willPublish && cfg.savedEvaluations.length > 0) {
      const ok = await confirm({
        title: "Publier malgré des évaluations enregistrées ?",
        message: `Cette UE contient ${cfg.savedEvaluations.length} évaluation${cfg.savedEvaluations.length > 1 ? "s" : ""} déjà enregistrée${cfg.savedEvaluations.length > 1 ? "s" : ""}. Continuer ?`,
        confirmLabel: "Publier quand même",
        danger: false,
      });
      if (!ok) return;
    }
    store.toggleConfigPublished(cfg.id);
    auditLog(willPublish ? "Publier UE" : "Dépublier UE", `${session.name} → ${cfg.ue}`);
    notify(willPublish ? `"${cfg.ue || "UE"}" publiée — visible par les évaluateurs.` : `"${cfg.ue || "UE"}" masquée.`);
  };

  const handleResetSession = async () => {
    const ok = await confirm({
      title: "Réinitialiser toutes les évaluations ?",
      message: `Cela supprimera les ${totalEvals} évaluation${totalEvals > 1 ? "s" : ""} enregistrée${totalEvals > 1 ? "s" : ""} de cette session.\n\nLa configuration (UEs, étudiants, critères) est conservée.`,
      confirmLabel: "Réinitialiser",
      danger: true,
    });
    if (!ok) return;
    for (const cfg of configs) {
      store.updateConfig(cfg.id, { savedEvaluations: [], studentListValidated: cfg.studentListValidated });
    }
    if (session.published) store.updateSession(sessionId, { published: false });
    auditLog("Réinitialiser session", session.name);
    notify("Session réinitialisée.");
  };

  const handleDeleteSession = async () => {
    const ok = await confirm({
      title: "Supprimer cette session ?",
      message: `Supprimer la session "${session.name}" et toutes ses UEs ?\n\nCette action est irréversible.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    store.deleteSession(sessionId, true);
    auditLog("Supprimer session", session.name);
    onNavigate({ page: "admin-home" });
  };

  const handleExportSession = async () => {
    const payload = {
      type: "praxie-session",
      version: 1,
      exportedAt: new Date().toISOString(),
      session,
      configs,
    };
    const safeName = sanitizeFolder(session.name);
    const fileName = `Session_${safeName}_${session.date}.json`;
    await saveFileToFolder("Sessions Praxie", fileName, JSON.stringify(payload, null, 2));
    auditLog("Export session", session.name);
    notify(`Session exportée : ${fileName}`);
  };

  const handleEditEval = (ev: SavedEvaluation) => setEditingEval(ev);

  const handleSaveEditedEval = (updated: SavedEvaluation) => {
    const cfg = configs.find(c => c.savedEvaluations.some(e => e.id === updated.id));
    if (!cfg) return;
    const nextEvals = cfg.savedEvaluations.map(e => e.id === updated.id ? updated : e);
    store.updateConfig(cfg.id, { savedEvaluations: nextEvals });
    auditLog("Modifier éval", `${updated.student.nom} ${updated.student.prenom} — ${updated.ue}`);
    notify("Évaluation modifiée.");
    setEditingEval(null);
  };

  const handleExportEval = async (ev: SavedEvaluation) => {
    const payload = { type: "praxie-eval", version: 1, exportedAt: new Date().toISOString(), evaluation: ev };
    const safeName = sanitizeFolder(`${ev.student.nom}_${ev.student.prenom}`);
    const safeUe = sanitizeFolder(ev.ue);
    const fileName = `Eval_${safeUe}_${safeName}_${ev.date}.json`;
    await saveFileToFolder("Évaluations Praxie", fileName, JSON.stringify(payload, null, 2));
    notify(`Évaluation exportée : ${fileName}`);
  };

  const handleImportEval = (configId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const ref = importEvalRefs.current[configId];
    if (ref) ref.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (raw.type !== "praxie-eval" || !raw.evaluation) throw new Error("Format invalide");
        const ev: SavedEvaluation = { ...raw.evaluation, id: generateId() };
        const cfg = configs.find(c => c.id === configId);
        if (!cfg) return;
        store.updateConfig(configId, { savedEvaluations: [...cfg.savedEvaluations, ev] });
        auditLog("Import éval", `${ev.student.nom} ${ev.student.prenom} — ${ev.ue}`);
        notify(`Évaluation de ${ev.student.nom} ${ev.student.prenom} importée.`);
      } catch {
        notify("Fichier invalide — ce n'est pas une évaluation Praxie.", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <img src={praxieLogoDataUri} alt="Praxie" className="h-10 w-auto rounded-xl" />
        <button
          type="button"
          onClick={handleExportSession}
          title="Exporter cette session"
          className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
        >
          <Download size={13} /> Exporter
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {/* Titre session */}
        <div className="mb-6">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{dateLabel}</p>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-lg font-black text-slate-800 focus:border-amber-400 focus:outline-none"
                autoFocus
              />
              <button onClick={handleSaveName} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-400">✓</button>
              <button onClick={() => setEditingName(false)} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-100">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">{session.name}</h1>
              <button
                onClick={() => { setNameValue(session.name); setEditingName(true); }}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-slate-400">
            {configs.length} unité{configs.length !== 1 ? "s" : ""} d'enseignement
            {totalEvals > 0 && <span className="ml-2 text-emerald-600">· {totalEvals} éval{totalEvals > 1 ? "s" : ""} enregistrée{totalEvals > 1 ? "s" : ""}</span>}
          </p>
        </div>

        {/* Statut publication — agrégé */}
        <div className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 ${publishedCount > 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-100"}`}>
          {publishedCount > 0
            ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            : <Send size={20} className="shrink-0 text-slate-400" />
          }
          <div>
            <p className={`text-sm font-black uppercase tracking-wide ${publishedCount > 0 ? "text-emerald-700" : "text-slate-600"}`}>
              {publishedCount === 0
                ? "Aucune UE publiée"
                : publishedCount === configs.length
                  ? "Toutes les UEs publiées"
                  : `${publishedCount} / ${configs.length} UE${configs.length > 1 ? "s" : ""} publiée${publishedCount > 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-slate-400">
              {publishedCount > 0
                ? "Les UEs publiées sont visibles par les évaluateurs"
                : "Publiez chaque UE individuellement via son bouton dédié"}
            </p>
          </div>
        </div>

        {/* Liste des UEs */}
        <div className="mb-6 space-y-3">
          {configs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
              <p>Aucune UE configurée dans cette session.</p>
              <p className="mt-1 text-xs">Cliquez sur "Ajouter une UE" pour commencer.</p>
            </div>
          ) : (
            configs.map(cfg => {
              const done = cfg.savedEvaluations.length;
              const total = cfg.studentList.length;
              const allDone = total > 0 && done >= total;
              const noneStarted = done === 0;
              return (
                <div key={cfg.id} className="space-y-0">
                <div
                  className={`flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm ${expandedConfigId === cfg.id ? "rounded-b-none border-b-0" : ""} ${noneStarted ? "border-slate-200" : allDone ? "border-emerald-200" : "border-amber-200"}`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${allDone ? "bg-emerald-100 text-emerald-600" : noneStarted ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"}`}>
                    <BookOpen size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{cfg.promotion || "—"}</div>
                    <div className="truncate font-black uppercase tracking-wide text-slate-800">{cfg.ue || "U.E. sans nom"}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Users size={10} />{done}/{total} évalués</span>
                      {cfg.examDurationMinutes > 0 && <span>{cfg.examDurationMinutes} min</span>}
                      {cfg.bddSchedule && <span className="text-indigo-500">BDD ✓</span>}
                      {noneStarted && <span className="text-slate-300 italic">aucune éval en cours</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {cfg.savedEvaluations.length > 0 && (
                      <button
                        type="button"
                        title="Voir / modifier les évaluations"
                        onClick={() => setExpandedConfigId(expandedConfigId === cfg.id ? null : cfg.id)}
                        className={`rounded-lg p-2 text-xs font-bold transition-colors ${expandedConfigId === cfg.id ? "bg-indigo-100 text-indigo-600" : "text-slate-300 hover:bg-indigo-50 hover:text-indigo-500"}`}
                      >
                        Évals
                      </button>
                    )}
                    <button
                      type="button"
                      title={cfg.published ? "Dépublier cette UE" : "Publier cette UE"}
                      onClick={() => handleToggleUePublished(cfg)}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${cfg.published
                        ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                    >
                      {cfg.published ? "✓ Publiée" : "Publier"}
                    </button>
                    <button
                      type="button"
                      title="BDD de passage"
                      onClick={() => onNavigate({ page: "admin-bdd", preselectedConfigId: cfg.id })}
                      className="rounded-lg p-2 text-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Database size={15} />
                    </button>

                    {cfg.savedEvaluations.length > 0 ? (
                      <button
                        type="button"
                        title={`Modification impossible : ${cfg.savedEvaluations.length} évaluation(s) déjà validée(s)`}
                        disabled
                        className="rounded-lg p-2 cursor-not-allowed text-slate-200"
                      >
                        <Pencil size={15} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Modifier"
                        onClick={() => { auditLog("Modifier UE", cfg.ue); onNavigate({ page: "admin-edit", evalId: cfg.id, sessionId }); }}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {confirmDeleteId === cfg.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { store.deleteConfig(cfg.id); setConfirmDeleteId(null); auditLog("Supprimer UE", cfg.ue); }}
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
                        onClick={() => setConfirmDeleteId(cfg.id)}
                        className="rounded-lg p-2 text-slate-300 hover:bg-red-100 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Panneau évals dépliable */}
                {expandedConfigId === cfg.id && (
                  <div className={`rounded-b-2xl border border-t-0 bg-white shadow-sm overflow-hidden ${noneStarted ? "border-slate-200" : allDone ? "border-emerald-200" : "border-amber-200"}`}>
                    <RecapTable
                      savedEvaluations={cfg.savedEvaluations}
                      onDelete={evId => {
                        const nextEvals = cfg.savedEvaluations.filter(e => e.id !== evId);
                        store.updateConfig(cfg.id, { savedEvaluations: nextEvals });
                        auditLog("Supprimer éval", cfg.ue);
                      }}
                      onEdit={handleEditEval}
                      onExport={handleExportEval}
                    />
                    {/* Import éval */}
                    <div className="border-t border-slate-100 px-5 py-3">
                      <input
                        ref={el => { importEvalRefs.current[cfg.id] = el; }}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={e => handleImportEval(cfg.id, e)}
                      />
                      <button
                        type="button"
                        onClick={() => importEvalRefs.current[cfg.id]?.click()}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <Upload size={13} /> Importer une évaluation (.json)
                      </button>
                    </div>
                  </div>
                )}
                </div>
              );
            })
          )}
        </div>

        {/* Bouton ajouter UE */}
        <div ref={addMenuRef} className="relative">
          <button
            type="button"
            onClick={handleAddConfig}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 py-4 text-sm font-bold text-emerald-600 transition-all hover:border-emerald-500 hover:bg-emerald-100"
          >
            <PlusCircle size={18} />
            Ajouter une unité d'enseignement
          </button>
          {showAddMenu && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Choisir un point de départ</p>
                <button type="button" onClick={() => setShowAddMenu(false)} className="rounded-lg p-1 text-slate-300 hover:bg-slate-100">
                  <X size={14} />
                </button>
              </div>
              {/* Nouvelle vierge */}
              <button
                type="button"
                onClick={handleNewBlank}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <PlusCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Nouvelle UE vierge</p>
                  <p className="text-xs text-slate-400">Partir de zéro</p>
                </div>
              </button>
              {/* Modèles */}
              <div className="border-t border-slate-100 px-4 py-2">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Modèles enregistrés</p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {templates.map(tpl => (
                    <div key={tpl.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFromTemplate(tpl.id, tpl.name)}
                        className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                          <FileText size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{tpl.name}</p>
                          <p className="text-[10px] text-slate-400">{tpl.axes.length} axe{tpl.axes.length !== 1 ? "s" : ""} · {tpl.examDurationMinutes} min{tpl.drawEnabled ? " · Tirage ✓" : ""}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        title="Exporter ce modèle"
                        onClick={e => { e.stopPropagation(); handleExportTemplate(tpl); }}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-indigo-500"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Import */}
                <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportTemplate} />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Upload size={13} />
                  Importer un modèle (.json)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions session */}
        <div className="mt-10 space-y-3">
          {/* Réinitialiser */}
          {hasOngoingEvals && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">Réinitialiser la session</p>
              <p className="mb-3 text-xs text-amber-700">Efface toutes les évaluations enregistrées. La configuration (UEs, étudiants, critères) est conservée.</p>
              <button
                type="button"
                onClick={handleResetSession}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 border border-amber-300"
              >
                <RotateCcw size={13} /> Réinitialiser toutes les évaluations
              </button>
            </div>
          )}

          {/* Zone danger */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-500">Zone danger</p>
            <button
              type="button"
              onClick={handleDeleteSession}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 size={13} /> Supprimer cette session et toutes ses UEs
            </button>
          </div>
        </div>
      </main>

      {editingEval && (
        <EditEvalModal
          ev={editingEval}
          onSave={handleSaveEditedEval}
          onClose={() => setEditingEval(null)}
        />
      )}
    </div>
  );
}
