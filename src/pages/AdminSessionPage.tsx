import { useState } from "react";
import { ArrowLeft, PlusCircle, Pencil, Trash2, BookOpen, Users, Eye } from "lucide-react";
import { logoDataUri } from "../assets/logo";
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
      <div className="flex min-h-screen items-center justify-center bg-slate-800 text-white/50">
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
    <div className="flex min-h-screen flex-col bg-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <img src={logoDataUri} alt="" className="h-8 w-auto brightness-0 invert opacity-70" />
        <div className="w-20" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {/* Titre session */}
        <div className="mb-6">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">{dateLabel}</p>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-lg font-black text-white focus:border-amber-400/60 focus:outline-none"
                autoFocus
              />
              <button onClick={handleSaveName} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-400">✓</button>
              <button onClick={() => setEditingName(false)} className="rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/5">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black uppercase tracking-tight text-white">{session.name}</h1>
              <button
                onClick={() => { setNameValue(session.name); setEditingName(true); }}
                className="rounded-lg p-1.5 text-white/20 hover:bg-white/5 hover:text-white/50"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-white/40">
            {configs.length} unité{configs.length !== 1 ? "s" : ""} d'enseignement
          </p>
        </div>

        {/* Liste des UEs */}
        <div className="mb-6 space-y-3">
          {configs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/30">
              <BookOpen size={32} className="mx-auto mb-3 opacity-20" />
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
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${allDone ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-400/10 text-indigo-400"}`}>
                    <BookOpen size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{cfg.promotion || "—"}</div>
                    <div className="truncate font-black uppercase tracking-wide text-white/90">{cfg.ue || "U.E. sans nom"}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-white/30">
                      <span className="flex items-center gap-1"><Users size={10} />{done}/{total} évalués</span>
                      {cfg.examDurationMinutes > 0 && <span>{cfg.examDurationMinutes} min</span>}
                      {cfg.bddSchedule && <span className="text-indigo-400">BDD ✓</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Aperçu"
                      onClick={() => onNavigate({ page: "admin-preview", config: cfg, backRoute: { page: "admin-session-detail", sessionId } })}
                      className="rounded-lg p-2 text-white/25 hover:bg-white/5 hover:text-white/60"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      title="Modifier"
                      onClick={() => { auditLog("Modifier UE", cfg.ue); onNavigate({ page: "admin-edit", evalId: cfg.id, sessionId }); }}
                      className="rounded-lg p-2 text-white/25 hover:bg-white/5 hover:text-white/60"
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
                          className="rounded-lg px-2 py-1 text-[10px] text-white/30 hover:bg-white/5"
                        >Annuler</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title="Supprimer"
                        onClick={() => setConfirmDeleteId(cfg.id)}
                        className="rounded-lg p-2 text-white/25 hover:bg-red-900/30 hover:text-red-400"
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
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 py-4 text-sm font-bold text-emerald-400 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/10"
        >
          <PlusCircle size={18} />
          Ajouter une unité d'enseignement
        </button>

        {/* Zone danger : supprimer la session */}
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-900/10 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-400/60">Zone danger</p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Supprimer la session "${session.name}" et toutes ses UEs ?`)) {
                store.deleteSession(sessionId, true);
                auditLog("Supprimer session", session.name);
                onNavigate({ page: "admin-home" });
              }
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-400/60 hover:bg-red-900/20 hover:text-red-400"
          >
            <Trash2 size={13} /> Supprimer cette session et toutes ses UEs
          </button>
        </div>
      </main>
    </div>
  );
}
