import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { PenTool, HelpCircle, Settings, AlertTriangle, Target, Download, Upload, KeyRound, TableIcon } from "lucide-react";
import { useEvaluationForm, formatDurationMs } from "./hooks/useEvaluationForm";
import { useEvalStore } from "./hooks/useEvalStore";
import { HomePage } from "./pages/HomePage";
import { AdminHomePage } from "./pages/AdminHomePage";
import { AdminSessionPage } from "./pages/AdminSessionPage";
import { EvalConfigPage } from "./pages/EvalConfigPage";
import { EvaluatorSelectPage } from "./pages/EvaluatorSelectPage";
import { BddSelectPage } from "./pages/BddSelectPage";
import { RecapSelectPage } from "./pages/RecapSelectPage";
import type { AppRoute } from "./types";
import { Modal } from "./components/Modal";
import { Button } from "./components/Button";
import { useDialogs } from "./hooks/useDialogs";
import { EvaluationPicker } from "./components/EvaluationPicker";
import { StudentStep } from "./components/StudentStep";
import { StickyHeader } from "./components/StickyHeader";
import { ExaminerStep } from "./components/ExaminerStep";
import { RemarksStep } from "./components/RemarksStep";
import { SignatureStep } from "./components/SignatureStep";
import { DashboardModal } from "./components/DashboardModal";
import { RadarChart } from "./components/RadarChart";
import { ContextHelp } from "./components/ContextHelp";
import { AdminPanel } from "./components/AdminPanel";
import { BddPanel } from "./components/BddPanel";
import { RecapTable } from "./components/RecapTable";
import { useEvaluationStats } from "./hooks/useEvaluationStats";
import { buildEvaluationsHtml } from "./utils/evaluations";
import { buildArchivesPath, buildNotesPath, buildExportFileName, saveFileToFolder, sanitizeFolder } from "./utils/exportFolder";
import { buildRecapXlsxBuffer } from "./utils/recapXlsx";
import { printHtml, buildRecapHtml } from "./utils/printPdf";
import { logoDataUri } from "./assets/logo";
import type { DrawPersisted } from "./types";

export function App() {
  const [route, setRoute] = useState<AppRoute>({ page: "home" });
  const isOnline = useOnlineStatus();

  const offlineBadge = !isOnline ? (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full border border-red-300 bg-red-600 px-3 py-1.5 shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white" />
      <span className="text-[11px] font-bold uppercase tracking-wide text-white">Hors ligne</span>
    </div>
  ) : null;

  if (route.page === "home") return <>{<HomePage onNavigate={setRoute} />}{offlineBadge}</>;
  if (route.page === "admin-home") return <>{<AdminHomePage onNavigate={setRoute} />}{offlineBadge}</>;
  if (route.page === "admin-session-detail") return <>{<AdminSessionPage sessionId={route.sessionId} onNavigate={setRoute} />}{offlineBadge}</>;
  if (route.page === "admin-create") return <>{<EvalConfigPage mode="create" sessionId={route.sessionId} onNavigate={setRoute} onRequestPreview={cfg => setRoute({ page: "admin-preview", config: cfg, backRoute: { page: "admin-create", sessionId: route.sessionId } })} />}{offlineBadge}</>;
  if (route.page === "admin-edit") return <>{<EvalConfigPage mode="edit" evalId={route.evalId} sessionId={route.sessionId} onNavigate={setRoute} onRequestPreview={cfg => setRoute({ page: "admin-preview", config: cfg, backRoute: { page: "admin-edit", evalId: route.evalId, sessionId: route.sessionId } })} />}{offlineBadge}</>;
  if (route.page === "admin-bdd") return <>{<BddSelectPage onNavigate={setRoute} />}{offlineBadge}</>;
  if (route.page === "admin-recap") return <>{<RecapSelectPage onNavigate={setRoute} />}{offlineBadge}</>;
  if (route.page === "admin-preview") return <>{<EvaluatorWizard previewConfig={route.config} onBack={() => setRoute(route.backRoute)} onNavigate={setRoute} />}{offlineBadge}</>;
  if (route.page === "eval-select-evaluator" || route.page === "eval-select-ue") {
    return <>{<EvaluatorSelectPage route={route} onNavigate={setRoute} />}{offlineBadge}</>;
  }
  // route.page === "eval-run" → EvaluatorWizard
  const evalId = route.page === "eval-run" ? route.evalId : undefined;
  return <>{<EvaluatorWizard evalId={evalId} onNavigate={setRoute} />}{offlineBadge}</>;
}

function EvaluatorWizard({ evalId, previewConfig, onBack, onNavigate }: { evalId?: string; previewConfig?: import("./types").EvalConfig; onBack?: () => void; onNavigate: (r: AppRoute) => void }) {
  const { confirm, notify } = useDialogs();
  const form = useEvaluationForm();
  const evalStore = useEvalStore();

  // Plein écran automatique en mode éval (pas en aperçu admin)
  useEffect(() => {
    if (previewConfig) return;
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [previewConfig]);

  // Charge la config de l'éval sélectionnée dans le formulaire au montage
  useEffect(() => {
    const cfg = previewConfig ?? (evalId ? evalStore.getConfig(evalId) : null);
    if (!cfg) return;
    form.setStudentList(cfg.studentList);
    form.setStudentListValidated(cfg.studentListValidated);
    form.setAxes(cfg.axes);
    form.setDrawEnabled(cfg.drawEnabled);
    form.setDrawMode(cfg.drawMode);
    form.setDrawGroups(cfg.drawGroups);
    form.setDrawSingles(cfg.drawSingles);
    form.setDrawListValidated(cfg.drawListValidated);
    form.setExamDurationMinutes(cfg.examDurationMinutes);
    form.setDefaultExaminer(cfg.defaultExaminer);
    form.setShowFinalNoteToEvaluator(cfg.showFinalNoteToEvaluator);
    form.setShowBaremeToEvaluator(cfg.showBaremeToEvaluator);
    form.setShowPercentToEvaluator(cfg.showPercentToEvaluator);
    form.setSavedEvaluations(cfg.savedEvaluations);
    form.setStudentData(prev => ({
      ...prev,
      ue: cfg.ue,
      promotion: cfg.promotion,
      evaluatorNom: cfg.defaultExaminer.nom,
      evaluatorPrenom: cfg.defaultExaminer.prenom,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalId, previewConfig]);

  const [showHelp, setShowHelp] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [adminView, setAdminView] = useState<"config" | "preview" | "recap" | "bdd">("config");
  const [bddTestTrigger, setBddTestTrigger] = useState(0);
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordCode, setCoordCode] = useState("");
  const [coordError, setCoordError] = useState("");
  const [showPreExitModal, setShowPreExitModal] = useState(false);
  const [preExitNeeds, setPreExitNeeds] = useState<{ students: boolean; questions: boolean; duration: boolean }>(
    { students: false, questions: false, duration: false },
  );

  const [evalStep, setEvalStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const radarSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (evalStep === 3) {
      window.setTimeout(() => {
        radarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [evalStep]);

  const [isSaving, setIsSaving] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const [bulkStudentsText, setBulkStudentsText] = useState("");
  const [bulkGroupsText, setBulkGroupsText] = useState("");
  const [bulkSinglesText, setBulkSinglesText] = useState("");

  const studentsSectionRef = useRef<HTMLDivElement | null>(null);
  const questionsSectionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastDrawSignatureRef = useRef<string | null>(null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<typeof form.savedEvaluations[number] | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const [showExitRecapModal, setShowExitRecapModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<"config" | "all">("config");
  const [resetCode, setResetCode] = useState("");
  const [resetError, setResetError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");



  // Retour étape 1 quand l'étudiant est désélectionné/réinitialisé
  useEffect(() => {
    if (!form.hasSelectedStudent && !isCoordinator) setEvalStep(1);
  }, [form.hasSelectedStudent, isCoordinator]);

  // Auto-avance quand l'étudiant est sélectionné à l'étape 1
  useEffect(() => {
    if (form.hasSelectedStudent && evalStep === 1 && !isCoordinator) {
      if (form.drawEnabled) doDraw(false); // tirage sans démarrer le chrono
      setEvalStep(2); // toujours passer à l'étape 2 (chrono démarre sur "Commencer")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hasSelectedStudent]);

  // La modal de validation est déclenchée manuellement via le bouton "Valider"
  // (plus d'auto-modal sur signatureImage pour éviter le bug double-appui)

  const clearCanvasSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const handleResetEvaluation = useCallback(() => {
    form.resetEvaluationForm();
    clearCanvasSignature();
  }, [form, clearCanvasSignature]);

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    if (e.type === "mousedown" || e.type === "touchstart") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!form.signatureReady) return;
    isDrawing.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (canvasRef.current) form.setSignatureImage(canvasRef.current.toDataURL());
  };

  const clearSignature = () => {
    clearCanvasSignature();
    form.setSignatureImage(null);
  };

  const doDraw = useCallback((startTimer = true) => {
    if (!form.drawEnabled) {
      notify("Le tirage au sort est désactivé.", "error");
      return;
    }

    if (form.drawMode === "group") {
      const pools = form.drawGroups.filter(g => g.questions.length > 0);
      if (pools.length === 0) { notify("Aucun groupe avec des questions.", "error"); return; }
      const candidates = pools.map(group => ({
        group,
        signature: `G|${group.title}::${group.questions.join("||")}`,
      }));
      let filtered = candidates;
      if (lastDrawSignatureRef.current) {
        const tmp = candidates.filter(c => c.signature !== lastDrawSignatureRef.current);
        if (tmp.length > 0) filtered = tmp;
      }
      const chosen = filtered[Math.floor(Math.random() * filtered.length)];
      const payload: DrawPersisted = { mode: "group", group: chosen.group };
      lastDrawSignatureRef.current = chosen.signature;
      form.setDrawPersisted(payload);
      if (startTimer && form.examDurationMinutes > 0) form.timer.start();
    } else {
      const list = form.drawSingles.filter(q => q.trim());
      if (list.length === 0) { notify("Aucune question unique disponible.", "error"); return; }
      const candidates = list.map(q => ({ question: q, signature: `S|${q}` }));
      let filtered = candidates;
      if (lastDrawSignatureRef.current) {
        const tmp = candidates.filter(c => c.signature !== lastDrawSignatureRef.current);
        if (tmp.length > 0) filtered = tmp;
      }
      const chosen = filtered[Math.floor(Math.random() * filtered.length)];
      const payload: DrawPersisted = { mode: "single", question: chosen.question };
      lastDrawSignatureRef.current = chosen.signature;
      form.setDrawPersisted(payload);
      if (startTimer && form.examDurationMinutes > 0) form.timer.start();
    }
  }, [form, notify]);

  const handleExitAdmin = useCallback(() => {
    const needStudents =
      !form.studentListValidated &&
      (form.studentList.length > 0 || bulkStudentsText.trim().length > 0);
    const needQuestions =
      form.drawEnabled &&
      !form.drawListValidated &&
      ((form.drawMode === "group" && (bulkGroupsText.trim().length > 0 || form.drawGroups.length > 0)) ||
       (form.drawMode === "single" && (bulkSinglesText.trim().length > 0 || form.drawSingles.length > 0)));
    const needDuration = form.examDurationMinutes <= 0;
    if (needStudents || needQuestions || needDuration) {
      setPreExitNeeds({ students: needStudents, questions: needQuestions, duration: needDuration });
      setShowPreExitModal(true);
    } else {
      setShowExitRecapModal(true);
    }
  }, [form, bulkStudentsText, bulkGroupsText, bulkSinglesText]);

  const openResetModal = useCallback(() => {
    setResetScope("config");
    setResetCode("");
    setResetError("");
    setShowResetModal(true);
  }, []);

  const confirmReset = () => {
    if (resetCode.trim() !== form.adminPassword) {
      setResetError("Code incorrect");
      return;
    }
    form.resetData(resetScope);
    clearCanvasSignature();
    setShowResetModal(false);
    setResetCode("");
    setResetError("");
    notify(
      resetScope === "all"
        ? "Remise à zéro complète effectuée."
        : "Données de configuration effacées.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPasswordModal = useCallback(() => {
    setNewAdminPassword("");
    setConfirmAdminPassword("");
    setPasswordChangeError("");
    setShowPasswordModal(true);
  }, []);

  const confirmChangeAdminPassword = () => {
    if (!newAdminPassword.trim()) {
      setPasswordChangeError("Le mot de passe ne peut pas être vide.");
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordChangeError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    form.setAdminPassword(newAdminPassword.trim());
    setShowPasswordModal(false);
    setNewAdminPassword("");
    setConfirmAdminPassword("");
    setPasswordChangeError("");
    notify("Mot de passe administrateur modifié.");
  };


  // --- Sauvegarde / restauration complète (#1) ---
  const handleExportBackup = useCallback(async () => {
    try {
      await form.exportAllData();
      notify("Sauvegarde complète téléchargée.");
    } catch {
      notify("Échec de la création de la sauvegarde.", "error");
    }
  }, [form, notify]);

  const handleExportRecapXlsx = useCallback(async () => {
    if (form.savedEvaluations.length === 0) {
      notify("Aucune évaluation enregistrée à exporter.", "error");
      return;
    }
    try {
      const buffer = await buildRecapXlsxBuffer(form.savedEvaluations);
      const sanitize = (s: string) =>
        s.replace(/[[\]*?:/\\]/g, "-").replace(/\s+/g, " ").trim();
      const first = form.savedEvaluations[0];
      const safeName = [sanitize(first.ue || ""), sanitize(first.promotion || "")]
        .filter(Boolean).join(" - ").slice(0, 100) || "recap-notes";
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch {
      notify("Erreur lors de la génération du fichier Excel.", "error");
    }
  }, [form.savedEvaluations, notify]);

  const handleRestoreFile = useCallback(
    async (file: File) => {
      const ok = await confirm({
        title: "Restaurer une sauvegarde ?",
        message:
          "Cette opération remplacera TOUTES les données actuelles (évaluations, étudiants, " +
          "questions, configuration) par le contenu du fichier. Action irréversible. Continuer ?",
        confirmLabel: "Restaurer",
        danger: true,
      });
      if (!ok) return;

      try {
        const text = await file.text();
        const success = await form.importAllData(text);
        if (success) {
          clearCanvasSignature();
          notify("Sauvegarde restaurée avec succès.");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          notify("Fichier invalide ou mot de passe incorrect.", "error");
        }
      } catch {
        notify("Impossible de lire le fichier de sauvegarde.", "error");
      }
    },
    [form, confirm, notify, clearCanvasSignature],
  );

  const validateCoordCode = () => {
    if (coordCode.trim() === form.adminPassword) {
      setIsCoordinator(true);
      setAdminView("config");
      setShowCoordModal(false);
      setCoordError("");
      setCoordCode("");
    } else {
      setCoordError("Code incorrect");
    }
  };

  const stats = useEvaluationStats(form.savedEvaluations);

  const studentsEvaluatedCount = form.savedEvaluations.length;
  const totalStudentsCount = form.studentList.length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <StickyHeader
        isCoordinator={isCoordinator}
        hasSelectedStudent={form.hasSelectedStudent}
        studentData={form.studentData}
        studentsEvaluatedCount={studentsEvaluatedCount}
        totalStudentsCount={totalStudentsCount}
        drawEnabled={form.drawEnabled}
        drawPersisted={form.drawPersisted}
        onDrawQuestion={doDraw}
        onResetEvaluation={handleResetEvaluation}
        onResetAndRedraw={() => { handleResetEvaluation(); form.timer.reset(); doDraw(false); setEvalStep(2); }}
        examDurationMinutes={form.examDurationMinutes}
        elapsedMs={form.timer.elapsedMs}
        remainingMs={form.timer.remainingMs}
        isOvertime={form.timer.isOvertime}
        isTimerRunning={form.timer.isRunning}
        onStartTimer={form.timer.start}
        evalStep={evalStep}
      />

      <div className="p-2 md:p-6">
        <div
          id="export-area"
          className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200 print:shadow-none"
        >
          <div className="border-b border-white/10 bg-slate-800 p-4 text-white md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <img
                src={logoDataUri}
                alt="Logo IFSO Vichy Clermont-FD"
                className="h-12 w-auto brightness-0 invert opacity-80 md:h-14"
              />
              <div className="flex items-center gap-2">
                {previewConfig ? (
                  <button
                    type="button"
                    onClick={() => onBack ? onBack() : onNavigate({ page: "admin-home" })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-100/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-800 hover:bg-indigo-200 transition-colors"
                  >
                    ← Retour config
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: "home" })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    🏠 Accueil
                  </button>
                )}
                <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  previewConfig
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : isCoordinator
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}>
                  {previewConfig ? "👁 Mode aperçu" : isCoordinator ? "⚙️ Mode administrateur" : "📋 Mode évaluateur"}
                </span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-3 text-center md:mb-0 md:text-left">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-white/40">
                  IFSO Vichy Clermont-Ferrand
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                  PRAXIE
                </h1>
              </div>

              <div className="flex flex-col items-end gap-2">
                {!isCoordinator && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Settings size={14} />}
                    onClick={() => onNavigate({ page: "admin-home" })}
                    className="uppercase"
                  >
                    Accès administrateur
                  </Button>
                )}

                <div className="hidden flex-col items-end gap-2 md:flex">

                  {/* Ligne 1 : aide + quitter */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<HelpCircle size={16} />}
                      onClick={() => setShowHelp(true)}
                      className="uppercase text-emerald-900 hover:bg-emerald-700/10"
                    >
                      Aide
                    </Button>
                    {isCoordinator && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleExitAdmin}
                        className="uppercase"
                      >
                        Quitter admin
                      </Button>
                    )}
                  </div>

                  {isCoordinator && (
                    <>
                      {/* Ligne 2 : actions groupées par thème */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2">
                        {/* Groupe MDP */}
                        <div className="flex items-center gap-1">
                          <Button variant="neutral" size="sm" icon={<KeyRound size={13} />} onClick={openPasswordModal}>
                            MDP admin
                          </Button>
                        </div>

                        <div className="h-5 w-px bg-stone-300" />

                        {/* Groupe sauvegarde */}
                        <div className="flex items-center gap-1">
                          <Button variant="neutral" size="sm" icon={<Download size={13} />} onClick={handleExportBackup}>
                            Sauvegarde
                          </Button>
                          <Button variant="neutral" size="sm" icon={<Upload size={13} />} onClick={() => restoreInputRef.current?.click()}>
                            Restaurer
                          </Button>
                          <input
                            ref={restoreInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="sr-only"
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) await handleRestoreFile(file);
                            }}
                          />
                        </div>

                        <div className="h-5 w-px bg-stone-300" />

                        {/* Groupe exports */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="info"
                            size="sm"
                            onClick={async () => {
                              if (form.savedEvaluations.length === 0) {
                                notify("Aucune évaluation terminée à exporter.", "error");
                                return;
                              }
                              const html = buildEvaluationsHtml(form.savedEvaluations);
                              const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `evaluations-${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                            }}
                          >
                            Export HTML
                          </Button>
                          <Button
                            variant="neutral"
                            size="sm"
                            icon={<TableIcon size={13} />}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={handleExportRecapXlsx}
                          >
                            Excel
                          </Button>
                          <Button
                            variant="neutral"
                            size="sm"
                            className="bg-rose-600 text-white hover:bg-rose-700"
                            onClick={() => {
                              if (form.savedEvaluations.length === 0) {
                                notify("Aucune évaluation à exporter.", "error");
                                return;
                              }
                              const first = form.savedEvaluations[0];
                              const title = [first.ue, first.promotion].filter(Boolean).join(" — ");
                              printHtml(buildRecapHtml(form.savedEvaluations, title), title);
                            }}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="neutral"
                            size="sm"
                            className="bg-purple-600 text-white hover:bg-purple-700"
                            onClick={() => setShowDashboard(true)}
                          >
                            Dashboard
                          </Button>
                        </div>
                      </div>

                      {/* Ligne 3 : sélection évaluation */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-lg bg-emerald-700/10 px-3 py-2">
                        <EvaluationPicker
                          savedEvaluations={form.savedEvaluations}
                          value={form.selectedSavedId}
                          onChange={form.setSelectedSavedId}
                          placeholder="— Évaluations enregistrées —"
                          className="min-w-[220px]"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!form.selectedSavedId}
                          onClick={() => {
                            if (form.selectedSavedId) {
                              form.loadSavedEvaluation(form.selectedSavedId);
                              clearCanvasSignature();
                              window.setTimeout(() => setEvalStep(3), 120);
                            }
                          }}
                        >
                          Charger
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={!form.selectedSavedId}
                          onClick={() => {
                            if (!form.selectedSavedId) return;
                            const found = form.savedEvaluations.find(e => e.id === form.selectedSavedId) || null;
                            if (!found) return;
                            setEvaluationToDelete(found);
                            setShowDeleteModal(true);
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!isCoordinator && form.allStudentsEvaluated && !form.loadedStudentKey ? (
            <div className="p-8 text-center">
              <div className="mb-4 text-6xl">🎉</div>
              <h2 className="mb-2 text-2xl font-black text-emerald-700">ÉPREUVE TERMINÉE</h2>
              <p className="mb-6 text-slate-600">Tous les étudiants ont été évalués.</p>

              <div className="mb-6 inline-block rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <span className="text-lg font-bold text-emerald-800">
                  {form.savedEvaluations.length} évaluations enregistrées
                </span>
              </div>

              <div className="mx-auto max-w-md rounded-xl border bg-slate-50 p-4">
                <label className="mb-2 block text-xs font-black uppercase text-slate-500">
                  Modifier une évaluation
                </label>
                <div className="flex items-end gap-2">
                  <EvaluationPicker
                    savedEvaluations={form.savedEvaluations}
                    value={form.selectedSavedId}
                    onChange={form.setSelectedSavedId}
                    showNote={false}
                    className="flex-1 text-left"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!form.selectedSavedId}
                    onClick={() => {
                      if (form.selectedSavedId) {
                        form.loadSavedEvaluation(form.selectedSavedId);
                        clearCanvasSignature();
                        // Attendre que loadSavedEvaluation ait positionné loadedStudentKey
                        window.setTimeout(() => setEvalStep(3), 120);
                      }
                    }}
                  >
                    Charger
                  </Button>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Pour exporter, passez en mode administrateur.
              </p>
            </div>
          ) : (
            <>
              {isCoordinator && (
                <>
                  <div className="flex gap-1 border-b-2 border-amber-300 bg-amber-100 px-4 pt-3">
                    {(
                      [
                        { key: "config",  label: "Configuration" },
                        { key: "preview", label: "Aperçu évaluateur" },
                        { key: "recap",   label: "Récapitulatif des notes" },
                        { key: "bdd",     label: "Création BDD" },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAdminView(key)}
                        className={`rounded-t-lg px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-all ${
                          adminView === key
                            ? "border-2 border-b-0 border-amber-400 bg-white text-amber-900 shadow-sm"
                            : "border-2 border-transparent bg-amber-200/70 text-amber-800 hover:bg-amber-200 hover:text-amber-900"
                        }`}
                      >
                        {label}
                      </button>
                    ))}

                    {/* Bouton remplissage test */}
                    <div className="ml-auto flex items-end pb-1">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => {
                          const testStudents = [
                            { civilite: "M.", nom: "MARTIN", prenom: "Lucas" },
                            { civilite: "Mme", nom: "DUPONT", prenom: "Sophie" },
                            { civilite: "M.", nom: "BERNARD", prenom: "Nathan" },
                            { civilite: "Mme", nom: "LEROY", prenom: "Emma" },
                            { civilite: "M.", nom: "MOREAU", prenom: "Arthur" },
                          ];
                          form.setDefaultExaminer({ nom: "DUPUIS", prenom: "Marie" });
                          form.setStudentData(prev => ({ ...prev, ue: "UE Kinésithérapie — Bilan articulaire", promotion: "Promotion 2024-2026" }));
                          window.localStorage.setItem("uePreset", JSON.stringify("UE Kinésithérapie — Bilan articulaire"));
                          window.localStorage.setItem("promotionPreset", JSON.stringify("Promotion 2024-2026"));
                          form.setStudentList(testStudents);
                          form.setStudentListValidated(true);
                          form.setDrawEnabled(true);
                          form.setDrawMode("group");
                          form.setDrawGroups([
                            { id: "test-g1", title: "Bilan articulaire", questions: ["Décrire le bilan de l'épaule", "Mesurer la flexion du genou en DD", "Bilan de la cheville post-entorse"] },
                            { id: "test-g2", title: "Bilan musculaire", questions: ["Testing du quadriceps", "Évaluation des rotateurs de hanche", "Testing des fléchisseurs plantaires"] },
                            { id: "test-g3", title: "Raisonnement clinique", questions: ["Proposer un diagnostic kiné", "Justifier le choix des techniques", "Identifier les contre-indications"] },
                          ]);
                          form.setDrawListValidated(true);
                          form.setExamDurationMinutes(15);
                          setBddTestTrigger(t => t + 1);
                          notify("Données de test chargées (5 étudiants, 3 groupes de questions, 15 min).", "success");
                        }}
                        className="border border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 text-[11px] font-bold uppercase"
                      >
                        🧪 Remplir test
                      </Button>
                    </div>
                  </div>

                  {adminView === "config" && (
                    <AdminPanel
                      studentsSectionRef={studentsSectionRef}
                      questionsSectionRef={questionsSectionRef}
                      studentList={form.studentList}
                      setStudentList={form.setStudentList}
                      studentListValidated={form.studentListValidated}
                      setStudentListValidated={form.setStudentListValidated}
                      bulkStudentsText={bulkStudentsText}
                      setBulkStudentsText={setBulkStudentsText}
                      savedEvaluations={form.savedEvaluations}
                      drawEnabled={form.drawEnabled}
                      setDrawEnabled={form.setDrawEnabled}
                      drawMode={form.drawMode}
                      setDrawMode={form.setDrawMode}
                      bulkSinglesText={bulkSinglesText}
                      setBulkSinglesText={setBulkSinglesText}
                      bulkGroupsText={bulkGroupsText}
                      setBulkGroupsText={setBulkGroupsText}
                      drawSingles={form.drawSingles}
                      setDrawSingles={form.setDrawSingles}
                      drawGroups={form.drawGroups}
                      setDrawGroups={form.setDrawGroups}
                      drawListValidated={form.drawListValidated}
                      setDrawListValidated={form.setDrawListValidated}
                      defaultExaminer={form.defaultExaminer}
                      setDefaultExaminer={form.setDefaultExaminer}
                      studentData={form.studentData}
                      setStudentData={form.setStudentData}
                      examDurationMinutes={form.examDurationMinutes}
                      setExamDurationMinutes={form.setExamDurationMinutes}
                      showFinalNoteToEvaluator={form.showFinalNoteToEvaluator}
                      setShowFinalNoteToEvaluator={form.setShowFinalNoteToEvaluator}
                      showBaremeToEvaluator={form.showBaremeToEvaluator}
                      setShowBaremeToEvaluator={form.setShowBaremeToEvaluator}
                      showPercentToEvaluator={form.showPercentToEvaluator}
                      setShowPercentToEvaluator={form.setShowPercentToEvaluator}
                      axes={form.axes}
                      setAxes={form.setAxes}
                      axesMaxSum={form.axesMaxSum}
                      setScores={form.setScores}
                      questionsCount={form.questionsCount}
                      onRequestReset={openResetModal}
                    />
                  )}

                  {adminView === "recap" && (
                    <RecapTable savedEvaluations={form.savedEvaluations} />
                  )}

                  {adminView === "bdd" && (
                    <BddPanel
                      studentList={form.studentList}
                      defaultExaminer={form.defaultExaminer}
                      examDurationMinutes={form.examDurationMinutes}
                      ue={form.studentData.ue}
                      promotion={form.studentData.promotion}
                      testTrigger={bddTestTrigger}
                      onScheduleGenerated={evalId ? schedule => evalStore.saveBddSchedule(evalId, schedule) : undefined}
                      otherSchedules={evalId ? evalStore.configs
                        .filter(c => c.id !== evalId && c.promotion === form.studentData.promotion && c.bddSchedule)
                        .map(c => c.bddSchedule!) : undefined}
                    />
                  )}
                </>
              )}

              {isCoordinator && adminView === "preview" && (
                <div className="mx-auto max-w-2xl p-6 space-y-4">
                  <h2 className="text-sm font-black uppercase tracking-wide text-amber-700">Aperçu de l'évaluation</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Promotion</p>
                      <p className="font-bold text-slate-800">{form.studentData.promotion || <span className="italic text-slate-400">—</span>}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-1 text-[10px] font-black uppercase text-slate-400">U.E.</p>
                      <p className="font-bold text-slate-800">{form.studentData.ue || <span className="italic text-slate-400">—</span>}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Évaluateur</p>
                      <p className="font-bold text-slate-800">
                        {[form.defaultExaminer.prenom, form.defaultExaminer.nom].filter(Boolean).join(" ") || <span className="italic text-slate-400">—</span>}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Durée examen</p>
                      <p className="font-bold text-slate-800">{form.examDurationMinutes ? `${form.examDurationMinutes} min` : <span className="italic text-slate-400">—</span>}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-[10px] font-black uppercase text-slate-400">Axes ({form.axes.length}) — total {form.axesMaxSum} pts</p>
                    {form.axes.length === 0 ? <p className="text-sm italic text-slate-400">Aucun axe configuré</p> : (
                      <div className="space-y-1">
                        {form.axes.map(ax => (
                          <div key={ax.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                            <span>{ax.label || "Sans nom"}</span>
                            <span className="font-bold text-amber-600">{ax.max} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Étudiants</p>
                    <p className="text-sm text-slate-700">{form.studentList.length > 0 ? `${form.studentList.length} inscrits` : <span className="italic text-slate-400">Aucun</span>}</p>
                  </div>
                  {form.drawEnabled && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Tirage</p>
                      <p className="text-sm text-slate-700">
                        {form.drawMode === "group" ? `${form.drawGroups.length} groupe(s)` : `${form.drawSingles.length} question(s)`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Alerte étudiants non évalués avant fin créneau */}
              {!isCoordinator && form.timer.isRunning && form.timer.remainingMs !== null && form.timer.remainingMs > 0 && form.timer.remainingMs < 15 * 60 * 1000 && (() => {
                const remaining = form.studentList.filter(s =>
                  !form.savedEvaluations.some(ev => ev.student.nom === s.nom && ev.student.prenom === s.prenom) &&
                  !(form.studentData.nom === s.nom && form.studentData.prenom === s.prenom)
                );
                if (remaining.length === 0) return null;
                const mins = Math.ceil(form.timer.remainingMs / 60000);
                return (
                  <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border-2 border-orange-400 bg-orange-50 px-4 py-3 shadow-sm">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="text-sm font-extrabold text-orange-800">
                        {mins} min restante{mins > 1 ? "s" : ""} — {remaining.length} étudiant{remaining.length > 1 ? "s" : ""} non évalué{remaining.length > 1 ? "s" : ""} :
                      </p>
                      <p className="text-xs text-orange-700">
                        {remaining.map(s => `${s.nom} ${s.prenom}`).join(" · ")}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {!isCoordinator && (
              <>

              {/* ── ÉTAPE 1 : Sélection étudiant ── */}
              {evalStep === 1 && (
                <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
                  <StudentStep
                    selectedStudentValue={form.selectedStudentValue}
                    onStudentChange={form.handleStudentChange}
                    studentData={form.studentData}
                    onDateChange={v => form.setStudentData(prev => ({ ...prev, date: v }))}
                    studentList={form.studentList}
                    loadedStudentKey={form.loadedStudentKey}
                    savedEvaluations={form.savedEvaluations}
                    bddSchedule={evalId ? evalStore.getConfig(evalId)?.bddSchedule : undefined}
                  />
                  <ExaminerStep
                    evaluatorFullName={`${form.studentData.evaluatorNom} ${form.studentData.evaluatorPrenom}`.trim()}
                    total20={form.total20}
                    showFinalNote={(isCoordinator && adminView !== "preview") || form.showFinalNoteToEvaluator}
                  />
                  <p className="text-center text-xs text-slate-400 italic pt-2">
                    La sélection d'un étudiant démarre automatiquement l'évaluation.
                  </p>
                </div>
              )}

              {/* ── ÉTAPE 2 : Question / Énoncé ── */}
              {evalStep === 2 && (
                <div className="mx-auto max-w-2xl px-6 py-10 space-y-6 text-center">
                  {form.studentData.ue && (
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{form.studentData.ue}</p>
                  )}
                  {form.drawEnabled && form.drawPersisted ? (
                    <>
                      <h2 className="text-xl font-black uppercase tracking-wide text-slate-700">
                        Question tirée au sort
                      </h2>
                      <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-8 text-left shadow-lg">
                        {form.drawPersisted.mode === "group" ? (
                          <>
                            <div className="mb-4 text-lg font-extrabold uppercase text-indigo-700">
                              {form.drawPersisted.group.title}
                            </div>
                            <ul className="ml-6 list-disc space-y-2">
                              {form.drawPersisted.group.questions.map((q, i) => (
                                <li key={i} className="text-base font-semibold text-indigo-900">{q}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <div className="text-xl font-extrabold text-indigo-900">
                            {form.drawPersisted.question}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-black uppercase tracking-wide text-slate-700">
                        Énoncé de l'épreuve
                      </h2>
                      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-10 text-center shadow-lg">
                        <p className="text-lg font-semibold text-slate-600">
                          Vous pouvez énoncer la ou les questions à l'étudiant.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={async () => {
                      await form.handleStudentChange("");
                      setEvalStep(1);
                    }}>← Retour</Button>
                    <div className="flex gap-2">
                      {form.drawEnabled && (
                        <Button
                          variant="neutral"
                          onClick={() => { form.timer.reset(); doDraw(false); }}
                        >
                          ↺ Nouveau tirage
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (form.examDurationMinutes > 0) form.timer.start();
                          setEvalStep(3);
                        }}
                      >
                        Commencer l'évaluation →
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 3 : Radar & sous-indicateurs ── */}
              {evalStep === 3 && (
                <div ref={radarSectionRef} className="px-6 py-6">
                  {form.loadedStudentKey && (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-amber-900">Évaluation chargée</div>
                        <div className="text-sm font-semibold">
                          {form.studentData.civilite ? `${form.studentData.civilite} ` : ""}
                          {form.studentData.nom} {form.studentData.prenom}
                        </div>
                      </div>
                      <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-amber-800">
                        Modification
                      </span>
                    </div>
                  )}

                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
                    <Target size={16} /> Évaluation
                    <ContextHelp
                      title="Aide radar"
                      lines={[
                        "Cliquez près d'un axe puis faites glisser pour ajuster la note.",
                        "Tous les axes doivent être modifiés au moins une fois pour permettre la signature.",
                      ]}
                    />
                  </h3>

                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
                    <PenTool size={16} /> Indicateurs
                    <ContextHelp
                      title="Aide sous-indicateurs"
                      lines={[
                        "Choisissez un statut pour chaque sous-indicateur : acquis, en cours ou non acquis.",
                        "Pour 'En cours' ou 'Non acquis', un commentaire est obligatoire.",
                      ]}
                    />
                  </h3>

                  <div className="mb-4">
                    <RadarChart
                      axes={form.axes}
                      scores={form.scores}
                      setScores={form.setScores}
                      setTouched={form.setTouched}
                      touched={form.touched}
                      axesMaxSum={form.axesMaxSum}
                      showBareme={(isCoordinator && adminView !== "preview") || form.showBaremeToEvaluator}
                      showPercent={(isCoordinator && adminView !== "preview") || form.showPercentToEvaluator}
                      subChecks={form.subChecks}
                      setSubChecks={form.setSubChecks}
                    />
                  </div>

                  {/* Commentaires obligatoires sous-indicateurs */}
                  {form.axes.some(axis =>
                    (axis.subItems || []).some(si => {
                      const st = form.subChecks[axis.id]?.[si.id] ?? "";
                      return st === "NON_ACQUIS" || st === "EN_COURS";
                    })
                  ) && (
                    <div className="mb-4 space-y-3">
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                        <p className="text-xs font-semibold text-amber-800">
                          Un ou plusieurs sous-indicateurs sont cochés <span className="font-bold">"En cours d'acquisition"</span> ou <span className="font-bold">"Non acquis"</span>. Vous devez rédiger un commentaire par indicateur concerné ci-dessous avant de pouvoir signer.
                        </p>
                      </div>
                      {form.axes
                        .filter(axis =>
                          (axis.subItems || []).some(si => {
                            const st = form.subChecks[axis.id]?.[si.id] ?? "";
                            return st === "NON_ACQUIS" || st === "EN_COURS";
                          })
                        )
                        .map(axis => {
                          const axisComment = form.subComments[axis.id]?.["__axis__"] ?? "";
                          const triggeringItems = (axis.subItems || []).filter(si => {
                            const st = form.subChecks[axis.id]?.[si.id] ?? "";
                            return st === "NON_ACQUIS" || st === "EN_COURS";
                          });
                          return (
                            <div key={axis.id} className={`rounded-xl border-2 p-3 shadow-sm ${axisComment.trim() ? "border-slate-300 bg-white" : "border-red-400 bg-red-50"}`}>
                              <div className="mb-2 flex items-start gap-2">
                                <AlertTriangle size={15} className={`mt-0.5 flex-shrink-0 ${axisComment.trim() ? "text-slate-400" : "text-red-500"}`} />
                                <div>
                                  <div className={`text-sm font-extrabold uppercase ${axisComment.trim() ? "text-slate-600" : "text-red-700"}`}>
                                    {axis.label}
                                  </div>
                                  <div className="mt-0.5 space-y-0.5">
                                    {triggeringItems.map(si => {
                                      const st = form.subChecks[axis.id]?.[si.id] ?? "";
                                      return (
                                        <div key={si.id} className="flex items-center gap-1.5 text-[11px] font-semibold">
                                          <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${st === "NON_ACQUIS" ? "bg-red-500" : "bg-amber-400"}`} />
                                          <span className="text-slate-700">{si.label}</span>
                                          <span className={`font-bold ${st === "NON_ACQUIS" ? "text-red-600" : "text-amber-600"}`}>
                                            — {st === "NON_ACQUIS" ? "Non acquis" : "En cours d'acquisition"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <textarea
                                rows={3}
                                value={axisComment}
                                onChange={e =>
                                  form.setSubComments(prev => ({
                                    ...prev,
                                    [axis.id]: { ...prev[axis.id], ["__axis__"]: e.target.value },
                                  }))
                                }
                                placeholder={`Expliquez ici pourquoi ce sous-indicateur est ${triggeringItems.some(s => form.subChecks[axis.id]?.[s.id] === "NON_ACQUIS") ? "non acquis" : "en cours d'acquisition"}…`}
                                className={`w-full rounded-lg border-2 px-3 py-2 text-sm ${
                                  axisComment.trim()
                                    ? "border-emerald-300 bg-white focus:border-emerald-400"
                                    : "border-red-300 bg-white focus:border-red-500"
                                } outline-none transition-colors`}
                              />
                              {!axisComment.trim() && (
                                <p className="mt-1 text-[10px] font-semibold text-red-500">
                                  ⚠ Ce commentaire est obligatoire pour pouvoir signer
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Validation avant passage à l'étape 4 */}
                  {(() => {
                    const untouchedAxes = form.axes.filter(a => !form.touched[a.id]);
                    const axesWithMissingSubStatus = form.axes.filter(a =>
                      (a.subItems || []).some(si => !(form.subChecks[a.id]?.[si.id] ?? ""))
                    );
                    const axesWithMissingComment = form.axes.filter(a => {
                      const needsComment = (a.subItems || []).some(si => {
                        const st = form.subChecks[a.id]?.[si.id] ?? "";
                        return st === "NON_ACQUIS" || st === "EN_COURS";
                      });
                      return needsComment && !form.subComments[a.id]?.["__axis__"]?.trim();
                    });
                    const canAdvance = form.allAxesTouched && form.allSubItemsSelected;
                    return (
                      <>
                        {!canAdvance && (
                          <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
                            <p className="text-sm font-extrabold uppercase text-amber-800">
                              Avant de continuer, veuillez compléter :
                            </p>
                            {untouchedAxes.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-700 mb-1">Axes non ajustés :</p>
                                <ul className="ml-4 list-disc space-y-0.5">
                                  {untouchedAxes.map(a => (
                                    <li key={a.id} className="text-xs text-amber-900 font-semibold">{a.label}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {axesWithMissingSubStatus.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-700 mb-1">Sous-indicateurs sans statut :</p>
                                <ul className="ml-4 list-disc space-y-0.5">
                                  {axesWithMissingSubStatus.map(a => (
                                    <li key={a.id} className="text-xs text-amber-900 font-semibold">
                                      {a.label} — {(a.subItems || []).filter(si => !(form.subChecks[a.id]?.[si.id] ?? "")).map(si => si.label).join(", ")}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {axesWithMissingComment.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-700 mb-1">Commentaires obligatoires manquants :</p>
                                <ul className="ml-4 list-disc space-y-0.5">
                                  {axesWithMissingComment.map(a => (
                                    <li key={a.id} className="text-xs text-amber-900 font-semibold">{a.label}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between pt-4 border-t border-slate-100">
                          <Button variant="ghost" onClick={() => setEvalStep(form.drawEnabled ? 2 : 1)}>← Retour</Button>
                          <Button
                            variant="primary"
                            disabled={!canAdvance}
                            onClick={() => setEvalStep(4)}
                          >
                            Suivant →
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── ÉTAPE 4 : Commentaires ── */}
              {evalStep === 4 && (
                <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
                  <h2 className="text-xl font-black uppercase tracking-wide text-slate-700">
                    Points positifs & axes d'amélioration
                  </h2>
                  <RemarksStep
                    positive={form.remarksPositive}
                    improvement={form.remarksImprovement}
                    onChangePositive={form.setRemarksPositive}
                    onChangeImprovement={form.setRemarksImprovement}
                  />
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setEvalStep(3)}>← Retour</Button>
                    <Button variant="primary" onClick={() => setEvalStep(5)}>Suivant →</Button>
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 5 : Signature & validation ── */}
              {evalStep === 5 && (
                <div className="px-6 py-10">
                  <h2 className="mb-6 text-xl font-black uppercase tracking-wide text-slate-700">
                    Signature & validation
                  </h2>

                  {isCoordinator && form.loadedEvaluation?.evaluationDurationMs != null && (
                    <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                      Temps d'épreuve (du début du chrono à la validation) :
                      <span className="ml-1 font-semibold text-slate-800">
                        {formatDurationMs(form.loadedEvaluation.evaluationDurationMs)}
                      </span>
                    </div>
                  )}

                  <SignatureStep
                    isCoordinator={isCoordinator}
                    loadedEvaluationSignatureImage={form.loadedEvaluation?.signatureImage ?? null}
                    signatureReady={form.signatureReady}
                    hasSelectedStudent={form.hasSelectedStudent}
                    allAxesTouched={form.allAxesTouched}
                    allSubItemsSelected={form.allSubItemsSelected}
                    commentsReady={form.commentsReady}
                    axes={form.axes}
                    touched={form.touched}
                    canvasRef={canvasRef}
                    onClearSignature={clearSignature}
                    onStartDrawing={startDrawing}
                    onDraw={draw}
                    onStopDrawing={stopDrawing}
                  />

                  {form.signatureImage ? (
                    <div className="mt-6 flex flex-col items-center gap-3">
                      <Button
                        variant="primary"
                        onClick={() => setShowFinishModal(true)}
                        className="w-full max-w-sm rounded-2xl py-4 text-base font-black uppercase tracking-wide shadow-lg"
                      >
                        ✓ Valider l'évaluation
                      </Button>
                      <button
                        type="button"
                        onClick={() => { clearSignature(); }}
                        className="text-xs text-slate-400 underline hover:text-slate-600"
                      >
                        Effacer la signature et recommencer
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 flex justify-start">
                      <Button variant="ghost" onClick={() => setEvalStep(4)}>← Retour</Button>
                    </div>
                  )}
                </div>
              )}

              </>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-slate-50 p-6 print:hidden">
            {!isCoordinator && !form.allStudentsEvaluated && form.savedEvaluations.length > 0 && (
              <div className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Modifier une évaluation enregistrée
                </p>
                <div className="flex items-center gap-2">
                  <EvaluationPicker
                    savedEvaluations={form.savedEvaluations}
                    value={form.selectedSavedId}
                    onChange={form.setSelectedSavedId}
                    showNote={true}
                    className="flex-1 rounded-lg border-2 border-amber-300 bg-white font-bold text-slate-800"
                  />
                  <Button
                    variant="warning"
                    disabled={!form.selectedSavedId}
                    onClick={() => {
                      if (form.selectedSavedId) {
                        form.loadSavedEvaluation(form.selectedSavedId);
                        clearCanvasSignature();
                        window.setTimeout(() => setEvalStep(3), 120);
                        notify("Évaluation chargée pour modification.");
                      }
                    }}
                    className="shrink-0 rounded-lg px-4 py-2 font-black"
                  >
                    ✎ Modifier
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Aide">
        <ol className="ml-5 list-decimal space-y-2 text-sm">
          <li>Sélectionnez un étudiant</li>
          <li>Ajustez les notes sur le radar</li>
          <li>Complétez les sous-indicateurs</li>
          <li>Rédigez les commentaires (points positifs et axes d'amélioration)</li>
          <li>Signez pour valider</li>
        </ol>
      </Modal>

      <Modal
        isOpen={showCoordModal}
        onClose={() => { setShowCoordModal(false); setCoordCode(""); setCoordError(""); }}
        title="Accès administrateur"
        showCloseButton={false}
      >
        <input
          type="password"
          value={coordCode}
          onChange={e => setCoordCode(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") validateCoordCode(); }}
          className="mb-3 w-full border-b-4 border-slate-200 py-3 text-center text-2xl font-black tracking-[0.4rem] outline-none focus:border-amber-500"
          autoFocus
        />
        {coordError && <p className="mb-3 text-xs font-bold text-red-600">{coordError}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            onClick={() => { setShowCoordModal(false); setCoordCode(""); setCoordError(""); }}
            className="rounded-2xl py-3 text-slate-400"
          >
            Annuler
          </Button>
          <Button variant="warning" onClick={validateCoordCode} className="rounded-2xl py-3">
            Valider
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        title="Valider l'évaluation ?"
        showCloseButton={false}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Valider l'évaluation pour</p>
        <p className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-800">
          {form.studentData.civilite ? `${form.studentData.civilite} ` : ""}
          {form.studentData.nom} {form.studentData.prenom}
        </p>
        {form.studentData.ue && (
          <p className="mt-0.5 text-sm font-semibold text-indigo-600">{form.studentData.ue}</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="neutral"
            disabled={isSaving}
            onClick={() => setShowFinishModal(false)}
            className="rounded-xl py-2"
          >
            Non
          </Button>
          <Button
            variant="primary"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                const { item, newAllEvals } = await form.saveCurrentEvaluation();
                // Sauvegarde aussi dans l'EvalStore (multi-éval)
                if (evalId) evalStore.addEvaluation(evalId, item);
                // Exports automatiques sur la clé USB
                const sessionEvals = newAllEvals.filter(
                  ev => ev.ue === item.ue && ev.date === item.date,
                );
                const sanitize = (s: string) => sanitizeFolder(s).replace(/\s+/g, "_");
                const promo = item.promotion || "inconnu";
                const sessionDate = evalId
                  ? (evalStore.getSessionForConfig(evalId)?.date ?? item.date)
                  : item.date;
                const baseName = buildExportFileName(item.ue, item.date, "");
                // HTML éval par étudiant + promotion complète → archives/{promo}/{ue}/
                try {
                  const archivesDir = buildArchivesPath(promo, item.ue);
                  // Fichier individuel de l'étudiant
                  const studentHtml = buildEvaluationsHtml([item]);
                  const studentFile = `${sanitize(item.student.nom)}_${sanitize(item.student.prenom)}.html`;
                  await saveFileToFolder(archivesDir, studentFile, studentHtml);
                  // Fichier promotion complète (toujours mis à jour)
                  const fullHtml = buildEvaluationsHtml(sessionEvals);
                  await saveFileToFolder(archivesDir, `${baseName}_promo.html`, fullHtml);
                } catch { /* non-bloquant */ }
                // Récap notes xlsx → notes/{promo}/{sessionDate}/{ue}/
                try {
                  const notesDir = buildNotesPath(promo, sessionDate, item.ue);
                  const xlsxBuf = await buildRecapXlsxBuffer(sessionEvals);
                  await saveFileToFolder(notesDir, `${baseName}.xlsx`, xlsxBuf);
                } catch { /* non-bloquant */ }

                handleResetEvaluation();
                form.setStudentData(prev => ({ ...prev, civilite: "", nom: "", prenom: "" }));
                form.setLoadedStudentKey(null);
                form.setLoadedEvaluation(null);
                setShowFinishModal(false);
                notify("Évaluation enregistrée avec succès !");
                window.scrollTo({ top: 0, behavior: "smooth" });
              } finally {
                setIsSaving(false);
              }
            }}
            className="rounded-xl py-2"
          >
            {isSaving ? "Enregistrement…" : "Oui, valider"}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showPreExitModal}
        onClose={() => setShowPreExitModal(false)}
        title="Listes non validées"
      >
        <p className="mb-2 text-sm text-slate-600">
          Vous avez saisi des éléments non validés. Avant de quitter le mode administrateur,
          merci de vérifier et de valider les listes suivantes :
        </p>
        <ul className="ml-6 list-disc space-y-1 text-sm">
          {preExitNeeds.students && (
            <li>
              Liste des étudiants (noms saisis mais non validés)
              <Button
                variant="neutral"
                size="sm"
                onClick={() => { setShowPreExitModal(false); studentsSectionRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className="ml-2 bg-amber-100 py-0.5 text-amber-800 hover:bg-amber-200"
              >
                Aller
              </Button>
            </li>
          )}
          {preExitNeeds.questions && (
            <li>
              Liste des questions (questions saisies mais non validées)
              <Button
                variant="neutral"
                size="sm"
                onClick={() => { setShowPreExitModal(false); questionsSectionRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className="ml-2 bg-amber-100 py-0.5 text-amber-800 hover:bg-amber-200"
              >
                Aller
              </Button>
            </li>
          )}
          {preExitNeeds.duration && (
            <li>Durée de l'examen (champ "Durée examen (min)") non renseignée ou égale à 0</li>
          )}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Vous resterez en mode administrateur tant que ces listes ne sont pas validées ou
          vidées et qu'une durée d'examen valide n'est pas définie.
        </p>
      </Modal>

      {/* Modal récap évals avant passage en mode éval */}
      {showExitRecapModal && (() => {
        const sortedConfigs = [...evalStore.configs].sort((a, b) => {
          const p = a.promotion.localeCompare(b.promotion, "fr");
          if (p !== 0) return p;
          const ev = `${a.defaultExaminer.nom} ${a.defaultExaminer.prenom}`.localeCompare(
            `${b.defaultExaminer.nom} ${b.defaultExaminer.prenom}`, "fr");
          if (ev !== 0) return ev;
          return a.ue.localeCompare(b.ue, "fr");
        });
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowExitRecapModal(false)}>
            <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="mb-1 text-base font-black uppercase tracking-wide text-white">Passer en mode évaluateur</h2>
              <p className="mb-4 text-xs text-white/50">Évaluations qui seront proposées — vous pouvez remettre à zéro avant de continuer.</p>
              {sortedConfigs.length === 0 ? (
                <p className="text-sm italic text-white/40">Aucune évaluation configurée.</p>
              ) : (
                <div className="mb-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {sortedConfigs.map(cfg => (
                    <div key={cfg.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{cfg.promotion}</div>
                        <div className="text-sm font-bold text-white">{cfg.ue || "U.E. sans nom"}</div>
                        <div className="text-[11px] text-white/40">
                          {[cfg.defaultExaminer.prenom, cfg.defaultExaminer.nom].filter(Boolean).join(" ") || "—"}
                          {cfg.savedEvaluations.length > 0 && (
                            <span className="ml-2 text-amber-400">· {cfg.savedEvaluations.length} note(s)</span>
                          )}
                        </div>
                      </div>
                      {cfg.savedEvaluations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => evalStore.updateConfig(cfg.id, { savedEvaluations: [] })}
                          className="ml-3 shrink-0 rounded-lg border border-red-400/30 bg-red-900/20 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-900/40"
                        >
                          RAZ
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowExitRecapModal(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm font-bold text-white/60 hover:bg-white/5">
                  Annuler
                </button>
                <button type="button" onClick={() => {
                  setShowExitRecapModal(false);
                  form.resetEvaluatorSession();
                  setIsCoordinator(false);
                }}
                  className="flex-1 rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white hover:bg-emerald-400">
                  Passer en mode évaluateur →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setEvaluationToDelete(null); }}
        title="Supprimer l'évaluation ?"
        showCloseButton={false}
      >
        {evaluationToDelete && (
          <>
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-bold text-red-800">
                {evaluationToDelete.student.nom} {evaluationToDelete.student.prenom}
              </p>
              <p className="text-sm text-red-700">
                Note: {evaluationToDelete.total20.toFixed(1)}/20 — {evaluationToDelete.ue}
              </p>
            </div>
            <p className="text-sm font-bold text-red-600">Cette action est irréversible.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="neutral"
                onClick={() => { setShowDeleteModal(false); setEvaluationToDelete(null); }}
                className="rounded-xl py-2"
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  form.setSavedEvaluations(prev => prev.filter(e => e.id !== evaluationToDelete.id));
                  form.setSelectedSavedId("");
                  setShowDeleteModal(false);
                  setEvaluationToDelete(null);
                  notify("Évaluation supprimée");
                }}
                className="rounded-xl py-2"
              >
                Supprimer
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Réinitialiser les données"
        showCloseButton={false}
      >
        <p className="text-sm text-slate-600">
          Choisissez ce que vous souhaitez effacer, puis saisissez le code administrateur pour confirmer.
        </p>

        <div className="mt-3 space-y-2">
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
              resetScope === "config" ? "border-amber-400 bg-amber-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name="resetScope"
              className="mt-0.5"
              checked={resetScope === "config"}
              onChange={() => setResetScope("config")}
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">
                Configuration seulement
              </span>
              <span className="block text-xs text-slate-500">
                Efface étudiants, questions, durée, évaluateur, UE/promotion et axes.
                Conserve les évaluations enregistrées.
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
              resetScope === "all" ? "border-red-400 bg-red-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name="resetScope"
              className="mt-0.5"
              checked={resetScope === "all"}
              onChange={() => setResetScope("all")}
            />
            <span>
              <span className="block text-sm font-bold text-red-700">
                Absolument tout (remise à zéro)
              </span>
              <span className="block text-xs text-slate-500">
                Efface aussi les {form.savedEvaluations.length} évaluation(s) enregistrée(s).
                Les résultats non exportés seront définitivement perdus.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Code administrateur
          </label>
          <input
            type="password"
            value={resetCode}
            onChange={e => {
              setResetCode(e.target.value);
              if (resetError) setResetError("");
            }}
            onKeyDown={e => {
              if (e.key === "Enter") confirmReset();
            }}
            className="w-full rounded border-b-4 border-slate-200 py-2 text-center text-xl font-black tracking-[0.3rem] outline-none focus:border-amber-500"
            autoFocus
          />
          {resetError && <p className="mt-2 text-xs font-bold text-red-600">{resetError}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="neutral"
            onClick={() => {
              setShowResetModal(false);
              setResetCode("");
              setResetError("");
            }}
            className="rounded-xl py-2"
          >
            Annuler
          </Button>
          <Button
            variant={resetScope === "all" ? "danger" : "warning"}
            onClick={confirmReset}
            className="rounded-xl py-2"
          >
            Effacer
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Changer le mot de passe administrateur"
        showCloseButton={false}
      >
        <p className="text-sm text-slate-600">
          Utilisé pour l'accès administrateur et la réinitialisation des données.
          Mot de passe actuel : <span className="font-bold text-slate-800">{form.adminPassword}</span>
        </p>

        <div className="mt-4 space-y-2">
          <input
            type="password"
            value={newAdminPassword}
            onChange={e => { setNewAdminPassword(e.target.value); setPasswordChangeError(""); }}
            placeholder="Nouveau mot de passe"
            className="w-full rounded border px-3 py-2 text-sm"
            autoFocus
          />
          <input
            type="password"
            value={confirmAdminPassword}
            onChange={e => { setConfirmAdminPassword(e.target.value); setPasswordChangeError(""); }}
            onKeyDown={e => { if (e.key === "Enter") confirmChangeAdminPassword(); }}
            placeholder="Confirmer le mot de passe"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {passwordChangeError && (
            <p className="text-xs font-bold text-red-600">{passwordChangeError}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="neutral"
            onClick={() => setShowPasswordModal(false)}
            className="rounded-xl py-2"
          >
            Annuler
          </Button>
          <Button
            variant="warning"
            onClick={confirmChangeAdminPassword}
            className="rounded-xl py-2"
          >
            Modifier
          </Button>
        </div>
      </Modal>


      <DashboardModal
        open={showDashboard && !!stats}
        onClose={() => setShowDashboard(false)}
        stats={stats}
        savedEvaluations={form.savedEvaluations}
      />
    </div>
  );
}
