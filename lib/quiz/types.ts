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
}

export interface RankedCandidate {
  candidate: ScoringCandidate;
  score: number;
  maxPossible: number;
  normalized: number; // 0..1
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
}

export interface QuizResults {
  officeResults: OfficeResult[];
  questionsAnswered: number;
  totalQuestions: number;
  overallConfidence: number;
  stopSuggestion: "quick" | "confident" | "thorough" | null;
}

export interface NextQuestionResult {
  questionId: string | null; // null = no more questions
  reason: "adaptive" | "ordered" | "exhausted";
}
