import { useMemo, useState } from "react";
import type { SavedEvaluation } from "../types";
import { formatEvaluationLabel } from "../utils/evaluations";
import { cn } from "../utils/cn";

interface EvaluationPickerProps {
  savedEvaluations: SavedEvaluation[];
  value: string;
  onChange: (id: string) => void;
  showNote?: boolean;
  /** Texte de l'option vide en tête de liste */
  placeholder?: string;
  className?: string;
  selectClassName?: string;
}

/**
 * Sélecteur d'évaluation enregistrée avec champ de recherche.
 * Au-delà de quelques étudiants, le filtre évite de faire défiler une longue liste.
 */
export function EvaluationPicker({
  savedEvaluations,
  value,
  onChange,
  showNote = true,
  placeholder = "— Sélectionner —",
  className,
  selectClassName,
}: EvaluationPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = savedEvaluations
      .slice()
      .sort((a, b) => `${a.student.nom}`.localeCompare(`${b.student.nom}`, "fr"));
    if (!q) return sorted;
    return sorted.filter(ev =>
      `${ev.student.nom} ${ev.student.prenom} ${ev.ue} ${ev.promotion ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [savedEvaluations, query]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un étudiant…"
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
      />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn("rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800", selectClassName)}
      >
        <option value="">{placeholder}</option>
        {filtered.map(ev => (
          <option key={ev.id} value={ev.id}>
            {formatEvaluationLabel(ev, { showNote })}
          </option>
        ))}
      </select>
      {query.trim() && (
        <span className="text-[10px] text-slate-400">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
