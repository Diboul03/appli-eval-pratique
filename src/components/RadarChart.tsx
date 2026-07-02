import React, { useCallback, useMemo, useRef, useState } from "react";
import type { Axis, Scores, SubStatus } from "../types";

const SI_COLORS: Record<"ACQUIS" | "EN_COURS" | "NON_ACQUIS", { selected: string; unselected: string; stroke: string }> = {
  ACQUIS:    { selected: "#059669", unselected: "#a7f3d0", stroke: "#065f46" },
  EN_COURS:  { selected: "#d97706", unselected: "#fde68a", stroke: "#92400e" },
  NON_ACQUIS:{ selected: "#dc2626", unselected: "#fca5a5", stroke: "#7f1d1d" },
};
const SI_STATUSES = ["ACQUIS", "EN_COURS", "NON_ACQUIS"] as const;
function wrapLabel(s: string): [string, string] {
  if (s.length <= 14) return [s, ""];
  const mid = s.lastIndexOf(" ", 14);
  if (mid > 3) return [s.substring(0, mid), s.substring(mid + 1)];
  return [s.substring(0, 14), s.substring(14)];
}

interface RadarChartProps {
  axes: Axis[];
  scores: Scores;
  setScores: React.Dispatch<React.SetStateAction<Scores>>;
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  touched: Record<string, boolean>;
  axesMaxSum: number;
  showBareme: boolean;
  showPercent: boolean;
  subChecks?: Record<string, Record<string, SubStatus>>;
  setSubChecks?: React.Dispatch<React.SetStateAction<Record<string, Record<string, SubStatus>>>>;
}

export function RadarChart({
  axes,
  scores,
  setScores,
  setTouched,
  touched,
  axesMaxSum,
  showBareme,
  showPercent,
  subChecks,
  setSubChecks,
}: RadarChartProps) {
  const center = 500;
  const radius = 210;
  const labelRadius = radius + 150;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const lockedAxisIndex = useRef<number | null>(null);
  const [hoveredAxisIndex, setHoveredAxisIndex] = useState<number | null>(null);

  const angleForIndex = (i: number, n: number) => -90 + (360 / n) * i;

  const getPointCoords = (val: number, max: number, angle: number) => {
    const r = max > 0 ? (val / max) * radius : 0;
    const rad = (angle * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const svgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX - center,
      y: (clientY - rect.top) * scaleY - center,
    };
  }, []);

  const findClosestAxis = useCallback(
    (x: number, y: number, toleranceDeg = 360): { idx: number; diff: number } => {
      const ang = (Math.atan2(y, x) * 180) / Math.PI;
      let minDiff = Infinity;
      let closestIdx = 0;
      for (let i = 0; i < axes.length; i += 1) {
        const a = angleForIndex(i, axes.length);
        let diff = Math.abs(a - ang);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) { minDiff = diff; closestIdx = i; }
      }
      return { idx: minDiff <= toleranceDeg ? closestIdx : -1, diff: minDiff };
    },
    [axes.length],
  );

  const updateLockedAxis = useCallback(
    (x: number, y: number) => {
      const idx = lockedAxisIndex.current;
      if (idx === null || idx < 0) return;
      const axis = axes[idx];
      const dist = Math.sqrt(x * x + y * y);
      let newVal = Math.round((dist / radius) * axis.max * 10) / 10;
      newVal = Math.max(0, Math.min(axis.max, newVal));
      setScores(prev => ({ ...prev, [axis.id]: newVal }));
      setTouched(prev => ({ ...prev, [axis.id]: true }));
    },
    [axes, setScores, setTouched],
  );

  const onRadarMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = svgCoords(e.clientX, e.clientY);
    const { idx, diff } = findClosestAxis(x, y, 20);
    if (diff <= 20) {
      lockedAxisIndex.current = idx;
      setHoveredAxisIndex(idx);
      updateLockedAxis(x, y);
    }
  };

  const onRadarMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = svgCoords(e.clientX, e.clientY);
    if (lockedAxisIndex.current !== null) {
      updateLockedAxis(x, y);
    } else {
      const { idx, diff } = findClosestAxis(x, y, 15);
      setHoveredAxisIndex(diff <= 15 ? idx : null);
    }
  };

  const onRadarMouseUp = () => { lockedAxisIndex.current = null; };
  const onRadarMouseLeave = () => { lockedAxisIndex.current = null; setHoveredAxisIndex(null); };

  const onRadarTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    const { x, y } = svgCoords(t.clientX, t.clientY);
    const { idx, diff } = findClosestAxis(x, y, 25);
    if (diff <= 25) {
      lockedAxisIndex.current = idx;
      setHoveredAxisIndex(idx);
      updateLockedAxis(x, y);
    }
  };

  const onRadarTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (lockedAxisIndex.current === null) return;
    const t = e.touches[0];
    const { x, y } = svgCoords(t.clientX, t.clientY);
    updateLockedAxis(x, y);
  };

  const onRadarTouchEnd = () => { lockedAxisIndex.current = null; setHoveredAxisIndex(null); };

  const radarPoints = useMemo(
    () =>
      axes
        .map((a, i) => {
          const angle = angleForIndex(i, axes.length);
          const coords = getPointCoords(scores[a.id] || 0, a.max, angle);
          return `${coords.x},${coords.y}`;
        })
        .join(" "),
    [axes, scores],
  );

  const handleSiClick = useCallback(
    (axisId: string, siId: string, status: SubStatus) => {
      setSubChecks?.(prev => ({
        ...prev,
        [axisId]: { ...prev[axisId], [siId]: status },
      }));
    },
    [setSubChecks],
  );

  const hasSubItems = axes.some(a => (a.subItems || []).length > 0);

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[1000px] rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
        {/* Instructions + légende au-dessus du radar */}
        <div className="mb-3 space-y-2 border-b border-slate-100 pb-3">
          {/* Instruction radar : toujours visible */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
              <span>Glissez le <strong>point bleu</strong> sur chaque axe pour noter</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
              <span><strong>Centre = 0</strong> &nbsp;—&nbsp; <strong>Extrémité = note maximale</strong></span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 13,5 11,12 3,12 1,5" fill="rgba(37,99,235,0.2)" stroke="#2563eb" strokeWidth="1.5"/></svg>
              <span>La <strong>surface bleue</strong> représente la note moyenne globale</span>
            </span>
          </div>
          {/* Légende sous-indicateurs : uniquement si des sous-indicateurs existent */}
          {hasSubItems && (
            <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-center text-[11px] font-semibold text-amber-800">
                ↓ Pour chaque sous-indicateur (fond jaune = non renseigné), cliquez sur un cercle :
              </p>
              <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-5 w-5 flex-shrink-0 rounded-full border-2 border-[#065f46] bg-[#059669]" />
                  <span className="font-semibold text-[#065f46]">Acquis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-5 w-5 flex-shrink-0 rounded-full border-2 border-[#92400e] bg-[#d97706]" />
                  <span className="font-semibold text-[#92400e]">En cours d'acquisition</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-5 w-5 flex-shrink-0 rounded-full border-2 border-[#7f1d1d] bg-[#dc2626]" />
                  <span className="font-semibold text-[#7f1d1d]">Non acquis</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <svg
          ref={svgRef}
          viewBox="0 0 1000 1000"
          className={`h-auto w-full ${hoveredAxisIndex !== null ? "cursor-grab" : "cursor-not-allowed"} select-none touch-none`}
          onMouseDown={onRadarMouseDown}
          onMouseMove={onRadarMouseMove}
          onMouseUp={onRadarMouseUp}
          onMouseLeave={onRadarMouseLeave}
          onTouchStart={onRadarTouchStart}
          onTouchMove={onRadarTouchMove}
          onTouchEnd={onRadarTouchEnd}
        >
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fecaca" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#fde68a" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.6} />
            </radialGradient>
          </defs>

          <circle cx={center} cy={center} r={radius} fill="url(#radarGradient)" />
          <circle cx={center} cy={center} r={radius * 0.5} fill="none" stroke="#bfdbfe" strokeWidth={2} />

          {[0.2, 0.4, 0.6, 0.8, 1].map(lvl => (
            <circle key={lvl} cx={center} cy={center} r={radius * lvl} fill="none" stroke="#f1f5f9" strokeWidth={1} />
          ))}

          {axes.map((a, i) => {
            const angle = angleForIndex(i, axes.length);
            const coords = getPointCoords(a.max, a.max, angle);
            const rad = (angle * Math.PI) / 180;
            const lx = center + labelRadius * Math.cos(rad);
            const ly = center + labelRadius * Math.sin(rad);
            const bg = touched[a.id] ? "#ffffff" : "#d1fae5";
            const isHighlighted = hoveredAxisIndex === i;

            const siItems = a.subItems || [];
            const siCount = siItems.length;
            const siRowH = 52;
            const siAreaH = siCount > 0 ? siCount * siRowH + 4 : 0;
            // Place sub-items above the label when near the bottom of the viewBox
            const flipUp = siCount > 0 && ly + 16 + siAreaH > 960;
            const rectY = flipUp ? ly - 24 - siAreaH : ly - 24;
            const rectH = 40 + siAreaH;
            const siBaseY = flipUp ? ly - 24 - siAreaH + 2 : ly + 20;

            return (
              <g key={a.id}>
                <line
                  x1={center} y1={center}
                  x2={coords.x} y2={coords.y}
                  stroke={isHighlighted ? "#60a5fa" : "#e2e8f0"}
                  strokeWidth={isHighlighted ? 3 : 1}
                />

                <rect
                  x={lx - 130}
                  y={rectY}
                  width={260}
                  height={rectH}
                  rx={6}
                  fill={bg}
                  opacity={0.95}
                />

                <text x={lx} y={ly - 6} fontSize={18} fontWeight={800} textAnchor="middle" fill="#64748b">
                  {a.label}
                </text>

                {(showBareme || showPercent) && (
                  <text x={lx} y={ly + 10} fontSize={11} fontWeight={700} textAnchor="middle" fill="#94a3b8">
                    {showBareme
                      ? `Barème: ${a.max.toFixed(1)}`
                      : `${Math.round((a.max / axesMaxSum) * 100)}% de la note finale`}
                  </text>
                )}

                {siCount > 0 && siItems.map((si, siIdx) => {
                  const currentStatus = subChecks?.[a.id]?.[si.id] ?? "";
                  const isUntouched = currentStatus === "";
                  const rowY = siBaseY + siIdx * siRowH;
                  return (
                    <g key={si.id}>
                      {/* Fond de surbrillance si non renseigné */}
                      {isUntouched && (
                        <rect
                          x={lx - 130}
                          y={rowY}
                          width={260}
                          height={siRowH - 2}
                          rx={4}
                          fill="#fef9c3"
                          opacity={0.7}
                        />
                      )}
                      {(() => {
                        const [line1, line2] = wrapLabel(si.label);
                        return (
                          <text
                            x={lx - 128}
                            fontSize={16}
                            fontWeight={700}
                            textAnchor="start"
                            fill={isUntouched ? "#92400e" : "#1e293b"}
                          >
                            <tspan x={lx - 128} y={rowY + (line2 ? 16 : 26)}>{line1}</tspan>
                            {line2 && <tspan x={lx - 128} dy={18}>{line2}</tspan>}
                          </text>
                        );
                      })()}
                      {SI_STATUSES.map((targetStatus, ci) => {
                        const col = SI_COLORS[targetStatus];
                        const isSelected = currentStatus === targetStatus;
                        return (
                          <g key={targetStatus}>
                            <circle
                              cx={lx + 20 + ci * 26}
                              cy={rowY + 25}
                              r={10}
                              fill={isSelected ? col.selected : col.unselected}
                              stroke={col.stroke}
                              strokeWidth={isSelected ? 2.5 : 1.5}
                              style={{ cursor: "pointer" }}
                              onMouseDown={e => e.stopPropagation()}
                              onTouchStart={e => { e.stopPropagation(); handleSiClick(a.id, si.id, targetStatus); }}
                              onClick={e => { e.stopPropagation(); handleSiClick(a.id, si.id, targetStatus); }}
                            />
                            {/* Pulsation sur le cercle non sélectionné quand rien n'est coché */}
                            {isUntouched && (
                              <circle
                                cx={lx + 20 + ci * 26}
                                cy={rowY + 25}
                                r={10}
                                fill="none"
                                stroke={col.stroke}
                                strokeWidth={2}
                                opacity={0}
                                style={{ pointerEvents: "none" }}
                              >
                                <animate attributeName="r" values="10;14;10" dur="1.8s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.7;0;0.7" dur="1.8s" repeatCount="indefinite" />
                              </circle>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            );
          })}

          <polygon
            points={radarPoints}
            fill="rgba(37,99,235,0.15)"
            stroke="#2563eb"
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {axes.map(a => {
            const i = axes.findIndex(x => x.id === a.id);
            const angle = angleForIndex(i, axes.length);
            const coords = getPointCoords(scores[a.id] || 0, a.max, angle);
            return <circle key={a.id} cx={coords.x} cy={coords.y} r={4} fill="#2563eb" />;
          })}
        </svg>

      </div>
    </div>
  );
}
