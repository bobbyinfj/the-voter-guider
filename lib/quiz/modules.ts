// Quiz modules: the quiz split by level of government, so a voter can take just the local part.
// A question's modules are the levels (Office.level) of the races on the voter's ballot where some
// candidate has a sourced stance on it; nothing is tagged by hand, so new stances and new states
// sort themselves.
import type { ScoringQuestion } from "./types";

export const MODULES = ["federal", "state", "county", "city", "school", "special"] as const;
export type QuizModule = (typeof MODULES)[number];

export const MODULE_LABELS: Record<QuizModule, string> = {
  federal: "Congress",
  state: "Statewide & legislature",
  county: "County",
  city: "City",
  school: "School & college boards",
  special: "Special districts",
};

export function parseModules(value: string | null | undefined): QuizModule[] | null {
  if (!value) return null;
  const list = value.split(",").filter((m): m is QuizModule => (MODULES as readonly string[]).includes(m));
  return list.length ? [...new Set(list)] : null;
}

interface OfficeStances {
  level: string;
  candidates: { stances: { issueId: string }[] }[];
}

// question id → the modules it belongs to (empty: no race on this ballot has a stance on it)
export function questionModules(questions: ScoringQuestion[], offices: OfficeStances[]): Record<string, QuizModule[]> {
  const issueLevels = new Map<string, Set<QuizModule>>();
  for (const o of offices) {
    if (!(MODULES as readonly string[]).includes(o.level)) continue;
    for (const c of o.candidates)
      for (const s of c.stances) {
        const set = issueLevels.get(s.issueId) ?? new Set<QuizModule>();
        set.add(o.level as QuizModule);
        issueLevels.set(s.issueId, set);
      }
  }
  return Object.fromEntries(
    questions.map((q) => {
      const levels = new Set<QuizModule>();
      for (const i of q.issues) for (const l of issueLevels.get(i.issueId) ?? []) levels.add(l);
      return [q.id, MODULES.filter((m) => levels.has(m))];
    }),
  );
}

// The modules on offer, in ballot order, with how many questions each has
export function moduleCounts(byQuestion: Record<string, QuizModule[]>): { module: QuizModule; label: string; count: number }[] {
  return MODULES.map((m) => ({ module: m, label: MODULE_LABELS[m], count: Object.values(byQuestion).filter((l) => l.includes(m)).length })).filter(
    (m) => m.count > 0,
  );
}

// Questions to ask: those in a chosen module (all modules when none chosen). Questions no race
// on this ballot has a stance on are never asked.
export function questionsFor<T extends { id: string }>(questions: T[], byQuestion: Record<string, QuizModule[]>, chosen: QuizModule[] | null): T[] {
  return questions.filter((q) => {
    const levels = byQuestion[q.id] ?? [];
    return levels.length > 0 && (!chosen || levels.some((l) => chosen.includes(l)));
  });
}
