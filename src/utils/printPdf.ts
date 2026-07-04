export function printHtml(html: string, title = "Évaluation IFSO"): void {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

export function buildRecapHtml(
  evaluations: import("../types").SavedEvaluation[],
  title = "Récapitulatif des notes",
): string {
  const rows = evaluations
    .slice()
    .sort((a, b) => `${a.student.nom} ${a.student.prenom}`.localeCompare(`${b.student.nom} ${b.student.prenom}`, "fr"))
    .map(ev => {
      const note = ev.total20.toFixed(1);
      const ok = ev.total20 >= 10;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${ev.student.nom} ${ev.student.prenom}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b">${ev.ue || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b">${ev.date || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:${ok ? "#059669" : "#dc2626"}">${note}/20</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b">${(ev.remarks || "").slice(0, 120)}</td>
      </tr>`;
    })
    .join("");

  const avg = evaluations.length > 0
    ? (evaluations.reduce((s, e) => s + e.total20, 0) / evaluations.length).toFixed(2)
    : "—";

  return `<div style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif">
  <h1 style="font-size:18px;font-weight:900;text-transform:uppercase;margin:0 0 4px">${title}</h1>
  <p style="color:#64748b;font-size:12px;margin:0 0 20px">${evaluations.length} étudiant(s) — Moyenne&nbsp;: <strong>${avg}/20</strong></p>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569">Étudiant</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569">UE</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569">Date</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569">Note</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569">Commentaire</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:20px;font-size:10px;color:#94a3b8">Généré le ${new Date().toLocaleDateString("fr-FR")} — IFSO Vichy Clermont-Ferrand</p>
</div>`;
}
