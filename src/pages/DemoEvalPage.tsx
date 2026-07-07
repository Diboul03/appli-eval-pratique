import { useEffect, useRef, useState } from "react";
import { X, Play, Info } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import { RadarChart } from "../components/RadarChart";
import type { AppRoute, Axis, Scores, SubStatus } from "../types";

// ─── Données de démonstration ─────────────────────────────────────────────────
const DEMO_AXES: Axis[] = [
  {
    id: "d1", label: "Recueil des données", max: 4,
    subItems: [
      { id: "d1s1", label: "Anamnèse" },
      { id: "d1s2", label: "Bilan postural" },
      { id: "d1s3", label: "Tests orthopédiques" },
    ],
  },
  {
    id: "d2", label: "Analyse clinique", max: 4,
    subItems: [
      { id: "d2s1", label: "Synthèse des données" },
      { id: "d2s2", label: "Hypothèse lésionnelle" },
    ],
  },
  {
    id: "d3", label: "Techniques ostéopathiques", max: 5,
    subItems: [
      { id: "d3s1", label: "Qualité gestuelle" },
      { id: "d3s2", label: "Sécurité du patient" },
      { id: "d3s3", label: "Adaptation technique" },
    ],
  },
  {
    id: "d4", label: "Relation thérapeutique", max: 3,
    subItems: [
      { id: "d4s1", label: "Communication verbale" },
      { id: "d4s2", label: "Empathie clinique" },
    ],
  },
];

const DEMO_FINAL_SCORES: Scores = { d1: 3, d2: 3, d3: 2, d4: 2 };

const DEMO_SUBCHECKS: Record<string, Record<string, SubStatus>> = {
  d1: { d1s1: "ACQUIS", d1s2: "ACQUIS", d1s3: "EN_COURS" },
  d2: { d2s1: "ACQUIS", d2s2: "ACQUIS" },
  d3: { d3s1: "ACQUIS", d3s2: "ACQUIS", d3s3: "NON_ACQUIS" },
  d4: { d4s1: "EN_COURS", d4s2: "ACQUIS" },
};

// Commentaire qui s'affiche automatiquement pour le sous-indicateur NON_ACQUIS
const DEMO_NON_ACQUIS_AXIS = "d3";
const DEMO_NON_ACQUIS_SI = "d3s3";
const DEMO_NON_ACQUIS_COMMENT =
  "Adaptation insuffisamment modulée lors de la palpation du scalène antérieur. La technique nécessite davantage de progressivité et de feedback proprioceptif.";

// Question tirée au sort (anatomie palpatoire)
const DEMO_QUESTION = "Localisation et palpation du tubercule de Lisfranc — Rapport avec le tendon du scalène antérieur";

const DEMO_REMARKS_POS =
  "Bonne maîtrise du repérage anatomique. Palpation du tubercule de Lisfranc précise et bien latéralisée. La progression de l'examen est logique et le patient correctement informé à chaque étape.";
const DEMO_REMARKS_IMP =
  "Approfondir la systématisation du bilan initial. Renforcer la corrélation entre les données palpatoires et les tests orthopédiques complémentaires.";

// ─── Bulles didactiques ────────────────────────────────────────────────────────
const DIDACTIC: Record<string, { title: string; text: string }> = {
  intro: {
    title: "Identification de l'étudiant",
    text: "L'évaluateur sélectionne le nom de l'étudiant dans un menu déroulant. Les autres informations (U.E., promotion, date, évaluateur) sont pré-remplies automatiquement. Une question est tirée au sort si l'option est activée.",
  },
  axis: {
    title: "Comment noter un axe ?",
    text: "Faites glisser le curseur pour attribuer la note de l'axe. Puis cliquez sur chaque sous-indicateur pour indiquer si la compétence est ✓ Acquise, ~ En cours ou ✗ Non acquise. Un commentaire obligatoire apparaît en cas de Non acquis.",
  },
  remarks: {
    title: "Commentaires de l'évaluateur",
    text: "L'évaluateur rédige ses observations : points forts et axes d'amélioration. Ces commentaires apparaîtront sur la feuille d'évaluation signée remise à l'étudiant.",
  },
  signature: {
    title: "Validation par signature",
    text: "L'évaluateur signe sur l'écran tactile pour valider l'évaluation. La feuille est ensuite exportée en HTML et archivée. Une modification reste possible en sélectionnant l'évaluation dans le menu déroulant, que ce soit en mode évaluateur ou en mode administrateur.",
  },
};

// ─── Séquence temporelle ───────────────────────────────────────────────────────
type Phase =
  | { kind: "intro" }
  | { kind: "axis"; idx: number }
  | { kind: "remarks" }
  | { kind: "signature" }
  | { kind: "done" };

const AXIS_DURATION = 4500;
const PHASES: Phase[] = [
  { kind: "intro" },
  { kind: "axis", idx: 0 },
  { kind: "axis", idx: 1 },
  { kind: "axis", idx: 2 },
  { kind: "axis", idx: 3 },
  { kind: "remarks" },
  { kind: "signature" },
  { kind: "done" },
];
const PHASE_DURATIONS: number[] = [
  5000,
  AXIS_DURATION,
  AXIS_DURATION,
  8000, // d3 : plus long pour laisser le commentaire NON_ACQUIS s'afficher
  AXIS_DURATION,
  10000,
  8000,
  0,
];

const STATUS_COLORS: Record<string, string> = {
  ACQUIS: "bg-emerald-500 text-white",
  EN_COURS: "bg-amber-500 text-white",
  NON_ACQUIS: "bg-red-500 text-white",
};
const STATUS_LABELS: Record<string, string> = {
  ACQUIS: "✓ Acquis",
  EN_COURS: "~ En cours",
  NON_ACQUIS: "✗ Non acquis",
};

function useTypewriter(text: string, active: boolean, msPerChar = 16) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, msPerChar);
    return () => clearInterval(id);
  }, [text, active]);
  return displayed;
}

// ─── Bulle didactique ─────────────────────────────────────────────────────────
function DidacticBubble({ phaseKey }: { phaseKey: string }) {
  const d = DIDACTIC[phaseKey];
  if (!d) return null;
  return (
    <div className="mx-auto mb-4 flex max-w-md items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
      <Info size={15} className="mt-0.5 shrink-0 text-indigo-400" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{d.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-indigo-800">{d.text}</p>
      </div>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────
interface Props { onNavigate: (r: AppRoute) => void }

export function DemoEvalPage({ onNavigate }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [scores, setScores] = useState<Scores>({ d1: 0, d2: 0, d3: 0, d4: 0 });
  const [subChecks, setSubChecks] = useState<Record<string, Record<string, SubStatus>>>({});
  const [nonAcquisActive, setNonAcquisActive] = useState(false);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nonAcquisRef = useRef<HTMLDivElement | null>(null);

  const phase = phaseIdx >= 0 ? PHASES[phaseIdx] : null;

  const nextPhase = (idx: number) => {
    if (idx >= PHASES.length) return;
    const p = PHASES[idx];
    setPhaseIdx(idx);
    setProgress(0);

    if (p.kind === "axis") {
      const a = DEMO_AXES[p.idx];
      const finalScore = DEMO_FINAL_SCORES[a.id];
      const finalSubs = DEMO_SUBCHECKS[a.id] ?? {};
      const subKeys = Object.keys(finalSubs);

      const scoreSteps = 30;
      const scoreInterval = (AXIS_DURATION / 2) / scoreSteps;
      let s = 0;
      const scoreTimer = setInterval(() => {
        s++;
        setScores(prev => ({ ...prev, [a.id]: parseFloat(Math.min(finalScore, (finalScore * s) / scoreSteps).toFixed(1)) }));
        if (s >= scoreSteps) clearInterval(scoreTimer);
      }, scoreInterval);

      if (subKeys.length > 0) {
        const delay = AXIS_DURATION / 2;
        const subInterval = (AXIS_DURATION / 2) / subKeys.length;
        subKeys.forEach((key, ki) => {
          const t = delay + ki * subInterval;
          setTimeout(() => {
            setSubChecks(prev => ({
              ...prev,
              [a.id]: { ...(prev[a.id] ?? {}), [key]: finalSubs[key] },
            }));
            // Auto-activer le typewriter du commentaire NON_ACQUIS
            if (a.id === DEMO_NON_ACQUIS_AXIS && key === DEMO_NON_ACQUIS_SI && finalSubs[key] === "NON_ACQUIS") {
              setTimeout(() => setNonAcquisActive(true), 400);
            }
          }, t);
        });
      }
    }

    if (p.kind === "done") return;

    const dur = PHASE_DURATIONS[idx];
    const tick = 50;
    let elapsed = 0;
    progressRef.current && clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      elapsed += tick;
      setProgress(Math.min(1, elapsed / dur));
    }, tick);

    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => nextPhase(idx + 1), dur);
  };

  const startDemo = () => {
    setStarted(true);
    setScores({ d1: 0, d2: 0, d3: 0, d4: 0 });
    setSubChecks({});
    setNonAcquisActive(false);
    nextPhase(0);
  };

  useEffect(() => () => {
    timerRef.current && clearTimeout(timerRef.current);
    progressRef.current && clearInterval(progressRef.current);
  }, []);

  // Auto-scroll vers le commentaire NON_ACQUIS quand il apparaît
  useEffect(() => {
    if (nonAcquisActive && nonAcquisRef.current) {
      setTimeout(() => {
        nonAcquisRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [nonAcquisActive]);

  const remarksActive = phase?.kind === "remarks";
  const displayedPos = useTypewriter(DEMO_REMARKS_POS, remarksActive);
  const displayedImp = useTypewriter(DEMO_REMARKS_IMP, remarksActive, 22);
  const displayedNonAcquis = useTypewriter(DEMO_NON_ACQUIS_COMMENT, nonAcquisActive, 18);

  const axesMaxSum = DEMO_AXES.reduce((s, a) => s + a.max, 0);
  const currentAxis = phase?.kind === "axis" ? DEMO_AXES[phase.idx] : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <img src={praxieLogoDataUri} alt="Praxie" className="h-8 w-auto" />
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-600">
            Démonstration
          </span>
          <span className="mt-0.5 text-[9px] text-slate-400">Aucune donnée enregistrée</span>
        </div>
        <button
          type="button"
          onClick={() => {
            timerRef.current && clearTimeout(timerRef.current);
            progressRef.current && clearInterval(progressRef.current);
            onNavigate({ page: "eval-select-evaluator" });
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
        >
          <X size={13} /> Quitter
        </button>
      </header>

      {/* Barre de progression globale */}
      {started && phase?.kind !== "done" && (
        <div className="h-1 w-full bg-slate-200">
          <div
            className="h-1 bg-indigo-500 transition-all duration-100"
            style={{ width: `${((phaseIdx + progress) / (PHASES.length - 1)) * 100}%` }}
          />
        </div>
      )}

      <main className="flex-1 overflow-y-auto">

        {/* ── Écran d'accueil ── */}
        {!started && (
          <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-3xl border border-indigo-200 bg-white p-10 shadow-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
                <Play size={28} className="text-indigo-600" />
              </div>
              <h1 className="text-lg font-black uppercase tracking-wide text-slate-800">
                Évaluation de démonstration
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Observez le déroulement complet d'une évaluation type sans aucune intervention.
              </p>
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 text-left text-xs text-slate-500 space-y-1.5">
                <div><span className="font-bold text-slate-700">Promotion :</span> PCEO1</div>
                <div><span className="font-bold text-slate-700">U.E. :</span> U.E. 5.1</div>
                <div><span className="font-bold text-slate-700">Durée examen :</span> 1 minute</div>
                <div><span className="font-bold text-slate-700">Étudiant :</span> M. DUPONT Thomas</div>
                <div><span className="font-bold text-slate-700">Question :</span> Anatomie palpatoire — Tubercule de Lisfranc</div>
                <div><span className="font-bold text-slate-700">Axes évalués :</span> {DEMO_AXES.length}</div>
              </div>
              <p className="mt-4 text-[10px] text-slate-400">
                Cette démonstration n'apparaît pas dans les statistiques admin.
              </p>
              <button
                type="button"
                onClick={startDemo}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98]"
              >
                <Play size={16} /> Lancer la démonstration
              </button>
            </div>
          </div>
        )}

        {/* ── Phase intro ── */}
        {phase?.kind === "intro" && (
          <div className="mx-auto max-w-md px-4 py-6 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Étape 1 — Identification</p>
                <h2 className="mt-1 text-base font-black uppercase text-slate-800">Informations étudiant</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 opacity-60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pré-rempli</span>
                  <div className="mt-1 space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between"><span>Promotion</span><span className="font-semibold text-slate-700">PCEO1</span></div>
                    <div className="flex justify-between"><span>U.E.</span><span className="font-semibold text-slate-700">U.E. 5.1</span></div>
                    <div className="flex justify-between"><span>Durée</span><span className="font-semibold text-slate-700">1 minute</span></div>
                    <div className="flex justify-between"><span>Évaluateur</span><span className="font-semibold text-slate-700">M. MARTIN Julien</span></div>
                  </div>
                </div>
                {/* Bulle didactique juste au-dessus du champ étudiant */}
                <DidacticBubble phaseKey="intro" />
                <AnimField label="▾ Étudiant (menu déroulant)" value="M. DUPONT Thomas" delay={800} dropdown />
                <AnimField label="Question tirée au sort" value="Tubercule de Lisfranc — scalène antérieur" delay={1600} />
              </div>
            </div>
          </div>
        )}

        {/* ── Phase axe ── */}
        {phase?.kind === "axis" && currentAxis && (
          <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Étape 2 — Axe {phase.idx + 1}/{DEMO_AXES.length}
              </p>
              <h2 className="mt-1 text-base font-black uppercase text-slate-800">{currentAxis.label}</h2>
            </div>

            {/* Question palpatoire */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Question tirée au sort</p>
              <p className="mt-0.5 text-xs font-semibold text-amber-800">{DEMO_QUESTION}</p>
            </div>

            {/* Radar + bulle didactique collée dessous */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <RadarChart
                axes={DEMO_AXES}
                scores={scores}
                setScores={() => {}}
                touched={Object.fromEntries(DEMO_AXES.map(a => [a.id, true]))}
                setTouched={() => {}}
                axesMaxSum={axesMaxSum}
                showBareme={false}
                showPercent={false}
                subChecks={subChecks}
                setSubChecks={() => {}}
              />
              <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                <DidacticBubble phaseKey="axis" />
              </div>
            </div>

            {/* Sous-indicateurs */}
            {currentAxis.subItems.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sous-indicateurs</p>
                <div className="space-y-2">
                  {currentAxis.subItems.map(si => {
                    const status = subChecks[currentAxis.id]?.[si.id];
                    const isNonAcquis = status === "NON_ACQUIS";
                    const isThisNonAcquisDemo =
                      currentAxis.id === DEMO_NON_ACQUIS_AXIS && si.id === DEMO_NON_ACQUIS_SI;
                    return (
                      <div key={si.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-sm text-slate-700">{si.label}</span>
                          <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold transition-all duration-500 ${status ? STATUS_COLORS[status] : "bg-slate-200 text-slate-400"}`}>
                            {status ? STATUS_LABELS[status] : "—"}
                          </span>
                        </div>
                        {isNonAcquis && isThisNonAcquisDemo && (
                          <div ref={nonAcquisRef} className="ml-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-red-500">
                              Commentaire obligatoire — Non acquis
                            </p>
                            <p className="min-h-[36px] text-xs leading-relaxed text-slate-700">
                              {displayedNonAcquis}
                              {nonAcquisActive && displayedNonAcquis.length < DEMO_NON_ACQUIS_COMMENT.length && <BlinkCursor />}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Phase commentaires ── */}
        {phase?.kind === "remarks" && (
          <div className="mx-auto max-w-md px-4 py-6 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Étape 3 — Commentaires</p>
                <h2 className="mt-1 text-base font-black uppercase text-slate-800">Bilan de l'évaluation</h2>
              </div>
              {/* Bulle juste avant les zones de texte */}
              <DidacticBubble phaseKey="remarks" />
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Points positifs</p>
                  <p className="min-h-[60px] text-sm text-slate-700">{displayedPos}<BlinkCursor /></p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">Axes d'amélioration</p>
                  <p className="min-h-[60px] text-sm text-slate-700">{displayedImp}<BlinkCursor /></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase signature ── */}
        {phase?.kind === "signature" && (
          <div className="mx-auto max-w-md px-4 py-6 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Étape 4 — Signature</p>
                <h2 className="mt-1 text-base font-black uppercase text-slate-800">Validation par l'évaluateur</h2>
              </div>
              {/* Bulle juste au-dessus de la zone de signature */}
              <DidacticBubble phaseKey="signature" />
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-sm text-slate-400">Zone de signature</p>
                <p className="mt-2 text-xs text-slate-300">L'évaluateur signe ici pour valider l'évaluation</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase terminée ── */}
        {phase?.kind === "done" && (
          <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-10 shadow-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-lg font-black uppercase tracking-wide text-slate-800">Démonstration terminée</h1>
              <p className="mt-2 text-sm text-slate-500">
                Voilà à quoi ressemble une évaluation complète.<br />
                Aucune donnée n'a été enregistrée.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button type="button" onClick={startDemo}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50">
                  <Play size={14} /> Rejouer la démonstration
                </button>
                <button type="button" onClick={() => onNavigate({ page: "eval-select-evaluator" })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700">
                  Retour à l'accueil évaluateur
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────────

function BlinkCursor() {
  return <span className="ml-0.5 inline-block h-4 w-0.5 bg-slate-600 align-text-bottom animate-pulse" />;
}

function AnimField({ label, value, delay, dropdown }: { label: string; value: string; delay: number; dropdown?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 transition-all duration-500 ${
      visible
        ? dropdown ? "border-indigo-300 bg-indigo-50 opacity-100" : "border-emerald-200 bg-emerald-50 opacity-100"
        : "border-slate-100 bg-slate-50 opacity-30"
    }`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${visible && dropdown ? "text-indigo-400" : "text-slate-400"}`}>{label}</span>
      <span className={`text-sm font-bold transition-all duration-500 ${visible ? "text-slate-800" : "text-slate-200"}`}>
        {visible ? value : "…"}
      </span>
    </div>
  );
}
