import { useState } from "react";
import { Plus, Trash2, UserCircle, GraduationCap, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import type {
  StudentItem,
  SavedEvaluation,
  DrawMode,
  QuestionGroup,
  ExaminerItem,
  StudentData,
  Axis,
  Scores,
} from "../types";
import { parseStudentsFromText } from "../utils";
import { setLocalStorageItem } from "../hooks/useLocalStorage";
import { DrawConfig } from "./DrawConfig";
import { useDialogs } from "./Dialogs";
import { Button } from "./Button";

interface AdminPanelProps {
  studentsSectionRef: React.RefObject<HTMLDivElement | null>;
  questionsSectionRef: React.RefObject<HTMLDivElement | null>;

  studentList: StudentItem[];
  setStudentList: React.Dispatch<React.SetStateAction<StudentItem[]>>;
  studentListValidated: boolean;
  setStudentListValidated: React.Dispatch<React.SetStateAction<boolean>>;

  bulkStudentsText: string;
  setBulkStudentsText: React.Dispatch<React.SetStateAction<string>>;

  savedEvaluations: SavedEvaluation[];

  drawEnabled: boolean;
  setDrawEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  drawMode: DrawMode;
  setDrawMode: React.Dispatch<React.SetStateAction<DrawMode>>;
  bulkSinglesText: string;
  setBulkSinglesText: React.Dispatch<React.SetStateAction<string>>;
  bulkGroupsText: string;
  setBulkGroupsText: React.Dispatch<React.SetStateAction<string>>;
  drawSingles: string[];
  setDrawSingles: React.Dispatch<React.SetStateAction<string[]>>;
  drawGroups: QuestionGroup[];
  setDrawGroups: React.Dispatch<React.SetStateAction<QuestionGroup[]>>;
  drawListValidated: boolean;
  setDrawListValidated: React.Dispatch<React.SetStateAction<boolean>>;

  defaultExaminer: ExaminerItem;
  setDefaultExaminer: React.Dispatch<React.SetStateAction<ExaminerItem>>;

  studentData: StudentData;
  setStudentData: React.Dispatch<React.SetStateAction<StudentData>>;
  examDurationMinutes: number;
  setExamDurationMinutes: React.Dispatch<React.SetStateAction<number>>;
  showFinalNoteToEvaluator: boolean;
  setShowFinalNoteToEvaluator: React.Dispatch<React.SetStateAction<boolean>>;
  showBaremeToEvaluator: boolean;
  setShowBaremeToEvaluator: React.Dispatch<React.SetStateAction<boolean>>;
  showPercentToEvaluator: boolean;
  setShowPercentToEvaluator: React.Dispatch<React.SetStateAction<boolean>>;

  axes: Axis[];
  setAxes: React.Dispatch<React.SetStateAction<Axis[]>>;
  axesMaxSum: number;
  setScores: React.Dispatch<React.SetStateAction<Scores>>;

  questionsCount: number;

  onRequestReset: () => void;
}

export function AdminPanel({
  studentsSectionRef,
  questionsSectionRef,
  studentList,
  setStudentList,
  studentListValidated,
  setStudentListValidated,
  bulkStudentsText,
  setBulkStudentsText,
  savedEvaluations,
  drawEnabled,
  setDrawEnabled,
  drawMode,
  setDrawMode,
  bulkSinglesText,
  setBulkSinglesText,
  bulkGroupsText,
  setBulkGroupsText,
  drawSingles,
  setDrawSingles,
  drawGroups,
  setDrawGroups,
  drawListValidated,
  setDrawListValidated,
  defaultExaminer,
  setDefaultExaminer,
  studentData,
  setStudentData,
  examDurationMinutes,
  setExamDurationMinutes,
  showFinalNoteToEvaluator,
  setShowFinalNoteToEvaluator,
  showBaremeToEvaluator,
  setShowBaremeToEvaluator,
  showPercentToEvaluator,
  setShowPercentToEvaluator,
  axes,
  setAxes,
  axesMaxSum,
  setScores,
  questionsCount,
  onRequestReset,
}: AdminPanelProps) {
  const { confirm, notify } = useDialogs();
  const [collapsedAxes, setCollapsedAxes] = useState<Record<string, boolean>>({});

  return (
    <div className="border-b border-slate-200 bg-amber-50/60 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Barre d'actions déplacée dans l'en-tête principal (App) */}
        <div className="mb-4 flex items-center justify-between">
          <strong className="text-sm uppercase text-amber-900">
            Configuration administrateur
          </strong>
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={13} />}
            onClick={onRequestReset}
            className="border border-red-300 bg-red-50 uppercase text-red-700 hover:bg-red-100"
          >
            Réinitialiser les données
          </Button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap gap-4">
            <span>
              Étudiants importés :{" "}
              <span className="font-bold">{studentList.length}</span>
            </span>
            <span>
              Évaluations enregistrées :{" "}
              <span className="font-bold">{savedEvaluations.length}</span>
            </span>
            <span>
              Questions configurées :{" "}
              <span className="font-bold">{questionsCount}</span>
            </span>
          </div>
        </div>

        {/* Bloc doublon "Évaluations enregistrées" supprimé ici pour éviter la répétition */}

        <div className="mb-6 rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <strong className="text-sm uppercase tracking-tight text-amber-900 flex items-center gap-1">
              <UserCircle size={14} /> Formateur évaluateur
            </strong>
            <span className="text-[10px] uppercase text-slate-400">Étape 1 admin</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select
              value={(defaultExaminer as any).civilite || ""}
              onChange={e =>
                setDefaultExaminer(prev => ({
                  ...(prev as any),
                  civilite: e.target.value || undefined,
                }))
              }
              className={`rounded border px-2 py-2 text-sm ${
                (defaultExaminer as any).civilite ? "bg-white" : "bg-emerald-100"
              }`}
            >
              <option value="">Civilité</option>
              <option value="Mme">Mme</option>
              <option value="M.">M.</option>
            </select>
            <input
              value={defaultExaminer.nom}
              onChange={e =>
                setDefaultExaminer(prev => ({
                  ...prev,
                  nom: e.target.value.toUpperCase(),
                }))
              }
              placeholder="Nom"
              className={`rounded border px-2 py-2 text-sm ${
                defaultExaminer.nom.trim() ? "bg-white" : "bg-emerald-100"
              }`}
            />
            <input
              value={defaultExaminer.prenom}
              onChange={e =>
                setDefaultExaminer(prev => ({
                  ...prev,
                  prenom: e.target.value.toUpperCase(),
                }))
              }
              placeholder="Prénom"
              className={`rounded border px-2 py-2 text-sm ${
                defaultExaminer.prenom.trim() ? "bg-white" : "bg-emerald-100"
              }`}
            />
          </div>
        </div>

        <div
          ref={studentsSectionRef}
          className="mb-6 rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm"
        >
          <div className="mb-1 flex items-center justify-between">
            <strong className="text-sm uppercase tracking-tight text-amber-900 flex items-center gap-1">
              <GraduationCap size={14} /> Étudiants — Import ({studentList.length})
            </strong>
            <span className="text-[10px] uppercase text-slate-400">
              Étape 2 admin
            </span>
          </div>

          <textarea
            value={bulkStudentsText}
            onChange={e => setBulkStudentsText(e.target.value)}
            className={`mt-2 h-24 w-full rounded border px-2 py-1 text-sm ${
              bulkStudentsText.trim() ? "bg-white" : "bg-emerald-100"
            }`}
            placeholder="Mme NOM Prénom (1 ligne)"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              variant="warning"
              size="sm"
              onClick={() => {
                if (bulkStudentsText.trim()) {
                  const imported = parseStudentsFromText(bulkStudentsText);
                  setStudentList(prev => {
                    const next = [...prev];
                    imported.forEach(n => {
                      if (!next.some(s => s.nom === n.nom && s.prenom === n.prenom)) {
                        next.push({ civilite: n.civilite, nom: n.nom, prenom: n.prenom });
                      }
                    });
                    return next;
                  });
                  setStudentListValidated(true);
                  setBulkStudentsText("");
                }
              }}
            >
              Valider
            </Button>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setBulkStudentsText("")}
            >
              Effacer
            </Button>

            <label className="ml-2 inline-flex items-center gap-2 rounded bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase text-indigo-800 hover:bg-indigo-200 cursor-pointer">
              Import fichier (.xlsx, .xls, .docx)
              <input
                type="file"
                accept=".xlsx,.xls,.docx"
                className="sr-only"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const name = file.name.toLowerCase();
                  try {
                    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
                      const data = await file.arrayBuffer();
                      const workbook = XLSX.read(data, { type: "array" });
                      const sheetName = workbook.SheetNames[0];
                      const sheet = workbook.Sheets[sheetName];
                      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

                      const imported: StudentItem[] = [];
                      for (let i = 1; i < rows.length; i += 1) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;
                        const civilite = (row[0] || "").toString().trim();
                        const nom = (row[1] || "").toString().trim().toUpperCase();
                        const prenom = (row[2] || "").toString().trim();
                        if (!nom || !prenom) continue;
                        imported.push({ civilite, nom, prenom });
                      }

                      setStudentList(prev => {
                        const next = [...prev];
                        imported.forEach(s => {
                          if (!next.some(x => x.nom === s.nom && x.prenom === s.prenom)) {
                            next.push(s);
                          }
                        });
                        return next;
                      });
                      setStudentListValidated(true);
                    } else if (name.endsWith(".docx")) {
                      const arrayBuffer = await file.arrayBuffer();
                      const { value } = await mammoth.extractRawText({ arrayBuffer });
                      const lines = value
                        .split(/\r?\n/)
                        .map(l => l.trim())
                        .filter(Boolean);
                      const imported: StudentItem[] = [];
                      lines.forEach(line => {
                        const parts = line.split(/\s+/);
                        if (parts.length === 0) return;

                        let civilite = "";
                        let nom = "";
                        let prenom = "";

                        if (parts.length >= 3) {
                          // Format recommandé : Civilité NOM Prénom(s)
                          civilite = (parts[0] || "").trim();
                          nom = (parts[1] || "").toUpperCase();
                          prenom = parts.slice(2).join(" ");
                        } else {
                          // Compatibilité avec l'ancien format : NOM Prénom(s)
                          nom = (parts[0] || "").toUpperCase();
                          prenom = parts.slice(1).join(" ");
                        }

                        if (!nom || !prenom) return;
                        imported.push({ civilite, nom, prenom });
                      });

                      setStudentList(prev => {
                        const next = [...prev];
                        imported.forEach(s => {
                          if (!next.some(x => x.nom === s.nom && x.prenom === s.prenom)) {
                            next.push(s);
                          }
                        });
                        return next;
                      });
                      setStudentListValidated(true);
                    } else {
                      notify("Format de fichier non supporté. Utilisez .xlsx, .xls ou .docx", "error");
                    }
                  } catch (err) {
                    console.error(err);
                    notify("Erreur lors de la lecture du fichier. Vérifiez son format.", "error");
                  } finally {
                    e.target.value = "";
                  }
                }}
              />
            </label>

            <Button
              variant="neutral"
              size="sm"
              className="text-[10px]"
              onClick={async () => {
                const header = ["Civilité", "Nom", "Prénom"];
                const example = [
                  ["Mme", "DURAND", "Marie"],
                  ["M.", "DUPONT", "Jean"],
                ];
                const worksheet = XLSX.utils.aoa_to_sheet([header, ...example]);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Etudiants");
                const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
                const blob = new Blob([wbout], {
                  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "modele-etudiants.xlsx";
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 500);
              }}
            >
              Modèle Excel (.xlsx)
            </Button>

            <Button
              variant="neutral"
              size="sm"
              className="text-[10px]"
              onClick={async () => {
                const { Document, Packer, Paragraph } = await import("docx");

                const doc = new Document({
                  sections: [
                    {
                      children: [
                        new Paragraph("Mme DURAND Marie"),
                        new Paragraph("M. DUPONT Jean"),
                      ],
                    },
                  ],
                });

                const blob = await Packer.toBlob(doc);
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "modele-etudiants.docx";
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 500);
              }}
            >
              Modèle Word (.docx)
            </Button>

            <span
              className={`text-xs font-bold ${
                studentListValidated ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {studentListValidated ? "Validée" : "Non validée"}
            </span>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-bold uppercase text-slate-600">
              Étudiants importés ({studentList.length})
            </div>
            {studentList.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Aucun étudiant importé pour le moment.
              </p>
            ) : (
              <>
                <ul className="max-h-40 overflow-y-auto rounded border border-slate-200 bg-slate-50 text-xs">
                  {studentList
                    .slice()
                    .sort((a, b) =>
                      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
                    )
                    .map((s, idx) => (
                      <li
                        key={`${s.nom}-${s.prenom}-${idx}`}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1.5 last:border-b-0"
                      >
                        <span className="flex-1">
                          {s.civilite ? `${s.civilite} ` : ""}
                          {s.nom} {s.prenom}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStudentList(prev =>
                              prev.filter(st => !(st.nom === s.nom && st.prenom === s.prenom)),
                            );
                          }}
                          title="Supprimer cet étudiant"
                          aria-label={`Supprimer ${s.nom} ${s.prenom}`}
                          className="bg-red-100 px-1.5 py-0.5 text-red-700 hover:bg-red-200"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </li>
                    ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Supprimer tous les étudiants ?",
                      message: "Tous les étudiants importés seront retirés de la liste.",
                      confirmLabel: "Tout supprimer",
                      danger: true,
                    });
                    if (!ok) return;
                    setStudentList([]);
                    setStudentListValidated(false);
                  }}
                  className="mt-2 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Tout supprimer
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
            <strong className="text-sm uppercase tracking-tight text-amber-900">
              UE
            </strong>
            <input
              value={studentData.ue}
              onChange={e => {
                const val = e.target.value.toUpperCase();
                setStudentData(prev => ({ ...prev, ue: val }));
                setLocalStorageItem("uePreset", val);
              }}
              className={`mt-2 w-full rounded border px-2 py-2 text-sm ${
                studentData.ue.trim() ? "bg-white" : "bg-emerald-100"
              }`}
            />
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
            <strong className="text-sm uppercase tracking-tight text-amber-900">
              Promotion
            </strong>
            <input
              value={studentData.promotion}
              onChange={e => {
                const val = e.target.value.toUpperCase();
                setStudentData(prev => ({ ...prev, promotion: val }));
                setLocalStorageItem("promotionPreset", val);
              }}
              className={`mt-2 w-full rounded border px-2 py-2 text-sm ${
                studentData.promotion.trim() ? "bg-white" : "bg-emerald-100"
              }`}
            />
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
            <strong className="text-sm uppercase tracking-tight text-amber-900">
              Durée examen (min)
            </strong>
            <input
              type="number"
              value={examDurationMinutes}
              onChange={e => {
                const val = Math.max(0, parseInt(e.target.value || "0", 10) || 0);
                setExamDurationMinutes(val);
              }}
              className={`mt-2 w-full rounded border px-2 py-2 text-sm ${
                examDurationMinutes > 0 ? "bg-white" : "bg-emerald-100"
              }`}
              min={0}
            />
          </div>
        </div>

        <div
          ref={questionsSectionRef}
          className="mb-6 rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm"
        >
          <DrawConfig
            drawEnabled={drawEnabled}
            setDrawEnabled={setDrawEnabled}
            drawMode={drawMode}
            setDrawMode={setDrawMode}
            bulkSinglesText={bulkSinglesText}
            setBulkSinglesText={setBulkSinglesText}
            bulkGroupsText={bulkGroupsText}
            setBulkGroupsText={setBulkGroupsText}
            drawSingles={drawSingles}
            setDrawSingles={setDrawSingles}
            drawGroups={drawGroups}
            setDrawGroups={setDrawGroups}
            drawListValidated={drawListValidated}
            setDrawListValidated={setDrawListValidated}
          />
        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
          <strong className="mb-2 block text-sm uppercase tracking-tight text-amber-900">
            Visibilité côté évaluateur
          </strong>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <label className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">Afficher la note finale</span>
              <input
                type="checkbox"
                checked={showFinalNoteToEvaluator}
                onChange={e => setShowFinalNoteToEvaluator(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
          </div>

          <div className="mt-1">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Affichage sur le radar</span>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
              {([
                { value: "bareme", label: "Barème par indicateur" },
                { value: "percent", label: "% de la note finale" },
                { value: "none", label: "Aucun" },
              ] as const).map(opt => {
                const current = showBaremeToEvaluator ? "bareme" : showPercentToEvaluator ? "percent" : "none";
                return (
                  <label key={opt.value} className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{opt.label}</span>
                    <input
                      type="radio"
                      name="radarDisplay"
                      checked={current === opt.value}
                      onChange={() => {
                        setShowBaremeToEvaluator(opt.value === "bareme");
                        setShowPercentToEvaluator(opt.value === "percent");
                      }}
                      className="h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="mb-1 flex items-center justify-between">
            <strong className="text-sm uppercase tracking-tight text-amber-900">
              Axes d'évaluation
            </strong>
            <span className="text-[10px] uppercase text-slate-400">Étape 4 admin</span>
          </div>
          {axes.map((a, idx) => {
            const subCount = (a.subItems || []).length;
            const isCollapsed = collapsedAxes[a.id] ?? true;
            return (
            <div
              key={a.id}
              className="rounded border border-amber-300 bg-amber-50 p-3"
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCollapsedAxes(prev => ({ ...prev, [a.id]: !isCollapsed }))
                  }
                  title={isCollapsed ? "Déplier les sous-indicateurs" : "Replier les sous-indicateurs"}
                  aria-label={isCollapsed ? "Déplier les sous-indicateurs" : "Replier les sous-indicateurs"}
                  className="px-1.5 py-1 text-amber-700 hover:bg-amber-100"
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </Button>
                <input
                  value={a.label}
                  onChange={e =>
                    setAxes(prev =>
                      prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={a.max}
                  onChange={e =>
                    setAxes(prev =>
                      prev.map((x, i) =>
                        i === idx
                          ? {
                              ...x,
                              max: Math.max(0, Math.round(parseFloat(e.target.value) * 10) / 10 || 0),
                            }
                          : x,
                      ),
                    )
                  }
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setAxes(prev => prev.filter((_, i) => i !== idx))}
                  title="Supprimer cet axe"
                  aria-label="Supprimer cet axe"
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              {isCollapsed && (
                <div className="ml-9 mt-1 text-[11px] text-amber-700">
                  {subCount > 0
                    ? `${subCount} sous-indicateur${subCount > 1 ? "s" : ""}`
                    : "Aucun sous-indicateur"}
                </div>
              )}

              {!isCollapsed && (a.subItems || []).map((si, sidx) => (
                <div
                  key={si.id}
                  className="mt-1 ml-4 flex items-center gap-2"
                >
                  <input
                    value={si.label}
                    onChange={e =>
                      setAxes(prev =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                subItems: (x.subItems || []).map((y, j) =>
                                  j === sidx ? { ...y, label: e.target.value } : y,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setAxes(prev =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                subItems: (x.subItems || []).filter((_, j) => j !== sidx),
                              }
                            : x,
                        ),
                      )
                    }
                    title="Supprimer ce sous-indicateur"
                    aria-label="Supprimer ce sous-indicateur"
                    className="bg-red-500 px-2 hover:bg-red-600"
                  >
                    ✕
                  </Button>
                </div>
              ))}

              {!isCollapsed && (
              <div className="mt-1 ml-4 flex items-center gap-2">
                <input
                  id={`newSub-${a.id}`}
                  placeholder="+ Sous-item"
                  className="w-48 rounded border px-2 py-1 text-xs"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      const label = input.value.trim();
                      if (label) {
                        const sid = `sub-${Date.now()}`;
                        setAxes(prev =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  subItems: [
                                    ...(x.subItems || []),
                                    { id: sid, label },
                                  ],
                                }
                              : x,
                          ),
                        );
                        input.value = "";
                      }
                    }
                  }}
                />
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById(
                      `newSub-${a.id}`,
                    ) as HTMLInputElement | null;
                    if (!input) return;
                    const label = input.value.trim();
                    if (!label) return;
                    const sid = `sub-${Date.now()}`;
                    setAxes(prev =>
                      prev.map((x, i) =>
                        i === idx
                          ? {
                              ...x,
                              subItems: [
                                ...(x.subItems || []),
                                { id: sid, label },
                              ],
                            }
                          : x,
                      ),
                    );
                    input.value = "";
                  }}
                >
                  Valider
                </Button>
              </div>
              )}
            </div>
            );
          })}

          <div className="flex gap-2">
            <input
              id="newAxisLabel"
              placeholder="Nouvel axe"
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <input
              id="newAxisMax"
              type="number"
              step="0.1"
              min="0"
              placeholder="Barème"
              className="w-20 rounded border px-2 py-1 text-sm"
            />
            <Button
              variant="warning"
              size="sm"
              aria-label="Ajouter un axe"
              onClick={() => {
                const labelEl = document.getElementById(
                  "newAxisLabel",
                ) as HTMLInputElement | null;
                const maxEl = document.getElementById(
                  "newAxisMax",
                ) as HTMLInputElement | null;

                const label = labelEl?.value.trim();
                const max = parseFloat(maxEl?.value || "0");

                if (label && max > 0) {
                  const id = `axis-${Date.now()}`;
                  setAxes(prev => [...prev, { id, label, max, subItems: [] }]);
                  setScores(prev => ({ ...prev, [id]: max / 2 }));

                  if (labelEl) labelEl.value = "";
                  if (maxEl) maxEl.value = "";
                }
              }}
            >
              <Plus size={14} />
            </Button>
          </div>

          <div className="text-xs text-amber-700">
            Total barème: {axesMaxSum.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
