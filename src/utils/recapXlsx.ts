import ExcelJS from "exceljs";
import type { SavedEvaluation } from "../types";
import { logoDataUri } from "../assets/logo";

const COLOR = {
  emerald: "047857", emeraldLight: "D1FAE5", emeraldBg: "059669",
  white: "FFFFFF", rowEven: "F0FDF4", grey: "F3F4F6", greyText: "374151",
  dark: "1E3A2F", border: "CCCCCC", borderStrong: "047857",
};

const thin   = { style: "thin"   as const, color: { argb: "FF" + COLOR.border } };
const medium = { style: "medium" as const, color: { argb: "FF" + COLOR.borderStrong } };
const borderAll  = { top: thin,   bottom: thin,   left: thin, right: thin };
const borderTop  = { top: medium, bottom: medium, left: thin, right: thin };
const borderFoot = { top: medium, bottom: thin,   left: thin, right: thin };

function fmtDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)} min ${(s % 60).toString().padStart(2, "0")} s`;
}

function fmtDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function sanitizeSheet(s: string): string {
  return s.replace(/[[\]*?:/\\]/g, "-").replace(/\s+/g, " ").trim();
}

export async function buildRecapXlsxBuffer(savedEvaluations: SavedEvaluation[]): Promise<ArrayBuffer> {
  const groups = new Map<string, SavedEvaluation[]>();
  for (const ev of savedEvaluations) {
    const key = `${ev.ue || "—"}|||${ev.date || ""}|||${ev.promotion || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) =>
    b.split("|||")[1].localeCompare(a.split("|||")[1]),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Praxie — IFSO Vichy";
  wb.created = new Date();

  for (const [key, evals] of sortedGroups) {
    const [ue, date, promotion] = key.split("|||");
    const sorted = [...evals].sort((a, b) =>
      `${a.student.nom} ${a.student.prenom}`.localeCompare(
        `${b.student.nom} ${b.student.prenom}`, "fr",
      ),
    );

    const sheetName = sanitizeSheet(ue).slice(0, 31) || "Récap";
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    ws.columns = [
      { key: "nom",    width: 22 },
      { key: "prenom", width: 20 },
      { key: "note",   width: 14 },
      { key: "duree",  width: 20 },
    ];

    // Row 1 — Logo
    const logoBase64 = logoDataUri.replace(/^data:image\/png;base64,/, "");
    const logoId = wb.addImage({ base64: logoBase64, extension: "png" });
    const logoRow = ws.addRow(["", "", "", ""]);
    logoRow.height = 50;
    ws.mergeCells(`A${logoRow.number}:D${logoRow.number}`);
    ws.addImage(logoId, { tl: { col: 0, row: logoRow.number - 1 }, ext: { width: 160, height: 61 } });

    // Row 2 — UE title
    const titleRow = ws.addRow([ue, "", "", ""]);
    titleRow.height = 30;
    ws.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 16, color: { argb: "FF" + COLOR.white } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR.emerald } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.border = borderAll;

    // Row 3 — Date + promotion subtitle
    const subtitle = [fmtDate(date), promotion].filter(Boolean).join("   —   ");
    const subRow = ws.addRow([subtitle, "", "", ""]);
    subRow.height = 20;
    ws.mergeCells(`A${subRow.number}:D${subRow.number}`);
    const subCell = subRow.getCell(1);
    subCell.font = { italic: true, size: 13, color: { argb: "FF" + COLOR.white } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR.emeraldBg } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    subCell.border = borderAll;

    // Spacer
    ws.addRow([]);

    // Headers
    const headerRow = ws.addRow(["Nom", "Prénom", "Note / 20", "Durée réelle"]);
    headerRow.height = 22;
    headerRow.eachCell((c, ci) => {
      c.font = { bold: true, size: 14, color: { argb: "FF" + COLOR.dark } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR.emeraldLight } };
      c.alignment = { horizontal: ci <= 2 ? "left" : "center", vertical: "middle" };
      c.border = borderTop;
    });

    // Data rows
    sorted.forEach((ev, idx) => {
      const bg = idx % 2 === 0 ? COLOR.rowEven : COLOR.white;
      const dataRow = ws.addRow([
        ev.student.nom,
        ev.student.prenom,
        parseFloat(ev.total20.toFixed(1)),
        fmtDuration(ev.evaluationDurationMs),
      ]);
      dataRow.height = 20;
      dataRow.eachCell((c, ci) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
        c.alignment = { horizontal: ci <= 2 ? "left" : "center", vertical: "middle" };
        c.border = borderAll;
        if (ci === 3) {
          c.font = { bold: true, size: 13, color: { argb: ev.total20 >= 10 ? "FF047857" : "FFB91C1C" } };
        } else {
          c.font = { size: 13 };
        }
      });
    });

    // Footer
    const avg = (sorted.reduce((s, e) => s + e.total20, 0) / sorted.length).toFixed(1);
    const footerRow = ws.addRow([
      `${sorted.length} étudiant${sorted.length > 1 ? "s" : ""}`,
      "",
      `Moy. ${avg} / 20`,
      "",
    ]);
    footerRow.height = 20;
    footerRow.eachCell(c => {
      c.font = { bold: true, italic: true, size: 13, color: { argb: "FF" + COLOR.greyText } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR.grey } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = borderFoot;
    });
    footerRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  }

  // Feuille récap globale par promotion
  const promoMap = new Map<string, SavedEvaluation[]>();
  for (const ev of savedEvaluations) {
    const p = ev.promotion || "—";
    if (!promoMap.has(p)) promoMap.set(p, []);
    promoMap.get(p)!.push(ev);
  }
  if (promoMap.size > 0) {
    const ws2 = wb.addWorksheet("Moyennes promotions", { views: [{ showGridLines: false }] });
    ws2.columns = [
      { key: "promo", width: 22 },
      { key: "ue",    width: 24 },
      { key: "n",     width: 12 },
      { key: "avg",   width: 14 },
    ];
    const h2 = ws2.addRow(["Promotion", "UE", "Nb étudiants", "Moyenne / 20"]);
    h2.height = 22;
    h2.eachCell(c => {
      c.font = { bold: true, size: 13, color: { argb: "FF" + COLOR.dark } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR.emeraldLight } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = borderTop;
    });
    for (const [promo, evs] of [...promoMap.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"))) {
      const byUe = new Map<string, SavedEvaluation[]>();
      for (const ev of evs) {
        const u = ev.ue || "—";
        if (!byUe.has(u)) byUe.set(u, []);
        byUe.get(u)!.push(ev);
      }
      for (const [ue, ueEvs] of [...byUe.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"))) {
        const avg = (ueEvs.reduce((s, e) => s + e.total20, 0) / ueEvs.length).toFixed(1);
        const row = ws2.addRow([promo, ue, ueEvs.length, parseFloat(avg)]);
        row.height = 20;
        row.eachCell((c, ci) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLOR.white } };
          c.alignment = { horizontal: ci <= 2 ? "left" : "center", vertical: "middle" };
          c.border = borderAll;
          c.font = ci === 4
            ? { bold: true, size: 13, color: { argb: parseFloat(avg) >= 10 ? "FF047857" : "FFB91C1C" } }
            : { size: 13 };
        });
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer() as unknown;
  if (buf instanceof ArrayBuffer) return buf;
  if (buf instanceof Uint8Array) return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return buf as ArrayBuffer;
}
