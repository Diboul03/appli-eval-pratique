import { useCallback } from "react";
import { useLocalStorage, getLocalStorageItem, setLocalStorageItem } from "./useLocalStorage";
import { generateId } from "../utils";
import type { EvalConfig, SavedEvaluation } from "../types";

const STORE_KEY = "evalConfigs";

function readConfigs(): EvalConfig[] {
  return getLocalStorageItem<EvalConfig[]>(STORE_KEY, []);
}

function writeConfigs(configs: EvalConfig[]): void {
  setLocalStorageItem(STORE_KEY, configs);
}

const defaultAxes = [
  { id: "positionnement", label: "Positionnement", max: 3, subItems: [] },
  { id: "presentation",   label: "Présentation",   max: 3, subItems: [] },
  { id: "methodologie",   label: "Méthodologie",   max: 4, subItems: [] },
  { id: "precision",      label: "Précision",       max: 6, subItems: [] },
  { id: "discours",       label: "Discours",        max: 2, subItems: [] },
];

function blankConfig(overrides: Partial<EvalConfig> = {}): EvalConfig {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    promotion: "",
    ue: "",
    defaultExaminer: { nom: "", prenom: "" },
    examDurationMinutes: 0,
    studentList: [],
    studentListValidated: false,
    axes: structuredClone(defaultAxes),
    drawEnabled: false,
    drawMode: "single",
    drawGroups: [],
    drawSingles: [],
    drawListValidated: false,
    showFinalNoteToEvaluator: false,
    showBaremeToEvaluator: false,
    showPercentToEvaluator: true,
    savedEvaluations: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export { blankConfig };

export function useEvalStore() {
  const [configs, setConfigs] = useLocalStorage<EvalConfig[]>("evalConfigs", []);

  const getConfig = useCallback(
    (id: string) => configs.find(c => c.id === id) ?? null,
    [configs],
  );

  const createConfig = useCallback(
    (partial: Partial<EvalConfig> = {}): EvalConfig => {
      const cfg = blankConfig(partial);
      const next = [...readConfigs(), cfg];
      writeConfigs(next);
      setConfigs(next);
      return cfg;
    },
    [setConfigs],
  );

  const updateConfig = useCallback(
    (id: string, updates: Partial<EvalConfig>) => {
      const next = readConfigs().map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
      );
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const deleteConfig = useCallback(
    (id: string) => {
      const next = readConfigs().filter(c => c.id !== id);
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const addEvaluation = useCallback(
    (evalId: string, evaluation: SavedEvaluation) => {
      const next = readConfigs().map(c => {
        if (c.id !== evalId) return c;
        const filtered = c.savedEvaluations.filter(
          e => !(e.student.nom === evaluation.student.nom && e.student.prenom === evaluation.student.prenom),
        );
        return {
          ...c,
          savedEvaluations: [evaluation, ...filtered],
          updatedAt: new Date().toISOString(),
        };
      });
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const removeEvaluation = useCallback(
    (evalId: string, evaluationId: string) => {
      const next = readConfigs().map(c =>
        c.id !== evalId
          ? c
          : { ...c, savedEvaluations: c.savedEvaluations.filter(e => e.id !== evaluationId) },
      );
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const saveBddSchedule = useCallback(
    (evalId: string, schedule: import("../types").BddScheduleEntry[]) => {
      const next = readConfigs().map(c =>
        c.id !== evalId ? c : { ...c, bddSchedule: schedule, updatedAt: new Date().toISOString() },
      );
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const promotionsAvailable = [...new Set(configs.map(c => c.promotion).filter(Boolean))].sort();

  return {
    configs,
    getConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    addEvaluation,
    removeEvaluation,
    saveBddSchedule,
    promotionsAvailable,
  };
}
