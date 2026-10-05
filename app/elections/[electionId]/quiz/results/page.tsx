"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import ScoreBar from "@/components/quiz/ScoreBar";
import BreakdownTable from "@/components/quiz/BreakdownTable";
import type { QuizResults, RankedCandidate } from "@/lib/quiz/types";

export default function QuizResultsPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const searchParams = useSearchParams();
  const guideId = searchParams.get("guideId");

  const [results, setResults] = useState<QuizResults | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadingState, setLoading] = useState(true);
  const [fetchError, setError] = useState<string | null>(null);
  const loading = guideId ? loadingState : false;
  const error = guideId ? fetchError : "No guide ID provided.";

  useEffect(() => {
    if (!guideId) return;
    fetch(`/api/quiz/results?guideId=${guideId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to load results")))
      .then((data: QuizResults) => { setResults(data); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [guideId]);

  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading results…
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error ?? "Unknown error"}</p>
          <Link href={`/elections/${electionId}`} className="text-blue-600 underline">
            Back to election
          </Link>
        </div>
      </div>
    );
  }

  const stopLabel = results.stopSuggestion
    ? { quick: "Quick read", confident: "Confident", thorough: "Thorough" }[results.stopSuggestion]
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/elections/${electionId}/quiz?guideId=${guideId}`} className="text-sm text-blue-600 hover:underline">
            ← Back to quiz
          </Link>
          <div className="flex items-start justify-between mt-2 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Results</h1>
              <p className="text-gray-600 text-sm">
                Based on {results.questionsAnswered} of {results.totalQuestions} questions answered.
                {stopLabel && (
                  <span className="ml-2 text-green-700 font-medium">
                    Confidence: {stopLabel}
                  </span>
                )}
              </p>
            </div>
            <Link
              href={`/elections/${electionId}/quiz?guideId=${guideId}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Continue quiz
            </Link>
          </div>
        </div>

        {/* Per-office results */}
        <div className="space-y-8">
          {results.officeResults.map((officeResult) => (
            <div key={officeResult.officeId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">{officeResult.officeTitle}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="bg-gray-100 rounded-full h-2 w-20 overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${Math.round(officeResult.confidence * 100)}%` }}
                    />
                  </div>
                  <span>{Math.round(officeResult.confidence * 100)}% confident</span>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {officeResult.rankedCandidates.map((rc: RankedCandidate, idx) => {
                  const key = `${officeResult.officeId}-${rc.candidate.id}`;
                  const isTop = idx === 0;
                  return (
                    <div key={rc.candidate.id} className={`px-6 py-4 ${isTop ? "bg-blue-50" : ""}`}>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className={`text-lg font-bold w-8 text-center ${isTop ? "text-blue-600" : "text-gray-400"}`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/candidates/${rc.candidate.id}`}
                              className={`font-semibold hover:underline ${isTop ? "text-blue-800 text-base" : "text-gray-700"}`}
                            >
                              {rc.candidate.name}
                            </Link>
                            {rc.candidate.party && (
                              <span className="text-xs text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                                {rc.candidate.party}
                              </span>
                            )}
                            {rc.candidate.incumbent && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5">
                                Incumbent
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <ScoreBar
                              normalized={rc.normalized}
                              topScore={isTop && rc.maxPossible > 0}
                              hasData={rc.maxPossible > 0}
                              label={`based on ${rc.breakdown.length} stated position${rc.breakdown.length === 1 ? "" : "s"}`}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpand(key)}
                          className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
                        >
                          {expanded[key] ? "Hide" : "Why?"}
                        </button>
                      </div>

                      {expanded[key] && (
                        <div className="mt-4">
                          <BreakdownTable
                            breakdown={rc.breakdown}
                            maxPossible={rc.maxPossible}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Office links */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm">
                <Link
                  href={`/elections/${electionId}/offices/${officeResult.officeId}`}
                  className="text-blue-600 hover:underline"
                >
                  Compare all candidates side-by-side →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Issue alignment summary */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Explore issues</h2>
          <p className="text-sm text-gray-500 mb-4">
            See all candidates&apos; stances on each policy topic.
          </p>
          <div className="flex flex-wrap gap-2">
            {["housing", "climate", "public-safety", "economy", "healthcare", "immigration", "education", "water", "transportation"].map((slug) => (
              <Link
                key={slug}
                href={`/issues/${slug}`}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
              >
                {slug.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
