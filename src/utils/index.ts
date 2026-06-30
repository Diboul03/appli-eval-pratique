export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseStudentsFromText(
  text: string,
): { civilite?: string; nom: string; prenom: string }[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/\s+/);

      let civilite: string | undefined;
      let nom = "";
      let prenom = "";

      if (parts.length >= 3 && /^(M\.|Mme|Mlle)$/i.test(parts[0] || "")) {
        civilite = (parts[0] || "").trim();
        nom = (parts[1] || "").toUpperCase();
        prenom = parts.slice(2).join(" ");
      } else {
        nom = (parts[0] || "").toUpperCase();
        prenom = parts.slice(1).join(" ");
      }

      return { civilite, nom, prenom };
    });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR");
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
