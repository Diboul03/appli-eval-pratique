import { BarChart3, X } from "lucide-react";
import type { SavedEvaluation } from "../types";
import { Button } from "./Button";

export type DashboardStats = {
  avg: number;
  median: number;
  min: number;
  max: number;
  passRate: number;
  distribution: { label: string; count: number; color: string }[];
  axisStats: { id: string; label: string; avg: number; max: number }[];
  /**
   * Durée moyenne d'épreuve en millisecondes (calculée sur les évaluations qui ont une durée mesurée)
   */
  avgDurationMs: number | null;
};

interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  stats: DashboardStats | null;
  savedEvaluations: SavedEvaluation[];
}

export function DashboardModal({ open, onClose, stats, savedEvaluations }: DashboardModalProps) {
  if (!open || !stats) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-black">
            <BarChart3 size={24} /> Tableau de bord
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <div className="text-2xl font-black text-blue-600">{stats.avg.toFixed(1)}</div>
            <div className="text-xs text-blue-800">Moyenne</div>
          </div>
          <div
            className={`rounded-xl p-4 text-center ${
              stats.passRate >= 80
                ? "bg-green-50"
                : stats.passRate >= 50
                  ? "bg-orange-50"
                  : "bg-red-50"
            }`}
          >
            <div
              className={`text-2xl font-black ${
                stats.passRate >= 80
                  ? "text-green-600"
                  : stats.passRate >= 50
                    ? "text-orange-600"
                    : "text-red-600"
              }`}
            >
              {stats.passRate.toFixed(0)}%
            </div>
            <div className="text-xs">Réussite</div>
          </div>
          <div className="rounded-xl bg-purple-50 p-4 text-center">
            <div className="text-2xl font-black text-purple-600">{stats.median.toFixed(1)}</div>
            <div className="text-xs text-purple-800">Médiane</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <div className="text-2xl font-black text-slate-600">
              {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
            </div>
            <div className="text-xs text-slate-800">Étendue</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-center md:col-span-4">
            <div className="text-lg font-black text-amber-700">
              {stats.avgDurationMs != null
                ? (() => {
                    const totalSeconds = Math.round(stats.avgDurationMs / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    if (minutes > 0) {
                      return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;
                    }
                    return `${seconds} s`;
                  })()
                : "Non mesuré"}
            </div>
            <div className="text-xs text-amber-900">Temps moyen d'épreuve</div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 font-bold">Distribution des notes</h4>
            <div className="space-y-1">
              {stats.distribution.map(d => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-12 text-xs">{d.label}</span>
                  <div className="h-4 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`${d.color} h-4 rounded-full`}
                      style={{
                        width: `${
                          savedEvaluations.length > 0
                            ? (d.count / savedEvaluations.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-bold">Axes à renforcer</h4>
            <div className="space-y-2">
              {stats.axisStats.map(a => (
                <div key={a.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{a.label}</span>
                    <span>{a.avg.toFixed(1)}/20</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-red-400"
                      style={{ width: `${(a.avg / 20) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
