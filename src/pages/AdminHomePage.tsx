import { useMemo, useState } from "react";
import { PlusCircle, CalendarDays, BarChart2, ArrowLeft, KeyRound, ClipboardList, History, Search, Users, BookOpen, CheckCircle2 } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute, EvalConfig } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { auditLog, getAuditLog, clearAuditLog } from "../utils/auditLog";
import type { AuditEntry } from "../utils/auditLog";
import { useLocalStorage } from "../hooks/useLocalStorage";

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
            <button
              key={name}
              type="button"
              onClick={() => setQuery(name)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
            >
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
  const { configs, sessions, createSession, getConfigsForSession } = useEvalStore();
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [adminPassword, setAdminPassword] = useLocalStorage<string>("adminPassword", "0405");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
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
              <button
                type="button"
                onClick={() => onNavigate({ page: "home" })}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={validate}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-400"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateSession = () => {
    if (!newSessionDate) return;
    const s = createSession(newSessionDate);
    auditLog("Créer session", s.name);
    setShowNewSession(false);
    onNavigate({ page: "admin-session-detail", sessionId: s.id });
  };

  const handleSavePassword = () => {
    if (newPassword.length < 4) { setPasswordError("Le code doit comporter au moins 4 caractères."); return; }
    if (newPassword !== newPasswordConfirm) { setPasswordError("Les codes ne correspondent pas."); return; }
    setAdminPassword(newPassword);
    setShowPasswordModal(false);
    setNewPassword(""); setNewPasswordConfirm(""); setPasswordError("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => { sessionStorage.removeItem("adminAuth"); onNavigate({ page: "home" }); }}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={15} /> Accueil
        </button>
        <div className="flex items-center gap-3">
          <img src={praxieLogoDataUri} alt="Praxie" className="h-12 w-auto rounded-xl" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Administration</span>
        </div>
        <button
          type="button"
          onClick={() => { setNewPassword(""); setNewPasswordConfirm(""); setPasswordError(""); setShowPasswordModal(true); }}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Changer le mot de passe"
        >
          <KeyRound size={15} />
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-700">Sessions d'évaluation</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate({ page: "admin-bdd" })}
              disabled={configs.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-30"
            >
              <CalendarDays size={13} /> BDD
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ page: "admin-recap" })}
              disabled={configs.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-100 disabled:opacity-30"
            >
              <BarChart2 size={13} /> Récap
            </button>
          </div>
        </div>

        {/* Bouton nouvelle session */}
        <button
          type="button"
          onClick={() => setShowNewSession(true)}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 py-5 text-sm font-bold text-emerald-600 transition-all hover:border-emerald-500 hover:bg-emerald-100"
        >
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
            {sessions.map(session => {
              const sessionConfigs = getConfigsForSession(session.id);
              const totalStudents = sessionConfigs.reduce((s, c) => s + c.studentList.length, 0);
              const totalDone = sessionConfigs.reduce((s, c) => s + c.savedEvaluations.length, 0);
              const dateLabel = new Date(session.date + "T00:00:00").toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              });
              const allDone = totalStudents > 0 && totalDone >= totalStudents;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onNavigate({ page: "admin-session-detail", sessionId: session.id })}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${allDone ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                    <CalendarDays size={22} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{dateLabel}</div>
                    <div className="flex items-center gap-2">
                      <span className="truncate font-black uppercase tracking-wide text-slate-800">{session.name}</span>
                      {session.published && <CheckCircle2 size={14} className="shrink-0 text-emerald-500" title="Session publiée" />}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><BookOpen size={10} />{sessionConfigs.length} UE{sessionConfigs.length !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1"><Users size={10} />{totalDone}/{totalStudents} évalués</span>
                      {totalDone === 0 && totalStudents > 0 && <span className="text-slate-300 italic">aucune éval en cours</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-300">›</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Historique étudiant multi-UEs */}
        {configs.some(c => c.savedEvaluations.length > 0) && (
          <StudentHistory configs={configs} />
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => { setAuditEntries(getAuditLog()); setShowAudit(true); }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ClipboardList size={13} /> Journal d'activité
          </button>
        </div>
      </main>

      {/* Modal nouvelle session */}
      {showNewSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowNewSession(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-600">Nouvelle session d'évaluation</h2>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Date de la session</label>
              <input
                type="date"
                value={newSessionDate}
                onChange={e => setNewSessionDate(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateSession(); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-800 focus:border-emerald-400 focus:outline-none"
                autoFocus
              />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <KeyRound size={18} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Changer le code admin</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nouveau code</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirmer le code</label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={e => { setNewPasswordConfirm(e.target.value); setPasswordError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleSavePassword(); }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
            {passwordError && <p className="mt-2 text-xs font-semibold text-red-600">{passwordError}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500 hover:bg-slate-100">Annuler</button>
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
                <button
                  type="button"
                  onClick={() => { clearAuditLog(); setAuditEntries([]); }}
                  className="rounded-lg px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  Effacer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAudit(false)}
                  className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-100"
                >
                  Fermer
                </button>
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
