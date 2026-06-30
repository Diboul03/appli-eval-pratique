import type React from "react";
import { X } from "lucide-react";
import type { Axis } from "../types";
import { Button } from "./Button";

interface SignatureStepProps {
  isCoordinator: boolean;
  loadedEvaluationSignatureImage: string | null;
  signatureReady: boolean;
  hasSelectedStudent: boolean;
  allAxesTouched: boolean;
  allSubItemsSelected: boolean;
  /** true si les deux champs de commentaires (points positifs et axes d'amélioration) sont remplis */
  commentsReady: boolean;
  axes: Axis[];
  touched: Record<string, boolean>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onClearSignature: () => void;
  onStartDrawing: (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => void;
  onDraw: (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => void;
  onStopDrawing: () => void;
}

export function SignatureStep({
  isCoordinator,
  loadedEvaluationSignatureImage,
  signatureReady,
  hasSelectedStudent,
  allAxesTouched,
  allSubItemsSelected,
  commentsReady,
  axes,
  touched,
  canvasRef,
  onClearSignature,
  onStartDrawing,
  onDraw,
  onStopDrawing,
}: SignatureStepProps) {
  const statusMessage = (() => {
    if (!hasSelectedStudent) return "Sélectionnez un étudiant";
    if (!allAxesTouched) {
      const missing = axes
        .filter(a => !touched[a.id])
        .map(a => a.label)
        .join(", ");
      return `Évaluez tous les axes du radar (manquants : ${missing})`;
    }
    if (!allSubItemsSelected) return "Complétez tous les sous-items";
    if (!commentsReady) return "Renseignez les commentaires (points positifs et axes d'amélioration)";
    return "Veuillez compléter tous les champs";
  })();

  if (isCoordinator && loadedEvaluationSignatureImage) {
    return (
      <div className="rounded-xl border-2 border-slate-200 bg-white p-3 text-center shadow-inner">
        <p className="mb-2 text-[11px] font-semibold text-slate-500">
          Signature de l'évaluateur (non modifiable en mode administrateur)
        </p>
        <img
          src={loadedEvaluationSignatureImage}
          alt="Signature de l'évaluateur"
          className="mx-auto max-h-32"
        />
      </div>
    );
  }

  const totalAxes = axes.length;
  const touchedCount = axes.reduce((count, a) => (touched[a.id] ? count + 1 : count), 0);

  const hasAnySubItem = axes.some(a => (a.subItems || []).length > 0);

  const studentOk = hasSelectedStudent;
  const axesOk = allAxesTouched;
  const axesPartial = !allAxesTouched && touchedCount > 0;
  const subItemsOk = allSubItemsSelected || !hasAnySubItem;
  const commentsOk = commentsReady;

  const canSign = signatureReady;

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
        <div className="mb-1 font-semibold text-slate-600">Checklist avant signature</div>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                studentOk ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {studentOk ? "✓" : "!"}
            </span>
            <span>Étudiant sélectionné</span>
          </li>

          <li className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                axesOk
                  ? "bg-emerald-500 text-white"
                  : axesPartial
                    ? "bg-amber-500 text-white"
                    : "bg-red-500 text-white"
              }`}
            >
              {axesOk ? "✓" : axesPartial ? "~" : "!"}
            </span>
            <span>
              Tous les axes du radar notés
              {totalAxes > 0 && ` (${touchedCount}/${totalAxes})`}
            </span>
          </li>

          <li className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                !hasAnySubItem
                  ? "bg-slate-300 text-slate-800"
                  : subItemsOk
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-500 text-white"
              }`}
            >
              {!hasAnySubItem ? "-" : subItemsOk ? "✓" : "~"}
            </span>
            <span>
              {hasAnySubItem
                ? "Tous les sous-items renseignés"
                : "Aucun sous-item configuré"}
            </span>
          </li>

          <li className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                commentsOk ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {commentsOk ? "✓" : "!"}
            </span>
            <span>Commentaires rédigés</span>
          </li>
        </ul>
      </div>

      {canSign ? (
        <div className="relative mx-auto inline-block overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-inner">
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={12} />}
            onClick={onClearSignature}
            className="absolute right-1 top-1 bg-red-100 text-red-600 hover:bg-red-200"
          >
            Effacer
          </Button>
          <canvas
            ref={canvasRef}
            width={320}
            height={120}
            onMouseDown={onStartDrawing}
            onMouseMove={onDraw}
            onMouseUp={onStopDrawing}
            onMouseOut={onStopDrawing}
            onTouchStart={onStartDrawing}
            onTouchMove={onDraw}
            onTouchEnd={onStopDrawing}
            className="touch-none"
          />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-700 shadow-inner">
          <p>Complétez tous les éléments ci-dessus pour pouvoir signer.</p>
          <p className="mt-1 text-[10px] font-normal text-slate-500">{statusMessage}</p>
        </div>
      )}
    </div>
  );
}
