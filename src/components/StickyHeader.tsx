import type { DrawPersisted, StudentData } from "../types";
import { RefreshCw, Shuffle } from "lucide-react";
import { useDialogs } from "./Dialogs";
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
  hasSelectedStudent: boolean;
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

  if (isCoordinator || evalStep < 2) return null;

  const formatMs = (ms: number) => {
    const isNegative = ms < 0;
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const base = `${minutes}:${seconds}`;
    return isNegative ? `-${base}` : base;
  };

  const durationMs = examDurationMinutes > 0 ? examDurationMinutes * 60_000 : 0;

  const isWarning =
    durationMs > 0 &&
    !isOvertime &&
    elapsedMs >= (durationMs * 4) / 5 &&
    elapsedMs < durationMs;

  let bgClass = "from-indigo-600 to-indigo-700";
  let extraClasses = "";

  if (isOvertime) {
    bgClass = "from-red-600 to-red-700";
    extraClasses = "animate-pulse";
  } else if (isWarning) {
    bgClass = "from-orange-500 to-amber-500";
    extraClasses = "animate-pulse";
  }

  return (
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
            <span className="text-xs font-semibold text-white/80">
              {studentData.civilite ? `${studentData.civilite} ` : ""}
              {studentData.nom} {studentData.prenom}
            </span>
            <span className="text-[10px] text-white/60">
              {studentData.ue && <span>{studentData.ue}</span>}
              {studentData.ue && totalStudentsCount > 0 && <span className="mx-1">·</span>}
              {totalStudentsCount > 0 && <span>{studentsEvaluatedCount}/{totalStudentsCount} évalués</span>}
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
            {drawEnabled && drawPersisted && (
              <div className="max-w-md max-h-40 overflow-y-auto rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Question tirée
                </div>
                {drawPersisted.mode === "group" ? (
                  <div className="mt-0.5">
                    <div className="text-xs font-extrabold uppercase text-indigo-700">
                      {drawPersisted.group.title}
                    </div>
                    <ul className="mt-1 ml-4 list-disc space-y-0.5">
                      {drawPersisted.group.questions.map((q, idx) => (
                        <li key={idx} className="text-[11px] leading-snug">
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-0.5 text-sm font-extrabold text-indigo-800">
                    {drawPersisted.question}
                  </div>
                )}
              </div>
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
  );
}
