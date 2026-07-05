import type { SavedEvaluation } from "../types";
import { escapeHtml, formatDate, formatTime } from "./index";
import { logoDataUri } from "../assets/logo";

export const formatEvaluationLabel = (
  ev: SavedEvaluation,
  options?: { showNote?: boolean },
): string => {
  const created = new Date(ev.createdAt || `${ev.date}T00:00:00`);
  const showNote = options?.showNote ?? true;

  const uePrefix = ev.ue ? `[${ev.ue}] ` : "";

  if (!showNote) {
    return `${uePrefix}${ev.student.nom} ${ev.student.prenom} — ${formatDate(created)} ${formatTime(created)}`;
  }

  return `${uePrefix}${ev.student.nom} ${ev.student.prenom} — ${ev.total20.toFixed(1)}/20 — ${formatDate(
    created,
  )} ${formatTime(created)}`;
};

export const buildRadarSvg = (ev: SavedEvaluation): string => {
  const c = 240;
  const r = 180;
  const n = ev.axes.length || 1;

  const rings = [0.2, 0.4, 0.6, 0.8, 1]
    .map(
      lvl =>
        `<circle cx="${c}" cy="${c}" r="${r * lvl}" fill="none" stroke="#e5e7eb" stroke-width="1" />`,
    )
    .join("");

  const axesLines = ev.axes
    .map((a, i) => {
      const angle = -90 + (360 / n) * i;
      const rad = (angle * Math.PI) / 180;
      const x2 = c + r * Math.cos(rad);
      const y2 = c + Math.sin(rad) * r;
      const lx = c + (r + 28) * Math.cos(rad);
      const ly = c + (r + 28) * Math.sin(rad);
      return `<g><line x1="${c}" y1="${c}" x2="${x2}" y2="${y2}" stroke="#cbd5e1" stroke-width="1" /><text x="${lx}" y="${
        ly - 6
      }" font-size="14" font-weight="700" text-anchor="middle" fill="#475569">${escapeHtml(
        a.label,
      )}</text><text x="${lx}" y="${
        ly + 10
      }" font-size="10" font-weight="700" text-anchor="middle" fill="#64748b">Barème: ${a.max.toFixed(
        1,
      )}</text></g>`;
    })
    .join("");

  const points = ev.axes
    .map((a, i) => {
      const angle = -90 + (360 / n) * i;
      const pr = a.max > 0 ? ((ev.scores[a.id] || 0) / a.max) * r : 0;
      const rad = (angle * Math.PI) / 180;
      return `${c + pr * Math.cos(rad)},${c + pr * Math.sin(rad)}`;
    })
    .join(" ");

  const dots = ev.axes
    .map((a, i) => {
      const angle = -90 + (360 / n) * i;
      const pr = a.max > 0 ? ((ev.scores[a.id] || 0) / a.max) * r : 0;
      const rad = (angle * Math.PI) / 180;
      return `<circle cx="${c + pr * Math.cos(rad)}" cy="${
        c + pr * Math.sin(rad)
      }" r="4" fill="#2563eb" />`;
    })
    .join("");

  return `<svg width="480" height="480" viewBox="0 0 480 480">${rings}${axesLines}<polygon points="${points}" fill="rgba(37,99,235,0.15)" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" />${dots}</svg>`;
};

export const buildEvaluationsHtml = (savedEvaluations: SavedEvaluation[]): string => {
  const sorted = [...savedEvaluations].sort((a, b) =>
    `${a.student.nom} ${a.student.prenom}`.localeCompare(
      `${b.student.nom} ${b.student.prenom}`,
      "fr",
      { sensitivity: "base" },
    ),
  );

  const sections = sorted
    .map((ev, idx) => {
      const created = new Date(ev.createdAt || `${ev.date}T00:00:00`);
      const radar = buildRadarSvg(ev);

      const axesDetails = ev.axes
        .map(axis => {
          const score = (ev.scores[axis.id] || 0).toFixed(1);
          const axisComment = ev.subComments?.[axis.id]?.["__axis__"] || "";
          const axisNeedsComment = (axis.subItems || []).some(si => {
            const st = ev.subChecks?.[axis.id]?.[si.id] || "";
            return st === "NON_ACQUIS" || st === "EN_COURS";
          });
          const subItems = (axis.subItems || [])
            .map(si => {
              const status = ev.subChecks?.[axis.id]?.[si.id] || "";
              return `<div class="sub-item"><div class="sub-label">${escapeHtml(
                si.label,
              )}</div><div class="sub-status">Statut: ${escapeHtml(
                status || "Non renseigné",
              )}</div></div>`;
            })
            .join("") + (axisNeedsComment
              ? `<div class="sub-comment">Commentaire: ${escapeHtml(axisComment || "-")}</div>`
              : "");

          return `<div class="axis"><div class="axis-header"><div class="axis-title">${escapeHtml(
            axis.label,
          )}</div><div class="axis-score">${score} / ${axis.max.toFixed(
            1,
          )}</div></div>${subItems ? `<div class="sub-list">${subItems}</div>` : ""}</div>`;
        })
        .join("");

      const remarksHtml = escapeHtml(ev.remarks || "-").replace(/\n/g, "<br />");

      const questionHtml = (() => {
        if (!ev.drawPersisted) return "";
        if (ev.drawPersisted.mode === "single") {
          return `<div class="question-box"><span class="question-label">Question tirée au sort</span><p class="question-text">${escapeHtml(ev.drawPersisted.question)}</p></div>`;
        }
        const g = ev.drawPersisted.group;
        const items = g.questions.map(q => `<li>${escapeHtml(q)}</li>`).join("");
        return `<div class="question-box"><span class="question-label">Sujet tiré au sort — ${escapeHtml(g.title)}</span><ul class="question-list">${items}</ul></div>`;
      })();

      return `<section class="evaluation" id="evaluation-${idx + 1}">
  <div class="page page-1">
    <div class="brand"><img class="brand-logo" src="${logoDataUri}" alt="Logo IFSO Vichy Clermont-FD" /></div>
    <header class="evaluation-header">
      <div>
        <h1>IFSO VICHY CLERMONT-FERRAND</h1>
        <h2>Grille d'évaluation pratique</h2>
      </div>
      <div class="meta">
        <div><strong>Date:</strong> ${escapeHtml(formatDate(created))} à ${escapeHtml(
        formatTime(created),
      )}</div>
      </div>
    </header>
    <div class="identity-grid">
      <div class="identity-card">
        <span class="identity-label">Étudiant</span>
        <div class="student-line">
          <span class="identity-value">${ev.student.civilite ? `${escapeHtml(
        ev.student.civilite,
      )} ` : ""}${escapeHtml(ev.student.nom)} ${escapeHtml(
        ev.student.prenom,
      )}</span>
          <span class="student-note">Note finale: ${ev.total20.toFixed(1)} / 20</span>
        </div>
      </div>
      <div class="identity-card">
        <span class="identity-label">UE</span>
        <span class="identity-value">${escapeHtml(ev.ue)}</span>
      </div>
      <div class="identity-card">
        <span class="identity-label">Promotion</span>
        <span class="identity-value">${escapeHtml(ev.promotion || "-")}</span>
      </div>
      <div class="identity-card">
        <span class="identity-label">Formateur évaluateur</span>
        <span class="identity-value">${escapeHtml(ev.examiner.nom)} ${escapeHtml(
        ev.examiner.prenom,
      )}</span>
      </div>
    </div>
    ${questionHtml}
    <div class="radar">${radar}</div>
  </div>
  <div class="page page-2">
    <div class="details">
      <h3>Détails</h3>
      <div class="details-grid">${axesDetails}</div>
    </div>
    <div class="remarks">
      <h3>Remarques</h3>
      <p>${remarksHtml}</p>
    </div>
    <div class="signature">
      <h3>Signature</h3>
      ${
        ev.signatureImage
          ? `<img src="${ev.signatureImage}" alt="Signature" />`
          : "<p>Non renseignée</p>"
      }
    </div>
    ${(() => {
      if (!ev.evaluationDurationMs) return "";
      const totalSeconds = Math.round(ev.evaluationDurationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const text = minutes > 0
        ? `${minutes} min ${seconds.toString().padStart(2, "0")} s`
        : `${seconds} s`;
      return `<p class="duration-note">Temps d'épreuve (du début du chrono à la validation) : ${text}</p>`;
    })()}
  </div>
</section>`;
    })
    .join("");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>Évaluations</title><style>:root{font-family:"Inter",sans-serif;color:#0f172a;background:#f8fafc}body{margin:0;padding:24px}h1{font-size:20px;margin:0}h2{font-size:16px;margin:4px 0 0}h3{font-size:14px;margin:16px 0 8px}.evaluation{background:#fff;margin-bottom:24px;border-radius:16px;box-shadow:0 12px 30px rgba(15,23,42,0.08);overflow:hidden;page-break-after:always}.evaluation:last-child{page-break-after:auto}.page{padding:24px;min-height:960px}.page-2{page-break-before:always}.brand{display:flex;justify-content:center;margin-bottom:14px}.brand-logo{height:56px;width:auto}.evaluation-header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #e2e8f0;padding-bottom:12px}.meta div{font-size:13px;margin-bottom:4px}.identity-grid{margin:18px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.identity-card{background:#f8fafc;border-radius:12px;padding:12px 14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:4px}.identity-label{font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700}.identity-value{font-size:16px;font-weight:800;margin-top:2px}.student-line{display:flex;justify-content:space-between;align-items:center;gap:6px}.student-note{font-size:21px;font-weight:800;margin-left:6px}.radar{margin:20px 0;display:flex;justify-content:center;background:#f8fafc;border-radius:16px;padding:20px;border:1px solid #e2e8f0}.remarks,.signature,.details{background:#f1f5f9;border-radius:12px;padding:14px 18px;margin-top:10px;margin-bottom:14px}.signature img{max-height:120px;margin-top:6px}.details-grid{display:grid;gap:12px}.axis{background:#fff;border-radius:10px;padding:10px 12px;border:1px solid #e2e8f0}.axis-header{display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:4px}.axis-title{text-transform:uppercase}.sub-list{margin-top:8px}.sub-item{background:#f8fafc;border-radius:8px;padding:8px;margin-bottom:6px;font-size:12px}.sub-label{font-weight:600;margin-bottom:4px}.duration-note{margin-top:8px;font-size:11px;color:#64748b;font-style:italic}.question-box{margin:14px 0;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 18px}.question-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#3b82f6;display:block;margin-bottom:6px}.question-text{margin:0;font-size:15px;font-weight:600;color:#1e3a5f}.question-list{margin:0;padding-left:18px;font-size:14px;color:#1e3a5f}@media print{body{padding:0;background:#fff}.evaluation{box-shadow:none;margin:0;border-radius:0}.page{min-height:auto}.page-2{page-break-before:always}}</style></head><body>${sections}</body></html>`;

  return html;
};
