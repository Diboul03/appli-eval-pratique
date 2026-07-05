import { useState } from "react";
import { ArrowLeft, PlusCircle, Pencil, Trash2, BookOpen, Users, Eye, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { useDialogs } from "../hooks/useDialogs";
import { auditLog } from "../utils/auditLog";

interface Props {
  sessionId: string;
  onNavigate: (route: AppRoute) => void;
}

export function AdminSessionPage({ sessionId, onNavigate }: Props) {
  const store = useEvalStore();
  const { confirm, notify } = useDialogs();
  const session = store.getSession(sessionId);
  const configs = store.getConfigsForSession(sessionId);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(session?.name ?? "");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleAddConfig = () => {
    const cfg = store.createConfigInSession(sessionId);
    auditLog("Ajouter UE dans session", `${session.name} → ${cfg.id}`);
    onNavigate({ page: "admin-edit", evalId: cfg.id, sessionId });
  };

  const handleSaveName = () => {
    if (nameValue.trim()) {
      store.updateSession(sessionId, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handlePublishToggle = async () => {
    if (!session.published) {
      // Publier
      if (hasOngoingEvals) {
        const ok = await confirm({
          title: "Publier malgré les évaluations en cours ?",
          message: `Cette session contient ${totalEvals} évaluation${totalEvals > 1 ? "s" : ""} enregistrée${totalEvals > 1 ? "s" : ""}.\n\nPublier signifie que cette session est prête pour les évaluateurs. Continuer ?`,
          confirmLabel: "Publier quand même",
          danger: false,
        });
        if (!ok) return;
      }
      store.updateSession(sessionId, { published: true });
      auditLog("Publier session", session.name);
      notify("Session publiée — visible par les évaluateurs.");
    } else {
      // Dépublier
      store.updateSession(sessionId, { published: false });
      auditLog("Dépublier session", session.name);
      notify("Session masquée pour les évaluateurs.");
    }
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <img src={praxieLogoDataUri} alt="Praxie" className="h-10 w-auto rounded-xl" />
        <div className="w-20" />
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

        {/* Statut publication */}
        <div className={`mb-6 flex items-center justify-between rounded-2xl border p-4 ${session.published ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-100"}`}>
          <div className="flex items-center gap-3">
            {session.published
              ? <CheckCircle2 size={22} className="text-emerald-600" />
              : <Send size={22} className="text-slate-400" />
            }
            <div>
              <p className={`text-sm font-black uppercase tracking-wide ${session.published ? "text-emerald-700" : "text-slate-600"}`}>
                {session.published ? "Session publiée" : "Session non publiée"}
              </p>
              <p className="text-xs text-slate-400">
                {session.published
                  ? "Visible par les évaluateurs · aucune évaluation non commencée attendue"
                  : "Invisible pour les évaluateurs jusqu'à la publication"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePublishToggle}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${session.published
              ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              : "bg-emerald-500 text-white hover:bg-emerald-400"
            }`}
          >
            {session.published ? "Dépublier" : "Publier →"}
          </button>
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
                <div
                  key={cfg.id}
                  className={`flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm ${noneStarted ? "border-slate-200" : allDone ? "border-emerald-200" : "border-amber-200"}`}
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
                    <button
                      type="button"
                      title="Aperçu"
                      onClick={() => onNavigate({ page: "admin-preview", config: cfg, backRoute: { page: "admin-session-detail", sessionId } })}
                      className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      title="Modifier"
                      onClick={() => { auditLog("Modifier UE", cfg.ue); onNavigate({ page: "admin-edit", evalId: cfg.id, sessionId }); }}
                      className="rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil size={15} />
                    </button>
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
              );
            })
          )}
        </div>

        {/* Bouton ajouter UE */}
        <button
          type="button"
          onClick={handleAddConfig}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 py-4 text-sm font-bold text-emerald-600 transition-all hover:border-emerald-500 hover:bg-emerald-100"
        >
          <PlusCircle size={18} />
          Ajouter une unité d'enseignement
        </button>

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
    </div>
  );
}
