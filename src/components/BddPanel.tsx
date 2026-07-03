import { useState, useCallback, useEffect } from "react";
import ExcelJS from "exceljs";
import { logoDataUri } from "../assets/logo";
import { Button } from "./Button";
import { useDialogs } from "./Dialogs";
import { buildBddFolder, buildExportFileName, saveFileToFolder } from "../utils/exportFolder";

interface Student {
  civilite?: string;
  nom: string;
  prenom: string;
}


interface OtherScheduleEntry {
  student: Student;
  heure: string;
  date: string;
}

interface BddPanelProps {
  studentList: Student[];
  defaultExaminer: { nom: string; prenom: string };
  examDurationMinutes: number;
  ue: string;
  promotion: string;
  testTrigger?: number;
  otherSchedules?: OtherScheduleEntry[][];
  onScheduleGenerated?: (schedule: { student: Student; heure: string; period: "matin" | "apmidi"; date: string }[]) => void;
}

interface ScheduleEntry {
  student: Student;
  heure: string;
  period: "matin" | "apmidi";
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function formatDateFr(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function safeFilename(s: string) {
  return s.replace(/[^a-zA-Z0-9À-ÿ._-]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

const PRESENCE_PRESETS = ["10 min", "15 min", "20 min", "30 min", "45 min", "1 h"];

// Style identique à la config : vert si vide/requis, gris si rempli
const fieldCls = (value: string, required = true) =>
  `w-full rounded-lg border-2 border-slate-200 px-3 py-2 font-bold text-sm focus:outline-none ${
    required && !value.trim() ? "bg-emerald-100" : "bg-slate-100"
  }`;

const labelCls = "block text-[10px] font-black uppercase tracking-tighter text-slate-700 mb-0.5";

function TimeSlot({
  active, onToggle, label, debut, fin, onDebut, onFin, color,
}: {
  active: boolean; onToggle: (v: boolean) => void; label: string;
  debut: string; fin: string; onDebut: (v: string) => void; onFin: (v: string) => void;
  color: "amber" | "indigo";
}) {
  const colors = color === "amber"
    ? { border: "border-amber-300", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-800" }
    : { border: "border-indigo-300", bg: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-800" };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${active ? colors.border + " " + colors.bg : "border-slate-200 bg-white opacity-60"}`}>
      <label className="flex cursor-pointer items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={active}
          onChange={e => onToggle(e.target.checked)}
          className="h-5 w-5 rounded"
        />
        <span className={`rounded-full px-3 py-0.5 text-xs font-black uppercase ${active ? colors.badge : "bg-slate-100 text-slate-500"}`}>
          {label}
        </span>
      </label>
      <div className={`grid grid-cols-2 gap-3 transition-opacity ${!active ? "pointer-events-none opacity-40" : ""}`}>
        <div>
          <label className={labelCls}>Début</label>
          <input type="time" className={fieldCls(debut, false)} value={debut} onChange={e => onDebut(e.target.value)} disabled={!active} />
        </div>
        <div>
          <label className={labelCls}>Fin</label>
          <input type="time" className={fieldCls(fin, false)} value={fin} onChange={e => onFin(e.target.value)} disabled={!active} />
        </div>
      </div>
    </div>
  );
}

export function BddPanel({ studentList, defaultExaminer, examDurationMinutes, ue, promotion, testTrigger, otherSchedules, onScheduleGenerated }: BddPanelProps) {
    const { notify } = useDialogs();

    const [juryNumero, setJuryNumero] = useState("Jury 1");
    const [lieu, setLieu] = useState("");
    const [jourPassage, setJourPassage] = useState("");
    const [tempsPresence, setTempsPresence] = useState("20 min");

    const [matinActive, setMatinActive] = useState(true);
    const [matinDebut, setMatinDebut] = useState("08:00");
    const [matinFin, setMatinFin] = useState("12:00");
    const [apremActive, setApremActive] = useState(false);
    const [apremDebut, setApremDebut] = useState("13:30");
    const [apremFin, setApremFin] = useState("17:30");

    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [generated, setGenerated] = useState(false);

    // Réagit au testTrigger même quand le composant vient d'être monté
    useEffect(() => {
      if (!testTrigger) return;
      setJourPassage("2026-07-07");
      setLieu("Salle clinique, 35 rue Lucas 03200 Vichy");
      setJuryNumero("Jury 1");
      setTempsPresence("20 min");
      setMatinActive(true);
      setMatinDebut("08:00");
      setMatinFin("12:00");
      setApremActive(true);
      setApremDebut("13:30");
      setApremFin("17:30");
      setSchedule([]);
      setGenerated(false);
    }, [testTrigger]);

    const missingFields: string[] = [];
    if (studentList.length === 0) missingFields.push("Liste d'étudiants (Configuration)");
    if (!jourPassage) missingFields.push("Jour de passage");
    if (!lieu.trim()) missingFields.push("Lieu de passage");
    if (!matinActive && !apremActive) missingFields.push("Au moins un créneau horaire (Matin ou Après-midi)");
    const canGenerate = missingFields.length === 0;

    const generateSchedule = useCallback(() => {
      if (!canGenerate) { notify("Veuillez renseigner tous les champs requis.", "error"); return; }

      const dur = examDurationMinutes > 0 ? examDurationMinutes : 15;

      // Build list of all available slots in chronological order
      const slots: { time: number; period: "matin" | "apmidi" }[] = [];
      if (matinActive) {
        for (let t = timeToMin(matinDebut); t + dur <= timeToMin(matinFin); t += dur)
          slots.push({ time: t, period: "matin" });
      }
      if (apremActive) {
        for (let t = timeToMin(apremDebut); t + dur <= timeToMin(apremFin); t += dur)
          slots.push({ time: t, period: "apmidi" });
      }

      // Build forbidden-time map per student key (nom+prenom) from other UEs on same day
      const forbiddenByStudent = new Map<string, Set<number>>();
      if (otherSchedules && otherSchedules.length > 0) {
        for (const otherSched of otherSchedules) {
          for (const entry of otherSched) {
            if (entry.date !== jourPassage) continue;
            const key = `${entry.student.nom}|${entry.student.prenom}`;
            if (!forbiddenByStudent.has(key)) forbiddenByStudent.set(key, new Set());
            const occupied = timeToMin(entry.heure);
            // Forbid slots within 2 durations of the occupied slot
            for (let gap = -2; gap <= 2; gap++) {
              forbiddenByStudent.get(key)!.add(occupied + gap * dur);
            }
          }
        }
      }

      // Shuffle students
      const shuffled = [...studentList].sort(() => Math.random() - 0.5);
      const usedSlotIndices = new Set<number>();
      const result: ScheduleEntry[] = [];

      for (const student of shuffled) {
        const key = `${student.nom}|${student.prenom}`;
        const forbidden = forbiddenByStudent.get(key) ?? new Set<number>();
        // Find first available slot not forbidden for this student
        const slotIdx = slots.findIndex((s, i) => !usedSlotIndices.has(i) && !forbidden.has(s.time));
        if (slotIdx === -1) {
          // No valid slot — fall back to first free slot ignoring constraint
          const fallbackIdx = slots.findIndex((_, i) => !usedSlotIndices.has(i));
          if (fallbackIdx === -1) break;
          result.push({ student, heure: minToTime(slots[fallbackIdx].time), period: slots[fallbackIdx].period });
          usedSlotIndices.add(fallbackIdx);
        } else {
          result.push({ student, heure: minToTime(slots[slotIdx].time), period: slots[slotIdx].period });
          usedSlotIndices.add(slotIdx);
        }
      }

      if (result.length < shuffled.length) {
        notify(`Attention : seulement ${result.length}/${shuffled.length} étudiants planifiés. Élargissez les créneaux.`, "error");
      }

      // Check for constraint violations and warn
      if (forbiddenByStudent.size > 0) {
        const violations = result.filter(e => {
          const k = `${e.student.nom}|${e.student.prenom}`;
          const f = forbiddenByStudent.get(k);
          return f && f.has(timeToMin(e.heure));
        });
        if (violations.length > 0) {
          notify(`⚠ ${violations.length} étudiant(s) ont moins de 2 créneaux d'écart avec une autre U.E. — élargissez les horaires.`, "error");
        }
      }

      setSchedule(result);
      setGenerated(true);
      onScheduleGenerated?.(result.map(e => ({ ...e, date: jourPassage })));
    }, [canGenerate, studentList, examDurationMinutes, matinActive, matinDebut, matinFin, apremActive, apremDebut, apremFin, otherSchedules, jourPassage, onScheduleGenerated, notify]);

    const exportXlsx = useCallback(async () => {
      if (schedule.length === 0) { notify("Générez d'abord le planning.", "error"); return; }

      const wb = new ExcelJS.Workbook();
      wb.creator = "Appli Eval Pratique — IFSO Vichy";
      wb.created = new Date();
      const ws = wb.addWorksheet("Ordre de passage", { views: [{ showGridLines: false }] });

      ws.columns = [
        { key: "civEt",    width: 14 }, { key: "nomEt",    width: 20 }, { key: "prenEt",   width: 18 },
        { key: "jour",     width: 28 }, { key: "heure",    width: 14 }, { key: "ueEval",   width: 30 },
        { key: "tpsEval",  width: 16 }, { key: "numJury",  width: 12 }, { key: "civJury",  width: 14 },
        { key: "nomJury",  width: 18 }, { key: "prenJury", width: 18 }, { key: "lieu",     width: 36 },
        { key: "tpsPres",  width: 28 },
      ];

      const C = { g: "047857", gl: "D1FAE5", gm: "059669", w: "FFFFFF", re: "F0FDF4", d: "1E3A2F", b: "CCCCCC" };
      const thin   = { style: "thin"   as const, color: { argb: "FF" + C.b } };
      const medium = { style: "medium" as const, color: { argb: "FF" + C.g } };
      const bAll = { top: thin,   bottom: thin,   left: thin, right: thin };
      const bTop = { top: medium, bottom: medium, left: thin, right: thin };

      // Logo
      const logoId = wb.addImage({ base64: logoDataUri.replace(/^data:image\/png;base64,/, ""), extension: "png" });
      const lr = ws.addRow(Array(13).fill(""));
      lr.height = 55;
      ws.mergeCells(`A${lr.number}:M${lr.number}`);
      ws.addImage(logoId, { tl: { col: 0, row: lr.number - 1 }, ext: { width: 175, height: 67 } });

      // Titre
      const tr2 = ws.addRow([`Ordre de passage — ${ue}`, ...Array(12).fill("")]);
      tr2.height = 32;
      ws.mergeCells(`A${tr2.number}:M${tr2.number}`);
      const tc = tr2.getCell(1);
      tc.font = { bold: true, size: 16, color: { argb: "FF" + C.w } };
      tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.g } };
      tc.alignment = { horizontal: "center", vertical: "middle" };
      tc.border = bAll;

      // Sous-titre
      const sr = ws.addRow([[promotion, formatDateFr(jourPassage)].filter(Boolean).join("   —   "), ...Array(12).fill("")]);
      sr.height = 22;
      ws.mergeCells(`A${sr.number}:M${sr.number}`);
      const sc = sr.getCell(1);
      sc.font = { italic: true, size: 13, color: { argb: "FF" + C.w } };
      sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.gm } };
      sc.alignment = { horizontal: "center", vertical: "middle" };
      sc.border = bAll;

      ws.addRow([]);

      const HEADERS = [
        "CIVILITÉ ÉTUDIANT","NOM ÉTUDIANT","PRÉNOM ÉTUDIANT","JOUR DE PASSAGE","HEURE DE PASSAGE",
        "UE ÉVALUÉE","TEMPS D'ÉVALUATION","NUMÉRO JURY","CIVILITÉ JURY","NOM JURY","PRÉNOM JURY",
        "LIEU DE PASSAGE DE L'ÉVALUATION","TEMPS DE PRÉSENCE AVANT HEURE DE PASSAGE",
      ];
      const hRow = ws.addRow(HEADERS);
      hRow.height = 36;
      hRow.eachCell(c => {
        c.font = { bold: true, size: 12, color: { argb: "FF" + C.d } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.gl } };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = bTop;
      });

      const dateFr = formatDateFr(jourPassage);
      const tpsEval = `${examDurationMinutes > 0 ? examDurationMinutes : 15} min`;
      schedule.forEach((entry, idx) => {
        const bg = idx % 2 === 0 ? C.re : C.w;
        const dRow = ws.addRow([
          entry.student.civilite ?? "", entry.student.nom, entry.student.prenom,
          dateFr, entry.heure, ue, tpsEval, juryNumero, "",
          defaultExaminer.nom, defaultExaminer.prenom, lieu, tempsPresence,
        ]);
        dRow.height = 22;
        dRow.eachCell((c, ci) => {
          c.font = { size: 12 };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
          c.alignment = { vertical: "middle", horizontal: ci === 5 || ci >= 8 ? "center" : "left", wrapText: true };
          c.border = bAll;
        });
      });

      const buf = await wb.xlsx.writeBuffer() as unknown;
      let arrayBuf: ArrayBuffer;
      if (buf instanceof ArrayBuffer) arrayBuf = buf;
      else if (buf instanceof Uint8Array) arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      else arrayBuf = buf as ArrayBuffer;

      const bddDir = buildBddFolder(ue, promotion);
      const fileName = buildExportFileName(ue, jourPassage, ".xlsx");

      try {
        await saveFileToFolder(bddDir, fileName, arrayBuf);
        notify(`BDD exportée dans le dossier "${bddDir}" sur la clé.`, "success");
        return;
      } catch { /* hors Tauri — fallback navigateur */ }

      const blob = new Blob([arrayBuf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bddDir}_${fileName}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Export Excel téléchargé.", "success");
    }, [schedule, ue, promotion, jourPassage, examDurationMinutes, juryNumero, defaultExaminer, lieu, tempsPresence, notify]);

    const dur = examDurationMinutes > 0 ? examDurationMinutes : 15;
    const slotsCount =
      (matinActive ? Math.max(0, Math.floor((timeToMin(matinFin) - timeToMin(matinDebut)) / dur)) : 0) +
      (apremActive ? Math.max(0, Math.floor((timeToMin(apremFin) - timeToMin(apremDebut)) / dur)) : 0);

    return (
      <div className="mx-auto max-w-4xl p-6 space-y-5">
        <h2 className="text-lg font-black uppercase text-slate-700">Création BDD — Ordre de passage</h2>

        {/* Récap config (lecture seule) */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
          <span><span className="font-black text-slate-400 uppercase text-[10px]">Évaluateur </span>{defaultExaminer.nom} {defaultExaminer.prenom}</span>
          <span><span className="font-black text-slate-400 uppercase text-[10px]">UE </span>{ue || <span className="italic text-red-400">non renseignée</span>}</span>
          <span><span className="font-black text-slate-400 uppercase text-[10px]">Promotion </span>{promotion || <span className="italic text-red-400">non renseignée</span>}</span>
          <span><span className="font-black text-slate-400 uppercase text-[10px]">Durée / étudiant </span>{dur} min</span>
          <span><span className="font-black text-slate-400 uppercase text-[10px]">Étudiants </span>{studentList.length}</span>
        </div>

        {/* Champs BDD */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold uppercase text-slate-500">Informations complémentaires</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className={labelCls}>Numéro jury</label>
              <input
                className={fieldCls(juryNumero, false)}
                value={juryNumero}
                onChange={e => setJuryNumero(e.target.value)}
                placeholder="Jury 1"
              />
            </div>
            <div>
              <label className={labelCls}>Jour de passage *</label>
              <input
                type="date"
                className={fieldCls(jourPassage)}
                value={jourPassage}
                onChange={e => setJourPassage(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Temps de présence avant passage</label>
              <select
                className={`mb-1 ${fieldCls(tempsPresence, false)}`}
                value={PRESENCE_PRESETS.includes(tempsPresence) ? tempsPresence : "__custom__"}
                onChange={e => { if (e.target.value !== "__custom__") setTempsPresence(e.target.value); }}
              >
                {PRESENCE_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                <option value="__custom__">Autre</option>
              </select>
              <input
                className={fieldCls(tempsPresence, false)}
                value={tempsPresence}
                onChange={e => setTempsPresence(e.target.value)}
                placeholder="Ex: 20 min"
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className={labelCls}>Lieu de passage *</label>
              <input
                className={fieldCls(lieu)}
                value={lieu}
                onChange={e => setLieu(e.target.value)}
                placeholder="BOX 5, 35 rue Lucas 03200 Vichy"
              />
            </div>
          </div>
        </div>

        {/* Créneaux horaires */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold uppercase text-slate-500">Créneaux horaires *</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TimeSlot
              active={matinActive} onToggle={setMatinActive} label="Matin" color="amber"
              debut={matinDebut} fin={matinFin} onDebut={setMatinDebut} onFin={setMatinFin}
            />
            <TimeSlot
              active={apremActive} onToggle={setApremActive} label="Après-midi" color="indigo"
              debut={apremDebut} fin={apremFin} onDebut={setApremDebut} onFin={setApremFin}
            />
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Créneaux disponibles : <span className="font-bold text-slate-600">{slotsCount}</span>
            {" "}· Étudiants à planifier : <span className="font-bold text-slate-600">{studentList.length}</span>
            {slotsCount > 0 && slotsCount < studentList.length && (
              <span className="ml-2 font-bold text-red-500">⚠ Pas assez de créneaux</span>
            )}
          </p>
        </div>

        {/* Erreurs de validation */}
        {!canGenerate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-black uppercase text-[10px] text-amber-600 mb-1">Champs requis avant génération</p>
            <ul className="list-disc list-inside space-y-0.5">
              {missingFields.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="primary"
            onClick={generateSchedule}
            className={!canGenerate ? "opacity-50 cursor-not-allowed" : ""}
          >
            ↺ Générer l'ordre de passage (aléatoire)
          </Button>
          {generated && schedule.length > 0 && (
            <Button
              variant="neutral"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={exportXlsx}
            >
              ⬇ Exporter .xlsx
            </Button>
          )}
        </div>

        {/* Tableau */}
        {generated && schedule.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 text-[11px] font-black uppercase text-slate-600">
                  <th className="px-3 py-2 text-left">Heure</th>
                  <th className="px-3 py-2 text-left">Civilité</th>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Prénom</th>
                  <th className="px-3 py-2 text-center">Période</th>
                  <th className="px-3 py-2 text-left">Jury</th>
                  <th className="px-3 py-2 text-left">Lieu</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((entry, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-emerald-50/40" : "bg-white"}>
                    <td className="px-3 py-1.5 font-bold text-indigo-700">{entry.heure}</td>
                    <td className="px-3 py-1.5">{entry.student.civilite}</td>
                    <td className="px-3 py-1.5 font-semibold">{entry.student.nom}</td>
                    <td className="px-3 py-1.5">{entry.student.prenom}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        entry.period === "matin" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {entry.period === "matin" ? "Matin" : "Après-midi"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs">{juryNumero} — {defaultExaminer.nom} {defaultExaminer.prenom}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-500">{lieu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {generated && schedule.length === 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
            Aucun créneau disponible avec les horaires définis.
          </div>
        )}
      </div>
    );
}
