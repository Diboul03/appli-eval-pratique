interface ScoreControlProps {
  label: string;
  max: number;
  value: number;
}

export function ScoreControl({ label, max, value }: ScoreControlProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
      <div className="font-semibold text-slate-700">{label}</div>
      <div className="text-slate-500">
        {value.toFixed(1)} / {max.toFixed(1)}
      </div>
    </div>
  );
}
