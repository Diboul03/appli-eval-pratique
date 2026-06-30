import React, { useCallback, useMemo, useRef, useState } from "react";
import type { Axis, Scores } from "../types";

interface RadarChartProps {
  axes: Axis[];
  scores: Scores;
  setScores: React.Dispatch<React.SetStateAction<Scores>>;
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  touched: Record<string, boolean>;
  axesMaxSum: number;
  showBareme: boolean;
}

export function RadarChart({
  axes,
  scores,
  setScores,
  setTouched,
  touched,
  axesMaxSum,
  showBareme,
}: RadarChartProps) {
  const center = 370;
  const radius = 210;
  const labelRadius = radius + 90;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRadar = useRef(false);
  const [hoveredAxisIndex, setHoveredAxisIndex] = useState<number | null>(null);

  const angleForIndex = (i: number, n: number) => {
    return -90 + (360 / n) * i;
  };

  const getPointCoords = (val: number, max: number, angle: number) => {
    const r = max > 0 ? (val / max) * radius : 0;
    const rad = (angle * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const computeNearAxis = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { isNear: false, axisIndex: null };

      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left - center;
      const y = clientY - rect.top - center;
      const ang = (Math.atan2(y, x) * 180) / Math.PI;

      let minDiff = Infinity;
      let closestIdx: number | null = null;
      for (let i = 0; i < axes.length; i += 1) {
        let a = angleForIndex(i, axes.length);
        let diff = Math.abs(a - ang);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      const isNear = minDiff <= 10 && closestIdx !== null;
      setHoveredAxisIndex(isNear ? closestIdx : null);
      return { isNear, axisIndex: isNear ? closestIdx : null };
    },
    [axes.length],
  );

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left - center;
      const y = clientY - rect.top - center;
      const ang = (Math.atan2(y, x) * 180) / Math.PI;
      const dist = Math.sqrt(x * x + y * y);

      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < axes.length; i += 1) {
        let a = angleForIndex(i, axes.length);
        let diff = Math.abs(a - ang);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      if (minDiff > 10) return;

      const axis = axes[closestIdx];
      let newVal = Math.round((dist / radius) * axis.max * 10) / 10;
      newVal = Math.max(0, Math.min(axis.max, newVal));

      setScores(prev => ({ ...prev, [axis.id]: newVal }));
      setTouched(prev => ({ ...prev, [axis.id]: true }));
    },
    [axes, setScores, setTouched],
  );

  const onRadarMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const { isNear } = computeNearAxis(e.clientX, e.clientY);
    if (isNear) {
      isDraggingRadar.current = true;
      updateFromClient(e.clientX, e.clientY);
    }
  };

  const onRadarMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    computeNearAxis(e.clientX, e.clientY);
    if (isDraggingRadar.current) updateFromClient(e.clientX, e.clientY);
  };

  const onRadarMouseUp = () => {
    isDraggingRadar.current = false;
  };

  const onRadarMouseLeave = () => {
    isDraggingRadar.current = false;
    setHoveredAxisIndex(null);
  };

  const onRadarTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    const { isNear } = computeNearAxis(t.clientX, t.clientY);
    if (isNear) {
      isDraggingRadar.current = true;
      updateFromClient(t.clientX, t.clientY);
    }
  };

  const onRadarTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const t = e.touches[0];
    computeNearAxis(t.clientX, t.clientY);
    if (isDraggingRadar.current) updateFromClient(t.clientX, t.clientY);
  };

  const onRadarTouchEnd = () => {
    isDraggingRadar.current = false;
    setHoveredAxisIndex(null);
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

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[740px] rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
        <svg
          ref={svgRef}
          viewBox="0 0 740 740"
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

          <circle
            cx={center}
            cy={center}
            r={radius * 0.5}
            fill="none"
            stroke="#bfdbfe"
            strokeWidth={2}
          />

          {[0.2, 0.4, 0.6, 0.8, 1].map(lvl => (
            <circle
              key={lvl}
              cx={center}
              cy={center}
              r={radius * lvl}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          ))}

          {axes.map((a, i) => {
            const angle = angleForIndex(i, axes.length);
            const coords = getPointCoords(a.max, a.max, angle);
            const rad = (angle * Math.PI) / 180;
            const lx = center + labelRadius * Math.cos(rad);
            const ly = center + labelRadius * Math.sin(rad);
            const bg = touched[a.id] ? "#ffffff" : "#d1fae5";
            const isHighlighted = hoveredAxisIndex === i;
            return (
              <g key={a.id}>
                <line
                  x1={center}
                  y1={center}
                  x2={coords.x}
                  y2={coords.y}
                  stroke={isHighlighted ? "#60a5fa" : "#e2e8f0"}
                  strokeWidth={isHighlighted ? 3 : 1}
                />
                <rect
                  x={lx - 72}
                  y={ly - 24}
                  width={144}
                  height={40}
                  rx={6}
                  fill={bg}
                  opacity={0.9}
                />
                <text
                  x={lx}
                  y={ly - 6}
                  fontSize={18}
                  fontWeight={800}
                  textAnchor="middle"
                  fill="#64748b"
                >
                  {a.label}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="#94a3b8"
                >
                  {showBareme
                    ? `Barème: ${a.max.toFixed(1)}`
                    : `${Math.round((a.max / axesMaxSum) * 100)}% de la note finale`}
                </text>
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
