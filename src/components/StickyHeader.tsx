import { useEffect, useRef, useState } from "react";
import type { DrawPersisted, StudentData } from "../types";
import { RefreshCw, Shuffle, BookOpen, X, GripHorizontal } from "lucide-react";
import { useDialogs } from "../hooks/useDialogs";
import { Button } from "./Button";

const STEP_LABELS: Record<number, string> = {
  1: "Étudiant",
  2: "Tirage au sort",
  3: "Évaluation",
  4: "Commentaires",
  5: "Signature",
};

interface StickyHeaderProps {
  isCoordinator: boolean;
  studentData: StudentData;
  studentsEvaluatedCount: number;
  totalStudentsCount: number;
  drawEnabled: boolean;
  drawPersisted: DrawPersisted | null;
  onDrawQuestion: () => void;
  onResetEvaluation: () => void;
  onResetAndRedraw: () => void;
  examDurationMinutes: number;
  elapsedMs: number;
  remainingMs: number;
  isOvertime: boolean;
  isTimerRunning: boolean;
  onStartTimer: () => void;
  evalStep: number;
}

function QuestionPopup({
  drawPersisted,
  onClose,
}: {
  drawPersisted: DrawPersisted;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ x: Math.max(0, window.innerWidth - 340), y: 80 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  return (
    <div
      className="fixed z-[200] w-80 rounded-2xl border border-indigo-200 bg-white shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex cursor-grab items-center justify-between rounded-t-2xl bg-indigo-600 px-4 py-2 text-white select-none"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <GripHorizontal size={14} className="opacity-70" />
          Question tirée au sort
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 hover:bg-white/20"
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-4">
        {drawPersisted.mode === "group" ? (
          <>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-indigo-700">
              {drawPersisted.group.title}
            </p>
            <ul className="ml-4 list-disc space-y-1">
              {drawPersisted.group.questions.map((q, i) => (
                <li key={i} className="text-sm leading-snug text-slate-800">{q}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-base font-semibold leading-snug text-slate-800">
            {drawPersisted.question}
          </p>
        )}
      </div>
    </div>
  );
}

export function StickyHeader({
  isCoordinator,
  studentData,
  studentsEvaluatedCount,
  totalStudentsCount,
  drawEnabled,
  drawPersisted,
  onDrawQuestion,
  onResetEvaluation,
  onResetAndRedraw,
  examDurationMinutes,
  elapsedMs,
  remainingMs,
  isOvertime,
  isTimerRunning,
  onStartTimer,
  evalStep,
}: StickyHeaderProps) {
  const { confirm } = useDialogs();
  const [popupOpen, setPopupOpen] = useState(false);

  // Ouvrir le popup automatiquement dès que la question est tirée
  useEffect(() => {
    if (drawPersisted) setPopupOpen(true);
    else setPopupOpen(false);
  }, [drawPersisted]);

  if (isCoordinator || evalStep < 2) return null;

  const formatMs = (ms: number) => {
    const isNegative = ms < 0;
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const base = `${minutes}:${seconds}`;
    return isNegative ? `-${base}` : base;
  };

  const durationMs = examDurationMinutes > 0 ? examDurationMinutes * 60_000 : 0;
  const isWarning =
    durationMs > 0 && !isOvertime && elapsedMs >= (durationMs * 4) / 5 && elapsedMs < durationMs;

  let bgClass = "from-indigo-600 to-indigo-700";
  let extraClasses = "";
  if (isOvertime) { bgClass = "from-red-600 to-red-700"; extraClasses = "animate-pulse"; }
  else if (isWarning) { bgClass = "from-orange-500 to-amber-500"; extraClasses = "animate-pulse"; }

  return (
    <>
      {drawEnabled && drawPersisted && popupOpen && (
        <QuestionPopup drawPersisted={drawPersisted} onClose={() => setPopupOpen(false)} />
      )}

      <div
        className={`sticky top-0 z-50 px-4 py-3 text-white shadow-xl print:hidden bg-gradient-to-r ${bgClass} ${extraClasses}`}
      >
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm font-black">
                {evalStep}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Étape {evalStep}/5</span>
                <span className="text-sm font-extrabold">{STEP_LABELS[evalStep] ?? ""}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-white/30" />
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-black uppercase tracking-tight text-white drop-shadow">
                {studentData.civilite ? `${studentData.civilite} ` : ""}
                {studentData.nom} {studentData.prenom}
              </span>
              <span className="text-sm font-bold text-white/80">
                {studentData.ue && <span>{studentData.ue}</span>}
                {studentData.ue && totalStudentsCount > 0 && <span className="mx-1.5 opacity-50">·</span>}
                {totalStudentsCount > 0 && (() => {
                    const remaining = totalStudentsCount - studentsEvaluatedCount;
                    return remaining > 0
                      ? <span className="text-white/50">{remaining} restant{remaining > 1 ? "s" : ""}</span>
                      : null;
                  })()}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            {examDurationMinutes > 0 && (
              <div className="rounded-full bg-black/40 px-6 py-2 text-3xl font-black tracking-widest shadow-sm md:text-4xl">
                ⏱ {formatMs(remainingMs)}
              </div>
            )}
            {!drawEnabled && examDurationMinutes > 0 && !isTimerRunning && (
              <Button
                size="sm"
                onClick={onStartTimer}
                className="rounded-full bg-white/20 text-[10px] uppercase text-white hover:bg-emerald-500"
              >
                Démarrer le chrono
              </Button>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {drawEnabled && drawPersisted && !popupOpen && (
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  <BookOpen size={13} /> Voir la question
                </button>
              )}

              {drawEnabled && !drawPersisted && (
                <Button
                  icon={<Shuffle size={18} />}
                  onClick={onDrawQuestion}
                  className="rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold uppercase text-slate-900 shadow-xl ring-2 ring-amber-300 hover:bg-amber-500 hover:ring-amber-400 animate-pulse"
                >
                  Tirer une question
                </Button>
              )}

              <Button
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Réinitialiser l'évaluation ?",
                    message: drawEnabled
                      ? "L'évaluation en cours sera effacée, un nouveau tirage sera effectué et le chrono redémarre."
                      : "Toutes les notes, remarques et la signature de l'évaluation en cours seront effacées.",
                    confirmLabel: "Réinitialiser",
                    danger: true,
                  });
                  if (ok) {
                    if (drawEnabled) onResetAndRedraw();
                    else onResetEvaluation();
                  }
                }}
                className="bg-white/20 text-white hover:bg-red-500"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
