import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Axis,
  SubStatus,
  Scores,
  DrawPersisted,
  SavedEvaluation,
  StudentData,
  StudentItem,
  ExaminerItem,
  DrawMode,
} from "../types";
import { useLocalStorage, getLocalStorageItem } from "./useLocalStorage";
import { useExamTimer } from "./useExamTimer";
import { formatDate, formatTime, generateId } from "../utils";
import { buildEvaluationsHtml } from "../utils/evaluations";
import { buildFolderName, saveFileToFolder } from "../utils/exportFolder";
import { useDialogs } from "../components/Dialogs";
import { sumAxesMax, computeTotal20, areAllSubItemsSelected } from "../utils/scoring";

const defaultAxes: Axis[] = [
  { id: "positionnement", label: "Positionnement", max: 3, subItems: [] },
  { id: "presentation", label: "Présentation", max: 3, subItems: [] },
  { id: "methodologie", label: "Méthodologie", max: 4, subItems: [] },
  { id: "precision", label: "Précision", max: 6, subItems: [] },
  { id: "discours", label: "Discours", max: 2, subItems: [] },
];

type EvaluationDraft = {
  studentData: StudentData;
  axes: Axis[];
  scores: Scores;
  subChecks: Record<string, Record<string, SubStatus>>;
  subComments: Record<string, Record<string, string>>;
  remarksPositive: string;
  remarksImprovement: string;
  drawPersisted: DrawPersisted | null;
};

// Réexport pour compatibilité avec les imports existants (App, etc.).
export { formatDurationMs } from "../utils/format";

function initScores(axes: Axis[]): Scores {
  const init: Scores = {};
  axes.forEach(a => { init[a.id] = a.max / 2; });
  return init;
}

function initTouched(axes: Axis[]): Record<string, boolean> {
  const init: Record<string, boolean> = {};
  axes.forEach(a => { init[a.id] = false; });
  return init;
}

function initSubMap<T>(axes: Axis[], defaultVal: T): Record<string, Record<string, T>> {
  const init: Record<string, Record<string, T>> = {};
  axes.forEach(a => {
    init[a.id] = {};
    (a.subItems || []).forEach(si => { init[a.id][si.id] = defaultVal; });
  });
  return init;
}

export function useEvaluationForm() {
  const { confirm, notify } = useDialogs();

  const [drawPersisted, setDrawPersisted] = useLocalStorage<DrawPersisted | null>("drawPersisted", null);
  const [drawEnabled, setDrawEnabled] = useLocalStorage<boolean>("drawEnabled", false);
  const [drawMode, setDrawMode] = useLocalStorage<DrawMode>("drawMode", "single");
  const [drawGroups, setDrawGroups] = useLocalStorage<{ id: string; title: string; questions: string[] }[]>("drawGroups", []);
  const [drawSingles, setDrawSingles] = useLocalStorage<string[]>("drawSingles", []);
  const [drawListValidated, setDrawListValidated] = useLocalStorage<boolean>("drawListValidated", false);

  const initialUe = getLocalStorageItem<string>("uePreset", "");
  const initialPromotion = getLocalStorageItem<string>("promotionPreset", "");
  const [examDurationMinutes, setExamDurationMinutes] = useLocalStorage<number>("examDurationMinutes", 0);
  const [showFinalNoteToEvaluator, setShowFinalNoteToEvaluator] = useLocalStorage<boolean>("showFinalNoteToEvaluator", false);
  const [showBaremeToEvaluator, setShowBaremeToEvaluator] = useLocalStorage<boolean>("showBaremeToEvaluator", false);
  const [showPercentToEvaluator, setShowPercentToEvaluator] = useLocalStorage<boolean>("showPercentToEvaluator", true);
  const [adminPassword, setAdminPassword] = useLocalStorage<string>("adminPassword", "0405");

  const [studentList, setStudentList] = useLocalStorage<StudentItem[]>("studentList", []);
  const [studentListValidated, setStudentListValidated] = useLocalStorage<boolean>("studentListValidated", false);
  const [defaultExaminer, setDefaultExaminer] = useLocalStorage<ExaminerItem>("defaultExaminer", { nom: "", prenom: "" });

  const [studentData, setStudentData] = useState<StudentData>({
    civilite: "",
    nom: "",
    prenom: "",
    evaluator: "",
    evaluatorNom: "",
    evaluatorPrenom: "",
    date: new Date().toISOString().split("T")[0],
    ue: initialUe,
    promotion: initialPromotion,
    questionNum: "",
  });

  useEffect(() => {
    setStudentData(prev => ({
      ...prev,
      evaluatorNom: defaultExaminer.nom.toUpperCase(),
      evaluatorPrenom: defaultExaminer.prenom.toUpperCase(),
    }));
  }, [defaultExaminer]);

  const [axes, setAxes] = useLocalStorage<Axis[]>("axesConfig", defaultAxes);

  const [scores, setScores] = useState<Scores>(() => {
    const savedAxes = getLocalStorageItem<Axis[]>("axesConfig", defaultAxes);
    return initScores(savedAxes);
  });

  const [touched, setTouched] = useState<Record<string, boolean>>(() => {
    const savedAxes = getLocalStorageItem<Axis[]>("axesConfig", defaultAxes);
    return initTouched(savedAxes);
  });

  const [subChecks, setSubChecks] = useState<Record<string, Record<string, SubStatus>>>(() => {
    const savedAxes = getLocalStorageItem<Axis[]>("axesConfig", defaultAxes);
    return initSubMap<SubStatus>(savedAxes, "");
  });

  const [subComments, setSubComments] = useState<Record<string, Record<string, string>>>(() => {
    const savedAxes = getLocalStorageItem<Axis[]>("axesConfig", defaultAxes);
    return initSubMap<string>(savedAxes, "");
  });

  const isLoadingEvaluation = useRef(false);

  // Sync subChecks/subComments/touched/scores when axes change
  useEffect(() => {
    if (isLoadingEvaluation.current) return;
    const timeoutId = window.setTimeout(() => {
      if (isLoadingEvaluation.current) return;

      setSubChecks(prev => {
        const next: Record<string, Record<string, SubStatus>> = {};
        let hasChange = false;
        axes.forEach(a => {
          const prevAxis = prev[a.id] || {};
          const map: Record<string, SubStatus> = {};
          (a.subItems || []).forEach(si => {
            map[si.id] = prevAxis[si.id] ?? "";
            if (prevAxis[si.id] === undefined) hasChange = true;
          });
          next[a.id] = map;
          if (!prev[a.id]) hasChange = true;
        });
        return hasChange ? next : prev;
      });

      setSubComments(prev => {
        const next: Record<string, Record<string, string>> = {};
        let hasChange = false;
        axes.forEach(a => {
          const prevAxis = prev[a.id] || {};
          const map: Record<string, string> = {};
          (a.subItems || []).forEach(si => {
            map[si.id] = prevAxis[si.id] ?? "";
            if (prevAxis[si.id] === undefined) hasChange = true;
          });
          next[a.id] = map;
          if (!prev[a.id]) hasChange = true;
        });
        return hasChange ? next : prev;
      });

      setTouched(prev => {
        const next: Record<string, boolean> = {};
        let hasChange = false;
        axes.forEach(a => {
          next[a.id] = prev[a.id] ?? false;
          if (prev[a.id] === undefined) hasChange = true;
        });
        return hasChange ? next : prev;
      });
    }, 100);
    return () => window.clearTimeout(timeoutId);
  }, [axes]);

  useEffect(() => {
    if (isLoadingEvaluation.current) return;
    const timeoutId = window.setTimeout(() => {
      if (isLoadingEvaluation.current) return;
      setScores(prev => {
        const next: Scores = { ...prev };
        let hasChange = false;
        axes.forEach(a => {
          if (next[a.id] === undefined) { next[a.id] = a.max / 2; hasChange = true; }
          if (next[a.id] > a.max) { next[a.id] = a.max; hasChange = true; }
        });
        Object.keys(next).forEach(id => {
          if (!axes.find(a => a.id === id)) { delete next[id]; hasChange = true; }
        });
        return hasChange ? next : prev;
      });
    }, 100);
    return () => window.clearTimeout(timeoutId);
  }, [axes]);

  const [remarksPositive, setRemarksPositive] = useState("");
  const [remarksImprovement, setRemarksImprovement] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  const timer = useExamTimer(examDurationMinutes);

  const [savedEvaluations, setSavedEvaluations] = useLocalStorage<SavedEvaluation[]>("savedEvaluations", []);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [, setExportDateTime] = useState({ date: "", time: "" });
  const [loadedStudentKey, setLoadedStudentKey] = useState<string | null>(null);
  const [loadedEvaluation, setLoadedEvaluation] = useState<SavedEvaluation | null>(null);

  // --- Computed values ---
  const axesMaxSum = useMemo(() => sumAxesMax(axes), [axes]);
  const total20 = useMemo(() => computeTotal20(axes, scores), [axes, scores]);

  const allSubItemsSelected = useMemo(
    () => areAllSubItemsSelected(axes, subChecks, subComments),
    [axes, subChecks, subComments],
  );

  const hasSelectedStudent = !!(studentData.nom.trim() || studentData.prenom.trim());
  const allAxesTouched = useMemo(() => axes.every(a => touched[a.id]), [axes, touched]);
  const someAxesTouched = useMemo(() => axes.some(a => touched[a.id]), [axes, touched]);
  const touchedCount = useMemo(() => axes.reduce((c, a) => (touched[a.id] ? c + 1 : c), 0), [axes, touched]);

  const { totalSubItems, completedSubItems } = useMemo(() => {
    let total = 0, complete = 0;
    axes.forEach(a => {
      const subs = a.subItems || [];
      total += subs.length;
      subs.forEach(si => { if (subChecks[a.id]?.[si.id]) complete += 1; });
    });
    return { totalSubItems: total, completedSubItems: complete };
  }, [axes, subChecks]);

  const hasAnyComment = remarksPositive.trim().length > 0 || remarksImprovement.trim().length > 0;
  const commentsReady = remarksPositive.trim().length > 0 && remarksImprovement.trim().length > 0;

  const combinedRemarks = useMemo(() => {
    const pos = remarksPositive.trim();
    const imp = remarksImprovement.trim();
    if (!pos && !imp) return "";
    if (pos && imp) return `Points positifs:\n${pos}\n\nAxes d'amélioration:\n${imp}`;
    if (pos) return `Points positifs:\n${pos}`;
    return `Axes d'amélioration:\n${imp}`;
  }, [remarksPositive, remarksImprovement]);

  const signatureReady = commentsReady && hasSelectedStudent && allSubItemsSelected && allAxesTouched;

  const allStudentsEvaluated =
    studentList.length > 0 &&
    studentList.every(s => savedEvaluations.some(ev => ev.student.nom === s.nom && ev.student.prenom === s.prenom));

  const questionsCount =
    drawMode === "single"
      ? drawSingles.length
      : drawGroups.reduce((sum, g) => sum + g.questions.length, 0);

  // --- Draft auto-save ---
  useEffect(() => {
    if (!hasSelectedStudent) return;
    const draft: EvaluationDraft = {
      studentData, axes, scores, subChecks, subComments, remarksPositive, remarksImprovement, drawPersisted,
    };
    const timeoutId = window.setTimeout(() => {
      try { window.localStorage.setItem("currentEvaluationDraft", JSON.stringify(draft)); } catch { /* quota */ }
    }, 800);
    return () => window.clearTimeout(timeoutId);
  }, [hasSelectedStudent, studentData, axes, scores, subChecks, subComments, remarksPositive, remarksImprovement, drawPersisted]);

  // --- Draft restore on mount ---
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem("currentEvaluationDraft");
    } catch {
      return;
    }
    if (!raw) return;

    let draft: EvaluationDraft;
    try {
      draft = JSON.parse(raw) as EvaluationDraft;
    } catch {
      return; // JSON corrompu
    }
    if (!draft.studentData?.nom && !draft.studentData?.prenom) return;

    (async () => {
      const ok = await confirm({
        title: "Reprendre l'évaluation ?",
        message: `Une évaluation en cours a été retrouvée pour ${draft.studentData.nom} ${draft.studentData.prenom}. Voulez-vous la reprendre ?`,
        confirmLabel: "Reprendre",
        cancelLabel: "Ignorer",
      });
      if (!ok) return;
      setStudentData(draft.studentData);
      setAxes(draft.axes);
      setScores(draft.scores);
      setSubChecks(draft.subChecks);
      setSubComments(draft.subComments);
      setRemarksPositive(draft.remarksPositive);
      setRemarksImprovement(draft.remarksImprovement);
      setDrawPersisted(draft.drawPersisted);
      setLoadedStudentKey(`${draft.studentData.nom}||${draft.studentData.prenom}`);
      const allTouched: Record<string, boolean> = {};
      draft.axes.forEach(a => { allTouched[a.id] = true; });
      setTouched(allTouched);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- beforeunload ---
  useEffect(() => {
    const hasUnsavedData = hasSelectedStudent && (someAxesTouched || hasAnyComment);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasSelectedStudent, someAxesTouched, hasAnyComment]);

  // --- Auto-update date ---
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hasSelectedStudent) {
        const today = new Date().toISOString().split("T")[0];
        if (studentData.date !== today) setStudentData(prev => ({ ...prev, date: today }));
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [hasSelectedStudent, studentData.date]);

  // --- Actions ---
  const resetScores = useCallback(() => {
    setScores(() => {
      const next: Scores = {};
      axes.forEach(a => { next[a.id] = Math.round((a.max / 2) * 10) / 10; });
      return next;
    });
    setSubChecks(() => initSubMap<SubStatus>(axes, ""));
    setTouched(() => initTouched(axes));
  }, [axes]);

  const resetEvaluationForm = useCallback(() => {
    resetScores();
    timer.reset();
    setSubComments(() => initSubMap<string>(axes, ""));
    setRemarksPositive("");
    setRemarksImprovement("");
    setSignatureImage(null);
    setDrawPersisted(null);
    setLoadedEvaluation(null);
  }, [axes, resetScores, setDrawPersisted, timer]);

  // Réinitialise toutes les données évaluateur (appelé à la sortie du mode admin)
  const resetEvaluatorSession = useCallback(() => {
    resetEvaluationForm();
    setStudentData(prev => ({
      ...prev,
      civilite: "",
      nom: "",
      prenom: "",
      questionNum: "",
    }));
    setLoadedStudentKey(null);
    setSelectedSavedId("");
  }, [resetEvaluationForm]);

  const saveCurrentEvaluation = useCallback(async () => {
    const now = new Date();
    const item: SavedEvaluation = {
      id: generateId(),
      createdAt: now.toISOString(),
      student: { civilite: studentData.civilite, nom: studentData.nom, prenom: studentData.prenom },
      examiner: { nom: studentData.evaluatorNom, prenom: studentData.evaluatorPrenom },
      date: studentData.date,
      ue: studentData.ue,
      promotion: studentData.promotion,
      remarks: combinedRemarks,
      remarksPositive,
      remarksImprovement,
      evaluationDurationMs: timer.elapsedMs > 0 ? timer.elapsedMs : undefined,
      signatureImage,
      axes: structuredClone(axes),
      scores: { ...scores },
      subChecks: structuredClone(subChecks),
      subComments: structuredClone(subComments),
      drawPersisted: drawPersisted ? structuredClone(drawPersisted) : null,
      total20,
    };

    const newAllEvals = [item, ...savedEvaluations.filter(
      ev => !(ev.student.nom === item.student.nom && ev.student.prenom === item.student.prenom),
    )];
    setSavedEvaluations(newAllEvals);

    try {
      const rawHtml = buildEvaluationsHtml([item]);
      const html = rawHtml;
      const [year, month, day] = item.date.split("-");
      const shortYear = year.slice(2);
      const safeNom = item.student.nom.replace(/\s+/g, "_");
      const safePrenom = item.student.prenom.replace(/\s+/g, "_");
      const datePart = `${day}-${month}-${shortYear}`;
      const pad = (n: number) => n.toString().padStart(2, "0");
      const timePart = `${pad(now.getHours())}h${pad(now.getMinutes())}m${pad(now.getSeconds())}`;
      const dirName = buildFolderName(item.promotion || "", item.ue, item.date);
      const fileName = `${safeNom}-${safePrenom}-${datePart}_${timePart}.html`;
      await saveFileToFolder(dirName, fileName, html);
    } catch (err) {
      console.error("Erreur lors de l'export HTML automatique", err);
      notify(
        "L'évaluation est enregistrée, mais l'export du fichier a échoué. Pensez à exporter manuellement.",
        "error",
      );
    }

    setExportDateTime({ date: formatDate(now), time: formatTime(now) });
    return { item, newAllEvals };
  }, [studentData, combinedRemarks, remarksPositive, remarksImprovement, signatureImage, axes, scores, subChecks, subComments, drawPersisted, total20, timer.elapsedMs, setSavedEvaluations, notify]);

  const loadSavedEvaluation = useCallback((id: string) => {
    const s = savedEvaluations.find(e => e.id === id);
    if (!s) return;

    setRemarksPositive(s.remarksPositive ?? "");
    setRemarksImprovement(s.remarksImprovement ?? "");
    setLoadedEvaluation(s);
    isLoadingEvaluation.current = true;
    setAxes(s.axes);

    window.setTimeout(() => {
      setScores(s.scores);
      setSubChecks(structuredClone(s.subChecks));
      setSubComments(structuredClone(s.subComments));

      const allTouched: Record<string, boolean> = {};
      s.axes.forEach(a => { allTouched[a.id] = true; });
      setTouched(allTouched);

      setSignatureImage(null);
      setStudentData(prev => ({
        ...prev,
        civilite: s.student.civilite || "",
        nom: s.student.nom,
        prenom: s.student.prenom,
        evaluatorNom: s.examiner.nom,
        evaluatorPrenom: s.examiner.prenom,
        date: s.date,
        ue: s.ue,
        promotion: s.promotion || "",
      }));
      setLoadedStudentKey(`${s.student.nom}||${s.student.prenom}`);
      setDrawPersisted(s.drawPersisted);

      const created = new Date(s.createdAt || `${s.date}T00:00:00`);
      setExportDateTime({ date: formatDate(created), time: formatTime(created) });

      window.setTimeout(() => { isLoadingEvaluation.current = false; }, 200);
    }, 50);
  }, [savedEvaluations, setAxes, setDrawPersisted]);

  const handleStudentChange = useCallback(async (value: string) => {
    const hasUnsavedData = someAxesTouched || hasAnyComment;
    if (hasSelectedStudent && hasUnsavedData) {
      const ok = await confirm({
        title: "Changer d'étudiant ?",
        message:
          "Attention : vous avez des données non sauvegardées pour l'étudiant actuel. " +
          "Voulez-vous vraiment changer d'étudiant ? Les données non validées seront perdues.",
        confirmLabel: "Changer",
        danger: true,
      });
      if (!ok) return;
      resetEvaluationForm();
    }
    setLoadedStudentKey(null);
    setLoadedEvaluation(null);
    if (!value) {
      setStudentData(prev => ({ ...prev, civilite: "", nom: "", prenom: "" }));
      setDrawPersisted(null);
    } else {
      const [nom, prenom] = value.split("||");
      const found = studentList.find(s => s.nom === nom && s.prenom === prenom);
      setStudentData(prev => ({ ...prev, civilite: found?.civilite || "", nom, prenom }));
    }
  }, [someAxesTouched, hasAnyComment, hasSelectedStudent, resetEvaluationForm, studentList, setDrawPersisted, confirm]);

  // Réinitialisation globale (mode administrateur).
  // scope "config" : efface toute la configuration à renseigner mais conserve
  //   les évaluations enregistrées.
  // scope "all" : remise à zéro complète, y compris les évaluations enregistrées.
  const resetData = useCallback((scope: "config" | "all") => {
    // Listes et paramètres de configuration
    setStudentList([]);
    setStudentListValidated(false);
    setDrawPersisted(null);
    setDrawEnabled(false);
    setDrawMode("single");
    setDrawGroups([]);
    setDrawSingles([]);
    setDrawListValidated(false);
    setExamDurationMinutes(0);
    setDefaultExaminer({ nom: "", prenom: "" });
    setShowFinalNoteToEvaluator(false);
    setShowBaremeToEvaluator(false);


    // Axes et état d'évaluation en cours
    setAxes(defaultAxes);
    setScores(initScores(defaultAxes));
    setTouched(initTouched(defaultAxes));
    setSubChecks(initSubMap<SubStatus>(defaultAxes, ""));
    setSubComments(initSubMap<string>(defaultAxes, ""));
    setRemarksPositive("");
    setRemarksImprovement("");
    setSignatureImage(null);
    setLoadedStudentKey(null);
    setLoadedEvaluation(null);
    setSelectedSavedId("");
    setStudentData({
      civilite: "",
      nom: "",
      prenom: "",
      evaluator: "",
      evaluatorNom: "",
      evaluatorPrenom: "",
      date: new Date().toISOString().split("T")[0],
      ue: "",
      promotion: "",
      questionNum: "",
    });
    timer.reset();

    // Clés stockées hors du mécanisme useLocalStorage
    try {
      window.localStorage.removeItem("uePreset");
      window.localStorage.removeItem("promotionPreset");
      window.localStorage.removeItem("currentEvaluationDraft");
    } catch {
      /* ignore */
    }

    if (scope === "all") {
      setSavedEvaluations([]);
    }
  }, [
    setStudentList,
    setStudentListValidated,
    setDrawPersisted,
    setDrawEnabled,
    setDrawMode,
    setDrawGroups,
    setDrawSingles,
    setDrawListValidated,
    setExamDurationMinutes,
    setDefaultExaminer,
    setShowFinalNoteToEvaluator,
    setShowBaremeToEvaluator,
    setAxes,
    setSavedEvaluations,
    timer,
  ]);

  // --- Sauvegarde / restauration complète (chiffrée) ---
  const exportAllData = useCallback(async () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      savedEvaluations,
      studentList,
      studentListValidated,
      axes,
      drawEnabled,
      drawMode,
      drawGroups,
      drawSingles,
      drawListValidated,
      examDurationMinutes,
      defaultExaminer,
      showFinalNoteToEvaluator,
      showBaremeToEvaluator,
      showPercentToEvaluator,
      uePreset: getLocalStorageItem<string>("uePreset", ""),
      promotionPreset: getLocalStorageItem<string>("promotionPreset", ""),
    };
    const payload = JSON.stringify(backup, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sauvegarde-evaluations-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [
    savedEvaluations,
    studentList,
    studentListValidated,
    axes,
    drawEnabled,
    drawMode,
    drawGroups,
    drawSingles,
    drawListValidated,
    examDurationMinutes,
    defaultExaminer,
    showFinalNoteToEvaluator,
    showBaremeToEvaluator,
    showPercentToEvaluator,
  ]);

  const importAllData = useCallback(
    async (encryptedJson: string): Promise<boolean> => {
      type FullBackup = {
        savedEvaluations?: SavedEvaluation[];
        studentList?: StudentItem[];
        studentListValidated?: boolean;
        axes?: Axis[];
        drawEnabled?: boolean;
        drawMode?: DrawMode;
        drawGroups?: { id: string; title: string; questions: string[] }[];
        drawSingles?: string[];
        drawListValidated?: boolean;
        examDurationMinutes?: number;
        defaultExaminer?: ExaminerItem;
        showFinalNoteToEvaluator?: boolean;
        showBaremeToEvaluator?: boolean;
        showPercentToEvaluator?: boolean;
        uePreset?: string;
        promotionPreset?: string;
      };

      let data: FullBackup;
      try {
        data = JSON.parse(encryptedJson) as FullBackup;
      } catch {
        return false; // mot de passe incorrect ou fichier invalide
      }

      isLoadingEvaluation.current = true;

      setSavedEvaluations(data.savedEvaluations ?? []);
      setStudentList(data.studentList ?? []);
      setStudentListValidated(!!data.studentListValidated);
      setDrawEnabled(!!data.drawEnabled);
      setDrawMode(data.drawMode ?? "single");
      setDrawGroups(data.drawGroups ?? []);
      setDrawSingles(data.drawSingles ?? []);
      setDrawListValidated(!!data.drawListValidated);
      setExamDurationMinutes(data.examDurationMinutes ?? 0);
      setDefaultExaminer(data.defaultExaminer ?? { nom: "", prenom: "" });
      setShowFinalNoteToEvaluator(!!data.showFinalNoteToEvaluator);
      setShowBaremeToEvaluator(!!data.showBaremeToEvaluator);
      setShowPercentToEvaluator(data.showPercentToEvaluator ?? true);

      const importedAxes = data.axes ?? defaultAxes;
      setAxes(importedAxes);
      setScores(initScores(importedAxes));
      setTouched(initTouched(importedAxes));
      setSubChecks(initSubMap<SubStatus>(importedAxes, ""));
      setSubComments(initSubMap<string>(importedAxes, ""));

      setRemarksPositive("");
      setRemarksImprovement("");
      setSignatureImage(null);
      setLoadedStudentKey(null);
      setLoadedEvaluation(null);
      setSelectedSavedId("");
      setDrawPersisted(null);

      try {
        window.localStorage.setItem("uePreset", JSON.stringify(data.uePreset ?? ""));
        window.localStorage.setItem("promotionPreset", JSON.stringify(data.promotionPreset ?? ""));
        window.localStorage.removeItem("currentEvaluationDraft");
      } catch {
        /* ignore */
      }

      setStudentData(prev => ({
        ...prev,
        civilite: "",
        nom: "",
        prenom: "",
        ue: data.uePreset ?? "",
        promotion: data.promotionPreset ?? "",
      }));

      window.setTimeout(() => {
        isLoadingEvaluation.current = false;
      }, 200);
      return true;
    },
    [
      setSavedEvaluations,
      setStudentList,
      setStudentListValidated,
      setDrawEnabled,
      setDrawMode,
      setDrawGroups,
      setDrawSingles,
      setDrawListValidated,
      setExamDurationMinutes,
      setDefaultExaminer,
      setShowFinalNoteToEvaluator,
      setShowBaremeToEvaluator,
      setAxes,
      setDrawPersisted,
    ],
  );

  const selectedStudentValue =
    loadedStudentKey ?? (studentData.nom || studentData.prenom ? `${studentData.nom}||${studentData.prenom}` : "");

  return {
    // Draw
    drawPersisted, setDrawPersisted,
    drawEnabled, setDrawEnabled,
    drawMode, setDrawMode,
    drawGroups, setDrawGroups,
    drawSingles, setDrawSingles,
    drawListValidated, setDrawListValidated,

    // Exam config
    examDurationMinutes, setExamDurationMinutes,
    showFinalNoteToEvaluator, setShowFinalNoteToEvaluator,
    showBaremeToEvaluator, setShowBaremeToEvaluator,
    showPercentToEvaluator, setShowPercentToEvaluator,
    adminPassword, setAdminPassword,

    // Students
    studentList, setStudentList,
    studentListValidated, setStudentListValidated,
    defaultExaminer, setDefaultExaminer,
    studentData, setStudentData,

    // Axes & scores
    axes, setAxes,
    scores, setScores,
    touched, setTouched,
    subChecks, setSubChecks,
    subComments, setSubComments,

    // Remarks
    remarksPositive, setRemarksPositive,
    remarksImprovement, setRemarksImprovement,

    // Signature
    signatureImage, setSignatureImage,

    // Timer
    timer,

    // Saved evaluations
    savedEvaluations, setSavedEvaluations,
    selectedSavedId, setSelectedSavedId,
    loadedStudentKey, setLoadedStudentKey,
    loadedEvaluation, setLoadedEvaluation,

    // Computed
    axesMaxSum,
    total20,
    allSubItemsSelected,
    hasSelectedStudent,
    allAxesTouched,
    someAxesTouched,
    touchedCount,
    totalSubItems, completedSubItems,
    hasAnyComment,
    commentsReady,
    combinedRemarks,
    signatureReady,
    allStudentsEvaluated,
    questionsCount,
    selectedStudentValue,

    // Actions
    resetScores,
    resetEvaluationForm,
    resetEvaluatorSession,
    saveCurrentEvaluation,
    loadSavedEvaluation,
    handleStudentChange,
    resetData,
    exportAllData,
    importAllData,
  };
}
