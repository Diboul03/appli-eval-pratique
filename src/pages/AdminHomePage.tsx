import { useMemo, useRef, useState } from "react";
import { PlusCircle, CalendarDays, BarChart2, ArrowLeft, KeyRound, ClipboardList, History, Search, Users, BookOpen, CheckCircle2, Trash2, AlertTriangle, Database, RotateCcw, FileText, Upload } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute, EvalConfig, EvalSession } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { auditLog, getAuditLog, clearAuditLog } from "../utils/auditLog";
import type { AuditEntry } from "../utils/auditLog";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useDialogs } from "../hooks/useDialogs";

function StudentHistory({ configs }: { configs: EvalConfig[] }) {
  const [query, setQuery] = useState("");

  const allEvals = useMemo(() =>
    configs.flatMap(cfg =>
      cfg.savedEvaluations.map(ev => ({ ...ev, configUe: cfg.ue, configPromotion: cfg.promotion }))
    ),
    [configs]
  );

  const studentNames = useMemo(() => {
    const names = new Set<string>();
    allEvals.forEach(ev => names.add(`${ev.student.nom} ${ev.student.prenom}`));
    return [...names].sort((a, b) => a.localeCompare(b, "fr"));
  }, [allEvals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return studentNames.filter(n => n.toLowerCase().includes(q));
  }, [query, studentNames]);

  const selected = filtered.length === 1 ? filtered[0] : null;
  const history = useMemo(() => {
    if (!selected) return [];
    return allEvals
      .filter(ev => `${ev.student.nom} ${ev.student.prenom}` === selected)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [selected, allEvals]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <History size={12} /> Historique étudiant multi-UEs
      </p>
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un étudiant…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
        />
      </div>
      {query.trim() && filtered.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {filtered.map(name => (
            <button key={name} type="button" onClick={() => setQuery(name)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-100">
              {name}
            </button>
          ))}
        </div>
      )}
      {selected && history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-600">{selected} — {history.length} évaluation{history.length > 1 ? "s" : ""}</p>
          {history.map(ev => (
            <div key={ev.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ev.configPromotion}</div>
                <div className="text-sm font-semibold text-slate-700">{ev.configUe || ev.ue}</div>
                <div className="text-[10px] text-slate-400">{ev.date ? new Date(ev.date).toLocaleDateString("fr-FR") : "—"}</div>
              </div>
              <div className={`text-lg font-black tabular-nums ${ev.total20 >= 10 ? "text-emerald-600" : "text-red-500"}`}>
                {ev.total20.toFixed(1)}<span className="text-xs font-normal text-slate-400">/20</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && history.length === 0 && (
        <p className="text-center text-xs text-slate-400">Aucune évaluation enregistrée pour cet étudiant.</p>
      )}
    </div>
  );
}

interface Props {
  onNavigate: (route: AppRoute) => void;
}

export function AdminHomePage({ onNavigate }: Props) {
  const store = useEvalStore();
  const { configs, sessions, createSession, getConfigsForSession, deleteSession } = store;
  const { confirm, notify } = useDialogs();

  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const importSessionRef = useRef<HTMLInputElement>(null);
  const [adminPassword, setAdminPassword] = useLocalStorage<string>("adminPassword", "0405");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("adminAuth") === "1"
  );

  const validate = () => {
    if (code.trim() === adminPassword) {
      sessionStorage.setItem("adminAuth", "1");
      auditLog("Connexion admin");
      setAuthenticated(true);
      setError("");
      setCode("");
    } else {
      setError("Code incorrect");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <img src={praxieLogoDataUri} alt="Praxie" className="h-12 w-auto rounded-xl" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</span>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                <KeyRound size={26} className="text-amber-600" />
              </div>
              <h2 className="text-base font-black uppercase tracking-wide text-slate-800">Accès administrateur</h2>
              <p className="mt-1 text-xs text-slate-400">Saisissez le code pour continuer</p>
            </div>
            <input
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && validate()}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
              autoFocus
            />
            {error && <p className="mt-2 text-center text-xs font-semibold text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => onNavigate({ page: "home" })}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
                Retour
              </button>
              <button type="button" onClick={validate}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-400">
                Valider
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Données pour le récap de sortie ──────────────────────────────────────
  const sessionStats = sessions.map(s => {
    const cfgs = getConfigsForSession(s.id);
    const totalEvals = cfgs.reduce((acc, c) => acc + c.savedEvaluations.length, 0);
    const hasBdd = cfgs.some(c => c.bddSchedule && c.bddSchedule.length > 0);
    return { session: s, cfgs, totalEvals, hasBdd };
  });
  const publishedSessions = sessionStats.filter(s => s.session.published);
  const unpublishedSessions = sessionStats.filter(s => !s.session.published);
  const evalsInProgress = sessionStats.filter(s => s.totalEvals > 0 && !s.session.published);

  const handleClickAccueil = () => {
    if (sessions.length === 0) {
      sessionStorage.removeItem("adminAuth");
      onNavigate({ page: "home" });
      return;
    }
    setShowExitModal(true);
  };

  const handleExitAdmin = () => {
    sessionStorage.removeItem("adminAuth");
    setShowExitModal(false);
    onNavigate({ page: "home" });
  };

  const handleCreateSession = () => {
    if (!newSessionDate) return;
    const s = createSession(newSessionDate);
    auditLog("Créer session", s.name);
    setShowNewSession(false);
    onNavigate({ page: "admin-session-detail", sessionId: s.id });
  };

  const handleSavePassword = () => {
    if (currentPasswordInput.trim() !== adminPassword) { setPasswordError("Code actuel incorrect."); return; }
    if (newPassword.length < 4) { setPasswordError("Le nouveau code doit comporter au moins 4 caractères."); return; }
    if (newPassword !== newPasswordConfirm) { setPasswordError("Les codes ne correspondent pas."); return; }
    setAdminPassword(newPassword);
    setShowPasswordModal(false);
    setCurrentPasswordInput(""); setNewPassword(""); setNewPasswordConfirm(""); setPasswordError("");
    auditLog("Changement de code admin");
  };

  const handleImportSession = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (importSessionRef.current) importSessionRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (raw.type !== "praxie-session" || !raw.session || !Array.isArray(raw.configs)) throw new Error("Format invalide");
        const newSession = store.importSession(raw.session as EvalSession, raw.configs as EvalConfig[]);
        auditLog("Import session", newSession.name);
        notify(`Session « ${newSession.name} » importée.`);
        onNavigate({ page: "admin-session-detail", sessionId: newSession.id });
      } catch {
        notify("Fichier invalide — ce n'est pas une session Praxie.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteSessionInline = async (sessionId: string, sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Supprimer cette session ?",
      message: `Supprimer "${sessionName}" et toutes ses UEs ?\n\nCette action est irréversible.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    deleteSession(sessionId, true);
    auditLog("Supprimer session", sessionName);
  };

  const handleGlobalReset = async () => {
    const ok = await confirm({
      title: "Tout effacer ?",
      message: "Cette action supprime TOUTES les sessions, UEs, évaluations et BDD enregistrées dans l'application.\n\nLes modèles d'U.E. sont conservés.\n\nCette action est irréversible.",
      confirmLabel: "Tout effacer",
      danger: true,
    });
    if (!ok) return;
    for (const s of sessions) {
      deleteSession(s.id, true);
    }
    auditLog("Réinitialisation globale de l'application");
    notify("Toutes les données ont été supprimées.");
  };

  // Tri : publiées en premier, puis non publiées, dans chaque groupe par date décroissante
  const sortedSessions = [
    ...sessionStats.filter(s => s.session.published),
    ...sessionStats.filter(s => !s.session.published),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <button type="button" onClick={handleClickAccueil}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300">
          <ArrowLeft size={15} /> Accueil
        </button>
        <div className="flex items-center gap-3">
          <img src={praxieLogoDataUri} alt="Praxie" className="h-12 w-auto rounded-xl" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</span>
        </div>
        <button type="button"
          onClick={() => { setNewPassword(""); setNewPasswordConfirm(""); setPasswordError(""); setShowPasswordModal(true); }}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Changer le mot de passe">
          <KeyRound size={15} />
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-700">Sessions d'évaluation</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onNavigate({ page: "admin-templates" })}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100">
              <FileText size={13} /> Modèles
            </button>
            <button type="button" onClick={() => onNavigate({ page: "admin-recap" })} disabled={configs.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-100 disabled:opacity-30">
              <BarChart2 size={13} /> Récap notes
            </button>
          </div>
        </div>

        {/* Nouvelle session */}
        <button type="button" onClick={() => setShowNewSession(true)}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 py-5 text-sm font-bold text-emerald-600 transition-all hover:border-emerald-500 hover:bg-emerald-100">
          <PlusCircle size={20} /> Nouvelle session d'évaluation
        </button>

        {/* Liste des sessions */}
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
            <p>Aucune session créée.</p>
            <p className="mt-1 text-xs">Cliquez sur "Nouvelle session" pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unpublishedSessions.length > 0 && publishedSessions.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                Sessions publiées
              </p>
            )}
            {sortedSessions.map(({ session, cfgs, totalEvals, hasBdd }, idx) => {
              const totalStudents = cfgs.reduce((s, c) => s + c.studentList.length, 0);
              const dateLabel = new Date(session.date + "T00:00:00").toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              });
              const allDone = totalStudents > 0 && totalEvals >= totalStudents;
              // Séparateur entre publiées et non-publiées
              const prevPublished = idx > 0 ? sortedSessions[idx - 1].session.published : null;
              const showSeparator = idx > 0 && prevPublished && !session.published;

              return (
                <div key={session.id}>
                  {showSeparator && (
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      Sessions non publiées
                    </p>
                  )}
                  <div className={`flex items-center gap-3 rounded-2xl border bg-white shadow-sm transition-all ${
                    session.published ? "border-emerald-200" : "border-slate-200"
                  }`}>
                    {/* Zone cliquable principale */}
                    <button type="button"
                      onClick={() => onNavigate({ page: "admin-session-detail", sessionId: session.id })}
                      className="flex flex-1 items-center gap-4 rounded-l-2xl p-4 text-left hover:bg-slate-50 active:scale-[0.99]">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        session.published ? "bg-emerald-100 text-emerald-600"
                        : allDone ? "bg-indigo-100 text-indigo-600"
                        : "bg-amber-100 text-amber-600"
                      }`}>
                        <CalendarDays size={22} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate font-black uppercase tracking-wide text-slate-800">{session.name}</span>
                          {session.published && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 size={10} /> Publiée
                            </span>
                          )}
                          {hasBdd && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                              <Database size={10} /> BDD
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{dateLabel}</div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1"><BookOpen size={10} />{cfgs.length} UE{cfgs.length !== 1 ? "s" : ""}</span>
                          <span className="flex items-center gap-1"><Users size={10} />{totalEvals}/{totalStudents} évalués</span>
                          {totalEvals === 0 && totalStudents > 0 && <span className="italic text-slate-300">aucune éval</span>}
                        </div>
                      </div>
                    </button>

                    {/* Actions inline */}
                    <div className="flex shrink-0 items-center gap-1 pr-3">
                      <button type="button" title="Supprimer la session"
                        onClick={e => handleDeleteSessionInline(session.id, session.name, e)}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Historique étudiant multi-UEs */}
        {configs.some(c => c.savedEvaluations.length > 0) && (
          <StudentHistory configs={configs} />
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <input ref={importSessionRef} type="file" accept=".json" className="hidden" onChange={handleImportSession} />
          <button type="button" onClick={() => importSessionRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
            <Upload size={13} /> Importer session
          </button>
          <button type="button" onClick={() => { setAuditEntries(getAuditLog()); setShowAudit(true); }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <ClipboardList size={13} /> Journal d'activité
          </button>
        </div>

        {/* Zone danger — réinitialisation globale */}
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-500">Zone danger</p>
          <p className="mb-3 text-xs text-red-700">Supprime toutes les sessions, UEs, évaluations et BDD. Les modèles d'U.E. sont conservés.</p>
          <button type="button" onClick={handleGlobalReset}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
            <RotateCcw size={13} /> Tout effacer
          </button>
        </div>
      </main>

      {/* Modal récap sortie admin */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-700">Quitter le mode admin</h2>
            <div className="space-y-2 mb-5">
              {publishedSessions.length > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-800">
                    <strong>{publishedSessions.length}</strong> session{publishedSessions.length > 1 ? "s" : ""} publiée{publishedSessions.length > 1 ? "s" : ""} — visible{publishedSessions.length > 1 ? "s" : ""} par les évaluateurs
                  </span>
                </div>
              )}
              {unpublishedSessions.length > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                  <span className="text-sm text-amber-800">
                    <strong>{unpublishedSessions.length}</strong> session{unpublishedSessions.length > 1 ? "s" : ""} non publiée{unpublishedSessions.length > 1 ? "s" : ""} — invisibles pour les évaluateurs
                  </span>
                </div>
              )}
              {evalsInProgress.length > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2">
                  <Users size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-sm text-indigo-800">
                    Des évaluations sont en cours dans {evalsInProgress.length} session{evalsInProgress.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {sessions.length > 0 && publishedSessions.length === 0 && evalsInProgress.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2">
                  <CalendarDays size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-600">Aucune session publiée pour les évaluateurs.</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowExitModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
                Rester
              </button>
              <button type="button" onClick={handleExitAdmin}
                className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-bold text-white hover:bg-slate-600">
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouvelle session */}
      {showNewSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNewSession(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-600">Nouvelle session d'évaluation</h2>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Date de la session</label>
              <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateSession(); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-800 focus:border-emerald-400 focus:outline-none"
                autoFocus />
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowNewSession(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-100">Annuler</button>
              <button onClick={handleCreateSession} disabled={!newSessionDate} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-30">Créer →</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal changement MDP */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowPasswordModal(false); setCurrentPasswordInput(""); setNewPassword(""); setNewPasswordConfirm(""); setPasswordError(""); }}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <KeyRound size={18} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Changer le code admin</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Code actuel</label>
                <input type="password" value={currentPasswordInput} onChange={e => { setCurrentPasswordInput(e.target.value); setPasswordError(""); }}
                  placeholder="••••" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none" autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nouveau code</label>
                <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }}
                  placeholder="••••" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirmer le code</label>
                <input type="password" value={newPasswordConfirm} onChange={e => { setNewPasswordConfirm(e.target.value); setPasswordError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleSavePassword(); }}
                  placeholder="••••" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none" />
              </div>
            </div>
            {passwordError && <p className="mt-2 text-xs font-semibold text-red-600">{passwordError}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => { setShowPasswordModal(false); setCurrentPasswordInput(""); setNewPassword(""); setNewPasswordConfirm(""); setPasswordError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-100">Annuler</button>
              <button onClick={handleSavePassword} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-400">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal journal d'audit */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Journal d'activité admin</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => { clearAuditLog(); setAuditEntries([]); }}
                  className="rounded-lg px-3 py-1 text-xs text-red-500 hover:bg-red-50">Effacer</button>
                <button type="button" onClick={() => setShowAudit(false)}
                  className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-100">Fermer</button>
              </div>
            </div>
            {auditEntries.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Aucune entrée</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {auditEntries.map((e, i) => {
                  const d = new Date(e.ts);
                  const fmt = `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="shrink-0 text-[10px] text-slate-400 pt-0.5">{fmt}</span>
                      <div>
                        <span className="text-xs font-bold text-slate-600">{e.action}</span>
                        {e.detail && <span className="ml-2 text-[10px] text-slate-400">{e.detail}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
