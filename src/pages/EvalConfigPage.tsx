import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, CheckCircle, Trash2, FlaskConical, X, Users, Clock, BookOpen, Target } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute, Axis, EvalConfig, ExaminerItem, QuestionGroup, StudentData, StudentItem } from "../types";
import { PROMOTIONS } from "../types";
import { useEvalStore, blankConfig } from "../hooks/useEvalStore";
import { AdminPanel } from "../components/AdminPanel";
import { useDialogs } from "../hooks/useDialogs";
import { sumAxesMax } from "../utils/scoring";
import { generateId } from "../utils";


interface Props {
  mode: "create" | "edit";
  evalId?: string;
  sessionId?: string;
  onNavigate: (route: AppRoute) => void;
  onRequestPreview?: (config: EvalConfig) => void;
}

const UE_PRESETS = [
  ...Array.from({ length: 12 }, (_, i) => `U.E. 5.${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `U.E. 7.${i + 1}`),
] as const;

const DURATION_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60];

function configToStudentData(cfg: EvalConfig): StudentData {
  return {
    civilite: "",
    nom: "",
    prenom: "",
    evaluator: "",
    evaluatorNom: cfg.defaultExaminer.nom,
    evaluatorPrenom: cfg.defaultExaminer.prenom,
    date: new Date().toISOString().split("T")[0],
    ue: cfg.ue,
    promotion: cfg.promotion,
    questionNum: "",
  };
}

export function EvalConfigPage({ mode, evalId, sessionId, onNavigate }: Props) {
  const goBack = () => sessionId
    ? onNavigate({ page: "admin-session-detail", sessionId })
    : onNavigate({ page: "admin-home" });
  const { getConfig, createConfig, updateConfig, deleteConfig } = useEvalStore();
  const { confirm, notify } = useDialogs();

  const [selectedId, setSelectedId] = useState<string | null>(evalId ?? null);
  const { configs } = useEvalStore();

  const initialConfig = selectedId ? (getConfig(selectedId) ?? blankConfig()) : blankConfig();

  const [defaultExaminer, setDefaultExaminer] = useState<ExaminerItem>(initialConfig.defaultExaminer);
  const [studentList, setStudentList] = useState<StudentItem[]>(initialConfig.studentList);
  const [studentListValidated, setStudentListValidated] = useState(initialConfig.studentListValidated);
  const [axes, setAxes] = useState<Axis[]>(initialConfig.axes);
  const [drawEnabled, setDrawEnabled] = useState(initialConfig.drawEnabled);
  const [drawMode, setDrawMode] = useState<"single" | "group">(initialConfig.drawMode);
  const [drawGroups, setDrawGroups] = useState<QuestionGroup[]>(initialConfig.drawGroups);
  const [drawSingles, setDrawSingles] = useState<string[]>(initialConfig.drawSingles);
  const [drawListValidated, setDrawListValidated] = useState(initialConfig.drawListValidated);
  const [examDurationMinutes, setExamDurationMinutes] = useState(initialConfig.examDurationMinutes);
  const [showFinalNoteToEvaluator, setShowFinalNoteToEvaluator] = useState(initialConfig.showFinalNoteToEvaluator);
  const [showBaremeToEvaluator, setShowBaremeToEvaluator] = useState(initialConfig.showBaremeToEvaluator);
  const [showPercentToEvaluator, setShowPercentToEvaluator] = useState(initialConfig.showPercentToEvaluator);
  const [studentData, setStudentData] = useState<StudentData>(configToStudentData(initialConfig));

  const [bulkStudentsText, setBulkStudentsText] = useState("");
  const [bulkGroupsText, setBulkGroupsText] = useState("");
  const [bulkSinglesText, setBulkSinglesText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const studentsSectionRef = useRef<HTMLDivElement | null>(null);
  const questionsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const cfg = getConfig(selectedId);
    if (!cfg) return;
    setDefaultExaminer(cfg.defaultExaminer);
    setStudentList(cfg.studentList);
    setStudentListValidated(cfg.studentListValidated);
    setAxes(cfg.axes);
    setDrawEnabled(cfg.drawEnabled);
    setDrawMode(cfg.drawMode);
    setDrawGroups(cfg.drawGroups);
    setDrawSingles(cfg.drawSingles);
    setDrawListValidated(cfg.drawListValidated);
    setExamDurationMinutes(cfg.examDurationMinutes);
    setShowFinalNoteToEvaluator(cfg.showFinalNoteToEvaluator);
    setShowBaremeToEvaluator(cfg.showBaremeToEvaluator);
    setShowPercentToEvaluator(cfg.showPercentToEvaluator);
    setStudentData(configToStudentData(cfg));
    setBulkStudentsText("");
    setBulkGroupsText("");
    setBulkSinglesText("");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const gatherConfig = (): Partial<EvalConfig> => ({
    promotion: studentData.promotion,
    ue: studentData.ue,
    defaultExaminer,
    examDurationMinutes,
    studentList,
    studentListValidated,
    axes,
    drawEnabled,
    drawMode,
    drawGroups,
    drawSingles,
    drawListValidated,
    showFinalNoteToEvaluator,
    showBaremeToEvaluator,
    showPercentToEvaluator,
  });

  const handleSave = async () => {
    const missing: string[] = [];
    if (!studentData.promotion) missing.push("Promotion");
    if (!studentData.ue.trim()) missing.push("Unité d'enseignement");
    if (!defaultExaminer.nom.trim() && !defaultExaminer.prenom.trim()) missing.push("Nom de l'évaluateur");
    if (examDurationMinutes <= 0) missing.push("Durée de l'examen");
    if (axes.length === 0) missing.push("Au moins un axe d'évaluation");
    if (!studentListValidated && studentList.length === 0) missing.push("Liste des étudiants");
    if (missing.length > 0) {
      notify(`Champs manquants avant validation :\n• ${missing.join("\n• ")}`, "error");
      return;
    }
    if (mode === "create" || !selectedId) {
      const cfg = createConfig(gatherConfig());
      const wantBdd = await confirm({
        title: "Créer la BDD de passage ?",
        message: `L'évaluation "${cfg.ue}" (${cfg.promotion}) a été créée.\n\nVoulez-vous créer maintenant la base de données des horaires de passage ?`,
        confirmLabel: "Créer la BDD",
        cancelLabel: "Plus tard",
        danger: false,
      });
      if (wantBdd) {
        onNavigate({ page: "admin-bdd", preselectedConfigId: cfg.id });
      } else {
        goBack();
      }
    } else {
      updateConfig(selectedId, gatherConfig());
      notify("Évaluation mise à jour.");
      goBack();
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Réinitialiser le formulaire ?",
      message: "Tous les champs seront remis à zéro (étudiants, questions, évaluateur, axes). Les évaluations déjà enregistrées ne sont pas supprimées.",
      confirmLabel: "Réinitialiser",
      danger: true,
    });
    if (!ok) return;
    const blank = blankConfig();
    setDefaultExaminer(blank.defaultExaminer);
    setStudentList(blank.studentList);
    setStudentListValidated(blank.studentListValidated);
    setAxes(blank.axes);
    setDrawEnabled(blank.drawEnabled);
    setDrawMode(blank.drawMode);
    setDrawGroups(blank.drawGroups);
    setDrawSingles(blank.drawSingles);
    setDrawListValidated(blank.drawListValidated);
    setExamDurationMinutes(blank.examDurationMinutes);
    setShowFinalNoteToEvaluator(blank.showFinalNoteToEvaluator);
    setShowBaremeToEvaluator(blank.showBaremeToEvaluator);
    setShowPercentToEvaluator(blank.showPercentToEvaluator);
    setStudentData(prev => ({ ...prev, promotion: "", ue: "" }));
    notify("Formulaire réinitialisé.");
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const cfg = getConfig(selectedId);
    const ok = await confirm({
      title: "Supprimer cette évaluation ?",
      message: `L'évaluation "${cfg?.ue ?? ""}" (${cfg?.promotion ?? ""}) et toutes ses notes enregistrées seront supprimées. Action irréversible.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    deleteConfig(selectedId);
    notify("Évaluation supprimée.");
    goBack();
  };

  const fillTest = () => {
    setStudentData(prev => ({ ...prev, promotion: "PCEO2", ue: "U.E. 5.3" }));
    setDefaultExaminer({ civilite: "Mme", nom: "DUPONT", prenom: "MARIE" });
    setExamDurationMinutes(15);
    setStudentList([
      { civilite: "Mme", nom: "MARTIN", prenom: "Sophie" },
      { civilite: "M.", nom: "BERNARD", prenom: "Lucas" },
      { civilite: "Mme", nom: "LEROY", prenom: "Emma" },
    ]);
    setStudentListValidated(true);
    setDrawEnabled(true);
    setDrawMode("group");
    setDrawGroups([
      {
        id: generateId(),
        title: "Ostéopathie structurelle",
        questions: ["Tester la mobilité de T4 en rotation", "Décrire le thrust dorsal en décubitus", "Bilan du bassin en procubitus"],
      },
      {
        id: generateId(),
        title: "Ostéopathie viscérale",
        questions: ["Mobilisation du foie en décubitus", "Test de mobilité du côlon sigmoïde", "Écoute abdominale globale"],
      },
    ]);
    setDrawListValidated(true);
    notify("Données de test remplies — pensez à valider.");
  };

  const axesMaxSum = sumAxesMax(axes);
  const questionsCount = drawMode === "single"
    ? drawSingles.length
    : drawGroups.reduce((s, g) => s + g.questions.length, 0);

  const isEditing = mode === "edit";
  const hasConfigs = configs.length > 0;

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-800 px-6 py-3">
        <button
          type="button"
          onClick={() => goBack()}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <div className="flex items-center gap-3">
          <img src={praxieLogoDataUri} alt="Praxie" className="h-7 w-auto rounded-xl" />
          <span className="text-sm font-black uppercase tracking-wide text-white/70">
            {isEditing ? "Modifier une évaluation" : "Nouvelle évaluation"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fillTest}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/40 hover:bg-white/5 hover:text-white/70"
          >
            <FlaskConical size={13} /> Test
          </button>
          {isEditing && selectedId && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/30"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/50 hover:bg-white/5 hover:text-white/80"
          >
            <Eye size={13} /> Aperçu
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-400"
          >
            <CheckCircle size={13} /> Valider
          </button>
        </div>
      </div>

      {/* Edit mode selector */}
      {isEditing && hasConfigs && (
        <div className="border-b border-white/10 bg-slate-700/50 px-6 py-3">
          <label className="mr-3 text-xs font-bold uppercase tracking-wide text-white/40">
            Évaluation à modifier
          </label>
          <select
            value={selectedId ?? ""}
            onChange={e => setSelectedId(e.target.value || null)}
            className="rounded-lg border border-white/10 bg-slate-700 px-3 py-1.5 text-sm text-white focus:border-amber-400/60 focus:outline-none"
          >
            <option value="">— Choisir —</option>
            {configs.map(c => (
              <option key={c.id} value={c.id}>
                {c.promotion} — {c.ue || "U.E. sans nom"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Promotion / UE / Durée */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Promotion</label>
            <select
              value={studentData.promotion}
              onChange={e => setStudentData(prev => ({ ...prev, promotion: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-400 focus:outline-none ${studentData.promotion ? "border-slate-200 bg-white text-slate-800" : "border-amber-300 bg-amber-50 text-amber-700"}`}
            >
              <option value="">— Choisir —</option>
              {PROMOTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Unité d'enseignement</label>
            <select
              value={UE_PRESETS.includes(studentData.ue as typeof UE_PRESETS[number]) ? studentData.ue : studentData.ue ? "__custom__" : ""}
              onChange={e => {
                if (e.target.value !== "__custom__") setStudentData(prev => ({ ...prev, ue: e.target.value }));
              }}
              className={`mb-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-400 focus:outline-none ${studentData.ue.trim() ? "border-slate-200 bg-white text-slate-800" : "border-amber-300 bg-amber-50 text-amber-700"}`}
            >
              <option value="">— Choisir une U.E. —</option>
              <optgroup label="U.E. 5">
                {Array.from({ length: 12 }, (_, i) => `U.E. 5.${i + 1}`).map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="U.E. 7">
                {Array.from({ length: 4 }, (_, i) => `U.E. 7.${i + 1}`).map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <option value="__custom__">Autre (saisie libre)</option>
            </select>
            <input
              value={studentData.ue}
              onChange={e => setStudentData(prev => ({ ...prev, ue: e.target.value }))}
              placeholder="Intitulé complet de l'U.E."
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-400 focus:outline-none ${studentData.ue.trim() ? "border-slate-200 bg-white text-slate-800" : "border-amber-300 bg-amber-50 text-amber-700 placeholder:text-amber-400"}`}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Durée examen (min)</label>
            <select
              value={DURATION_PRESETS.includes(examDurationMinutes) ? examDurationMinutes : -1}
              onChange={e => { const v = parseInt(e.target.value, 10); if (v !== -1) setExamDurationMinutes(v); }}
              className={`mb-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-400 focus:outline-none ${examDurationMinutes > 0 ? "border-slate-200 bg-white text-slate-800" : "border-amber-300 bg-amber-50 text-amber-700"}`}
            >
              <option value={0}>— Choisir —</option>
              {DURATION_PRESETS.map(v => <option key={v} value={v}>{v} min</option>)}
              <option value={-1}>Autre (saisie libre)</option>
            </select>
            <input
              type="number"
              value={examDurationMinutes || ""}
              onChange={e => setExamDurationMinutes(Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
              placeholder="Durée en minutes"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-amber-400 focus:outline-none ${examDurationMinutes > 0 ? "border-slate-200 bg-white text-slate-800" : "border-amber-300 bg-amber-50 text-amber-700 placeholder:text-amber-400"}`}
              min={0}
            />
          </div>
        </div>
      </div>

      <AdminPanel
        studentsSectionRef={studentsSectionRef}
        questionsSectionRef={questionsSectionRef}
        studentList={studentList}
        setStudentList={setStudentList}
        studentListValidated={studentListValidated}
        setStudentListValidated={setStudentListValidated}
        bulkStudentsText={bulkStudentsText}
        setBulkStudentsText={setBulkStudentsText}
        savedEvaluations={selectedId ? (getConfig(selectedId)?.savedEvaluations ?? []) : []}
        drawEnabled={drawEnabled}
        setDrawEnabled={setDrawEnabled}
        drawMode={drawMode}
        setDrawMode={setDrawMode}
        bulkSinglesText={bulkSinglesText}
        setBulkSinglesText={setBulkSinglesText}
        bulkGroupsText={bulkGroupsText}
        setBulkGroupsText={setBulkGroupsText}
        drawSingles={drawSingles}
        setDrawSingles={setDrawSingles}
        drawGroups={drawGroups}
        setDrawGroups={setDrawGroups}
        drawListValidated={drawListValidated}
        setDrawListValidated={setDrawListValidated}
        defaultExaminer={defaultExaminer}
        setDefaultExaminer={setDefaultExaminer}
        studentData={studentData}
        setStudentData={setStudentData}
        examDurationMinutes={examDurationMinutes}
        setExamDurationMinutes={setExamDurationMinutes}
        showFinalNoteToEvaluator={showFinalNoteToEvaluator}
        setShowFinalNoteToEvaluator={setShowFinalNoteToEvaluator}
        showBaremeToEvaluator={showBaremeToEvaluator}
        setShowBaremeToEvaluator={setShowBaremeToEvaluator}
        showPercentToEvaluator={showPercentToEvaluator}
        setShowPercentToEvaluator={setShowPercentToEvaluator}
        axes={axes}
        setAxes={setAxes}
        axesMaxSum={axesMaxSum}
        setScores={() => {}}
        questionsCount={questionsCount}
        onRequestReset={handleReset}
        hideUePromoDuration
      />
    </div>

    {/* Modale aperçu — lecture seule, aucun impact sur le store */}
    {showPreview && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={() => setShowPreview(false)}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="absolute right-4 top-4 rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white/80"
          >
            <X size={18} />
          </button>

          <h2 className="mb-4 text-base font-black uppercase tracking-wide text-white/80">
            Aperçu de la configuration
          </h2>

          {/* Identifiants */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-700/60 p-3">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Promotion</p>
              <p className="text-sm font-semibold text-white">{studentData.promotion || <span className="text-slate-500 italic">non renseignée</span>}</p>
            </div>
            <div className="rounded-xl bg-slate-700/60 p-3">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">U.E.</p>
              <p className="text-sm font-semibold text-white">{studentData.ue || <span className="text-slate-500 italic">non renseignée</span>}</p>
            </div>
          </div>

          {/* Évaluateur + durée */}
          <div className="mb-4 flex gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-700/60 px-3 py-2.5">
              <Users size={15} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Évaluateur</p>
                <p className="text-sm text-white">
                  {defaultExaminer.prenom || defaultExaminer.nom
                    ? `${defaultExaminer.prenom} ${defaultExaminer.nom}`.trim()
                    : <span className="italic text-slate-500">non renseigné</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-700/60 px-3 py-2.5">
              <Clock size={15} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Durée</p>
                <p className="text-sm text-white">{examDurationMinutes ? `${examDurationMinutes} min` : <span className="italic text-slate-500">—</span>}</p>
              </div>
            </div>
          </div>

          {/* Axes */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <Target size={12} /> Axes d'évaluation ({axes.length}) — total {axesMaxSum} pts
            </div>
            {axes.length === 0 ? (
              <p className="text-xs italic text-slate-500">Aucun axe configuré</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {axes.map(ax => (
                  <div key={ax.id} className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-1.5">
                    <span className="text-xs text-white/80">{ax.label || "Sans nom"}</span>
                    <span className="text-xs font-bold text-amber-400">{ax.max} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Étudiants + tirage */}
          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-700/60 px-3 py-2.5">
              <BookOpen size={15} className="text-violet-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Étudiants</p>
                <p className="text-sm text-white">{studentList.length > 0 ? `${studentList.length} inscrits` : <span className="italic text-slate-500">aucun</span>}</p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-700/60 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tirage</p>
                <p className="text-sm text-white">
                  {!drawEnabled ? "Désactivé" : drawMode === "group"
                    ? `${drawGroups.length} groupe(s)`
                    : `${drawSingles.length} question(s)`}
                </p>
              </div>
            </div>
          </div>

          {/* Mini radar en temps réel */}
          {axes.length >= 3 && (() => {
            const c = 120; const r = 80; const n = axes.length;
            const rings = [0.25, 0.5, 0.75, 1].map(lvl =>
              `<circle cx="${c}" cy="${c}" r="${r * lvl}" fill="none" stroke="#334155" stroke-width="1" />`
            ).join("");
            const axLines = axes.map((_a, i) => {
              const ang = (-90 + (360 / n) * i) * Math.PI / 180;
              return `<line x1="${c}" y1="${c}" x2="${(c + r * Math.cos(ang)).toFixed(1)}" y2="${(c + r * Math.sin(ang)).toFixed(1)}" stroke="#475569" stroke-width="1" />`;
            }).join("");
            const lbls = axes.map((a, i) => {
              const ang = (-90 + (360 / n) * i) * Math.PI / 180;
              const lx = (c + (r + 22) * Math.cos(ang)).toFixed(1);
              const ly = (c + (r + 22) * Math.sin(ang)).toFixed(1);
              const short = a.label.length > 10 ? a.label.slice(0, 9) + "…" : a.label;
              return `<text x="${lx}" y="${ly}" font-size="8" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8">${short}</text>`;
            }).join("");
            const pts = axes.map((a, i) => {
              const ang = (-90 + (360 / n) * i) * Math.PI / 180;
              const ratio = a.max > 0 ? (axesMaxSum > 0 ? 0.5 : 0) : 0;
              const pr = ratio * r;
              return `${(c + pr * Math.cos(ang)).toFixed(1)},${(c + pr * Math.sin(ang)).toFixed(1)}`;
            }).join(" ");
            return (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Forme du radar ({axes.length} axes)</p>
                <div className="flex justify-center rounded-xl bg-slate-700/40 py-3">
                  <svg width="240" height="240" viewBox="0 0 240 240" dangerouslySetInnerHTML={{ __html: rings + axLines + lbls + `<polygon points="${pts}" fill="rgba(37,99,235,0.2)" stroke="#3b82f6" stroke-width="1.5" stroke-linejoin="round" />` }} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    )}
    </>
  );
}
