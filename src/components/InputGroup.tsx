interface InputGroupProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}

export function InputGroup({ label, type = "text", value, onChange }: InputGroupProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-tighter text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold"
      />
    </div>
  );
}
