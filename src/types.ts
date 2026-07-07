export const PROMOTIONS = [
  "PCEO1", "PCEO2", "PCEO3",
  "DCEO1", "DCEO2",
  "P1 D.E.", "P2 D.E.", "DCEO D.E.",
] as const;
export type Promotion = typeof PROMOTIONS[number];

export type SubStatus = "" | "ACQUIS" | "EN_COURS" | "NON_ACQUIS";

export type DrawMode = "single" | "group";

export interface AxisSubItem {
  id: string;
  label: string;
}

export interface Axis {
  id: string;
  label: string;
  max: number;
  subItems: AxisSubItem[];
}

// QuickNote type removed (feature disabled)

export interface StudentItem {
  civilite?: string;
  nom: string;
  prenom: string;
}

export interface ExaminerItem {
  civilite?: string;
  nom: string;
  prenom: string;
}

export interface StudentData {
  civilite?: string;
  nom: string;
  prenom: string;
  evaluator: string;
  evaluatorNom: string;
  evaluatorPrenom: string;
  date: string; // ISO date (YYYY-MM-DD)
  ue: string;
  promotion: string;
  questionNum: string;
}

export type Scores = Record<string, number>;

export interface QuestionGroup {
  id: string;
  title: string;
  questions: string[];
}

export type DrawPersisted =
  | { mode: "single"; question: string }
  | { mode: "group"; group: QuestionGroup };

export interface BddScheduleEntry {
  student: StudentItem;
  heure: string;   // "HH:MM"
  period: "matin" | "apmidi";
  date: string;    // ISO date "YYYY-MM-DD"
}

export interface EvalSession {
  id: string;
  name: string;       // ex. "Session Mardi 15 mars"
  date: string;       // YYYY-MM-DD
  configIds: string[]; // IDs des EvalConfig de cette session
  published: boolean; // true = visible par les évaluateurs
  createdAt: string;
  updatedAt: string;
}

export interface EvalConfig {
  id: string;
  promotion: string;
  ue: string;
  defaultExaminer: ExaminerItem;
  examDurationMinutes: number;
  studentList: StudentItem[];
  studentListValidated: boolean;
  axes: Axis[];
  drawEnabled: boolean;
  drawMode: DrawMode;
  drawGroups: QuestionGroup[];
  drawSingles: string[];
  drawListValidated: boolean;
  showFinalNoteToEvaluator: boolean;
  showBaremeToEvaluator: boolean;
  showPercentToEvaluator: boolean;
  savedEvaluations: SavedEvaluation[];
  bddSchedule?: BddScheduleEntry[];
  sessionId?: string; // référence à l'EvalSession parente
  published?: boolean; // true = visible par les évaluateurs
  createdAt: string;
  updatedAt: string;
}

export interface EvalTemplate {
  id: string;
  name: string;           // = ue name
  ue: string;
  axes: Axis[];
  drawEnabled: boolean;
  drawMode: DrawMode;
  drawGroups: QuestionGroup[];
  drawSingles: string[];
  examDurationMinutes: number;
  showFinalNoteToEvaluator: boolean;
  showBaremeToEvaluator: boolean;
  showPercentToEvaluator: boolean;
  createdAt: string;
}

export type AppRoute =
  | { page: "home" }
  | { page: "admin-home" }
  | { page: "admin-session-detail"; sessionId: string }
  | { page: "admin-create"; sessionId: string; templateId?: string }
  | { page: "admin-edit"; evalId: string; sessionId: string }
  | { page: "admin-bdd"; preselectedConfigId?: string }
  | { page: "admin-recap" }
  | { page: "admin-templates" }
  | { page: "admin-preview"; config: EvalConfig; backRoute: AppRoute }
  | { page: "eval-select-evaluator" }
  | { page: "eval-select-ue"; evaluatorKey: string }
  | { page: "eval-run"; evalId: string }
  | { page: "demo-eval" };

export interface SavedEvaluation {
  id: string;
  createdAt?: string;
  student: StudentItem;
  examiner: ExaminerItem;
  date: string;
  ue: string;
  promotion?: string;
  /**
   * Commentaires combinés (pour compatibilité avec les anciennes versions et l'export)
   */
  remarks: string;
  /** Commentaires positifs saisis dans l'UI */
  remarksPositive?: string;
  /** Axes d'amélioration saisis dans l'UI */
  remarksImprovement?: string;
  /**
   * Durée de l'épreuve en millisecondes (entre le début du chrono et la première validation)
   */
  evaluationDurationMs?: number;
  signatureImage: string | null;
  axes: Axis[];
  scores: Scores;
  subChecks: Record<string, Record<string, SubStatus>>;
  subComments: Record<string, Record<string, string>>;
  drawPersisted: DrawPersisted | null;
  total20: number;
}
