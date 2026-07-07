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
  subChecks,
  setSubChecks,
}: RadarChartProps) {
  const [coherenceWarn, setCoherenceWarn] = useState<string | null>(null);

  // Helpers sous-indicateurs
  const siItemsFor = useCallback((axisId: string) => {
    const ax = axes.find(a => a.id === axisId);
    return ax?.subItems ?? [];
  }, [axes]);

  const allAcquis = useCallback((axisId: string, pending?: { siId: string; status: SubStatus }) => {
    const items = siItemsFor(axisId);
    if (items.length === 0) return false;
    return items.every(si => {
      if (pending && si.id === pending.siId) return pending.status === "ACQUIS";
      return (subChecks?.[axisId]?.[si.id] ?? "") === "ACQUIS";
    });
  }, [siItemsFor, subChecks]);

  const allNonAcquis = useCallback((axisId: string, pending?: { siId: string; status: SubStatus }) => {
    const items = siItemsFor(axisId);
    if (items.length === 0) return false;
    return items.every(si => {
      if (pending && si.id === pending.siId) return pending.status === "NON_ACQUIS";
      return (subChecks?.[axisId]?.[si.id] ?? "") === "NON_ACQUIS";
    });
  }, [siItemsFor, subChecks]);

  const center = 500;
  const radius = 300;
  const lblRadX = radius + 190; // clearance horizontal — boîtes hors du cercle
  const lblRadY = radius + 80;  // clearance vertical

  const svgRef = useRef<SVGSVGElement | null>(null);
  const lockedAxisIndex = useRef<number | null>(null);
  const clampWarnShownRef = useRef(false);
  const [hoveredAxisIndex, setHoveredAxisIndex] = useState<number | null>(null);
  const [focusedAxisIndex, setFocusedAxisIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  const vibrate = (ms = 30) => {
    if (navigator.vibrate) navigator.vibrate(ms);
  };

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
    // viewBox="-150 -125 1300 1250"
    const scaleX = 1300 / rect.width;
    const scaleY = 1250 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX - 150 - center,
      y: (clientY - rect.top) * scaleY - 125 - center,
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

  const updateLockedAxisByIndex = useCallback(
    (idx: number, newVal: number) => {
      const axis = axes[idx];
      const mid = axis.max / 2;
      const siItems = axis.subItems ?? [];
      if (siItems.length > 0) {
        if (allAcquis(axis.id) && newVal < mid) return;
        if (allNonAcquis(axis.id) && newVal > mid) return;
      }
      setScores(prev => ({ ...prev, [axis.id]: newVal }));
      setTouched(prev => ({ ...prev, [axis.id]: true }));
    },
    [axes, allAcquis, allNonAcquis, setScores, setTouched],
  );

  const updateLockedAxis = useCallback(
    (x: number, y: number) => {
      const idx = lockedAxisIndex.current;
      if (idx === null || idx < 0) return;
      const axis = axes[idx];
      const dist = Math.sqrt(x * x + y * y);
      let newVal = Math.round((dist / radius) * axis.max * 10) / 10;
      newVal = Math.max(0, Math.min(axis.max, newVal));

      const mid = axis.max / 2;
      const siItems = axis.subItems ?? [];
      if (siItems.length > 0) {
        if (allAcquis(axis.id) && newVal < mid) {
          newVal = mid;
          if (!clampWarnShownRef.current) {
            clampWarnShownRef.current = true;
            setCoherenceWarn(
              `Tous les sous-indicateurs de « ${axis.label} » sont acquis (🟢).\n\nUne note inférieure à la moyenne (${mid.toFixed(1)} / ${axis.max}) est incohérente avec des sous-indicateurs tous acquis.\n\nModifiez d'abord les ronds si vous souhaitez noter en dessous de la moyenne.`
            );
          }
        } else if (allNonAcquis(axis.id) && newVal > mid) {
          newVal = mid;
          if (!clampWarnShownRef.current) {
            clampWarnShownRef.current = true;
            setCoherenceWarn(
              `Tous les sous-indicateurs de « ${axis.label} » sont non acquis (🔴).\n\nUne note supérieure à la moyenne (${mid.toFixed(1)} / ${axis.max}) est incohérente avec des sous-indicateurs tous non acquis.\n\nModifiez d'abord les ronds si vous souhaitez noter au-dessus de la moyenne.`
            );
          }
        }
      }

      setScores(prev => ({ ...prev, [axis.id]: newVal }));
      setTouched(prev => ({ ...prev, [axis.id]: true }));
    },
    [axes, allAcquis, allNonAcquis, setScores, setTouched],
  );

  const onRadarMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = svgCoords(e.clientX, e.clientY);
    const { idx, diff } = findClosestAxis(x, y, 20);
    if (diff <= 20) {
      lockedAxisIndex.current = idx;
      clampWarnShownRef.current = false;
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

  const pinchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onRadarTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      pinchStartDist.current = pinchDist(e.touches);
      pinchStartScale.current = zoomScale;
      lockedAxisIndex.current = null;
      return;
    }
    const t = e.touches[0];
    const { x, y } = svgCoords(t.clientX, t.clientY);
    const { idx, diff } = findClosestAxis(x, y, 25);
    if (diff <= 25) {
      lockedAxisIndex.current = idx;
      clampWarnShownRef.current = false;
      setHoveredAxisIndex(idx);
      setFocusedAxisIndex(idx);
      vibrate(30);
      updateLockedAxis(x, y);
    }
  };

  const onRadarTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      e.preventDefault();
      const ratio = pinchDist(e.touches) / pinchStartDist.current;
      const next = Math.min(4, Math.max(0.5, pinchStartScale.current * ratio));
      setZoomScale(next);
      return;
    }
    if (lockedAxisIndex.current === null) return;
    const t = e.touches[0];
    const { x, y } = svgCoords(t.clientX, t.clientY);
    updateLockedAxis(x, y);
  };

  const onRadarTouchEnd = () => {
    pinchStartDist.current = null;
    lockedAxisIndex.current = null;
    setHoveredAxisIndex(null);
  };

  // Navigation clavier : Tab/Maj+Tab = changer d'axe, flèches = ajuster le score
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const n = axes.length;
    if (n === 0) return;

    if (e.key === "Tab") {
      e.preventDefault();
      setFocusedAxisIndex(prev => {
        if (prev === null) return 0;
        return e.shiftKey ? (prev - 1 + n) % n : (prev + 1) % n;
      });
      return;
    }

    const idx = focusedAxisIndex;
    if (idx === null) return;
    const axis = axes[idx];
    const step = axis.max / 10;

    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const cur = scores[axis.id] ?? 0;
      const next = Math.min(axis.max, Math.round((cur + step) * 10) / 10);
      clampWarnShownRef.current = false;
      updateLockedAxisByIndex(idx, next);
      vibrate(20);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const cur = scores[axis.id] ?? 0;
      const next = Math.max(0, Math.round((cur - step) * 10) / 10);
      clampWarnShownRef.current = false;
      updateLockedAxisByIndex(idx, next);
      vibrate(20);
    }
  };

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
      const axis = axes.find(a => a.id === axisId);
      if (!axis) return;
      const mid = axis.max / 2;
      const score = scores[axisId] ?? 0;

      if (status === "ACQUIS" && allAcquis(axisId, { siId, status }) && score < mid) {
        setCoherenceWarn(
          `La note de « ${axis.label} » est inférieure à la moyenne (${score.toFixed(1)} / ${axis.max}).\n\nCocher tous les sous-indicateurs comme acquis (🟢) est incohérent avec une note en dessous de la moyenne.\n\nAugmentez d'abord la note sur le radar si tous les sous-indicateurs sont acquis.`
        );
        return;
      }
      if (status === "NON_ACQUIS" && allNonAcquis(axisId, { siId, status }) && score > mid) {
        setCoherenceWarn(
          `La note de « ${axis.label} » est supérieure à la moyenne (${score.toFixed(1)} / ${axis.max}).\n\nCocher tous les sous-indicateurs comme non acquis (🔴) est incohérent avec une note au-dessus de la moyenne.\n\nDiminuez d'abord la note sur le radar si tous les sous-indicateurs sont non acquis.`
        );
        return;
      }

      setSubChecks?.(prev => ({
        ...prev,
        [axisId]: { ...prev[axisId], [siId]: status },
      }));
    },
    [axes, scores, allAcquis, allNonAcquis, setSubChecks],
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
        {zoomScale !== 1 && (
          <div className="mb-1 flex justify-center">
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
            >
              Réinitialiser zoom ({Math.round(zoomScale * 100)} %)
            </button>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={(() => {
            const w = 1300 / zoomScale;
            const h = 1250 / zoomScale;
            return `${500 - w / 2} ${500 - h / 2} ${w} ${h}`;
          })()}
          className={`h-auto w-full ${hoveredAxisIndex !== null ? "cursor-grab" : "cursor-not-allowed"} select-none touch-none outline-none`}
          tabIndex={0}
          onKeyDown={onKeyDown}
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
          <circle cx={center} cy={center} r={radius * 0.5} fill="none" stroke="#93c5fd" strokeWidth={3} />

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
            const siRowH = 60;
            const bulkRowH = siCount > 0 ? 34 : 0;
            const siAreaH = siCount > 0 ? siCount * siRowH + 4 + bulkRowH : 0;
            const titleBlockH = 42;
            // Pour l'axe du haut (flipUp) : la boîte s'étend vers le haut depuis ly
            const rectH = titleBlockH + siAreaH;
            const flipUp = Math.sin(rad) < -0.3;
            const rawRectY = flipUp ? ly - rectH : ly - 22;
            const rectY = flipUp
              ? Math.max(-100, rawRectY)
              : Math.min(rawRectY, 1115 - rectH);
            const titleY = rectY + 26;
            const siBaseY = rectY + titleBlockH;

            const radarEdgeX = center + radius * Math.cos(rad);
            const radarEdgeY = center + radius * Math.sin(rad);

            return (
              <g key={a.id}>
                <line
                  x1={center} y1={center}
                  x2={radarEdgeX} y2={radarEdgeY}
                  stroke={(isHighlighted || touched[a.id]) ? scoreColor(a.max > 0 ? (scores[a.id] || 0) / a.max : 0) : "#94a3b8"}
                  strokeWidth={isHighlighted ? 5 : touched[a.id] ? 3 : 1.5}
                />

                {/* Groupe label : stopPropagation pour éviter le déclenchement du radar */}
                <g
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                >
                <rect
                  x={lx - 115}
                  y={rectY}
                  width={230}
                  height={rectH}
                  rx={6}
                  fill={bg}
                  opacity={0.95}
                />

                <text x={lx} y={titleY} fontSize={24} fontWeight={800} textAnchor="middle" fill="#64748b">
                  {a.label}
                </text>

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
                        const fs = si.label.length > 26 ? 13 : si.label.length > 18 ? 15 : 18;
                        return (
                          <text
                            x={lx}
                            fontSize={fs}
                            fontWeight={700}
                            textAnchor="middle"
                            fill={isUntouched ? "#92400e" : "#1e293b"}
                          >
                            <tspan x={lx} y={rowY + (line2 ? 13 : 20)}>{line1}</tspan>
                            {line2 && <tspan x={lx} dy={fs + 2}>{line2}</tspan>}
                          </text>
                        );
                      })()}
                      {SI_STATUSES.map((targetStatus, ci) => {
                        const col = SI_COLORS[targetStatus];
                        const isSelected = currentStatus === targetStatus;
                        const cx = lx - 28 + ci * 28;
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

                {/* Boutons "tout en vert/orange/rouge" */}
                {siCount > 0 && (() => {
                  const bulkY = siBaseY + siCount * siRowH + 6;
                  const btnW = 60; const btnH = 22; const gap = 5;
                  const totalW = 3 * btnW + 2 * gap;
                  const startX = lx - totalW / 2;
                  const BULK = [
                    { status: "ACQUIS"     as const, fill: "#059669", stroke: "#065f46", label: "Tous ✓" },
                    { status: "EN_COURS"   as const, fill: "#d97706", stroke: "#92400e", label: "Tous ~" },
                    { status: "NON_ACQUIS" as const, fill: "#dc2626", stroke: "#7f1d1d", label: "Tous ✗" },
                  ];
                  return BULK.map((btn, bi) => {
                    const bx = startX + bi * (btnW + gap);
                    return (
                      <g key={btn.status}
                        style={{ cursor: "pointer" }}
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => { e.stopPropagation(); setSubChecks?.(prev => ({ ...prev, [a.id]: Object.fromEntries(siItems.map(si => [si.id, btn.status])) })); }}
                        onClick={e => { e.stopPropagation(); setSubChecks?.(prev => ({ ...prev, [a.id]: Object.fromEntries(siItems.map(si => [si.id, btn.status])) })); }}
                      >
                        <rect x={bx} y={bulkY} width={btnW} height={btnH} rx={6} fill={btn.fill} opacity={0.85} />
                        <text x={bx + btnW / 2} y={bulkY + 15} fontSize={13} fontWeight={800} textAnchor="middle" fill="white" style={{ pointerEvents: "none" }}>
                          {btn.label}
                        </text>
                      </g>
                    );
                  });
                })()}
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

          {axes.map((a, i) => {
            const angle = angleForIndex(i, axes.length);
            const coords = getPointCoords(scores[a.id] || 0, a.max, angle);
            const isFocused = focusedAxisIndex === i;
            return (
              <g key={a.id}>
                {isFocused && (
                  <circle cx={coords.x} cy={coords.y} r={14} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth={2} />
                )}
                <circle cx={coords.x} cy={coords.y} r={isFocused ? 6 : 4} fill={isFocused ? "#6366f1" : "#2563eb"} />
              </g>
            );
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

      {/* Modale d'incohérence note / sous-indicateurs */}
      {coherenceWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCoherenceWarn(null)}>
          <div
            className="relative w-full max-w-md rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl">⚠️</span>
              <h3 className="text-base font-black uppercase tracking-wide text-amber-700">Note incohérente</h3>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{coherenceWarn}</p>
            <button
              type="button"
              onClick={() => setCoherenceWarn(null)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-2 text-sm font-bold text-white hover:bg-amber-400"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
