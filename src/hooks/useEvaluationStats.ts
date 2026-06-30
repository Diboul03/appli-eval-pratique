import { useMemo } from "react";
import type { SavedEvaluation } from "../types";
import type { DashboardStats } from "../components/DashboardModal";

export function useEvaluationStats(savedEvaluations: SavedEvaluation[]): DashboardStats | null {
  return useMemo(() => {
    if (savedEvaluations.length === 0) return null;

    const notes = savedEvaluations.map(e => e.total20);
    const avg = notes.reduce((a, b) => a + b, 0) / notes.length;

    const sorted = [...notes].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const min = Math.min(...notes);
    const max = Math.max(...notes);
    const passCount = notes.filter(n => n >= 10).length;
    const passRate = (passCount / notes.length) * 100;

    const distribution = [
      { label: "< 8", count: notes.filter(n => n < 8).length, color: "bg-red-500" },
      {
        label: "8-10",
        count: notes.filter(n => n >= 8 && n < 10).length,
        color: "bg-orange-500",
      },
      {
        label: "10-12",
        count: notes.filter(n => n >= 10 && n < 12).length,
        color: "bg-yellow-500",
      },
      {
        label: "12-14",
        count: notes.filter(n => n >= 12 && n < 14).length,
        color: "bg-lime-500",
      },
      {
        label: "14-16",
        count: notes.filter(n => n >= 14 && n < 16).length,
        color: "bg-green-500",
      },
      {
        label: "16-18",
        count: notes.filter(n => n >= 16 && n < 18).length,
        color: "bg-emerald-500",
      },
      { label: "≥ 18", count: notes.filter(n => n >= 18).length, color: "bg-teal-500" },
    ];

    type AxisAgg = { sum: number; count: number; label: string; max: number };
    const axisAgg: Record<string, AxisAgg> = {};

    savedEvaluations.forEach(ev => {
      ev.axes.forEach(axis => {
        if (!axisAgg[axis.id]) {
          axisAgg[axis.id] = { sum: 0, count: 0, label: axis.label, max: axis.max };
        }
        const val = ev.scores[axis.id] ?? 0;
        axisAgg[axis.id].sum += val;
        axisAgg[axis.id].count += 1;
        if (axis.max > axisAgg[axis.id].max) {
          axisAgg[axis.id].max = axis.max;
        }
      });
    });

    const axisStats = Object.entries(axisAgg)
      .map(([id, agg]) => {
        const avgAxis = agg.count > 0 ? agg.sum / agg.count : 0;
        const normalized = agg.max > 0 ? (avgAxis / agg.max) * 20 : 0;
        return { id, label: agg.label, avg: normalized, max: 20 };
      })
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5);

    // Durée moyenne d'épreuve sur les évaluations qui ont une durée mesurée
    const durations = savedEvaluations
      .map(e => e.evaluationDurationMs)
      .filter((v): v is number => typeof v === "number" && v > 0);
    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((sum, v) => sum + v, 0) / durations.length
        : null;

    const stats: DashboardStats = {
      avg,
      median,
      min,
      max,
      passRate,
      distribution,
      axisStats,
      avgDurationMs,
    };

    return stats;
  }, [savedEvaluations]);
}
