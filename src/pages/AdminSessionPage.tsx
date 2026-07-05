import { useState } from "react";
import { ArrowLeft, PlusCircle, Pencil, Trash2, BookOpen, Users, Eye } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { auditLog } from "../utils/auditLog";

interface Props {
  sessionId: string;
  onNavigate: (route: AppRoute) => void;
}

export function AdminSessionPage({ sessionId, onNavigate }: Props) {
  const store = useEvalStore();
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
        <img src={praxieLogoDataUri} alt="Praxie" className="h-8 w-auto rounded-xl" />
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
          </p>
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
              return (
                <div
                  key={cfg.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${allDone ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}>
                    <BookOpen size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{cfg.promotion || "—"}</div>
                    <div className="truncate font-black uppercase tracking-wide text-slate-800">{cfg.ue || "U.E. sans nom"}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Users size={10} />{done}/{total} évalués</span>
                      {cfg.examDurationMinutes > 0 && <span>{cfg.examDurationMinutes} min</span>}
                      {cfg.bddSchedule && <span className="text-indigo-500">BDD ✓</span>}
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

        {/* Zone danger : supprimer la session */}
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-500">Zone danger</p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Supprimer la session "${session.name}" et toutes ses UEs ?`)) {
                store.deleteSession(sessionId, true);
                auditLog("Supprimer session", session.name);
                onNavigate({ page: "admin-home" });
              }
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 size={13} /> Supprimer cette session et toutes ses UEs
          </button>
        </div>
      </main>
    </div>
  );
}
