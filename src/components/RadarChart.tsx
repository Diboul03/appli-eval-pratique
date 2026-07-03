import React, { useCallback, useMemo, useRef, useState } from "react";
import type { Axis, Scores, SubStatus } from "../types";

function scoreColor(ratio: number): string {
  // 0 → rouge opaque, 0.5 → gris transparent, 1 → vert opaque
  const dist = Math.abs(ratio - 0.5) * 2; // 0 au milieu, 1 aux extrêmes
  const alpha = 0.25 + dist * 0.75;       // 0.25 au centre, 1.0 aux bords
  if (ratio < 0.5) {
    const t = ratio * 2; // 0→1
    const r = Math.round(220 + (160 - 220) * t);
    const g = Math.round(38  + (160 - 38 ) * t);
    const b = Math.round(38  + (160 - 38 ) * t);
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  } else {
    const t = (ratio - 0.5) * 2; // 0→1
    const r = Math.round(160 + (5   - 160) * t);
    const g = Math.round(160 + (150 - 160) * t);
    const b = Math.round(160 + (105 - 160) * t);
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }
}

const SI_COLORS: Record<"ACQUIS" | "EN_COURS" | "NON_ACQUIS", { selected: string; unselected: string; stroke: string }> = {
  ACQUIS:    { selected: "#059669", unselected: "#a7f3d0", stroke: "#065f46" },
  EN_COURS:  { selected: "#d97706", unselected: "#fde68a", stroke: "#92400e" },
  NON_ACQUIS:{ selected: "#dc2626", unselected: "#fca5a5", stroke: "#7f1d1d" },
};
const SI_STATUSES = ["ACQUIS", "EN_COURS", "NON_ACQUIS"] as const;
function wrapLabel(s: string): [string, string] {
  if (s.length <= 22) return [s, ""];
  const mid = s.lastIndexOf(" ", 22);
  if (mid > 3) return [s.substring(0, mid), s.substring(mid + 1)];
  return [s.substring(0, 22), s.substring(22)];
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
  const lblRadX = radius + 140; // horizontal clearance (wider for ±0°/180° axes)
  const lblRadY = radius + 30;  // vertical clearance — réduit pour coller au cercle

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
        {/* Instructions radar — ligne compacte au-dessus */}
        <div className="mb-1 border-b border-slate-100 pb-1">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
              <span>Glissez le <strong>point bleu</strong> sur chaque axe pour noter</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
              <span><strong>Centre = 0</strong> &nbsp;—&nbsp; <strong>Extrémité = max</strong></span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 13,5 11,12 3,12 1,5" fill="rgba(37,99,235,0.2)" stroke="#2563eb" strokeWidth="1.5"/></svg>
              <span>La <strong>surface bleue</strong> = note globale</span>
            </span>
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox="0 50 1000 870"
          className={`w-full h-[46vh] min-h-[320px] ${hoveredAxisIndex !== null ? "cursor-grab" : "cursor-not-allowed"} select-none touch-none`}
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
            const _coords = getPointCoords(a.max, a.max, angle); void _coords;
            const rad = (angle * Math.PI) / 180;
            const lx = center + lblRadX * Math.cos(rad);
            const ly = center + lblRadY * Math.sin(rad);
            const bg = touched[a.id] ? "#ffffff" : "#d1fae5";
            const isHighlighted = hoveredAxisIndex === i;

            const siItems = a.subItems || [];
            const siCount = siItems.length;
            const siRowH = 58;
            const siAreaH = siCount > 0 ? siCount * siRowH + 4 : 0;
            const hasExtra = showBareme || showPercent; // barème line takes extra space
            const titleBlockH = hasExtra ? 58 : 38; // title + optional barème
            // Box shifts up for upper-half axes so sub-items don't overlap radar
            const flipUp = siCount > 0 && Math.sin(rad) < -0.1;
            const rectY = flipUp ? ly - 24 - siAreaH - titleBlockH + 14 : ly - 24;
            const rectH = titleBlockH + siAreaH;
            const titleY = rectY + 24;
            const baremeY = rectY + 46;
            const siBaseY = rectY + titleBlockH;

            const radarEdgeX = center + radius * Math.cos(rad);
            const radarEdgeY = center + radius * Math.sin(rad);

            return (
              <g key={a.id}>
                <line
                  x1={center} y1={center}
                  x2={radarEdgeX} y2={radarEdgeY}
                  stroke={(isHighlighted || touched[a.id]) ? scoreColor(a.max > 0 ? (scores[a.id] || 0) / a.max : 0) : "#e2e8f0"}
                  strokeWidth={isHighlighted ? 5 : touched[a.id] ? 3 : 1.5}
                />

                {/* Groupe label : stopPropagation pour éviter le déclenchement du radar */}
                <g
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                >
                <rect
                  x={lx - 105}
                  y={rectY}
                  width={210}
                  height={rectH}
                  rx={6}
                  fill={bg}
                  opacity={0.95}
                />

                <text x={lx} y={titleY} fontSize={24} fontWeight={800} textAnchor="middle" fill="#64748b">
                  {a.label}
                </text>

                {(showBareme || showPercent) && (
                  <text x={lx} y={baremeY} fontSize={18} fontWeight={700} textAnchor="middle" fill="#94a3b8">
                    {showBareme
                      ? `Barème: ${a.max.toFixed(1)}`
                      : `${Math.round((a.max / axesMaxSum) * 100)}%`}
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
                          x={lx - 105}
                          y={rowY}
                          width={210}
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
                            x={lx}
                            fontSize={18}
                            fontWeight={700}
                            textAnchor="middle"
                            fill={isUntouched ? "#92400e" : "#1e293b"}
                          >
                            <tspan x={lx} y={rowY + (line2 ? 13 : 20)}>{line1}</tspan>
                            {line2 && <tspan x={lx} dy={18}>{line2}</tspan>}
                          </text>
                        );
                      })()}
                      {SI_STATUSES.map((targetStatus, ci) => {
                        const col = SI_COLORS[targetStatus];
                        const isSelected = currentStatus === targetStatus;
                        const cx = lx - 24 + ci * 24;
                        const cy = rowY + (wrapLabel(si.label)[1] ? 50 : 42);
                        return (
                          <g key={targetStatus}>
                            {/* Halo blanc derrière le cercle sélectionné pour le faire ressortir */}
                            {isSelected && (
                              <circle cx={cx} cy={cy} r={14} fill="white" opacity={0.9} style={{ pointerEvents: "none" }} />
                            )}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? 12 : 9}
                              fill={isSelected ? col.selected : isUntouched ? col.selected : col.unselected}
                              stroke={isSelected ? col.stroke : isUntouched ? col.stroke : "#94a3b8"}
                              strokeWidth={isSelected ? 3 : isUntouched ? 1.5 : 1}
                              opacity={isSelected ? 1 : isUntouched ? 0.75 : 0.35}
                              style={{ cursor: "pointer" }}
                              onMouseDown={e => e.stopPropagation()}
                              onTouchStart={e => { e.stopPropagation(); handleSiClick(a.id, si.id, targetStatus); }}
                              onClick={e => { e.stopPropagation(); handleSiClick(a.id, si.id, targetStatus); }}
                            />
                            {/* Pulsation sur le cercle non sélectionné quand rien n'est coché */}
                            {isUntouched && (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={8}
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
                </g>{/* fin groupe label */}
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

        {/* Légende sous-indicateurs — sous le radar pour ne pas chevaucher l'axe supérieur */}
        {hasSubItems && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="mb-1 text-center text-[11px] font-semibold text-amber-800">
              Pour chaque sous-indicateur (fond jaune = non renseigné), cliquez sur un cercle :
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
    </div>
  );
}
