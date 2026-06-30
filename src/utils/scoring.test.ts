import { describe, it, expect } from "vitest";
import { sumAxesMax, computeTotal20, areAllSubItemsSelected } from "./scoring";
import type { Axis } from "../types";

const axes: Axis[] = [
  { id: "a", label: "A", max: 4, subItems: [{ id: "a1", label: "A1" }] },
  { id: "b", label: "B", max: 6, subItems: [] },
];

describe("sumAxesMax", () => {
  it("additionne les barèmes", () => {
    expect(sumAxesMax(axes)).toBe(10);
  });
  it("renvoie 0 sans axe", () => {
    expect(sumAxesMax([])).toBe(0);
  });
});

describe("computeTotal20", () => {
  it("ramène les scores sur 20", () => {
    // 2/4 + 3/6 => 5/10 du total => 10/20
    expect(computeTotal20(axes, { a: 2, b: 3 })).toBeCloseTo(10);
  });
  it("note maximale = 20", () => {
    expect(computeTotal20(axes, { a: 4, b: 6 })).toBeCloseTo(20);
  });
  it("scores manquants comptés comme 0", () => {
    expect(computeTotal20(axes, {})).toBe(0);
  });
  it("évite la division par zéro", () => {
    expect(computeTotal20([], {})).toBe(0);
  });
});

describe("areAllSubItemsSelected", () => {
  it("faux si un sous-item n'a pas de statut", () => {
    expect(areAllSubItemsSelected(axes, { a: { a1: "" } }, {})).toBe(false);
  });
  it("vrai si acquis sans commentaire requis", () => {
    expect(areAllSubItemsSelected(axes, { a: { a1: "ACQUIS" } }, {})).toBe(true);
  });
  it("faux si 'non acquis' sans commentaire", () => {
    expect(
      areAllSubItemsSelected(axes, { a: { a1: "NON_ACQUIS" } }, { a: { a1: "  " } }),
    ).toBe(false);
  });
  it("vrai si 'en cours' avec commentaire", () => {
    expect(
      areAllSubItemsSelected(axes, { a: { a1: "EN_COURS" } }, { a: { a1: "à revoir" } }),
    ).toBe(true);
  });
});
