import type React from "react";
import type { DrawMode, QuestionGroup } from "../types";
import { Trash2, Shuffle } from "lucide-react";
import mammoth from "mammoth";
import { Document, Packer, Paragraph } from "docx";
import { useDialogs } from "../hooks/useDialogs";
import { Button } from "./Button";

interface DrawConfigProps {
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
}

export function DrawConfig({
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
}: DrawConfigProps) {
  const { confirm, notify } = useDialogs();

  const handleImportQuestionsDocx: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".docx")) {
      notify(
        "Format non supporté. Enregistrez votre fichier en .docx (Word moderne).",
        "error",
      );
      e.target.value = "";
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      const text = value || "";

      if (!text.trim()) {
        notify("Le fichier ne contient pas de texte exploitable.", "error");
        return;
      }

      if (drawMode === "single") {
        const questions = text
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean);

        if (questions.length === 0) {
          notify(
            "Aucune question détectée. Vérifiez que chaque question est sur une ligne séparée.",
            "error",
          );
        } else {
          setDrawSingles(questions);
          setDrawListValidated(true);
        }
      } else {
        const lines = text
          .split(/\r?\n/)
          .map(l => l.trim());

        const groupedLines: string[][] = [];
        let currentGroup: string[] = [];
        let emptyStreak = 0;

        for (const line of lines) {
          if (!line) {
            emptyStreak += 1;
            continue;
          }

          if (emptyStreak >= 2 && currentGroup.length > 0) {
            groupedLines.push(currentGroup);
            currentGroup = [];
          }

          emptyStreak = 0;
          currentGroup.push(line);
        }

        if (currentGroup.length > 0) {
          groupedLines.push(currentGroup);
        }

        if (groupedLines.length === 0) {
          notify(
            "Aucun groupe détecté. Laissez au moins deux lignes vides entre deux groupes, chaque question sur sa ligne.",
            "error",
          );
        } else {
          const groups: QuestionGroup[] = groupedLines.map((questions, i) => ({
            id: `grp-${i}`,
            title: `Groupe ${i + 1}`,
            questions,
          }));
          setDrawGroups(groups);
          setDrawListValidated(true);
        }
      }
    } catch (err) {
      console.error(err);
      notify(
        "Erreur lors de la lecture du document Word. Vérifiez son contenu ou essayez un autre fichier.",
        "error",
      );
    } finally {
      e.target.value = "";
    }
  };

  const downloadSingleQuestionsDocxExample = async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph("Présentez-vous."),
            new Paragraph("Décrivez la situation clinique."),
            new Paragraph("Proposez une conduite à tenir."),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-questions-uniques.docx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const downloadGroupedQuestionsDocxExample = async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph("Situation A"),
            new Paragraph("Situation B"),
            new Paragraph(""),
            new Paragraph(""),
            new Paragraph("Situation C"),
            new Paragraph("Situation D"),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-questions-groupees.docx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <strong className="text-sm uppercase tracking-tight text-amber-900 flex items-center gap-1">
          <Shuffle size={14} /> Tirage au sort des questions — Paramétrage
        </strong>
        <span className="text-[10px] uppercase text-slate-400">Étape 3 admin</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          variant={drawEnabled ? "primary" : "neutral"}
          size="sm"
          onClick={() => setDrawEnabled(true)}
        >
          Oui
        </Button>
        <Button
          variant={!drawEnabled ? "danger" : "neutral"}
          size="sm"
          onClick={() => setDrawEnabled(false)}
        >
          Non
        </Button>
      </div>

      {drawEnabled && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex gap-4">
              <label className="text-xs">
                <input
                  type="radio"
                  checked={drawMode === "single"}
                  onChange={() => setDrawMode("single")}
                  className="mr-1"
                />
                Question unique
              </label>
              <label className="text-xs">
                <input
                  type="radio"
                  checked={drawMode === "group"}
                  onChange={() => setDrawMode("group")}
                  className="mr-1"
                />
                Questions groupées
              </label>
            </div>

            {drawMode === "single" ? (
              <>
                <textarea
                  value={bulkSinglesText}
                  onChange={e => setBulkSinglesText(e.target.value)}
                  className={`h-24 w-full rounded border px-2 py-1 text-sm ${
                    bulkSinglesText.trim() ? "bg-white" : "bg-emerald-100"
                  }`}
                  placeholder="1 question par ligne"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => {
                      if (bulkSinglesText.trim()) {
                        setDrawSingles(
                          bulkSinglesText
                            .split("\n")
                            .map(l => l.trim())
                            .filter(Boolean),
                        );
                        setDrawListValidated(true);
                        setBulkSinglesText("");
                      }
                    }}
                  >
                    Valider
                  </Button>
                  <label className="inline-flex items-center gap-2 rounded bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-200 cursor-pointer">
                    Import .docx
                    <input
                      type="file"
                      accept=".docx,.doc"
                      className="sr-only"
                      onChange={handleImportQuestionsDocx}
                    />
                  </label>
                  <Button
                    variant="neutral"
                    size="sm"
                    className="text-[10px]"
                    onClick={downloadSingleQuestionsDocxExample}
                  >
                    Modèle Word
                  </Button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={bulkGroupsText}
                  onChange={e => setBulkGroupsText(e.target.value)}
                  className={`h-24 w-full rounded border px-2 py-1 text-sm ${
                    bulkGroupsText.trim() ? "bg-white" : "bg-emerald-100"
                  }`}
                  placeholder={"Situation A\nSituation B\n\n\nSituation C\nSituation D"}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => {
                      if (bulkGroupsText.trim()) {
                        const lines = bulkGroupsText
                          .split("\n")
                          .map(l => l.trim());

                        const groupedLines: string[][] = [];
                        let currentGroup: string[] = [];

                        for (const line of lines) {
                          if (!line) {
                            if (currentGroup.length > 0) {
                              groupedLines.push(currentGroup);
                              currentGroup = [];
                            }
                          } else {
                            currentGroup.push(line);
                          }
                        }
                        if (currentGroup.length > 0) {
                          groupedLines.push(currentGroup);
                        }

                        if (groupedLines.length === 0) {
                          notify(
                            "Aucun groupe détecté. Laissez une ligne vide entre deux groupes.",
                            "error",
                          );
                        } else {
                          const groups: QuestionGroup[] = groupedLines.map((questions, i) => ({
                            id: `grp-${i}`,
                            title: `Groupe ${i + 1}`,
                            questions,
                          }));
                          setDrawGroups(groups);
                          setDrawListValidated(true);
                          setBulkGroupsText("");
                        }
                      }
                    }}
                  >
                    Valider
                  </Button>
                  <label className="inline-flex items-center gap-2 rounded bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-200 cursor-pointer">
                    Import .docx
                    <input
                      type="file"
                      accept=".docx,.doc"
                      className="sr-only"
                      onChange={handleImportQuestionsDocx}
                    />
                  </label>
                  <Button
                    variant="neutral"
                    size="sm"
                    className="text-[10px]"
                    onClick={downloadGroupedQuestionsDocxExample}
                  >
                    Modèle Word
                  </Button>
                </div>
              </>
            )}

            <span
              className={`ml-2 text-xs font-bold ${
                drawListValidated ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {drawListValidated ? "Validée" : "Non validée"}
            </span>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
            <div className="mb-1 font-bold uppercase text-slate-600">
              Questions configurées
            </div>
            {drawMode === "single" ? (
              drawSingles.length === 0 ? (
                <p className="text-[11px] text-slate-400">Aucune question enregistrée.</p>
              ) : (
                <>
                  <ul className="max-h-40 overflow-y-auto rounded border border-slate-200 bg-white">
                    {drawSingles.map((q, idx) => (
                      <li
                        key={`${q}-${idx}`}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1.5 last:border-b-0"
                      >
                        <span className="flex-1">{q}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDrawSingles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          title="Supprimer cette question"
                          aria-label="Supprimer cette question"
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
                        title: "Supprimer toutes les questions ?",
                        message: "Toutes les questions enregistrées seront retirées.",
                        confirmLabel: "Tout supprimer",
                        danger: true,
                      });
                      if (!ok) return;
                      setDrawSingles([]);
                      setDrawListValidated(false);
                    }}
                    className="mt-2 bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Tout supprimer
                  </Button>
                </>
              )
            ) : drawGroups.length === 0 ? (
              <p className="text-[11px] text-slate-400">Aucun groupe enregistré.</p>
            ) : (
              <>
                <ul className="max-h-40 overflow-y-auto rounded border border-slate-200 bg-white">
                  {drawGroups.map(group => (
                    <li
                      key={group.id}
                      className="border-b border-slate-100 px-2 py-1.5 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">{group.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDrawGroups(prev => prev.filter(g => g.id !== group.id));
                          }}
                          title="Supprimer ce groupe"
                          aria-label="Supprimer ce groupe de questions"
                          className="bg-red-100 px-1.5 py-0.5 text-red-700 hover:bg-red-200"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      {group.questions.length > 0 && (
                        <ul className="ml-4 mt-1 list-disc text-[11px] text-slate-600">
                          {group.questions.map((q, qi) => (
                            <li key={qi}>{q}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Supprimer tous les groupes ?",
                      message: "Tous les groupes de questions seront retirés.",
                      confirmLabel: "Tout supprimer",
                      danger: true,
                    });
                    if (!ok) return;
                    setDrawGroups([]);
                    setDrawListValidated(false);
                  }}
                  className="mt-2 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Tout supprimer
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
