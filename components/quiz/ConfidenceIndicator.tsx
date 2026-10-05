"use client";

import type { QuizResults } from "@/lib/quiz/types";

interface Props {
  results: QuizResults;
  onStop?: () => void;
}

const stopLabels = {
  quick: { label: "Quick read", color: "text-yellow-700 bg-yellow-50 border-yellow-300" },
  confident: { label: "Confident", color: "text-green-700 bg-green-50 border-green-300" },
  thorough: { label: "Thorough", color: "text-blue-700 bg-blue-50 border-blue-300" },
};

export default function ConfidenceIndicator({ results, onStop }: Props) {
  const pct = Math.round(results.questionsAnswered / Math.max(results.totalQuestions, 1) * 100);
  const { stopSuggestion } = results;

  return (
    <div className="space-y-3">
      {/* Progress bar with milestones */}
      <div className="relative">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>0</span>
          <span className="text-yellow-600">Quick (5)</span>
          <span className="text-green-600">Confident (12)</span>
          <span className="text-blue-600">All ({results.totalQuestions})</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2 relative overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
          {/* milestone ticks */}
          {[5, 12].map((n) => (
            <div
              key={n}
              className="absolute top-0 bottom-0 w-0.5 bg-white opacity-60"
              style={{ left: `${(n / results.totalQuestions) * 100}%` }}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1 text-right">
          {results.questionsAnswered} of {results.totalQuestions} answered
        </div>
      </div>

      {/* Per-office mini confidence */}
      <div className="space-y-1">
        {results.officeResults.map((o) => {
          const known = o.rankedCandidates.filter((r) => r.maxPossible > 0);
          const top = known[0];
          const second = known[1];
          return (
            <div key={o.officeId} className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 truncate max-w-[120px]" title={o.officeTitle}>
                {o.officeTitle}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(o.confidence * 100)}%` }}
                />
              </div>
              <span className="font-medium text-gray-700 truncate max-w-[80px]" title={top?.candidate.name}>
                {top ? top.candidate.name.split(" ").slice(-1)[0] : "—"}
              </span>
              {top && second && (
                <span className="text-gray-400">
                  +{Math.round((top.normalized - second.normalized) * 100)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Stop suggestion banner */}
      {stopSuggestion && onStop && (
        <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${stopLabels[stopSuggestion].color}`}>
          <span className="text-sm font-medium">
            {stopSuggestion === "confident" && "Your picks are stable — you can stop here."}
            {stopSuggestion === "thorough" && "You've covered everything — results are thorough."}
            {stopSuggestion === "quick" && "You have a rough lean — keep going or stop."}
          </span>
          <button
            onClick={onStop}
            className="ml-3 text-sm underline font-medium opacity-80 hover:opacity-100"
          >
            See results
          </button>
        </div>
      )}
    </div>
  );
}
