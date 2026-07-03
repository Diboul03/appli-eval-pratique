import { useState } from "react";
import { PlusCircle, Pencil, CalendarDays, BarChart2, FlaskConical, ArrowLeft, KeyRound } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface Props {
  onNavigate: (route: AppRoute) => void;
}

export function AdminHomePage({ onNavigate }: Props) {
  const { configs } = useEvalStore();
  const [adminPassword] = useLocalStorage<string>("adminPassword", "0405");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("adminAuth") === "1"
  );

  const validate = () => {
    if (code.trim() === adminPassword) {
      sessionStorage.setItem("adminAuth", "1");
      setAuthenticated(true);
      setError("");
      setCode("");
    } else {
      setError("Code incorrect");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-800">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <img src={logoDataUri} alt="Logo IFSO" className="h-10 w-auto brightness-0 invert opacity-80" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Administration</span>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
                <KeyRound size={26} className="text-amber-400" />
              </div>
              <h2 className="text-base font-black uppercase tracking-wide text-white">Accès administrateur</h2>
              <p className="mt-1 text-xs text-white/40">Saisissez le code pour continuer</p>
            </div>
            <input
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && validate()}
              placeholder="••••"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-white placeholder:text-white/20 focus:border-amber-400/60 focus:outline-none"
              autoFocus
            />
            {error && <p className="mt-2 text-center text-xs font-semibold text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onNavigate({ page: "home" })}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/50 hover:bg-white/5"
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

  const actions = [
    {
      key: "create",
      icon: <PlusCircle size={32} strokeWidth={1.5} />,
      label: "Nouvelle évaluation",
      description: "Créer et configurer une nouvelle éval",
      iconCls: "bg-emerald-400/10 text-emerald-400",
      labelCls: "text-emerald-300",
      cardCls: "border-emerald-400/20 hover:border-emerald-400/50",
      onClick: () => onNavigate({ page: "admin-create" }),
    },
    {
      key: "edit",
      icon: <Pencil size={32} strokeWidth={1.5} />,
      label: "Modifier une évaluation",
      description: `${configs.length} éval${configs.length !== 1 ? "s" : ""} existante${configs.length !== 1 ? "s" : ""}`,
      iconCls: "bg-blue-400/10 text-blue-400",
      labelCls: "text-blue-300",
      cardCls: "border-blue-400/20 hover:border-blue-400/50",
      onClick: () => configs.length > 0 && onNavigate({ page: "admin-edit", evalId: configs[0].id }),
      disabled: configs.length === 0,
    },
    {
      key: "bdd",
      icon: <CalendarDays size={32} strokeWidth={1.5} />,
      label: "Créer des BDD",
      description: "Planifier les passages par promotion",
      iconCls: "bg-indigo-400/10 text-indigo-400",
      labelCls: "text-indigo-300",
      cardCls: "border-indigo-400/20 hover:border-indigo-400/50",
      onClick: () => onNavigate({ page: "admin-bdd" }),
      disabled: configs.length === 0,
    },
    {
      key: "recap",
      icon: <BarChart2 size={32} strokeWidth={1.5} />,
      label: "Récapitulatif des notes",
      description: "Tableau de bord et export Excel",
      iconCls: "bg-amber-400/10 text-amber-400",
      labelCls: "text-amber-300",
      cardCls: "border-amber-400/20 hover:border-amber-400/50",
      onClick: () => onNavigate({ page: "admin-recap", evalId: configs[0]?.id ?? "" }),
      disabled: configs.length === 0,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={() => { sessionStorage.removeItem("adminAuth"); onNavigate({ page: "home" }); }}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Accueil
        </button>
        <div className="flex items-center gap-3">
          <img src={logoDataUri} alt="Logo" className="h-8 w-auto brightness-0 invert opacity-70" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Administration</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-edit", evalId: "__password__" })}
          className="rounded-lg p-2 text-white/30 hover:bg-white/5 hover:text-white/60"
          title="Changer le mot de passe"
        >
          <KeyRound size={15} />
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-8 text-center text-xl font-black uppercase tracking-tight text-white/80">
          Mode Administrateur
        </h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {actions.map(action => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={"disabled" in action && action.disabled}
              className={`group flex items-center gap-5 rounded-2xl border bg-white/5 p-6 text-left backdrop-blur-sm transition-all hover:bg-white/8 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 ${action.cardCls}`}
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${action.iconCls}`}>
                {action.icon}
              </div>
              <div>
                <div className={`font-black uppercase tracking-wide ${action.labelCls}`}>{action.label}</div>
                <div className="mt-0.5 text-xs text-white/30">{action.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onNavigate({ page: "admin-create" })}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-white/20 hover:bg-white/5 hover:text-white/40"
          >
            <FlaskConical size={13} /> Remplir test
          </button>
        </div>
      </main>
    </div>
  );
}
