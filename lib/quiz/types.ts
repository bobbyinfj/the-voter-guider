export interface ScoringCandidate {
  id: string;
  name: string;
  party?: string | null;
  photoUrl?: string | null;
  incumbent?: boolean;
  officeId: string;
  stances: Array<{
    issueId: string;
    position: number; // -2..+2
  }>;
}

export interface ScoringAnswer {
  questionId: string;
  optionId: string;
  stanceValue: number; // -2..+2
  importance: number; // 0..3
}

export interface ScoringQuestion {
  id: string;
  prompt: string;
  order: number;
  issues: Array<{
    issueId: string;
    weight: number;
  }>;
}

export interface ContributionItem {
  questionId: string;
  questionPrompt: string;
  issueId: string;
  issueName: string;
  candidateStance: number;
  userStance: number;
  qWeight: number;
  importance: number;
  agreement: number; // 0..4
  contribution: number;
  // False when not every candidate in the race has a sourced position on this question: shown, not scored
  counted: boolean;
}

export interface RankedCandidate {
  candidate: ScoringCandidate;
  score: number;
  maxPossible: number;
  normalized: number; // 0..1, over the questions every candidate in the race has a position on
  known: number; // answered questions this candidate has a sourced position on
  breakdown: ContributionItem[];
}

export interface OfficeResult {
  officeId: string;
  officeTitle: string;
  rankedCandidates: RankedCandidate[];
  confidence: number; // 0..1
  // False when fewer than two candidates have a stated position on the answered
  // questions — then there is no fair ranking, only individual agreement
  comparable: boolean;
  // match: a clear closest candidate; too-close: within CLOSE_GAP; not-enough: fewer than
  // MIN_SHARED_QUESTIONS answered questions with a sourced position from every candidate
  verdict: "match" | "too-close" | "not-enough";
  sharedQuestions: number;
  // Questions in the whole quiz that every candidate here has a sourced position on; with
  // fewer than MIN_SHARED_QUESTIONS the quiz can never compare this race
  decisiveQuestionIds: string[];
  decidable: boolean;
  // Candidates in the race with no sourced position on anything in the quiz
  notCompared: { id: string; name: string }[];
}

export interface QuizResults {
  officeResults: OfficeResult[];
  questionsAnswered: number;
  totalQuestions: number;
  overallConfidence: number;
  stopSuggestion: "quick" | "confident" | "thorough" | null;
  // What the voter's importance ratings changed; absent until they've rated topics differently
  importanceEffect?: { changed: number; races: number };
}

export interface NextQuestionResult {
  questionId: string | null; // null = no more questions
  reason: "adaptive" | "ordered" | "exhausted";
}
