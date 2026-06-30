// Protection par mot de passe des fichiers HTML exportés.
//
// Le contenu HTML est chiffré (AES-256-GCM, clé dérivée du mot de passe via
// PBKDF2) puis encapsulé dans un document "coquille" autonome. À l'ouverture,
// le fichier demande le mot de passe ; le contenu n'est déchiffré et affiché
// que si le mot de passe est correct. Rien n'est envoyé sur un serveur :
// tout se fait localement dans le navigateur.

export const DEFAULT_FILE_PASSWORD = "0405";

const PBKDF2_ITERATIONS = 150_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Script de déverrouillage embarqué dans le fichier exporté (JS pur, sans
// dépendance). Volontairement écrit sans template-literals ni `${` pour ne pas
// interférer avec le template-literal TypeScript qui l'enveloppe.
const UNLOCK_SCRIPT = `
(function () {
  var PAYLOAD = window.__PROTECTED_PAYLOAD__;
  var ITER = window.__PROTECTED_ITER__;

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(password, salt) {
    var enc = new TextEncoder();
    var km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: ITER, hash: "SHA-256" },
      km,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  }

  async function unlock() {
    var input = document.getElementById("pw");
    var err = document.getElementById("err");
    var btn = document.getElementById("btn");
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = "Déverrouillage...";
    try {
      var salt = b64ToBytes(PAYLOAD.s);
      var iv = b64ToBytes(PAYLOAD.i);
      var data = b64ToBytes(PAYLOAD.d);
      var key = await deriveKey(input.value, salt);
      var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
      var html = new TextDecoder().decode(plain);
      document.open();
      document.write(html);
      document.close();
    } catch (e) {
      err.textContent = "Mot de passe incorrect.";
      btn.disabled = false;
      btn.textContent = "Déverrouiller";
      input.value = "";
      input.focus();
    }
  }

  function ready() {
    if (!window.crypto || !window.crypto.subtle) {
      document.getElementById("err").textContent =
        "Votre navigateur ne permet pas le déchiffrement (ouvrez le fichier en local ou via https).";
      return;
    }
    document.getElementById("btn").addEventListener("click", unlock);
    document.getElementById("pw").addEventListener("keydown", function (e) {
      if (e.key === "Enter") unlock();
    });
    document.getElementById("pw").focus();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
`;

/**
 * Enveloppe un document HTML complet dans une coquille protégée par mot de passe.
 * Le résultat est lui-même un document HTML autonome téléchargeable.
 */
/**
 * Chiffre un texte et renvoie la charge utile JSON ({s,i,d} en base64).
 * Réutilisable pour les fichiers HTML protégés comme pour les sauvegardes JSON.
 */
export async function encryptToPayload(
  text: string,
  password: string = DEFAULT_FILE_PASSWORD,
): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text) as BufferSource,
  );
  return JSON.stringify({
    s: bytesToBase64(salt),
    i: bytesToBase64(iv),
    d: bytesToBase64(new Uint8Array(cipher)),
  });
}

/**
 * Déchiffre une charge utile produite par encryptToPayload.
 * Lève une erreur si le mot de passe est incorrect (authentification GCM).
 */
export async function decryptPayload(
  payloadJson: string,
  password: string = DEFAULT_FILE_PASSWORD,
): Promise<string> {
  const { s, i, d } = JSON.parse(payloadJson) as { s: string; i: string; d: string };
  const salt = base64ToBytes(s);
  const iv = base64ToBytes(i);
  const data = base64ToBytes(d);
  const key = await deriveKey(password, salt as BufferSource);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

export async function buildProtectedHtml(
  innerHtml: string,
  password: string = DEFAULT_FILE_PASSWORD,
): Promise<string> {
  // base64 : alphabet sans `<`, donc aucune séquence `</script>` ne peut
  // apparaître — l'injection dans la balise <script> est sûre.
  const payloadJson = await encryptToPayload(innerHtml, password);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Document protégé</title>
<style>
  :root { font-family: "Inter", system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #0f172a; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 12px 30px rgba(15,23,42,.08); padding: 28px; width: min(380px, 92vw); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #047857; background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 999px; padding: 4px 12px; margin-bottom: 14px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.sub { font-size: 13px; color: #64748b; margin: 0 0 18px; }
  input { width: 100%; box-sizing: border-box; border: none; border-bottom: 4px solid #e2e8f0; padding: 12px 4px; text-align: center; font-size: 24px; font-weight: 800; letter-spacing: .4rem; outline: none; }
  input:focus { border-color: #d97706; }
  button { margin-top: 18px; width: 100%; border: none; border-radius: 14px; background: #059669; color: #fff; font-weight: 800; font-size: 15px; padding: 12px; cursor: pointer; }
  button:disabled { opacity: .6; cursor: default; }
  .err { color: #dc2626; font-size: 12px; font-weight: 700; min-height: 16px; margin-top: 10px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 Document protégé</div>
    <h1>IFSO Vichy — Évaluation pratique</h1>
    <p class="sub">Saisissez le mot de passe pour afficher le contenu.</p>
    <input id="pw" type="password" autocomplete="off" inputmode="numeric" aria-label="Mot de passe" />
    <div id="err" class="err"></div>
    <button id="btn" type="button">Déverrouiller</button>
  </div>
  <script>
    window.__PROTECTED_PAYLOAD__ = ${payloadJson};
    window.__PROTECTED_ITER__ = ${PBKDF2_ITERATIONS};
  </script>
  <script>${UNLOCK_SCRIPT}</script>
</body>
</html>`;
}
