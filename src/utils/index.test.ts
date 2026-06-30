import { describe, it, expect } from "vitest";
import { escapeHtml, parseStudentsFromText, generateId } from "./index";

describe("escapeHtml", () => {
  it("échappe les caractères dangereux", () => {
    expect(escapeHtml(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#039;");
  });
  it("laisse un texte simple intact", () => {
    expect(escapeHtml("Dupont")).toBe("Dupont");
  });
});

describe("parseStudentsFromText", () => {
  it("parse 'Civilité NOM Prénom'", () => {
    expect(parseStudentsFromText("Mme DURAND Marie")).toEqual([
      { civilite: "Mme", nom: "DURAND", prenom: "Marie" },
    ]);
  });
  it("parse sans civilité et met le nom en majuscules", () => {
    expect(parseStudentsFromText("dupont Jean")).toEqual([
      { civilite: undefined, nom: "DUPONT", prenom: "Jean" },
    ]);
  });
  it("ignore les lignes vides", () => {
    expect(parseStudentsFromText("\n  \nMme A B\n")).toHaveLength(1);
  });
  it("gère les prénoms composés", () => {
    expect(parseStudentsFromText("M. MARTIN Jean Pierre")[0]).toEqual({
      civilite: "M.",
      nom: "MARTIN",
      prenom: "Jean Pierre",
    });
  });
});

describe("generateId", () => {
  it("produit des identifiants uniques", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
