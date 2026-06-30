import { describe, it, expect } from "vitest";
import { encryptToPayload, decryptPayload, buildProtectedHtml } from "./protect";

describe("chiffrement (protect)", () => {
  it("déchiffre avec le bon mot de passe (aller-retour)", async () => {
    const secret = JSON.stringify({ nom: "DUPONT", note: 14.5 });
    const payload = await encryptToPayload(secret, "0405");
    const back = await decryptPayload(payload, "0405");
    expect(back).toBe(secret);
  });

  it("échoue avec un mauvais mot de passe", async () => {
    const payload = await encryptToPayload("contenu", "0405");
    await expect(decryptPayload(payload, "9999")).rejects.toThrow();
  });

  it("ne laisse pas fuiter le texte en clair dans la charge utile", async () => {
    const payload = await encryptToPayload("MOT-SECRET-123", "0405");
    expect(payload).not.toContain("MOT-SECRET-123");
  });

  it("produit un document HTML protégé sans le contenu en clair", async () => {
    const html = await buildProtectedHtml("<h1>CONTENU SECRET</h1>", "0405");
    expect(html).toContain("<!doctype html>");
    expect(html).not.toContain("CONTENU SECRET");
  });
});
