import { useCallback } from "react";
import { useLocalStorage, getLocalStorageItem, setLocalStorageItem } from "./useLocalStorage";
import { generateId } from "../utils";
import type { EvalConfig, EvalSession, SavedEvaluation } from "../types";

const CONFIGS_KEY = "evalConfigs";
const SESSIONS_KEY = "evalSessions";

function readConfigs(): EvalConfig[] {
  return getLocalStorageItem<EvalConfig[]>(CONFIGS_KEY, []);
}
function writeConfigs(configs: EvalConfig[]): void {
  setLocalStorageItem(CONFIGS_KEY, configs);
}
function readSessions(): EvalSession[] {
  return getLocalStorageItem<EvalSession[]>(SESSIONS_KEY, []);
}
function writeSessions(sessions: EvalSession[]): void {
  setLocalStorageItem(SESSIONS_KEY, sessions);
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
    examDurationMinutes: 15,
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
    showPercentToEvaluator: false,
    savedEvaluations: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Migration : groupe les configs sans sessionId en sessions par date */
function migrate(): void {
  const configs = readConfigs();
  const sessions = readSessions();

  const orphans = configs.filter(c => !c.sessionId);
  if (orphans.length === 0) return;

  // Grouper par date (YYYY-MM-DD de createdAt)
  const byDate = new Map<string, EvalConfig[]>();
  for (const c of orphans) {
    const date = c.createdAt?.split("T")[0] ?? new Date().toISOString().split("T")[0];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(c);
  }

  const newSessions: EvalSession[] = [];
  const updatedConfigs = [...configs];

  for (const [date, group] of byDate) {
    const sessionId = generateId();
    const label = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    newSessions.push({
      id: sessionId,
      name: `Session du ${label}`,
      date,
      configIds: group.map(c => c.id),
      createdAt: group[0].createdAt,
      updatedAt: new Date().toISOString(),
    });
    for (const c of group) {
      const idx = updatedConfigs.findIndex(x => x.id === c.id);
      if (idx >= 0) updatedConfigs[idx] = { ...updatedConfigs[idx], sessionId };
    }
  }

  writeConfigs(updatedConfigs);
  writeSessions([...sessions, ...newSessions]);
}

// Migration au chargement du module
try { migrate(); } catch { /* ne pas bloquer */ }

export { blankConfig };

export function useEvalStore() {
  const [configs, setConfigs] = useLocalStorage<EvalConfig[]>(CONFIGS_KEY, []);
  const [sessions, setSessions] = useLocalStorage<EvalSession[]>(SESSIONS_KEY, []);

  // ── Configs ──────────────────────────────────────────────────
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
      // Retirer aussi de la session parente
      const sns = readSessions().map(s => ({
        ...s, configIds: s.configIds.filter(cid => cid !== id),
      }));
      writeSessions(sns);
      setSessions(sns);
    },
    [setConfigs, setSessions],
  );

  const addEvaluation = useCallback(
    (evalId: string, evaluation: SavedEvaluation) => {
      const next = readConfigs().map(c => {
        if (c.id !== evalId) return c;
        const filtered = c.savedEvaluations.filter(
          e => !(e.student.nom === evaluation.student.nom && e.student.prenom === evaluation.student.prenom),
        );
        return { ...c, savedEvaluations: [evaluation, ...filtered], updatedAt: new Date().toISOString() };
      });
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const removeEvaluation = useCallback(
    (evalId: string, evaluationId: string) => {
      const next = readConfigs().map(c =>
        c.id !== evalId ? c
          : { ...c, savedEvaluations: c.savedEvaluations.filter(e => e.id !== evaluationId) },
      );
      writeConfigs(next);
      setConfigs(next);
    },
    [setConfigs],
  );

  const duplicateConfig = useCallback(
    (id: string): EvalConfig | null => {
      const src = readConfigs().find(c => c.id === id);
      if (!src) return null;
      const now = new Date().toISOString();
      const copy: EvalConfig = {
        ...structuredClone(src),
        id: generateId(),
        ue: `${src.ue} (copie)`,
        savedEvaluations: [],
        bddSchedule: undefined,
        createdAt: now,
        updatedAt: now,
      };
      const nextC = [...readConfigs(), copy];
      writeConfigs(nextC);
      setConfigs(nextC);
      // Ajouter dans la même session si applicable
      if (src.sessionId) {
        const nextS = readSessions().map(s =>
          s.id === src.sessionId ? { ...s, configIds: [...s.configIds, copy.id] } : s,
        );
        writeSessions(nextS);
        setSessions(nextS);
      }
      return copy;
    },
    [setConfigs, setSessions],
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

  // ── Sessions ─────────────────────────────────────────────────
  const getSession = useCallback(
    (id: string) => sessions.find(s => s.id === id) ?? null,
    [sessions],
  );

  const getSessionForConfig = useCallback(
    (configId: string) => sessions.find(s => s.configIds.includes(configId)) ?? null,
    [sessions],
  );

  const createSession = useCallback(
    (date: string, name?: string): EvalSession => {
      const label = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      const now = new Date().toISOString();
      const session: EvalSession = {
        id: generateId(),
        name: name?.trim() || `Session du ${label}`,
        date,
        configIds: [],
        published: false,
        createdAt: now,
        updatedAt: now,
      };
      const next = [...readSessions(), session];
      writeSessions(next);
      setSessions(next);
      return session;
    },
    [setSessions],
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<EvalSession>) => {
      const next = readSessions().map(s =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s,
      );
      writeSessions(next);
      setSessions(next);
    },
    [setSessions],
  );

  const deleteSession = useCallback(
    (id: string, deleteConfigs = false) => {
      const session = readSessions().find(s => s.id === id);
      if (deleteConfigs && session) {
        const nextC = readConfigs().filter(c => !session.configIds.includes(c.id));
        writeConfigs(nextC);
        setConfigs(nextC);
      }
      const nextS = readSessions().filter(s => s.id !== id);
      writeSessions(nextS);
      setSessions(nextS);
    },
    [setConfigs, setSessions],
  );

  /** Crée un EvalConfig et l'attache à une session */
  const createConfigInSession = useCallback(
    (sessionId: string, partial: Partial<EvalConfig> = {}): EvalConfig => {
      const cfg = blankConfig({ ...partial, sessionId });
      const nextC = [...readConfigs(), cfg];
      writeConfigs(nextC);
      setConfigs(nextC);
      const nextS = readSessions().map(s =>
        s.id === sessionId ? { ...s, configIds: [...s.configIds, cfg.id], updatedAt: new Date().toISOString() } : s,
      );
      writeSessions(nextS);
      setSessions(nextS);
      return cfg;
    },
    [setConfigs, setSessions],
  );

  /** Configs d'une session, dans l'ordre */
  const getConfigsForSession = useCallback(
    (sessionId: string): EvalConfig[] => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return [];
      return session.configIds
        .map(id => configs.find(c => c.id === id))
        .filter((c): c is EvalConfig => !!c);
    },
    [sessions, configs],
  );

  const promotionsAvailable = [...new Set(configs.map(c => c.promotion).filter(Boolean))].sort();

  // Sessions triées par date décroissante
  const sessionsSorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return {
    configs,
    sessions: sessionsSorted,
    getConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    addEvaluation,
    removeEvaluation,
    duplicateConfig,
    saveBddSchedule,
    getSession,
    getSessionForConfig,
    createSession,
    updateSession,
    deleteSession,
    createConfigInSession,
    getConfigsForSession,
    promotionsAvailable,
  };
}
