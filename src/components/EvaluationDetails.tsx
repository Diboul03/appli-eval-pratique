import type { Axis, Scores, SubStatus } from "../types";
import { ScoreControl } from "./ScoreControl";
import { SubItemButton, subItemConfigs } from "./SubItemButton";

interface EvaluationDetailsProps {
  axes: Axis[];
  isCoordinator: boolean;
  scores: Scores;
  subChecks: Record<string, Record<string, SubStatus>>;
  subComments: Record<string, Record<string, string>>;
  setSubChecks: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, SubStatus>>>
  >;
  setSubComments: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, string>>>
  >;
}

export function EvaluationDetails({
  axes,
  isCoordinator,
  scores,
  subChecks,
  subComments,
  setSubChecks,
  setSubComments,
}: EvaluationDetailsProps) {
  return (
    <div className="space-y-4">
      {axes.map(axis => {
        const subItems = axis.subItems || [];
        const totalSub = subItems.length;
        const completedSub = subItems.reduce((count, si) => {
          const status = subChecks[axis.id]?.[si.id] ?? "";
          return status ? count + 1 : count;
        }, 0);
        const axisNeedsComment = subItems.some(si => {
          const st = subChecks[axis.id]?.[si.id] ?? "";
          return st === "NON_ACQUIS" || st === "EN_COURS";
        });
        const axisComment = subComments[axis.id]?.["__axis__"] ?? "";

        return (
          <div
            key={axis.id}
            className="rounded-xl border border-blue-100 bg-blue-50 p-2"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold uppercase text-slate-700">
                {axis.label}
              </span>
              {totalSub > 0 && (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] font-semibold text-slate-500">
                    Sous-indicateurs : {completedSub}/{totalSub}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: totalSub }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 w-1.5 rounded-full ${
                          idx < completedSub ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isCoordinator && (
              <div className="px-2 pb-1">
                <ScoreControl
                  label={axis.label}
                  max={axis.max}
                  value={scores[axis.id] || 0}
                />
              </div>
            )}

            {totalSub > 0 && (
              <div className="mt-2 rounded-lg border border-green-100 bg-green-50 p-2">
                {subItems.map(si => {
                  const status = subChecks[axis.id]?.[si.id] ?? "";
                  const isUntouched = status === "";

                  return (
                    <div
                      key={si.id}
                      className={`mb-2 rounded-lg border px-2 py-2 text-xs ${
                        isUntouched
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="font-semibold text-slate-700">{si.label}</div>
                        <div className="mt-1 flex gap-1.5 sm:mt-0">
                          {(["ACQUIS", "EN_COURS", "NON_ACQUIS"] as const).map(s => (
                            <SubItemButton
                              key={s}
                              status={status}
                              targetStatus={s}
                              onClick={() =>
                                setSubChecks(prev => ({
                                  ...prev,
                                  [axis.id]: { ...prev[axis.id], [si.id]: s },
                                }))
                              }
                              icon={subItemConfigs[s].icon}
                              label={subItemConfigs[s].label}
                              colorClasses={subItemConfigs[s].colorClasses}
                              tooltip={subItemConfigs[s].tooltip}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {axisNeedsComment && (
                  <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-2">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-red-600">
                      <span>*</span>
                      <span>Commentaire obligatoire pour cet indicateur</span>
                    </div>
                    <textarea
                      rows={2}
                      value={axisComment}
                      onChange={e =>
                        setSubComments(prev => ({
                          ...prev,
                          [axis.id]: { ...prev[axis.id], ["__axis__"]: e.target.value },
                        }))
                      }
                      placeholder="Commentaire obligatoire"
                      className={`w-full rounded border px-2 py-1 text-xs ${
                        axisComment.trim()
                          ? "border-slate-300 bg-white"
                          : "border-red-400 bg-red-50"
                      }`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
