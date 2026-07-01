import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PenTool, HelpCircle, Settings, CheckCircle2, AlertTriangle, XCircle, Target, PenLine, Download, Upload, KeyRound, TableIcon } from "lucide-react";
import { useEvaluationForm, formatDurationMs } from "./hooks/useEvaluationForm";
import { Modal } from "./components/Modal";
import { Button } from "./components/Button";
import { useDialogs } from "./components/Dialogs";
import { EvaluationPicker } from "./components/EvaluationPicker";
import { StudentStep } from "./components/StudentStep";
import { StickyHeader } from "./components/StickyHeader";
import { ExaminerStep } from "./components/ExaminerStep";
import { EvaluationDetails } from "./components/EvaluationDetails";
import { RemarksStep } from "./components/RemarksStep";
import { SignatureStep } from "./components/SignatureStep";
import { DashboardModal } from "./components/DashboardModal";
import { RadarChart } from "./components/RadarChart";
import { ContextHelp } from "./components/ContextHelp";
import { AdminPanel } from "./components/AdminPanel";
import { RecapTable } from "./components/RecapTable";
import { useEvaluationStats } from "./hooks/useEvaluationStats";
import { buildEvaluationsHtml } from "./utils/evaluations";
import { buildProtectedHtml } from "./utils/protect";
import { buildFolderName, saveFileToFolder } from "./utils/exportFolder";
import { buildRecapXlsxBuffer } from "./utils/recapXlsx";
import { logoDataUri } from "./assets/logo";
import type { DrawPersisted } from "./types";

export function App() {
  const { confirm, notify } = useDialogs();
  const form = useEvaluationForm();

  const [showHelp, setShowHelp] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [adminView, setAdminView] = useState<"config" | "preview" | "recap">("config");
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordCode, setCoordCode] = useState("");
  const [coordError, setCoordError] = useState("");
  const [showPreExitModal, setShowPreExitModal] = useState(false);
  const [preExitNeeds, setPreExitNeeds] = useState<{ students: boolean; questions: boolean; duration: boolean }>(
    { students: false, questions: false, duration: false },
  );

  const [showDrawModal, setShowDrawModal] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawPersisted | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const [bulkStudentsText, setBulkStudentsText] = useState("");
  const [bulkGroupsText, setBulkGroupsText] = useState("");
  const [bulkSinglesText, setBulkSinglesText] = useState("");

  const step1Ref = useRef<HTMLDivElement | null>(null);
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);
  const step4Ref = useRef<HTMLDivElement | null>(null);
  const signatureSectionRef = useRef<HTMLDivElement | null>(null);
  const studentsSectionRef = useRef<HTMLDivElement | null>(null);
  const questionsSectionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastDrawSignatureRef = useRef<string | null>(null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<typeof form.savedEvaluations[number] | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope, setResetScope] = useState<"config" | "all">("config");
  const [resetCode, setResetCode] = useState("");
  const [resetError, setResetError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");

  const [showFilePasswordModal, setShowFilePasswordModal] = useState(false);
  const [newFilePassword, setNewFilePassword] = useState("");
  const [confirmFilePassword, setConfirmFilePassword] = useState("");
  const [filePasswordChangeError, setFilePasswordChangeError] = useState("");

  useEffect(() => {
    if (!showDrawModal) return;
    const timer = window.setTimeout(() => setShowDrawModal(false), 4000);
    return () => window.clearTimeout(timer);
  }, [showDrawModal]);

  useEffect(() => {
    if (form.signatureImage) {
      window.setTimeout(() => setShowFinishModal(true), 0);
    }
  }, [form.signatureImage]);

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

  const doDraw = useCallback(() => {
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
      setDrawResult(payload);
      form.setDrawPersisted(payload);
      setShowDrawModal(true);
      if (form.examDurationMinutes > 0) form.timer.start();
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
      setDrawResult(payload);
      form.setDrawPersisted(payload);
      setShowDrawModal(true);
      if (form.examDurationMinutes > 0) form.timer.start();
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
      setIsCoordinator(false);
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

  const openFilePasswordModal = useCallback(() => {
    setNewFilePassword("");
    setConfirmFilePassword("");
    setFilePasswordChangeError("");
    setShowFilePasswordModal(true);
  }, []);

  const confirmChangeFilePassword = () => {
    if (!newFilePassword.trim()) {
      setFilePasswordChangeError("Le mot de passe ne peut pas être vide.");
      return;
    }
    if (newFilePassword !== confirmFilePassword) {
      setFilePasswordChangeError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    form.setFilePassword(newFilePassword.trim());
    setShowFilePasswordModal(false);
    setNewFilePassword("");
    setConfirmFilePassword("");
    setFilePasswordChangeError("");
    notify("Mot de passe des fichiers modifié.");
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
    <div className="min-h-screen bg-stone-200 font-sans text-slate-800">
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
        examDurationMinutes={form.examDurationMinutes}
        elapsedMs={form.timer.elapsedMs}
        remainingMs={form.timer.remainingMs}
        isOvertime={form.timer.isOvertime}
        isTimerRunning={form.timer.isRunning}
        onStartTimer={form.timer.start}
      />

      <div className="p-2 md:p-6">
        <div
          id="export-area"
          className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-stone-50 shadow-2xl print:shadow-none"
        >
          <div className="border-b-4 border-emerald-300 bg-emerald-100 p-4 text-slate-800 md:p-6">
            <div className="mb-3 flex justify-center">
              <img
                src={logoDataUri}
                alt="Logo IFSO Vichy Clermont-FD"
                className="h-12 w-auto md:h-14"
              />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-3 text-center md:mb-0 md:text-left">
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800/80">
                  IFSO Vichy Clermont-Ferrand
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 md:text-3xl">
                  Grille d'évaluation pratique
                </h1>
              </div>

              <div className="flex flex-col items-end gap-2">
                {!isCoordinator && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Settings size={14} />}
                    onClick={() => setShowCoordModal(true)}
                    className="uppercase"
                  >
                    Accès administrateur
                  </Button>
                )}

                <div className="hidden flex-col items-end gap-1.5 md:flex">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide border-emerald-400 bg-emerald-200 text-emerald-900">
                      {isCoordinator ? "Mode administrateur" : "Mode évaluateur"}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<HelpCircle size={16} />}
                      onClick={() => setShowHelp(true)}
                      className="uppercase text-emerald-900 hover:bg-emerald-700/10"
                    >
                      Aide
                    </Button>
                  </div>

                  {isCoordinator && (
                    <>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleExitAdmin}
                          className="uppercase"
                        >
                          Quitter le mode administrateur
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          icon={<KeyRound size={13} />}
                          onClick={openPasswordModal}
                        >
                          MDP admin
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          icon={<KeyRound size={13} />}
                          onClick={openFilePasswordModal}
                        >
                          MDP fichiers
                        </Button>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-end justify-end gap-2 rounded-lg bg-emerald-700/10 px-3 py-2 shadow-sm">
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
                        <Button
                          variant="info"
                          size="sm"
                          className="uppercase"
                          onClick={async () => {
                            if (form.savedEvaluations.length === 0) {
                              notify("Aucune évaluation terminée à exporter.", "error");
                              return;
                            }
                            const rawHtml = buildEvaluationsHtml(form.savedEvaluations);
                            const html = await buildProtectedHtml(rawHtml, form.filePassword);
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
                          Tableau Excel récapitulatif des notes
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          className="bg-purple-600 text-white hover:bg-purple-700"
                          onClick={() => setShowDashboard(true)}
                        >
                          Tableau de bord
                        </Button>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="neutral"
                          size="sm"
                          icon={<Download size={13} />}
                          onClick={handleExportBackup}
                        >
                          Sauvegarde (.json)
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          icon={<Upload size={13} />}
                          onClick={() => restoreInputRef.current?.click()}
                        >
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
                  <div className="flex gap-2 border-b border-amber-200 bg-amber-50/60 px-6 pt-4">
                    <button
                      type="button"
                      onClick={() => setAdminView("config")}
                      className={`rounded-t-lg px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                        adminView === "config"
                          ? "border border-b-0 border-amber-300 bg-white text-amber-900"
                          : "text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      Configuration
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminView("preview")}
                      className={`rounded-t-lg px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                        adminView === "preview"
                          ? "border border-b-0 border-amber-300 bg-white text-amber-900"
                          : "text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      Aperçu évaluateur
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminView("recap")}
                      className={`rounded-t-lg px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                        adminView === "recap"
                          ? "border border-b-0 border-amber-300 bg-white text-amber-900"
                          : "text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      Tableau récapitulatif
                    </button>
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
                </>
              )}

              {(!isCoordinator || adminView === "preview") && (
              <>
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 pt-4 pb-2">
                <ol className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                  {[
                    { id: 1, label: "Formateur évaluateur", done: Boolean(form.studentData.evaluatorNom || form.studentData.evaluatorPrenom) },
                    { id: 2, label: "Étudiant & UE", done: form.hasSelectedStudent },
                    { id: 3, label: "Évaluation", done: form.someAxesTouched },
                    { id: 4, label: "Commentaires", done: form.commentsReady },
                    { id: 5, label: "Signature", done: Boolean(form.signatureImage) },
                  ].map(step => (
                    <li key={step.id} className="flex items-center gap-1">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                          step.done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {step.id}
                      </span>
                      <span className={step.done ? "text-slate-700" : "text-slate-400"}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    {form.touchedCount === form.axes.length ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : form.touchedCount > 0 ? (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400" />
                    )}
                    <span>Axes ajustés : {form.touchedCount}/{form.axes.length}</span>
                  </span>

                  {form.totalSubItems > 0 && (
                    <span className="inline-flex items-center gap-1">
                      {form.completedSubItems === form.totalSubItems ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : form.completedSubItems > 0 ? (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-slate-400" />
                      )}
                      <span>Sous-items renseignés : {form.completedSubItems}/{form.totalSubItems}</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1">
                    {form.commentsReady ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                    <span>Commentaires : {form.commentsReady ? "renseignés" : "à compléter"}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
                <div className="border-r border-stone-200 bg-emerald-50/40 p-6 lg:col-span-5">
                  <div ref={step1Ref}>
                    <ExaminerStep
                      evaluatorFullName={`${form.studentData.evaluatorNom} ${form.studentData.evaluatorPrenom}`.trim()}
                      total20={form.total20}
                      showFinalNote={isCoordinator || form.showFinalNoteToEvaluator}
                    />
                  </div>
                </div>

                <div className="p-6 lg:col-span-7">
                  <div ref={step2Ref}>
                    <StudentStep
                      selectedStudentValue={form.selectedStudentValue}
                      onStudentChange={form.handleStudentChange}
                      studentData={form.studentData}
                      onDateChange={v => form.setStudentData(prev => ({ ...prev, date: v }))}
                      studentList={form.studentList}
                      loadedStudentKey={form.loadedStudentKey}
                      savedEvaluations={form.savedEvaluations}
                    />
                  </div>
                </div>
              </div>

              <div ref={step3Ref} className="p-6">
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

                <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
                  <Target size={16} /> Étape 3 — Évaluation
                  <ContextHelp
                    title="Aide radar"
                    lines={[
                      "Cliquez près d'un axe puis faites glisser pour ajuster la note.",
                      "Tous les axes doivent être modifiés au moins une fois pour permettre la signature.",
                    ]}
                  />
                </h3>

                {form.drawEnabled && form.drawPersisted && (
                  <div className="mb-3 rounded-lg border border-indigo-300 bg-indigo-50 p-4 text-indigo-900">
                    {form.drawPersisted.mode === "group" ? (
                      <>
                        <div className="mb-2 font-extrabold uppercase">{form.drawPersisted.group.title}</div>
                        <ul className="ml-6 list-disc">
                          {form.drawPersisted.group.questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div className="font-extrabold">{form.drawPersisted.question}</div>
                    )}
                  </div>
                )}

                <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
                  <PenTool size={16} /> Indicateurs
                  <ContextHelp
                    title="Aide sous-items"
                    lines={[
                      "Choisissez un statut pour chaque sous-item : acquis, en cours ou non acquis.",
                      "Pour 'En cours' ou 'Non acquis', un commentaire est obligatoire.",
                    ]}
                  />
                </h3>

                <div className="mt-2 mb-6">
                  <RadarChart
                    axes={form.axes}
                    scores={form.scores}
                    setScores={form.setScores}
                    setTouched={form.setTouched}
                    touched={form.touched}
                    axesMaxSum={form.axesMaxSum}
                    showBareme={isCoordinator || form.showBaremeToEvaluator}
                  />
                </div>

                <EvaluationDetails
                  axes={form.axes}
                  isCoordinator={isCoordinator}
                  scores={form.scores}
                  subChecks={form.subChecks}
                  subComments={form.subComments}
                  setSubChecks={form.setSubChecks}
                  setSubComments={form.setSubComments}
                />

                <div ref={step4Ref} className="mt-4 border-t border-slate-100 pt-4">
                  <RemarksStep
                    positive={form.remarksPositive}
                    improvement={form.remarksImprovement}
                    onChangePositive={form.setRemarksPositive}
                    onChangeImprovement={form.setRemarksImprovement}
                  />
                </div>

                <div ref={signatureSectionRef} className="mt-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
                    <PenLine size={16} /> Étape 5 — Signature
                    <ContextHelp
                      title="Aide signature"
                      lines={[
                        "Vous ne pouvez signer qu'une fois l'évaluation, les sous-items et les remarques complétés.",
                        "Signez dans le cadre blanc avec la souris ou le doigt.",
                      ]}
                    />
                  </h3>

                  {isCoordinator && form.loadedEvaluation?.evaluationDurationMs != null && (
                    <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
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
                </div>
              </div>
              </>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-slate-50 p-6 print:hidden">
            {!isCoordinator && !form.allStudentsEvaluated && form.savedEvaluations.length > 0 && (
              <div className="flex items-end gap-2">
                <EvaluationPicker
                  savedEvaluations={form.savedEvaluations}
                  value={form.selectedSavedId}
                  onChange={form.setSelectedSavedId}
                  showNote={false}
                  className="min-w-[260px] text-left"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!form.selectedSavedId}
                  onClick={() => {
                    if (form.selectedSavedId) {
                      form.loadSavedEvaluation(form.selectedSavedId);
                      clearCanvasSignature();
                      notify("Évaluation chargée pour modification.");
                    }
                  }}
                >
                  Charger
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Aide">
        <ol className="ml-5 list-decimal space-y-2 text-sm">
          <li>Sélectionnez un étudiant</li>
          <li>Ajustez les notes sur le radar</li>
          <li>Complétez les sous-items</li>
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

      <Modal isOpen={showDrawModal} onClose={() => setShowDrawModal(false)} title="Tirage au sort">
        {drawResult?.mode === "group" ? (
          <>
            <p className="mb-2 font-semibold">{drawResult.group.title}</p>
            <ul className="ml-5 list-disc">
              {drawResult.group.questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </>
        ) : (
          <p><span className="font-semibold">Question:</span> {drawResult?.question}</p>
        )}
      </Modal>

      <Modal
        isOpen={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        title="Valider l'évaluation ?"
        showCloseButton={false}
      >
        <p className="text-sm text-slate-600">Valider l'évaluation pour :</p>
        <p className="mt-2 text-lg font-extrabold">
          {form.studentData.civilite ? `${form.studentData.civilite} ` : ""}
          {form.studentData.nom} {form.studentData.prenom}
        </p>
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
                // Exports dans le dossier promotion/UE/date
                const sessionEvals = newAllEvals.filter(
                  ev => ev.ue === item.ue && ev.date === item.date,
                );
                const dirName = buildFolderName(item.promotion || "", item.ue, item.date);
                try {
                  const fullHtml = await buildProtectedHtml(buildEvaluationsHtml(sessionEvals), form.filePassword);
                  await saveFileToFolder(dirName, "promotion-complete.html", fullHtml);
                } catch { /* non-bloquant */ }
                try {
                  const xlsxBuf = await buildRecapXlsxBuffer(sessionEvals);
                  await saveFileToFolder(dirName, "recap-notes.xlsx", xlsxBuf);
                } catch { /* non-bloquant */ }

                handleResetEvaluation();
                form.setStudentData(prev => ({ ...prev, nom: "", prenom: "" }));
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

      <Modal
        isOpen={showFilePasswordModal}
        onClose={() => setShowFilePasswordModal(false)}
        title="Changer le mot de passe des fichiers"
        showCloseButton={false}
      >
        <p className="text-sm text-slate-600">
          Protège les fichiers HTML exportés et les sauvegardes JSON.
          Mot de passe actuel : <span className="font-bold text-slate-800">{form.filePassword}</span>
        </p>

        <div className="mt-4 space-y-2">
          <input
            type="password"
            value={newFilePassword}
            onChange={e => { setNewFilePassword(e.target.value); setFilePasswordChangeError(""); }}
            placeholder="Nouveau mot de passe"
            className="w-full rounded border px-3 py-2 text-sm"
            autoFocus
          />
          <input
            type="password"
            value={confirmFilePassword}
            onChange={e => { setConfirmFilePassword(e.target.value); setFilePasswordChangeError(""); }}
            onKeyDown={e => { if (e.key === "Enter") confirmChangeFilePassword(); }}
            placeholder="Confirmer le mot de passe"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {filePasswordChangeError && (
            <p className="text-xs font-bold text-red-600">{filePasswordChangeError}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="neutral"
            onClick={() => setShowFilePasswordModal(false)}
            className="rounded-xl py-2"
          >
            Annuler
          </Button>
          <Button
            variant="warning"
            onClick={confirmChangeFilePassword}
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
