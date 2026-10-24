"use client";

import { verdictText } from "@/lib/quiz/verdict";
import type { QuizResults } from "@/lib/quiz/types";

interface Props {
  results: QuizResults;
  onStop?: () => void;
}

// Live results beside the quiz: only the races it can compare, by their full office name
export default function ConfidenceIndicator({ results, onStop }: Props) {
  const pct = Math.round((results.questionsAnswered / Math.max(results.totalQuestions, 1)) * 100);
  const races = results.officeResults.filter((o) => o.decidable);

  return (
    <div className="space-y-3">
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-right text-xs text-gray-500">
          {results.questionsAnswered} of {results.totalQuestions} answered
        </div>
      </div>

      <ul className="space-y-2">
        {races.map((o) => {
          const top = o.verdict === "match" ? o.rankedCandidates[0] : undefined;
          const { headline } = verdictText(o);
          return (
            <li key={o.officeId} className="text-sm">
              <p className="font-semibold text-gray-800">{o.officeTitle}</p>
              <p className={top ? "text-green-800" : "text-gray-600"}>
                {top ? `Closest to you: ${top.candidate.name}` : headline}
              </p>
            </li>
          );
        })}
      </ul>

      {onStop && results.questionsAnswered > 0 && (
        <button onClick={onStop} className="text-sm font-medium text-blue-700 underline">
          How each race compares
        </button>
      )}
    </div>
  );
}
