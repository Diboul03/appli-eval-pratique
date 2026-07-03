import type { StudentData, StudentItem, SavedEvaluation } from "../types";
import { InputGroup } from "./InputGroup";
import { GraduationCap } from "lucide-react";

interface StudentStepProps {
  selectedStudentValue: string;
  onStudentChange: (value: string) => void;
  studentData: StudentData;
  onDateChange: (date: string) => void;
  studentList: StudentItem[];
  loadedStudentKey: string | null;
  savedEvaluations: SavedEvaluation[];
}

export function StudentStep({
  selectedStudentValue,
  onStudentChange,
  studentData,
  onDateChange,
  studentList,
  loadedStudentKey,
  savedEvaluations,
}: StudentStepProps) {
  return (
    <>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase text-slate-500">
        <GraduationCap size={16} /> Étudiant & UE
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-tighter text-slate-700">
            Étudiant
          </label>
          <select
            value={selectedStudentValue}
            onChange={e => onStudentChange(e.target.value)}
            className={`w-full rounded-lg border-2 border-slate-200 px-3 py-2 font-bold ${
              !selectedStudentValue ? "bg-emerald-100" : "bg-slate-100"
            }`}
          >
            <option value="">— Sélectionner —</option>
            {studentList
              .filter(s => {
                const key = `${s.nom}||${s.prenom}`;
                if (loadedStudentKey === key) return true;
                return !savedEvaluations.some(
                  ev => ev.student.nom === s.nom && ev.student.prenom === s.prenom,
                );
              })
              .sort((a, b) =>
                `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
              )
              .map((s, i) => (
                <option key={`${s.nom}-${s.prenom}-${i}`} value={`${s.nom}||${s.prenom}`}>
                  {s.civilite ? `${s.civilite} ` : ""}
                  {s.nom} {s.prenom}
                </option>
              ))}
          </select>
          {studentData.civilite && (
            <p className="mt-1 text-[10px] text-slate-600">
              Civilité : <span className="font-bold">{studentData.civilite}</span>
            </p>
          )}
        </div>

        <InputGroup
          label="Date"
          type="date"
          value={studentData.date}
          onChange={onDateChange}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-tighter text-slate-700">
            Promotion
          </label>
          <input
            readOnly
            value={studentData.promotion}
            placeholder="Défini par admin"
            className={`w-full rounded-lg border-2 border-slate-200 px-3 py-2 font-bold ${
              studentData.promotion ? "bg-slate-100" : "bg-emerald-100 italic"
            }`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-tighter text-slate-700">
            UE
          </label>
          <input
            readOnly
            value={studentData.ue}
            placeholder="Défini par admin"
            className={`w-full rounded-lg border-2 border-slate-200 px-3 py-2 font-bold ${
              studentData.ue ? "bg-slate-100" : "bg-emerald-100 italic"
            }`}
          />
        </div>
      </div>
    </>
  );
}
