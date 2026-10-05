"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ConfidenceIndicator from "@/components/quiz/ConfidenceIndicator";
import type { QuizResults } from "@/lib/quiz/types";
import { parseDistrictSelection } from "@/lib/districts";

interface QuestionOption {
  id: string;
  label: string;
  stanceValue: number;
  order: number;
}

interface Question {
  id: string;
  prompt: string;
  helpText?: string;
  order: number;
  options: QuestionOption[];
}

interface QuizState {
  guideId: string;
  question: Question | null;
  results: (QuizResults & { nextQuestionId: string | null }) | null;
  answeredIds: Set<string>;
  selectedOption: string | null;
  importance: number;
  loading: boolean;
  submitting: boolean;
  done: boolean;
}

export default function QuizPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const districtKey = searchParams.toString();

  const [state, setState] = useState<QuizState>({
    guideId: "",
    question: null,
    results: null,
    answeredIds: new Set(),
    selectedOption: null,
    importance: 1,
    loading: true,
    submitting: false,
    done: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize: create or find a guide, then get first question
  useEffect(() => {
    async function init() {
      try {
        // Look up election to get its jurisdictionId
        const electionRes = await fetch(`/api/elections?id=${electionId}`);
        if (!electionRes.ok) throw new Error("Election not found");
        const election = await electionRes.json();

        // Create a guide for this quiz session
        const guideRes = await fetch("/api/guides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            electionId,
            title: "My Quiz Guide",
            jurisdictionId: election.jurisdictionId,
            metadata: { districts: parseDistrictSelection(new URLSearchParams(districtKey)) },
          }),
        });
        if (!guideRes.ok) throw new Error("Could not create guide");
        const guide = await guideRes.json();
        const guideId = guide.id;

        // Get first question
        const nextRes = await fetch(`/api/quiz/next?guideId=${guideId}`);
        if (!nextRes.ok) throw new Error("Could not load quiz");
        const nextData = await nextRes.json();

        setState((prev) => ({
          ...prev,
          guideId,
          question: nextData.question,
          loading: false,
          done: !nextData.question,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load quiz");
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
    init();
  }, [electionId, districtKey]);

  const submitAnswer = useCallback(async () => {
    if (!state.selectedOption || !state.question || !state.guideId || state.submitting) return;

    setState((prev) => ({ ...prev, submitting: true }));

    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: state.guideId,
          questionId: state.question.id,
          optionId: state.selectedOption,
          importance: state.importance,
        }),
      });
      if (!res.ok) throw new Error("Failed to save answer");
      const data: QuizResults & { nextQuestionId: string | null } = await res.json();

      const newAnswered = new Set(state.answeredIds);
      newAnswered.add(state.question.id);

      // Load next question details if there is one
      let nextQuestion: Question | null = null;
      if (data.nextQuestionId) {
        const nextRes = await fetch(`/api/quiz/next?guideId=${state.guideId}`);
        if (nextRes.ok) {
          const nextData = await nextRes.json();
          nextQuestion = nextData.question;
        }
      }

      setState((prev) => ({
        ...prev,
        question: nextQuestion,
        results: data,
        answeredIds: newAnswered,
        selectedOption: null,
        importance: 1,
        submitting: false,
        done: !nextQuestion,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save answer");
      setState((prev) => ({ ...prev, submitting: false }));
    }
  }, [state]);

  const goToResults = () => {
    router.push(`/elections/${electionId}/quiz/results?guideId=${state.guideId}`);
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">Loading quiz…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href={`/elections/${electionId}`} className="text-blue-600 underline">
            Back to election
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/elections/${electionId}`} className="text-sm text-blue-600 hover:underline">
            ← Back to election
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Voter Quiz</h1>
          <p className="text-gray-600 text-sm">
            Answer as many questions as you like. Your results update live as you go.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: question panel */}
          <div className="lg:col-span-3">
            {state.done ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-5xl mb-4">🗳️</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {state.answeredIds.size === 0 ? "No questions yet" : "All done!"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {state.answeredIds.size === 0
                    ? "Something went wrong loading the quiz."
                    : `You answered ${state.answeredIds.size} question${state.answeredIds.size !== 1 ? "s" : ""}.`}
                </p>
                <button
                  onClick={goToResults}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  View full results
                </button>
              </div>
            ) : state.question ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* Question number */}
                <div className="text-xs text-gray-400 mb-3 font-medium">
                  Question {state.answeredIds.size + 1}
                </div>

                {/* Prompt */}
                <h2 className="text-lg font-semibold text-gray-800 mb-2 leading-snug">
                  {state.question.prompt}
                </h2>
                {state.question.helpText && (
                  <p className="text-sm text-gray-500 mb-4 italic">{state.question.helpText}</p>
                )}

                {/* Options */}
                <div className="space-y-2 mb-6">
                  {state.question.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setState((prev) => ({ ...prev, selectedOption: opt.id }))}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                        state.selectedOption === opt.id
                          ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                          : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Importance */}
                {state.selectedOption && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2 font-medium">
                      How important is this issue to you?
                    </p>
                    <div className="flex gap-2">
                      {[
                        { value: 0, label: "Doesn't matter" },
                        { value: 1, label: "Somewhat" },
                        { value: 2, label: "Important" },
                        { value: 3, label: "Very important" },
                      ].map((imp) => (
                        <button
                          key={imp.value}
                          onClick={() => setState((prev) => ({ ...prev, importance: imp.value }))}
                          className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                            state.importance === imp.value
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {imp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    onClick={submitAnswer}
                    disabled={!state.selectedOption || state.submitting}
                    className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {state.submitting ? "Saving…" : "Next →"}
                  </button>
                  {state.results && (
                    <button
                      onClick={goToResults}
                      className="py-3 px-4 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Stop &amp; view results
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: live results panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Live results</h3>
              {!state.results || state.results.questionsAnswered === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Answer your first question to see results appear here.
                </p>
              ) : (
                <ConfidenceIndicator results={state.results} onStop={goToResults} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
