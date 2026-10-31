import type { OfficeResult, QuizResults, ScoringAnswer } from "./types";

// The topics that gave the top candidate the most points: only a clear match has one to explain
export function reasonsFor(office: OfficeResult, limit = 2): string[] {
  if (office.verdict !== "match") return [];
  const counted = office.rankedCandidates[0]?.breakdown.filter((b) => b.counted && b.contribution > 0) ?? [];
  const topics = [...counted].sort((a, b) => b.contribution - a.contribution).map((b) => b.issueName);
  return [...new Set(topics)].slice(0, limit);
}

export function reasonLine(office: OfficeResult): string | null {
  const reasons = reasonsFor(office);
  return reasons.length ? `Mostly your answers on ${reasons.join(" and ")}.` : null;
}

// The same answers with every rating equal, to see what the ratings themselves did
export function flatImportance(answers: ScoringAnswer[]): ScoringAnswer[] {
  return answers.map((a) => ({ ...a, importance: a.importance > 0 ? 1 : 0 }));
}

export function ratedDifferently(answers: ScoringAnswer[]): boolean {
  return new Set(answers.filter((a) => a.importance > 0).map((a) => a.importance)).size > 1;
}

const topOf = (o?: OfficeResult) => (o?.verdict === "match" ? o.rankedCandidates[0]?.candidate.id : undefined);

// In how many races with a clear match did the ratings change who came out on top?
export function importanceEffect(rated: QuizResults, flat: QuizResults) {
  const races = rated.officeResults.filter((o) => o.decidable && o.verdict === "match");
  const changed = races.filter((o) => topOf(o) !== topOf(flat.officeResults.find((f) => f.officeId === o.officeId))).length;
  return { changed, races: races.length };
}
