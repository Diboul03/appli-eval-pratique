import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, CheckCircle, Trash2, FlaskConical } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute, Axis, EvalConfig, ExaminerItem, QuestionGroup, StudentData, StudentItem } from "../types";
import { PROMOTIONS } from "../types";
import { useEvalStore, blankConfig } from "../hooks/useEvalStore";
import { AdminPanel } from "../components/AdminPanel";
import { useDialogs } from "../components/Dialogs";
import { sumAxesMax } from "../utils/scoring";
import { generateId } from "../utils";


interface Props {
  mode: "create" | "edit";
  evalId?: string;
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

export function EvalConfigPage({ mode, evalId, onNavigate, onRequestPreview }: Props) {
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

  const handleSave = () => {
    if (!studentData.promotion || !studentData.ue) {
      notify("Veuillez renseigner la promotion et l'U.E. avant de valider.", "error");
      return;
    }
    if (mode === "create" || !selectedId) {
      const cfg = createConfig(gatherConfig());
      notify(`Évaluation "${cfg.ue}" (${cfg.promotion}) créée.`);
      onNavigate({ page: "admin-home" });
    } else {
      updateConfig(selectedId, gatherConfig());
      notify("Évaluation mise à jour.");
      onNavigate({ page: "admin-home" });
    }
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
    onNavigate({ page: "admin-home" });
  };

  const fillTest = () => {
    setStudentData(prev => ({ ...prev, promotion: "PCEO2", ue: "UE Kinésithérapie — Bilan articulaire" }));
    setDefaultExaminer({ nom: "DUPONT", prenom: "MARIE" });
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
        title: "Bilan articulaire",
        questions: ["Décrire le bilan de l'épaule", "Mesurer la flexion du genou en DD", "Bilan de la cheville post-entorse"],
      },
      {
        id: generateId(),
        title: "Bilan musculaire",
        questions: ["Testing du quadriceps", "Évaluation des rotateurs de hanche", "Testing des fléchisseurs plantaires"],
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-800 px-6 py-3">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <div className="flex items-center gap-3">
          <img src={logoDataUri} alt="" className="h-7 w-auto brightness-0 invert opacity-70" />
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
          {onRequestPreview && (
            <button
              type="button"
              onClick={() => onRequestPreview({ ...blankConfig(), ...gatherConfig() } as EvalConfig)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/50 hover:bg-white/5 hover:text-white/80"
            >
              <Eye size={13} /> Aperçu
            </button>
          )}
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
        onRequestReset={() => {}}
        hideUePromoDuration
      />
    </div>
  );
}
